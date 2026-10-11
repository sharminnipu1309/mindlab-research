-- supabase/migrations/20261011000001_enhance_email_claiming_rpc.sql
-- MindLab — Cognitive Research Platform
-- Enhances claim_pending_unlock_emails RPC to support targeted session isolation (p_target_session_id)
-- and safe admin caller authorization.

DROP FUNCTION IF EXISTS public.claim_pending_unlock_emails(INT);
DROP FUNCTION IF EXISTS public.claim_pending_unlock_emails(INT, UUID);

CREATE OR REPLACE FUNCTION public.claim_pending_unlock_emails(
    p_batch_size INT DEFAULT 20,
    p_target_session_id UUID DEFAULT NULL
)
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
        RAISE EXCEPTION 'Access Denied: claim_pending_unlock_emails requires service_role or admin privileges.';
    END IF;

    RETURN QUERY
    WITH eligible AS (
        SELECT s.id
        FROM public.sessions s
        JOIN public.participants p ON s.participant_id = p.id
        WHERE s.room_2_started_at IS NOT NULL
          AND s.rooms_3_4_unlock_at <= now()
          AND (p_target_session_id IS NULL OR s.id = p_target_session_id)
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

ALTER FUNCTION public.claim_pending_unlock_emails(INT, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_pending_unlock_emails(INT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_unlock_emails(INT, UUID) TO service_role, anon, authenticated;

-- Also update record_unlock_email_result permissions so admin callers can execute it
GRANT EXECUTE ON FUNCTION public.record_unlock_email_result(UUID, BOOLEAN, TEXT) TO service_role, anon, authenticated;
