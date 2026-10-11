-- =============================================================================
-- Migration: 20261012000000_update_24h_unlock_and_resume_by_name_email.sql
-- Description:
--   1. Enforces strict 24-hour unlock interval for Rooms 3 & 4 (Stroop & Task Switching).
--   2. Adds RPC resume_participant_by_name_and_email(p_name, p_email) to allow
--      participants to resume sessions on any device using only Name and Email.
-- =============================================================================

-- 1. UPDATE RECORD_ROOM_2_START RPC (24-Hour Interval)
CREATE OR REPLACE FUNCTION public.record_room_2_start(
    p_session_id UUID
)
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
    v_caller_uid UUID := auth.uid();
    v_is_authorized BOOLEAN := false;
BEGIN
    IF v_caller_uid IS NOT NULL AND (
        is_admin() OR is_session_owner(p_session_id)
    ) THEN
        v_is_authorized := true;
    ELSIF v_caller_uid IS NULL THEN
        -- Allow anonymous caller with valid session UUID
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
        -- Exactly 24 hours after Room 2 is started
        v_unlock_at := v_now + INTERVAL '24 hours';
        UPDATE public.sessions
        SET 
            room_2_started_at = v_now,
            rooms_3_4_unlock_at = v_unlock_at,
            unlock_email_status = 'pending',
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


-- 2. CREATE RESUME_PARTICIPANT_BY_NAME_AND_EMAIL RPC
CREATE OR REPLACE FUNCTION public.resume_participant_by_name_and_email(
    p_name TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_email TEXT;
    v_clean_name TEXT;
    v_first_name TEXT;
    v_part RECORD;
    v_sess RECORD;
    v_hanoi_count INT := 0;
    v_corsi_count INT := 0;
    v_stroop_count INT := 0;
    v_ts_count INT := 0;
    v_now TIMESTAMPTZ := now();
    v_unlocked BOOLEAN := false;
    v_remaining INT := 86400;
    v_caller_uid UUID := auth.uid();
BEGIN
    v_clean_email := lower(trim(p_email));
    v_clean_name := lower(trim(p_name));

    IF v_clean_email IS NULL OR length(v_clean_email) < 3 OR position('@' in v_clean_email) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please enter a valid registered Email address.');
    END IF;

    IF v_clean_name IS NULL OR length(v_clean_name) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please enter your Name.');
    END IF;

    -- Lookup participant by registered email address
    SELECT id, participant_code, name, email, age, gender, adhd_diagnosis, auth_user_id
    INTO v_part
    FROM public.participants
    WHERE lower(trim(email)) = v_clean_email
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_part IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No participant record found with this email address. Please check your spelling or register a new session.');
    END IF;

    -- Verify name matches (compare first name or full name, case-insensitive)
    v_first_name := lower(split_part(trim(v_part.name), ' ', 1));
    IF lower(trim(v_part.name)) <> v_clean_name 
       AND v_first_name <> v_clean_name 
       AND v_first_name <> lower(split_part(v_clean_name, ' ', 1)) 
       AND position(v_first_name in v_clean_name) = 0 
       AND position(v_clean_name in lower(trim(v_part.name))) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'The name entered does not match the name registered for this email address.');
    END IF;

    -- Rebind auth_user_id to current device identity if available
    IF v_caller_uid IS NOT NULL AND (v_part.auth_user_id IS NULL OR v_part.auth_user_id <> v_caller_uid) THEN
        UPDATE public.participants
        SET auth_user_id = v_caller_uid, updated_at = v_now
        WHERE id = v_part.id;
    END IF;

    -- Lookup latest active session
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

    -- Calculate 24-hour unlock status
    IF v_sess.room_2_started_at IS NOT NULL AND v_sess.rooms_3_4_unlock_at IS NOT NULL AND v_now >= v_sess.rooms_3_4_unlock_at THEN
        v_unlocked := true;
        v_remaining := 0;
    ELSIF v_sess.room_2_started_at IS NOT NULL AND v_sess.rooms_3_4_unlock_at IS NOT NULL THEN
        v_unlocked := false;
        v_remaining := GREATEST(0, EXTRACT(EPOCH FROM (v_sess.rooms_3_4_unlock_at - v_now))::INT);
    ELSIF v_sess.room_2_started_at IS NOT NULL THEN
        v_unlocked := (v_now >= (v_sess.room_2_started_at + INTERVAL '24 hours'));
        v_remaining := GREATEST(0, EXTRACT(EPOCH FROM ((v_sess.room_2_started_at + INTERVAL '24 hours') - v_now))::INT);
    ELSE
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
            'email', v_part.email,
            'age', v_part.age,
            'gender', v_part.gender,
            'adhdDiagnosis', v_part.adhd_diagnosis,
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

ALTER FUNCTION public.resume_participant_by_name_and_email(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resume_participant_by_name_and_email(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_participant_by_name_and_email(TEXT, TEXT) TO anon, authenticated;
