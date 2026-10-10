-- =============================================================================
-- MindLab — Cognitive Research Platform
-- PostgreSQL / Supabase Migration
-- Migration ID: 20261011000000_room_unlock_and_email_notification.sql
-- Description:
--   1. Adds authoritative room 2 start timestamp (room_2_started_at),
--      24-hour unlock timestamp (rooms_3_4_unlock_at), is_legacy flag, and
--      unlock email tracking fields to public.sessions.
--   2. Explicitly marks existing pre-migration sessions as is_legacy = true
--      and backfills room 2 timestamps ONLY for legacy sessions that had
--      already started or completed Room 2. New sessions are strictly is_legacy = false.
--   3. Adds authoritative record_room_2_start() RPC requiring is_session_owner()
--      or service_role/admin JWT claims.
--   4. Adds check_rooms_3_4_access() RPC with session ownership authorization.
--   5. Creates database triggers on stroop_trials and task_switching_trials
--      blocking unauthorized trial insertion before 24h expires for all post-migration
--      sessions, with a narrowly defined is_legacy rule for genuine historical sessions.
--   6. Creates database trigger on sessions blocking premature room 3/4 completion.
--   7. Adds atomic email claiming and result recording RPCs strictly for service_role.
--   8. Updates resume_participant_session() with multi-factor cross-device authorization:
--      never reassigns auth_user_id without verified registered email, preventing
--      unauthorized session takeovers while preserving legitimate cross-device resume.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND SESSIONS TABLE FOR ROOM 2 START & 24H UNLOCK TRACKING
-- -----------------------------------------------------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS room_2_started_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS rooms_3_4_unlock_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS unlock_email_sent_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS unlock_email_claimed_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS unlock_email_status VARCHAR(32) NOT NULL DEFAULT 'not_applicable';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS unlock_email_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS unlock_email_error TEXT;

-- Safely add constraint on unlock_email_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_sessions_unlock_email_status'
    ) THEN
        ALTER TABLE public.sessions 
        ADD CONSTRAINT chk_sessions_unlock_email_status 
        CHECK (unlock_email_status IN ('not_applicable', 'pending', 'claimed', 'sent', 'failed'));
    END IF;
END $$;

-- Index for efficient email worker queries
CREATE INDEX IF NOT EXISTS idx_sessions_unlock_email_pending 
ON public.sessions (rooms_3_4_unlock_at, unlock_email_status)
WHERE room_2_started_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. NARROW HISTORICAL SESSION BACKFILL
-- 1. Explicitly marks ONLY pre-migration sessions that had already started or completed
--    Room 2 (or completed Rooms 3 or 4) as is_legacy = true.
-- Pre-migration sessions that never started Room 2 remain is_legacy = false so they must observe the 24h lock when they start Room 2.
-- All sessions created after this migration default to is_legacy = false.
-- -----------------------------------------------------------------------------
UPDATE public.sessions s
SET is_legacy = true
WHERE s.created_at <= now()
  AND (
      s.corsi_completed = true 
      OR s.stroop_completed = true 
      OR s.task_switching_completed = true 
      OR EXISTS (SELECT 1 FROM public.corsi_trials ct WHERE ct.session_id = s.id)
  );

UPDATE public.sessions s
SET 
    room_2_started_at = COALESCE(
        (SELECT min(ct.created_at) FROM public.corsi_trials ct WHERE ct.session_id = s.id),
        s.created_at
    ),
    rooms_3_4_unlock_at = COALESCE(
        (SELECT min(ct.created_at) FROM public.corsi_trials ct WHERE ct.session_id = s.id),
        s.created_at
    ) + INTERVAL '24 hours',
    unlock_email_status = CASE 
        WHEN COALESCE((SELECT min(ct.created_at) FROM public.corsi_trials ct WHERE ct.session_id = s.id), s.created_at) + INTERVAL '24 hours' <= now() THEN 'not_applicable'
        WHEN s.stroop_completed = true OR s.task_switching_completed = true THEN 'not_applicable'
        ELSE 'pending'
    END
WHERE s.is_legacy = true
  AND s.room_2_started_at IS NULL
  AND (s.corsi_completed = true OR EXISTS (SELECT 1 FROM public.corsi_trials ct WHERE ct.session_id = s.id));

-- -----------------------------------------------------------------------------
-- 3. AUTHORITATIVE RECORD_ROOM_2_START RPC
-- Requires session ownership via is_session_owner(p_session_id), is_admin(),
-- or service_role JWT claims. Rejects unauthorized callers.
-- Idempotent: Never overwrites an established room_2_started_at.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_room_2_start(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sess RECORD;
    v_now TIMESTAMPTZ := now();
    v_unlock_at TIMESTAMPTZ;
    v_already_started BOOLEAN := false;
    v_is_authorized BOOLEAN := false;
BEGIN
    -- Verify caller identity via Supabase JWT claims or RLS session ownership
    IF auth.role() = 'service_role' 
       OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'service_role')
       OR is_admin() 
       OR is_session_owner(p_session_id) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller does not own this session.'
        );
    END IF;

    SELECT id, room_2_started_at, rooms_3_4_unlock_at, unlock_email_status
    INTO v_sess
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF v_sess IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found.');
    END IF;

    IF v_sess.room_2_started_at IS NOT NULL THEN
        v_already_started := true;
        v_unlock_at := v_sess.rooms_3_4_unlock_at;
    ELSE
        v_unlock_at := v_now + INTERVAL '24 hours';
        UPDATE public.sessions
        SET 
            room_2_started_at = v_now,
            rooms_3_4_unlock_at = v_unlock_at,
            unlock_email_status = CASE 
                WHEN unlock_email_status = 'not_applicable' THEN 'pending' 
                ELSE unlock_email_status 
            END,
            updated_at = v_now
        WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'already_started', v_already_started,
        'room_2_started_at', COALESCE(v_sess.room_2_started_at, v_now),
        'rooms_3_4_unlock_at', v_unlock_at,
        'server_now', v_now,
        'unlocked', (v_now >= v_unlock_at),
        'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_unlock_at - v_now))::INT)
    );
END;
$$;

ALTER FUNCTION public.record_room_2_start(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_room_2_start(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_room_2_start(UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. AUTHORITATIVE CHECK_ROOMS_3_4_ACCESS RPC
-- Checks server-side database now() against rooms_3_4_unlock_at.
-- Enforces is_session_owner(p_session_id) or service_role/admin.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rooms_3_4_access(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sess RECORD;
    v_now TIMESTAMPTZ := now();
    v_unlocked BOOLEAN := false;
    v_remaining INT := 0;
    v_reason TEXT;
    v_is_authorized BOOLEAN := false;
BEGIN
    IF auth.role() = 'service_role' 
       OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'service_role')
       OR is_admin() 
       OR is_session_owner(p_session_id) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller does not own this session.'
        );
    END IF;

    SELECT id, is_legacy, room_2_started_at, rooms_3_4_unlock_at, corsi_completed, stroop_completed, task_switching_completed
    INTO v_sess
    FROM public.sessions
    WHERE id = p_session_id;

    IF v_sess IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found.');
    END IF;

    -- NARROW LEGACY RULE:
    -- Only permit historical bypass if the session was explicitly marked is_legacy = true
    -- at migration time AND had already completed Room 2 or Room 3/4 before the migration.
    IF v_sess.is_legacy = true AND (v_sess.corsi_completed = true OR v_sess.stroop_completed = true OR v_sess.task_switching_completed = true) THEN
        IF v_sess.rooms_3_4_unlock_at IS NULL OR v_now >= v_sess.rooms_3_4_unlock_at THEN
            RETURN jsonb_build_object(
                'success', true,
                'session_id', p_session_id,
                'room_2_started', true,
                'room_2_started_at', v_sess.room_2_started_at,
                'rooms_3_4_unlock_at', v_sess.rooms_3_4_unlock_at,
                'unlocked', true,
                'reason', 'historical_unlocked',
                'server_now', v_now,
                'remaining_seconds', 0
            );
        END IF;
    END IF;

    -- ALL OTHER SESSIONS (strictly enforced):
    IF v_sess.room_2_started_at IS NULL THEN
        v_unlocked := false;
        v_reason := 'room_2_not_started';
        v_remaining := 86400;
    ELSIF v_now < v_sess.rooms_3_4_unlock_at THEN
        v_unlocked := false;
        v_reason := 'time_remaining';
        v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_sess.rooms_3_4_unlock_at - v_now))::INT);
    ELSE
        v_unlocked := true;
        v_reason := 'unlocked';
        v_remaining := 0;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'room_2_started', (v_sess.room_2_started_at IS NOT NULL),
        'room_2_started_at', v_sess.room_2_started_at,
        'rooms_3_4_unlock_at', v_sess.rooms_3_4_unlock_at,
        'unlocked', v_unlocked,
        'reason', v_reason,
        'server_now', v_now,
        'remaining_seconds', v_remaining
    );
END;
$$;

ALTER FUNCTION public.check_rooms_3_4_access(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_rooms_3_4_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rooms_3_4_access(UUID) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. SERVER-SIDE DATABASE ENFORCEMENT TRIGGERS
-- Blocks trial insertion and room completion.
-- Eliminates broad bypasses: post-migration sessions cannot bypass under any circumstances.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_rooms_3_4_trial_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sess RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT is_legacy, room_2_started_at, rooms_3_4_unlock_at, corsi_completed, stroop_completed, task_switching_completed
    INTO v_sess
    FROM public.sessions
    WHERE id = NEW.session_id;

    IF v_sess IS NULL THEN
        RAISE EXCEPTION 'Session % not found for trial insertion.', NEW.session_id;
    END IF;

    -- NARROW LEGACY RULE:
    -- Only permit bypass if the session was explicitly marked is_legacy = true at migration time
    -- AND had already completed Room 2 or Room 3/4 before the migration.
    IF v_sess.is_legacy = true AND (v_sess.corsi_completed = true OR v_sess.stroop_completed = true OR v_sess.task_switching_completed = true) THEN
        IF v_sess.rooms_3_4_unlock_at IS NULL OR v_now >= v_sess.rooms_3_4_unlock_at THEN
            RETURN NEW;
        END IF;
    END IF;

    -- FOR ALL POST-MIGRATION SESSIONS:
    IF v_sess.room_2_started_at IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Room 2 has not been started yet. Rooms 3 and 4 unlock 24 hours after starting Room 2.';
    END IF;

    IF v_now < v_sess.rooms_3_4_unlock_at THEN
        RAISE EXCEPTION 'Access Denied: Rooms 3 and 4 are locked until % (server time is %). 24-hour interval has not elapsed.', v_sess.rooms_3_4_unlock_at, v_now;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_stroop_unlock ON public.stroop_trials;
CREATE TRIGGER trg_enforce_stroop_unlock
BEFORE INSERT ON public.stroop_trials
FOR EACH ROW
EXECUTE FUNCTION public.enforce_rooms_3_4_trial_insert();

DROP TRIGGER IF EXISTS trg_enforce_ts_unlock ON public.task_switching_trials;
CREATE TRIGGER trg_enforce_ts_unlock
BEFORE INSERT ON public.task_switching_trials
FOR EACH ROW
EXECUTE FUNCTION public.enforce_rooms_3_4_trial_insert();

-- Trigger on sessions table: Ensure all newly created sessions have is_legacy = false
CREATE OR REPLACE FUNCTION public.enforce_rooms_3_4_session_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- All newly created sessions are post-migration and cannot be marked legacy
    NEW.is_legacy := false;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_rooms_3_4_session_insert ON public.sessions;
CREATE TRIGGER trg_enforce_rooms_3_4_session_insert
BEFORE INSERT ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_rooms_3_4_session_insert();

-- Trigger on sessions table: Prevent prematurely marking room 3 or 4 completed
CREATE OR REPLACE FUNCTION public.enforce_rooms_3_4_session_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Security guard: prevent marking an existing session as legacy
    IF NEW.is_legacy = true AND (OLD.is_legacy IS NULL OR OLD.is_legacy = false) THEN
        RAISE EXCEPTION 'Security Violation: Cannot mark an existing session as legacy.';
    END IF;

    -- Check if either room 3 or room 4 is being marked completed
    IF (NEW.stroop_completed = true AND (OLD.stroop_completed IS NULL OR OLD.stroop_completed = false)) OR
       (NEW.task_switching_completed = true AND (OLD.task_switching_completed IS NULL OR OLD.task_switching_completed = false)) THEN
        
        -- NARROW LEGACY RULE:
        IF OLD.is_legacy = true AND (OLD.corsi_completed = true OR OLD.stroop_completed = true OR OLD.task_switching_completed = true) THEN
            IF OLD.rooms_3_4_unlock_at IS NULL OR v_now >= OLD.rooms_3_4_unlock_at THEN
                RETURN NEW;
            END IF;
        END IF;

        -- FOR ALL POST-MIGRATION SESSIONS:
        IF OLD.room_2_started_at IS NULL THEN
            RAISE EXCEPTION 'Access Denied: Room 2 must be started before completing Room 3 or Room 4.';
        END IF;

        IF v_now < OLD.rooms_3_4_unlock_at THEN
            RAISE EXCEPTION 'Access Denied: Cannot mark Room 3 or 4 completed before unlock time % (server time %).', OLD.rooms_3_4_unlock_at, v_now;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_rooms_3_4_session_update ON public.sessions;
CREATE TRIGGER trg_enforce_rooms_3_4_session_update
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_rooms_3_4_session_update();

-- -----------------------------------------------------------------------------
-- 6. ATOMIC EMAIL NOTIFICATION CLAIMING & RESULT RECORDING (Strictly service_role)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_pending_unlock_emails(p_batch_size INT DEFAULT 20)
RETURNS TABLE (
    session_id UUID,
    participant_id UUID,
    participant_code VARCHAR,
    participant_name VARCHAR,
    participant_email VARCHAR,
    room_2_started_at TIMESTAMPTZ,
    rooms_3_4_unlock_at TIMESTAMPTZ,
    attempt_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT (
        auth.role() = 'service_role' 
        OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'service_role')
        OR is_admin()
    ) THEN
        RAISE EXCEPTION 'Access Denied: claim_pending_unlock_emails requires service_role privileges.';
    END IF;

    RETURN QUERY
    WITH eligible AS (
        SELECT s.id
        FROM public.sessions s
        JOIN public.participants p ON s.participant_id = p.id
        WHERE s.room_2_started_at IS NOT NULL
          AND s.rooms_3_4_unlock_at <= now()
          AND (
              s.unlock_email_status = 'pending'
              OR (s.unlock_email_status = 'failed' AND s.unlock_email_attempts < 5)
              OR (s.unlock_email_status = 'claimed' AND s.unlock_email_claimed_at < now() - INTERVAL '15 minutes')
          )
          AND s.unlock_email_sent_at IS NULL
          AND p.email IS NOT NULL
          AND length(trim(p.email)) > 0
        ORDER BY s.rooms_3_4_unlock_at ASC
        LIMIT p_batch_size
        FOR UPDATE OF s SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.sessions s
        SET 
            unlock_email_status = 'claimed',
            unlock_email_claimed_at = now(),
            unlock_email_attempts = s.unlock_email_attempts + 1
        FROM eligible e
        WHERE s.id = e.id
        RETURNING s.id, s.participant_id, s.room_2_started_at, s.rooms_3_4_unlock_at, s.unlock_email_attempts
    )
    SELECT 
        c.id AS session_id,
        c.participant_id,
        p.participant_code,
        p.name AS participant_name,
        p.email AS participant_email,
        c.room_2_started_at,
        c.rooms_3_4_unlock_at,
        c.unlock_email_attempts AS attempt_count
    FROM claimed c
    JOIN public.participants p ON c.participant_id = p.id;
END;
$$;

ALTER FUNCTION public.claim_pending_unlock_emails(INT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_pending_unlock_emails(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_unlock_emails(INT) TO service_role;

CREATE OR REPLACE FUNCTION public.record_unlock_email_result(
    p_session_id UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
BEGIN
    IF NOT (
        auth.role() = 'service_role' 
        OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'service_role')
        OR is_admin()
    ) THEN
        RAISE EXCEPTION 'Access Denied: record_unlock_email_result requires service_role privileges.';
    END IF;

    IF p_success THEN
        UPDATE public.sessions
        SET 
            unlock_email_status = 'sent',
            unlock_email_sent_at = v_now,
            unlock_email_error = NULL,
            updated_at = v_now
        WHERE id = p_session_id;
    ELSE
        UPDATE public.sessions
        SET 
            unlock_email_status = 'failed',
            unlock_email_error = p_error,
            updated_at = v_now
        WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', CASE WHEN p_success THEN 'sent' ELSE 'failed' END
    );
END;
$$;

ALTER FUNCTION public.record_unlock_email_result(UUID, BOOLEAN, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_unlock_email_result(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_unlock_email_result(UUID, BOOLEAN, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 7. UPDATE RESUME_PARTICIPANT_SESSION RPC (Strengthened Cross-Device Auth)
-- Reassigning auth_user_id to a new device strictly requires verification of the
-- participant's registered email address. Unverified requests cannot reassign auth_user_id.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.resume_participant_session(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.resume_participant_session(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.resume_participant_session(
    p_participant_code TEXT,
    p_verification_name TEXT,
    p_verification_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_norm_code TEXT;
    v_clean_name TEXT;
    v_clean_email TEXT;
    v_part RECORD;
    v_sess RECORD;
    v_hanoi_count INT := 0;
    v_corsi_count INT := 0;
    v_stroop_count INT := 0;
    v_ts_count INT := 0;
    v_first_name TEXT;
    v_now TIMESTAMPTZ := now();
    v_unlocked BOOLEAN := false;
    v_remaining INT := 0;
    v_caller_uid UUID := auth.uid();
BEGIN
    v_norm_code := upper(trim(p_participant_code));
    IF v_norm_code ~ '^[0-9]+$' THEN
        v_norm_code := 'ML-' || v_norm_code;
    END IF;

    IF v_norm_code IS NULL OR length(v_norm_code) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Participant ID format.');
    END IF;

    IF p_verification_name IS NULL OR length(trim(p_verification_name)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'First name verification is required to resume a session.');
    END IF;

    SELECT id, participant_code, name, email, auth_user_id
    INTO v_part
    FROM public.participants
    WHERE participant_code = v_norm_code
    LIMIT 1;

    IF v_part IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Participant ID or verification name is incorrect.');
    END IF;

    v_clean_name := lower(trim(p_verification_name));
    v_first_name := lower(split_part(trim(v_part.name), ' ', 1));
    IF v_first_name <> v_clean_name THEN
        RETURN jsonb_build_object('success', false, 'error', 'Participant ID or verification name is incorrect.');
    END IF;

    -- Require active authentication context
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required. Please refresh the page and try again.');
    END IF;

    -- STRENGTHENED CROSS-DEVICE AUTHENTICATION & OWNERSHIP TRANSFER:
    -- If the session is already bound to another auth identity, an unverified request
    -- (participant code + first name alone) is strictly forbidden from reassigning auth_user_id.
    -- Reassigning auth_user_id to a new device strictly requires verification of the registered email address.
    IF v_part.auth_user_id IS NOT NULL AND v_part.auth_user_id <> v_caller_uid THEN
        v_clean_email := lower(trim(coalesce(p_verification_email, '')));
        
        IF v_part.email IS NOT NULL AND length(trim(v_part.email)) > 0 THEN
            IF v_clean_email <> lower(trim(v_part.email)) THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Cross-device resume requires verification of your registered email address.'
                );
            END IF;
            -- Verified via registered email: securely bind auth_user_id to new device
            UPDATE public.participants
            SET auth_user_id = v_caller_uid, updated_at = v_now
            WHERE id = v_part.id;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Session is bound to another device. Please contact researchers to transfer access.'
            );
        END IF;
    ELSIF v_caller_uid IS NOT NULL AND v_part.auth_user_id IS NULL THEN
        -- Legacy unclaimed participant: bind once
        UPDATE public.participants
        SET auth_user_id = v_caller_uid, updated_at = v_now
        WHERE id = v_part.id;
    END IF;

    SELECT id, is_legacy, hanoi_completed, corsi_completed, stroop_completed, task_switching_completed, 
           session_status, room_2_started_at, rooms_3_4_unlock_at
    INTO v_sess
    FROM public.sessions
    WHERE participant_id = v_part.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sess IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active research session found for this participant.');
    END IF;

    -- NARROW LEGACY RULE FOR UNLOCK STATUS:
    IF v_sess.is_legacy = true AND (v_sess.corsi_completed = true OR v_sess.stroop_completed = true OR v_sess.task_switching_completed = true) THEN
        IF v_sess.rooms_3_4_unlock_at IS NULL OR v_now >= v_sess.rooms_3_4_unlock_at THEN
            v_unlocked := true;
            v_remaining := 0;
        ELSE
            v_unlocked := false;
            v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_sess.rooms_3_4_unlock_at - v_now))::INT);
        END IF;
    ELSIF v_sess.room_2_started_at IS NOT NULL AND v_now >= v_sess.rooms_3_4_unlock_at THEN
        v_unlocked := true;
        v_remaining := 0;
    ELSIF v_sess.room_2_started_at IS NOT NULL THEN
        v_unlocked := false;
        v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_sess.rooms_3_4_unlock_at - v_now))::INT);
    ELSE
        -- Post-migration session where room 2 was not started: locked
        v_unlocked := false;
        v_remaining := 86400;
    END IF;

    SELECT count(*) INTO v_hanoi_count FROM public.hanoi_puzzles WHERE session_id = v_sess.id;
    SELECT count(*) INTO v_corsi_count FROM public.corsi_trials WHERE session_id = v_sess.id;
    SELECT count(*) INTO v_stroop_count FROM public.stroop_trials WHERE session_id = v_sess.id;
    SELECT count(*) INTO v_ts_count FROM public.task_switching_trials WHERE session_id = v_sess.id;

    RETURN jsonb_build_object(
        'success', true,
        'participant', jsonb_build_object(
            'id', v_part.participant_code,
            'dbId', v_part.id,
            'name', v_part.name,
            'hanoiCompleted', v_sess.hanoi_completed,
            'corsiCompleted', v_sess.corsi_completed,
            'stroopCompleted', v_sess.stroop_completed,
            'taskSwitchingCompleted', v_sess.task_switching_completed,
            'hanoiCount', v_hanoi_count,
            'corsiCount', v_corsi_count,
            'stroopCount', v_stroop_count,
            'tsCount', v_ts_count
        ),
        'session', jsonb_build_object(
            'id', v_sess.id,
            'status', v_sess.session_status,
            'room2StartedAt', v_sess.room_2_started_at,
            'rooms3And4UnlockAt', v_sess.rooms_3_4_unlock_at,
            'rooms3And4Unlocked', v_unlocked,
            'serverNow', v_now,
            'remainingSeconds', v_remaining
        )
    );
END;
$$;

ALTER FUNCTION public.resume_participant_session(TEXT, TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resume_participant_session(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_participant_session(TEXT, TEXT, TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 9. TOWER OF HANOI MOVE LIMITS & ATTEMPT NUMBER ENHANCEMENT
-- -----------------------------------------------------------------------------
ALTER TABLE public.hanoi_puzzles ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;

-- Extend get_participant_config() to safely deliver validated hanoi_puzzles configuration
CREATE OR REPLACE FUNCTION public.get_participant_config()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    sess_cfg JSONB;
    meas_cfg JSONB;
    hanoi_cfg JSONB;
    v_allow_exit BOOLEAN := true;
    v_rec_invalid BOOLEAN := true;
    v_show_timer BOOLEAN := true;
    v_show_moves BOOLEAN := true;
    v_study_title TEXT := 'MindLab Cognitive Battery';
    v_rec_move_time BOOLEAN := true;
    v_rec_first_rt BOOLEAN := true;
    v_rec_inv_att BOOLEAN := true;
    v_rec_pos_acc BOOLEAN := true;
    v_rec_sess_time BOOLEAN := true;
BEGIN
    SELECT config INTO sess_cfg FROM public.experiment_configs WHERE key = 'session_options';
    SELECT config INTO meas_cfg FROM public.experiment_configs WHERE key = 'data_measurements';
    SELECT config INTO hanoi_cfg FROM public.experiment_configs WHERE key = 'hanoi_puzzles';

    IF sess_cfg IS NOT NULL AND jsonb_typeof(sess_cfg) = 'object' THEN
        IF sess_cfg->>'allowMidSessionExit' IN ('false', '0') THEN v_allow_exit := false; END IF;
        IF sess_cfg->>'recordInvalidMoves' IN ('false', '0') THEN v_rec_invalid := false; END IF;
        IF sess_cfg->>'showTimer' IN ('false', '0') THEN v_show_timer := false; END IF;
        IF sess_cfg->>'showMoveCounter' IN ('false', '0') THEN v_show_moves := false; END IF;
        IF sess_cfg->>'studyTitle' IS NOT NULL AND length(trim(sess_cfg->>'studyTitle')) > 0 THEN
            v_study_title := substring(trim(sess_cfg->>'studyTitle') from 1 for 120);
        END IF;
    END IF;

    IF meas_cfg IS NOT NULL AND jsonb_typeof(meas_cfg) = 'object' THEN
        IF meas_cfg->>'recordMoveTimestamps' IN ('false', '0') THEN v_rec_move_time := false; END IF;
        IF meas_cfg->>'recordFirstMoveRt' IN ('false', '0') THEN v_rec_first_rt := false; END IF;
        IF meas_cfg->>'recordInvalidMoveAttempts' IN ('false', '0') THEN v_rec_inv_att := false; END IF;
        IF meas_cfg->>'recordBlockPositionAccuracy' IN ('false', '0') THEN v_rec_pos_acc := false; END IF;
        IF meas_cfg->>'recordSessionTimestamps' IN ('false', '0') THEN v_rec_sess_time := false; END IF;
    END IF;

    RETURN jsonb_build_object(
        'session_options', jsonb_build_object(
            'allowMidSessionExit', v_allow_exit,
            'recordInvalidMoves', v_rec_invalid,
            'showTimer', v_show_timer,
            'showMoveCounter', v_show_moves,
            'studyTitle', v_study_title
        ),
        'data_measurements', jsonb_build_object(
            'recordMoveTimestamps', v_rec_move_time,
            'recordFirstMoveRt', v_rec_first_rt,
            'recordInvalidMoveAttempts', v_rec_inv_att,
            'recordBlockPositionAccuracy', v_rec_pos_acc,
            'recordSessionTimestamps', v_rec_sess_time
        ),
        'hanoi_puzzles', hanoi_cfg
    );
END;
$$;

ALTER FUNCTION public.get_participant_config() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_participant_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_participant_config() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. TASK SWITCHING STIMULUS POSITION, ROW CONSISTENCY & SHIFT COST SCHEMA
-- -----------------------------------------------------------------------------
-- 10.1 Add spatial positioning and consistency columns to trial-level data
ALTER TABLE public.task_switching_trials 
    ADD COLUMN IF NOT EXISTS stimulus_position TEXT CHECK (stimulus_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
    ADD COLUMN IF NOT EXISTS consistency TEXT CHECK (consistency IN ('consistent', 'inconsistent')),
    ADD COLUMN IF NOT EXISTS is_consistent BOOLEAN;

-- Backfill stimulus_position from historical quadrant data if quadrant column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'task_switching_trials' 
          AND column_name = 'quadrant'
    ) THEN
        EXECUTE 'UPDATE public.task_switching_trials
        SET stimulus_position = CASE quadrant
            WHEN 1 THEN ''top-left''
            WHEN 2 THEN ''top-right''
            WHEN 3 THEN ''bottom-right''
            WHEN 4 THEN ''bottom-left''
            ELSE NULL
        END
        WHERE stimulus_position IS NULL AND quadrant IS NOT NULL;';
    END IF;
END $$;

-- 10.2 Add shift cost summary metrics to sessions table
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS task_switching_consistent_trials INTEGER,
    ADD COLUMN IF NOT EXISTS task_switching_consistent_correct INTEGER,
    ADD COLUMN IF NOT EXISTS task_switching_consistent_mean_rt_ms NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS task_switching_inconsistent_trials INTEGER,
    ADD COLUMN IF NOT EXISTS task_switching_inconsistent_correct INTEGER,
    ADD COLUMN IF NOT EXISTS task_switching_inconsistent_mean_rt_ms NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS task_switching_shift_cost_ms NUMERIC(10, 2);

-- 10.3 Update task_switching_session_summaries_view with spatial shift cost columns
DROP VIEW IF EXISTS public.task_switching_session_summaries_view;

CREATE VIEW public.task_switching_session_summaries_view
WITH (security_invoker = true) AS
SELECT 
    s.id AS session_id,
    s.participant_id,
    COUNT(tst.id) AS total_experimental_trials,
    COUNT(*) FILTER (WHERE tst.is_correct) AS total_correct_trials,
    ROUND(COUNT(*) FILTER (WHERE tst.is_correct)::NUMERIC / NULLIF(COUNT(tst.id), 0) * 100, 2) AS overall_accuracy,
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter') AS pure_letter_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter' AND tst.is_correct) AS pure_letter_correct,
    ROUND(COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter' AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter'), 0) * 100, 2) AS pure_letter_accuracy,
    ROUND(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'pure-letter' AND tst.is_correct), 2) AS pure_letter_mean_rt_ms,
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-number') AS pure_number_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-number' AND tst.is_correct) AS pure_number_correct,
    ROUND(COUNT(*) FILTER (WHERE tst.block_type = 'pure-number' AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'pure-number'), 0) * 100, 2) AS pure_number_accuracy,
    ROUND(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'pure-number' AND tst.is_correct), 2) AS pure_number_mean_rt_ms,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed') AS mixed_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_correct) AS mixed_correct,
    ROUND(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'mixed'), 0) * 100, 2) AS mixed_accuracy,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat) AS mixed_repeat_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct) AS mixed_repeat_correct,
    ROUND(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat), 0) * 100, 2) AS mixed_repeat_accuracy,
    ROUND(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct), 2) AS mixed_repeat_mean_rt_ms,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch) AS mixed_switch_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct) AS mixed_switch_correct,
    ROUND(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch), 0) * 100, 2) AS mixed_switch_accuracy,
    ROUND(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct), 2) AS mixed_switch_mean_rt_ms,
    ROUND(
        AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct) - 
        AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct)
    , 2) AS switch_cost_ms,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'consistent') AS consistent_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'consistent' AND tst.is_correct) AS consistent_correct,
    ROUND(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'consistent' AND tst.is_correct), 2) AS consistent_mean_rt_ms,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'inconsistent') AS inconsistent_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'inconsistent' AND tst.is_correct) AS inconsistent_correct,
    ROUND(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'inconsistent' AND tst.is_correct), 2) AS inconsistent_mean_rt_ms,
    ROUND(
        AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'inconsistent' AND tst.is_correct) - 
        AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.consistency = 'consistent' AND tst.is_correct)
    , 2) AS shift_cost_ms
FROM public.sessions s
LEFT JOIN public.task_switching_trials tst ON tst.session_id = s.id AND tst.phase = 'experimental'
GROUP BY s.id, s.participant_id;

ALTER VIEW public.task_switching_session_summaries_view OWNER TO postgres;
REVOKE ALL ON public.task_switching_session_summaries_view FROM anon, public;
GRANT SELECT ON public.task_switching_session_summaries_view TO authenticated;


