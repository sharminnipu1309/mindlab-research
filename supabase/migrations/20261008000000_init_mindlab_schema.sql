-- =============================================================================
-- MindLab — Cognitive Research Platform
-- PostgreSQL / Supabase Schema Migration
-- Migration ID: 20261008000000_init_mindlab_schema.sql
-- =============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. ADMIN USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'researcher',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. PARTICIPANTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    participant_code VARCHAR(16) NOT NULL UNIQUE, -- e.g. "ML-1042"
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 16 AND age <= 100),
    gender VARCHAR(64) NOT NULL,
    adhd_diagnosis VARCHAR(32) NOT NULL CHECK (adhd_diagnosis IN ('yes', 'no', 'prefer_not_to_say')),
    email VARCHAR(255),
    consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    session_status VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (session_status IN ('in_progress', 'completed', 'abandoned')),
    hanoi_completed BOOLEAN NOT NULL DEFAULT false,
    hanoi_completed_at TIMESTAMPTZ,
    corsi_completed BOOLEAN NOT NULL DEFAULT false,
    corsi_completed_at TIMESTAMPTZ,
    stroop_completed BOOLEAN NOT NULL DEFAULT false,
    stroop_completed_at TIMESTAMPTZ,
    task_switching_completed BOOLEAN NOT NULL DEFAULT false,
    task_switching_completed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. TOWER OF HANOI PUZZLES TABLE (Room 01)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hanoi_puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    puzzle_index INTEGER NOT NULL CHECK (puzzle_index >= 0 AND puzzle_index <= 5),
    disk_count INTEGER NOT NULL CHECK (disk_count IN (3, 4, 5)),
    move_limit INTEGER NOT NULL,
    valid_moves INTEGER NOT NULL DEFAULT 0,
    invalid_moves INTEGER NOT NULL DEFAULT 0,
    first_reaction_time_ms NUMERIC(10, 2) NOT NULL DEFAULT 0,
    completion_time_ms NUMERIC(10, 2) NOT NULL DEFAULT 0,
    outcome VARCHAR(32) NOT NULL CHECK (outcome IN ('Completed', 'Move Limit Reached', 'Skipped')),
    initial_state JSONB NOT NULL,
    goal_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hanoi_puzzles_session_idx UNIQUE (session_id, puzzle_index)
);

-- =============================================================================
-- 5. TOWER OF HANOI MOVE TELEMETRY TABLE (Room 01 Moves)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hanoi_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hanoi_puzzle_id UUID NOT NULL REFERENCES hanoi_puzzles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    puzzle_index INTEGER NOT NULL,
    move_number INTEGER NOT NULL,
    source_rod INTEGER NOT NULL CHECK (source_rod IN (0, 1, 2)),
    dest_rod INTEGER NOT NULL CHECK (dest_rod IN (0, 1, 2)),
    disk_size INTEGER NOT NULL CHECK (disk_size >= 1 AND disk_size <= 5),
    is_valid BOOLEAN NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hanoi_moves_puzzle_num UNIQUE (hanoi_puzzle_id, move_number)
);

-- =============================================================================
-- 6. BACKWARD CORSI TRIALS TABLE (Room 02)
-- =============================================================================
CREATE TABLE IF NOT EXISTS corsi_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 8),
    sequence_length INTEGER NOT NULL CHECK (sequence_length >= 2 AND sequence_length <= 9),
    trial_number INTEGER NOT NULL CHECK (trial_number >= 1 AND trial_number <= 6),
    presented_sequence JSONB NOT NULL,
    recalled_sequence JSONB NOT NULL,
    is_correct BOOLEAN NOT NULL,
    correct_positions_count INTEGER NOT NULL,
    total_positions INTEGER NOT NULL,
    reaction_time_ms NUMERIC(10, 2),
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_corsi_trials_session_level_num UNIQUE (session_id, level, trial_number)
);

-- =============================================================================
-- 7. STROOP TASK TRIALS TABLE (Room 03)
-- =============================================================================
CREATE TABLE IF NOT EXISTS stroop_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    trial_number INTEGER NOT NULL,
    phase VARCHAR(16) NOT NULL CHECK (phase IN ('practice', 'experiment')),
    word VARCHAR(16) NOT NULL CHECK (word IN ('RED', 'GREEN', 'BLUE', 'YELLOW')),
    ink_color VARCHAR(16) NOT NULL CHECK (ink_color IN ('RED', 'GREEN', 'BLUE', 'YELLOW')),
    condition VARCHAR(16) NOT NULL CHECK (condition IN ('congruent', 'incongruent')),
    correct_response VARCHAR(16) NOT NULL CHECK (correct_response IN ('RED', 'GREEN', 'BLUE', 'YELLOW')),
    participant_response VARCHAR(16) NOT NULL CHECK (participant_response IN ('RED', 'GREEN', 'BLUE', 'YELLOW')),
    is_correct BOOLEAN NOT NULL,
    reaction_time_ms NUMERIC(10, 2) NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stroop_trials_session_phase_num UNIQUE (session_id, phase, trial_number)
);

-- =============================================================================
-- 8. TASK SWITCHING TRIALS TABLE (Room 04)
-- =============================================================================
CREATE TABLE IF NOT EXISTS task_switching_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    trial_number INTEGER NOT NULL,
    phase VARCHAR(16) NOT NULL CHECK (phase IN ('practice', 'experimental')),
    block_type VARCHAR(16) NOT NULL CHECK (block_type IN ('pure-letter', 'pure-number', 'mixed')),
    task_type VARCHAR(16) NOT NULL CHECK (task_type IN ('letter', 'number')),
    letter VARCHAR(2) NOT NULL,
    number INTEGER NOT NULL,
    correct_response VARCHAR(2) NOT NULL CHECK (correct_response IN ('B', 'N')),
    participant_response VARCHAR(2) NOT NULL CHECK (participant_response IN ('B', 'N')),
    is_correct BOOLEAN NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('correct', 'incorrect')),
    is_task_switch BOOLEAN NOT NULL DEFAULT false,
    is_task_repeat BOOLEAN NOT NULL DEFAULT false,
    reaction_time_ms NUMERIC(10, 2) NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ts_trials_session_phase_num UNIQUE (session_id, phase, trial_number)
);

-- =============================================================================
-- 9. EXPERIMENT CONFIGURATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS experiment_configs (
    key VARCHAR(64) PRIMARY KEY,
    config JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 10. INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(participant_code);
CREATE INDEX IF NOT EXISTS idx_participants_auth ON participants(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_hanoi_puzzles_session ON hanoi_puzzles(session_id);
CREATE INDEX IF NOT EXISTS idx_hanoi_moves_puzzle ON hanoi_moves(hanoi_puzzle_id);
CREATE INDEX IF NOT EXISTS idx_hanoi_moves_session ON hanoi_moves(session_id);
CREATE INDEX IF NOT EXISTS idx_corsi_trials_session ON corsi_trials(session_id);
CREATE INDEX IF NOT EXISTS idx_corsi_trials_level ON corsi_trials(level);
CREATE INDEX IF NOT EXISTS idx_stroop_trials_session ON stroop_trials(session_id);
CREATE INDEX IF NOT EXISTS idx_stroop_trials_phase_cond ON stroop_trials(phase, condition);
CREATE INDEX IF NOT EXISTS idx_ts_trials_session ON task_switching_trials(session_id);
CREATE INDEX IF NOT EXISTS idx_ts_trials_phase_block ON task_switching_trials(phase, block_type);

-- =============================================================================
-- 11. SECURITY FUNCTIONS & RLS POLICIES (EXPLICIT SEARCH_PATH)
-- =============================================================================

-- Helper Function: Check Admin Status (Secured Search Path)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Helper Function: Check Session Ownership for Participant (Secured Search Path)
CREATE OR REPLACE FUNCTION is_session_owner(check_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.sessions s
        JOIN public.participants p ON s.participant_id = p.id
        WHERE s.id = check_session_id AND p.auth_user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Enable Row Level Security on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanoi_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanoi_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE corsi_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stroop_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_switching_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_configs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Admin Policies (Full Access)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_all_admin_users ON admin_users;
CREATE POLICY admin_all_admin_users ON admin_users FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_participants ON participants;
CREATE POLICY admin_all_participants ON participants FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_sessions ON sessions;
CREATE POLICY admin_all_sessions ON sessions FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_hanoi_puzzles ON hanoi_puzzles;
CREATE POLICY admin_all_hanoi_puzzles ON hanoi_puzzles FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_hanoi_moves ON hanoi_moves;
CREATE POLICY admin_all_hanoi_moves ON hanoi_moves FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_corsi_trials ON corsi_trials;
CREATE POLICY admin_all_corsi_trials ON corsi_trials FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_stroop_trials ON stroop_trials;
CREATE POLICY admin_all_stroop_trials ON stroop_trials FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_ts_trials ON task_switching_trials;
CREATE POLICY admin_all_ts_trials ON task_switching_trials FOR ALL USING (is_admin());

DROP POLICY IF EXISTS admin_all_configs ON experiment_configs;
CREATE POLICY admin_all_configs ON experiment_configs FOR ALL USING (is_admin());

-- -----------------------------------------------------------------------------
-- Participant Self-Access Policies (Strict WITH CHECK constraints)
-- -----------------------------------------------------------------------------
-- Participants Table
DROP POLICY IF EXISTS participant_insert_self ON participants;
CREATE POLICY participant_insert_self ON participants 
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS participant_select_self ON participants;
CREATE POLICY participant_select_self ON participants 
    FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS participant_update_self ON participants;
CREATE POLICY participant_update_self ON participants 
    FOR UPDATE USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Sessions Table
DROP POLICY IF EXISTS participant_insert_session ON sessions;
CREATE POLICY participant_insert_session ON sessions 
    FOR INSERT WITH CHECK (
        participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS participant_select_session ON sessions;
CREATE POLICY participant_select_session ON sessions 
    FOR SELECT USING (
        participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS participant_update_session ON sessions;
CREATE POLICY participant_update_session ON sessions 
    FOR UPDATE USING (
        participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (
        participant_id IN (SELECT id FROM public.participants WHERE auth_user_id = auth.uid())
    );

-- Hanoi Puzzles Table
DROP POLICY IF EXISTS participant_insert_hanoi_puzzles ON hanoi_puzzles;
CREATE POLICY participant_insert_hanoi_puzzles ON hanoi_puzzles 
    FOR INSERT WITH CHECK (is_session_owner(session_id));

DROP POLICY IF EXISTS participant_select_hanoi_puzzles ON hanoi_puzzles;
CREATE POLICY participant_select_hanoi_puzzles ON hanoi_puzzles 
    FOR SELECT USING (is_session_owner(session_id));

-- Hanoi Moves Table
DROP POLICY IF EXISTS participant_insert_hanoi_moves ON hanoi_moves;
CREATE POLICY participant_insert_hanoi_moves ON hanoi_moves 
    FOR INSERT WITH CHECK (is_session_owner(session_id));

DROP POLICY IF EXISTS participant_select_hanoi_moves ON hanoi_moves;
CREATE POLICY participant_select_hanoi_moves ON hanoi_moves 
    FOR SELECT USING (is_session_owner(session_id));

-- Corsi Trials Table
DROP POLICY IF EXISTS participant_insert_corsi_trials ON corsi_trials;
CREATE POLICY participant_insert_corsi_trials ON corsi_trials 
    FOR INSERT WITH CHECK (is_session_owner(session_id));

DROP POLICY IF EXISTS participant_select_corsi_trials ON corsi_trials;
CREATE POLICY participant_select_corsi_trials ON corsi_trials 
    FOR SELECT USING (is_session_owner(session_id));

-- Stroop Trials Table
DROP POLICY IF EXISTS participant_insert_stroop_trials ON stroop_trials;
CREATE POLICY participant_insert_stroop_trials ON stroop_trials 
    FOR INSERT WITH CHECK (is_session_owner(session_id));

DROP POLICY IF EXISTS participant_select_stroop_trials ON stroop_trials;
CREATE POLICY participant_select_stroop_trials ON stroop_trials 
    FOR SELECT USING (is_session_owner(session_id));

-- Task Switching Trials Table
DROP POLICY IF EXISTS participant_insert_ts_trials ON task_switching_trials;
CREATE POLICY participant_insert_ts_trials ON task_switching_trials 
    FOR INSERT WITH CHECK (is_session_owner(session_id));

DROP POLICY IF EXISTS participant_select_ts_trials ON task_switching_trials;
CREATE POLICY participant_select_ts_trials ON task_switching_trials 
    FOR SELECT USING (is_session_owner(session_id));

-- Public read for study configs (safe task parameters only)
DROP POLICY IF EXISTS public_read_configs ON experiment_configs;
CREATE POLICY public_read_configs ON experiment_configs 
    FOR SELECT USING (key IN ('hanoi_puzzles', 'corsi_config', 'general'));

-- =============================================================================
-- 12. DYNAMIC RESEARCH ANALYTICAL VIEWS (SECURITY INVOKER ENABLED)
-- =============================================================================

-- View 1: Backward Corsi Dynamic Summary
CREATE OR REPLACE VIEW corsi_session_summaries_view
WITH (security_invoker = true) AS
WITH level_stats AS (
    SELECT 
        session_id,
        level,
        sequence_length,
        COUNT(*) AS total_level_trials,
        COUNT(*) FILTER (WHERE is_correct) AS correct_level_trials
    FROM public.corsi_trials
    GROUP BY session_id, level, sequence_length
),
completed_levels AS (
    SELECT 
        session_id,
        level,
        sequence_length,
        correct_level_trials,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY level DESC) as rn
    FROM level_stats
    WHERE correct_level_trials >= 4
)
SELECT 
    s.id AS session_id,
    s.participant_id,
    COALESCE(cl.level, 0) AS max_completed_level,
    COALESCE(cl.sequence_length, 0) AS max_completed_span,
    COALESCE(cl.correct_level_trials, 0) AS correct_trials_at_max_span,
    (COALESCE(cl.sequence_length, 0) * COALESCE(cl.correct_level_trials, 0)) AS product_score,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE ct.is_correct)::NUMERIC / NULLIF(COUNT(ct.id), 0) * 100, 0), 2) AS trial_accuracy,
    ROUND(COALESCE(SUM(ct.correct_positions_count)::NUMERIC / NULLIF(SUM(ct.total_positions), 0) * 100, 0), 2) AS block_position_accuracy,
    COUNT(ct.id) AS total_trials,
    COUNT(*) FILTER (WHERE ct.is_correct) AS total_correct_trials
FROM public.sessions s
LEFT JOIN completed_levels cl ON cl.session_id = s.id AND cl.rn = 1
LEFT JOIN public.corsi_trials ct ON ct.session_id = s.id
GROUP BY s.id, s.participant_id, cl.level, cl.sequence_length, cl.correct_level_trials;

-- View 2: Stroop Dynamic Summary (Excludes Practice Phase)
CREATE OR REPLACE VIEW stroop_session_summaries_view
WITH (security_invoker = true) AS
SELECT 
    s.id AS session_id,
    s.participant_id,
    COUNT(st.id) AS total_experimental_trials,
    COUNT(*) FILTER (WHERE st.is_correct) AS total_correct_trials,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE st.is_correct)::NUMERIC / NULLIF(COUNT(st.id), 0) * 100, 0), 2) AS overall_accuracy,
    COUNT(*) FILTER (WHERE st.condition = 'congruent') AS congruent_trials,
    COUNT(*) FILTER (WHERE st.condition = 'congruent' AND st.is_correct) AS congruent_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE st.condition = 'congruent' AND st.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE st.condition = 'congruent'), 0) * 100, 0), 2) AS congruent_accuracy,
    COUNT(*) FILTER (WHERE st.condition = 'incongruent') AS incongruent_trials,
    COUNT(*) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct) AS incongruent_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE st.condition = 'incongruent'), 0) * 100, 0), 2) AS incongruent_accuracy,
    ROUND(COALESCE(AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'congruent' AND st.is_correct), 0), 2) AS congruent_mean_rt_ms,
    ROUND(COALESCE(AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct), 0), 2) AS incongruent_mean_rt_ms,
    ROUND(COALESCE(
        AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'incongruent' AND st.is_correct) - 
        AVG(st.reaction_time_ms) FILTER (WHERE st.condition = 'congruent' AND st.is_correct)
    , 0), 2) AS stroop_effect_ms
FROM public.sessions s
LEFT JOIN public.stroop_trials st ON st.session_id = s.id AND st.phase = 'experiment'
GROUP BY s.id, s.participant_id;

-- View 3: Task Switching Dynamic Summary (Excludes Practice Phase)
CREATE OR REPLACE VIEW task_switching_session_summaries_view
WITH (security_invoker = true) AS
SELECT 
    s.id AS session_id,
    s.participant_id,
    COUNT(tst.id) AS total_experimental_trials,
    COUNT(*) FILTER (WHERE tst.is_correct) AS total_correct_trials,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE tst.is_correct)::NUMERIC / NULLIF(COUNT(tst.id), 0) * 100, 0), 2) AS overall_accuracy,
    -- Pure Letter
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter') AS pure_letter_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter' AND tst.is_correct) AS pure_letter_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter' AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'pure-letter'), 0) * 100, 0), 2) AS pure_letter_accuracy,
    ROUND(COALESCE(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'pure-letter' AND tst.is_correct), 0), 2) AS pure_letter_mean_rt_ms,
    -- Pure Number
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-number') AS pure_number_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'pure-number' AND tst.is_correct) AS pure_number_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE tst.block_type = 'pure-number' AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'pure-number'), 0) * 100, 0), 2) AS pure_number_accuracy,
    ROUND(COALESCE(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'pure-number' AND tst.is_correct), 0), 2) AS pure_number_mean_rt_ms,
    -- Mixed Block Overall
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed') AS mixed_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_correct) AS mixed_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'mixed'), 0) * 100, 2), 0) AS mixed_accuracy,
    -- Mixed Repeat (Denominator = total mixed-repeat trials)
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat) AS mixed_repeat_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct) AS mixed_repeat_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat), 0) * 100, 0), 2) AS mixed_repeat_accuracy,
    ROUND(COALESCE(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct), 0), 2) AS mixed_repeat_mean_rt_ms,
    -- Mixed Switch (Denominator = total mixed-switch trials)
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch) AS mixed_switch_trials,
    COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct) AS mixed_switch_correct,
    ROUND(COALESCE(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch), 0) * 100, 0), 2) AS mixed_switch_accuracy,
    ROUND(COALESCE(AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct), 0), 2) AS mixed_switch_mean_rt_ms,
    -- Switch Cost = (Mean Correct Switch RT) - (Mean Correct Repeat RT)
    ROUND(COALESCE(
        AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_switch AND tst.is_correct) - 
        AVG(tst.reaction_time_ms) FILTER (WHERE tst.block_type = 'mixed' AND tst.is_task_repeat AND tst.is_correct)
    , 0), 2) AS switch_cost_ms
FROM public.sessions s
LEFT JOIN public.task_switching_trials tst ON tst.session_id = s.id AND tst.phase = 'experimental'
GROUP BY s.id, s.participant_id;

-- =============================================================================
-- 13. SCHEMA & TABLE PERMISSIONS (GRANTS FOR AUTHENTICATED ROLE)
-- =============================================================================

-- 1. Schema USAGE
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Table-level DML Privileges for Application Tables
-- (Row Level Security provides the granular per-user / per-admin access control)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.admin_users,
    public.participants,
    public.sessions,
    public.hanoi_puzzles,
    public.hanoi_moves,
    public.corsi_trials,
    public.stroop_trials,
    public.task_switching_trials,
    public.experiment_configs
TO authenticated;

-- 3. Sequence Usage (for auto-incrementing counters or sequences if utilized)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 14. DYNAMIC VIEW ACCESS PERMISSIONS (SECURITY INVOKER ENABLED)
-- =============================================================================
REVOKE ALL ON public.corsi_session_summaries_view FROM anon, public;
REVOKE ALL ON public.stroop_session_summaries_view FROM anon, public;
REVOKE ALL ON public.task_switching_session_summaries_view FROM anon, public;

GRANT SELECT ON public.corsi_session_summaries_view TO authenticated;
GRANT SELECT ON public.stroop_session_summaries_view TO authenticated;
GRANT SELECT ON public.task_switching_session_summaries_view TO authenticated;

-- =============================================================================
-- 15. DEFAULT PRIVILEGES (FUTURE TABLES & SEQUENCES)
-- =============================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
