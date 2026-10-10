-- =============================================================================
-- MindLab — Cognitive Research Platform
-- PostgreSQL / Supabase Migration
-- Migration ID: 20261010000000_research_integrity_fixes.sql
-- Description:
--   1. Loosens NOT NULL on optional measurement fields to permit deliberate NULL storage:
--      - hanoi_puzzles.first_reaction_time_ms
--      - hanoi_moves.timestamp_ms
--      - corsi_trials.correct_positions_count
--      - corsi_trials.total_positions
--   2. Recreates stroop_session_summaries_view to preserve NULL for empty sessions
--      and zero-correct RTs / Stroop effect (0 experimental trials -> NULL; nonempty 0-correct -> 0.00%).
--   3. Recreates task_switching_session_summaries_view to:
--      - Fix mixed repeat accuracy denominator: (correct mixed repeats / all mixed repeats).
--      - Fix mixed switch accuracy denominator: (correct mixed switches / all mixed switches).
--      - Empty trial category -> NULL accuracy (no artificial 0%).
--      - Genuine measured 0% (trials exist, 0 correct) -> 0.00%.
--      - Empty session (0 experimental trials) -> NULL overall accuracy.
--      - Fix schema bug where mixed_accuracy previously coalesced to 2%.
--   4. Recreates corsi_session_summaries_view using sequential recursive CTE to strictly enforce
--      protocol progression (higher levels require all preceding levels passed with >=4/6),
--      distinguish incomplete sessions (returning NULL) from protocol stopping threshold (returning 0),
--      and preserve NULL for unrecorded block position accuracy.
--   5. Creates hardened get_participant_config() SECURITY DEFINER RPC with safe search_path,
--      explicit ownership by postgres, explicit execution grants to anon/authenticated,
--      revocation from PUBLIC, and defensive JSON sanitization.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LOOSEN NOT NULL CONSTRAINTS FOR INTENTIONALLY UNRECORDED MEASUREMENTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.hanoi_puzzles ALTER COLUMN first_reaction_time_ms DROP NOT NULL;
ALTER TABLE public.hanoi_moves ALTER COLUMN timestamp_ms DROP NOT NULL;
ALTER TABLE public.corsi_trials ALTER COLUMN correct_positions_count DROP NOT NULL;
ALTER TABLE public.corsi_trials ALTER COLUMN total_positions DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. RECREATE STROOP ANALYTICAL VIEW (NULL-PRESERVING FOR EMPTY/ZERO-CORRECT)
-- -----------------------------------------------------------------------------
-- Safely drop existing view without CASCADE (preserves safety; prevents column-type conflicts)
DROP VIEW IF EXISTS public.stroop_session_summaries_view;

CREATE VIEW public.stroop_session_summaries_view
WITH (security_invoker = true) AS
SELECT 
    s.id AS session_id,
    s.participant_id,
    COUNT(st.id) AS total_experimental_trials,
    COUNT(*) FILTER (WHERE st.is_correct) AS total_correct_trials,
    ROUND(COUNT(*) FILTER (WHERE st.is_correct)::NUMERIC / NULLIF(COUNT(st.id), 0) * 100, 2) AS overall_accuracy,
    COUNT(*) FILTER (WHERE st.condition = 'congruent') AS congruent_trials,
    COUNT(*) FILTER (WHERE st.condition = 'congruent' AND st.is_correct) AS congruent_correct,
    ROUND(COUNT(*) FILTER (WHERE st.condition = 'congruent' AND st.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE st.condition = 'congruent'), 0) * 100, 2) AS congruent_accuracy,
    COUNT(*) FILTER (WHERE st.condition = 'incongruent') AS incongruent_trials,
    COUNT(*) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct) AS incongruent_correct,
    ROUND(COUNT(*) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE st.condition = 'incongruent'), 0) * 100, 2) AS incongruent_accuracy,
    ROUND(AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'congruent' AND st.is_correct), 2) AS congruent_mean_rt_ms,
    ROUND(AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct), 2) AS incongruent_mean_rt_ms,
    ROUND(
        AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct) - 
        AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'congruent' AND st.is_correct)
    , 2) AS stroop_effect_ms
FROM public.sessions s
LEFT JOIN public.stroop_trials st ON st.session_id = s.id AND st.phase = 'experiment'
GROUP BY s.id, s.participant_id;

ALTER VIEW public.stroop_session_summaries_view OWNER TO postgres;
REVOKE ALL ON public.stroop_session_summaries_view FROM anon, public;
GRANT SELECT ON public.stroop_session_summaries_view TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. RECREATE TASK SWITCHING ANALYTICAL VIEW (NULL-PRESERVING & ACCURATE DENOMINATORS)
-- -----------------------------------------------------------------------------
-- Safely drop existing view without CASCADE (preserves safety; prevents column-type conflicts)
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
    , 2) AS switch_cost_ms
FROM public.sessions s
LEFT JOIN public.task_switching_trials tst ON tst.session_id = s.id AND tst.phase = 'experimental'
GROUP BY s.id, s.participant_id;

ALTER VIEW public.task_switching_session_summaries_view OWNER TO postgres;
REVOKE ALL ON public.task_switching_session_summaries_view FROM anon, public;
GRANT SELECT ON public.task_switching_session_summaries_view TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. RECREATE CORSI ANALYTICAL VIEW (SEQUENTIAL PROTOCOL COMPLETION & STRICT SCORING)
-- -----------------------------------------------------------------------------
-- Safely drop existing view without CASCADE (preserves safety; prevents column-type conflicts)
DROP VIEW IF EXISTS public.corsi_session_summaries_view;

CREATE VIEW public.corsi_session_summaries_view
WITH (security_invoker = true) AS
WITH RECURSIVE level_stats AS (
    SELECT 
        session_id,
        level,
        sequence_length,
        COUNT(*) AS total_level_trials,
        COUNT(*) FILTER (WHERE is_correct) AS correct_level_trials
    FROM public.corsi_trials
    WHERE level BETWEEN 1 AND 8
    GROUP BY session_id, level, sequence_length
),
seq AS (
    -- Anchor: Level 1 evaluation
    SELECT 
        ls.session_id,
        ls.level,
        ls.sequence_length,
        ls.total_level_trials,
        ls.correct_level_trials,
        CASE 
            WHEN ls.total_level_trials = 6 AND ls.correct_level_trials >= 4 THEN 1 
            ELSE 0 
        END AS max_completed_level,
        CASE 
            WHEN ls.total_level_trials = 6 AND ls.correct_level_trials >= 4 THEN ls.sequence_length 
            ELSE 0 
        END AS max_completed_span,
        CASE 
            WHEN ls.total_level_trials = 6 AND ls.correct_level_trials >= 4 THEN ls.correct_level_trials 
            ELSE 0 
        END AS correct_trials_at_max_span,
        CASE 
            WHEN ls.total_level_trials = 6 AND (ls.correct_level_trials < 4 OR ls.level = 8) THEN true 
            ELSE false 
        END AS is_protocol_complete
    FROM level_stats ls
    WHERE ls.level = 1

    UNION ALL

    -- Recursive: Enforce strictly sequential progression (Level n+1 requires Level n passed with >=4 / 6)
    SELECT 
        ls.session_id,
        ls.level,
        ls.sequence_length,
        ls.total_level_trials,
        ls.correct_level_trials,
        CASE 
            WHEN ls.total_level_trials = 6 AND ls.correct_level_trials >= 4 THEN ls.level 
            ELSE prev.max_completed_level 
        END AS max_completed_level,
        CASE 
            WHEN ls.total_level_trials = 6 AND ls.correct_level_trials >= 4 THEN ls.sequence_length 
            ELSE prev.max_completed_span 
        END AS max_completed_span,
        CASE 
            WHEN ls.total_level_trials = 6 AND ls.correct_level_trials >= 4 THEN ls.correct_level_trials 
            ELSE prev.correct_trials_at_max_span 
        END AS correct_trials_at_max_span,
        CASE 
            WHEN ls.total_level_trials = 6 AND (ls.correct_level_trials < 4 OR ls.level = 8) THEN true 
            ELSE false 
        END AS is_protocol_complete
    FROM seq prev
    JOIN level_stats ls ON ls.session_id = prev.session_id AND ls.level = prev.level + 1
    WHERE prev.total_level_trials = 6 AND prev.correct_level_trials >= 4 AND prev.level < 8
),
seq_final AS (
    SELECT 
        session_id,
        level,
        max_completed_level,
        max_completed_span,
        correct_trials_at_max_span,
        is_protocol_complete,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY level DESC) AS rn
    FROM seq
)
SELECT 
    s.id AS session_id,
    s.participant_id,
    CASE 
        WHEN sf.is_protocol_complete THEN sf.max_completed_level::INTEGER
        ELSE NULL 
    END AS max_completed_level,
    CASE 
        WHEN sf.is_protocol_complete THEN sf.max_completed_span::INTEGER
        ELSE NULL 
    END AS max_completed_span,
    CASE 
        WHEN sf.is_protocol_complete THEN sf.correct_trials_at_max_span::BIGINT
        ELSE NULL 
    END AS correct_trials_at_max_span,
    CASE 
        WHEN sf.is_protocol_complete THEN (sf.max_completed_span * sf.correct_trials_at_max_span)::BIGINT
        ELSE NULL 
    END AS product_score,
    ROUND(COUNT(*) FILTER (WHERE ct.is_correct)::NUMERIC / NULLIF(COUNT(ct.id), 0) * 100, 2) AS trial_accuracy,
    ROUND(SUM(ct.correct_positions_count)::NUMERIC / NULLIF(SUM(ct.total_positions), 0) * 100, 2) AS block_position_accuracy,
    COUNT(ct.id) AS total_trials,
    COUNT(*) FILTER (WHERE ct.is_correct) AS total_correct_trials
FROM public.sessions s
LEFT JOIN seq_final sf ON sf.session_id = s.id AND sf.rn = 1
LEFT JOIN public.corsi_trials ct ON ct.session_id = s.id
GROUP BY 
    s.id, 
    s.participant_id, 
    sf.is_protocol_complete, 
    sf.max_completed_level, 
    sf.max_completed_span, 
    sf.correct_trials_at_max_span;

ALTER VIEW public.corsi_session_summaries_view OWNER TO postgres;
REVOKE ALL ON public.corsi_session_summaries_view FROM anon, public;
GRANT SELECT ON public.corsi_session_summaries_view TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. CREATE HARDENED PARTICIPANT CONFIGURATION RPC
-- -----------------------------------------------------------------------------
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
        )
    );
END;
$$;

ALTER FUNCTION public.get_participant_config() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_participant_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_participant_config() TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURE PARTICIPANT RESUME RPC (Read-only lookup for returning participants)
-- Allows returning participants to resume an existing session across devices/browsers
-- without creating duplicate participant profiles.
-- Privacy safeguards:
-- 1. Requires valid participant_code AND case-insensitive first name verification.
-- 2. Strictly read-only; does not mutate records or alter permissions.
-- 3. Returns session status and trial counts so UI can render 3-state experiment statuses.
-- 4. Defined with SECURITY DEFINER and fixed search_path = public, pg_temp.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.resume_participant_session(
    p_participant_code TEXT,
    p_verification_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_norm_code TEXT;
    v_clean_name TEXT;
    v_part RECORD;
    v_sess RECORD;
    v_hanoi_count INT := 0;
    v_corsi_count INT := 0;
    v_stroop_count INT := 0;
    v_ts_count INT := 0;
    v_first_name TEXT;
BEGIN
    v_norm_code := upper(trim(p_participant_code));
    IF v_norm_code ~ '^[0-9]+$' THEN
        v_norm_code := 'ML-' || v_norm_code;
    END IF;

    IF v_norm_code IS NULL OR length(v_norm_code) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Participant ID format.');
    END IF;

    -- MANDATORY first-name verification required before returning any participant or session information
    IF p_verification_name IS NULL OR length(trim(p_verification_name)) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'First name verification is required to resume a session.');
    END IF;

    -- Lookup participant by code (only non-sensitive identity fields; zero email or demographic exposure)
    SELECT id, participant_code, name
    INTO v_part
    FROM public.participants
    WHERE participant_code = v_norm_code
    LIMIT 1;

    IF v_part IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Participant ID or verification name is incorrect.');
    END IF;

    -- Enforce exact normalized first-name matching (no substring or partial matching)
    v_clean_name := lower(trim(p_verification_name));
    v_first_name := lower(split_part(trim(v_part.name), ' ', 1));
    IF v_first_name <> v_clean_name THEN
        RETURN jsonb_build_object('success', false, 'error', 'Participant ID or verification name is incorrect.');
    END IF;

    -- Lookup active or latest session
    SELECT id, hanoi_completed, corsi_completed, stroop_completed, task_switching_completed, session_status
    INTO v_sess
    FROM public.sessions
    WHERE participant_id = v_part.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sess IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active research session found for this participant.');
    END IF;

    -- Count existing trial records for dashboard badges
    SELECT count(*) INTO v_hanoi_count FROM public.hanoi_puzzles WHERE session_id = v_sess.id;
    SELECT count(*) INTO v_corsi_count FROM public.corsi_trials WHERE session_id = v_sess.id;
    SELECT count(*) INTO v_stroop_count FROM public.stroop_trials WHERE session_id = v_sess.id;
    SELECT count(*) INTO v_ts_count FROM public.task_switching_trials WHERE session_id = v_sess.id;

    -- Return strictly the MINIMUM information needed to resume a session.
    -- SENSITIVE FIELDS EXCLUDED: email, age, gender, and adhd_diagnosis are NEVER exposed.
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
            'status', v_sess.session_status
        )
    );
END;
$$;

ALTER FUNCTION public.resume_participant_session(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resume_participant_session(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resume_participant_session(TEXT, TEXT) TO anon, authenticated;
