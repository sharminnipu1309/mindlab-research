-- ============================================================================
-- Migration: 20261012000001_set_1min_unlock_timer.sql
-- Description:
--   Updates the RPC record_room_2_start to set rooms_3_4_unlock_at to exactly
--   1 minute (60 seconds) after Room 2 is started, enabling rapid live
--   testing of the study room unlock workflow while the website frontend
--   continues displaying the formal 24-hour research protocol copy.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_room_2_start(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN := false;
    v_sess RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_unlock_at TIMESTAMPTZ;
    v_already_started BOOLEAN := false;
BEGIN
    v_caller_uid := auth.uid();

    IF auth.role() = 'service_role' 
       OR (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' = 'service_role') THEN
        v_is_authorized := true;
    ELSIF v_caller_uid IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admin_users WHERE auth_user_id = v_caller_uid
    ) THEN
        v_is_authorized := true;
    ELSIF v_caller_uid IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sessions s
        JOIN public.participants p ON p.id = s.participant_id
        WHERE s.id = p_session_id AND p.auth_user_id = v_caller_uid
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
        -- Exactly 1 minute (60 seconds) after Room 2 is started
        v_unlock_at := v_now + INTERVAL '1 minute';
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
GRANT EXECUTE ON FUNCTION public.record_room_2_start(UUID) TO anon, authenticated, service_role;
