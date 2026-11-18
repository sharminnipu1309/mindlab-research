-- =============================================================================
-- MindLab — Cognitive Research Platform
-- PostgreSQL / Supabase Schema Migration
-- Migration ID: 20261119000000_add_questionnaire_responses.sql
-- Description:
--   Creates questionnaire_responses table for the Mentalization / Reflective
--   Functioning Bengali Questionnaire (4 Sections: ক, খ, গ, ঘ; 18 questions).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_code VARCHAR(16) NOT NULL,
    
    -- Subscores & Total Score
    section_a_score INTEGER NOT NULL, -- Section (ক) Items 1 to 7 (Range: 7 to 35)
    section_b_score INTEGER NOT NULL, -- Section (খ) Items 8 to 10 (Range: 3 to 15)
    section_c_score INTEGER NOT NULL, -- Section (গ) Items 11 to 13 (Range: 3 to 15)
    section_d_score INTEGER NOT NULL, -- Section (ঘ) Items 14 to 18 (Range: 5 to 25)
    total_score INTEGER NOT NULL,     -- Total Score (Range: 18 to 90)
    
    -- Individual Question Answers (Likert scale 1 to 5)
    q1 INTEGER CHECK (q1 BETWEEN 1 AND 5),
    q2 INTEGER CHECK (q2 BETWEEN 1 AND 5),
    q3 INTEGER CHECK (q3 BETWEEN 1 AND 5),
    q4 INTEGER CHECK (q4 BETWEEN 1 AND 5),
    q5 INTEGER CHECK (q5 BETWEEN 1 AND 5),
    q6 INTEGER CHECK (q6 BETWEEN 1 AND 5),
    q7 INTEGER CHECK (q7 BETWEEN 1 AND 5),
    q8 INTEGER CHECK (q8 BETWEEN 1 AND 5),
    q9 INTEGER CHECK (q9 BETWEEN 1 AND 5),
    q10 INTEGER CHECK (q10 BETWEEN 1 AND 5),
    q11 INTEGER CHECK (q11 BETWEEN 1 AND 5),
    q12 INTEGER CHECK (q12 BETWEEN 1 AND 5),
    q13 INTEGER CHECK (q13 BETWEEN 1 AND 5),
    q14 INTEGER CHECK (q14 BETWEEN 1 AND 5),
    q15 INTEGER CHECK (q15 BETWEEN 1 AND 5),
    q16 INTEGER CHECK (q16 BETWEEN 1 AND 5),
    q17 INTEGER CHECK (q17 BETWEEN 1 AND 5),
    q18 INTEGER CHECK (q18 BETWEEN 1 AND 5),
    
    -- Raw JSON representation for flexible parsing
    answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_questionnaire_participant_id ON public.questionnaire_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_session_id ON public.questionnaire_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_participant_code ON public.questionnaire_responses(participant_code);

-- Enable Row Level Security (RLS)
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Grants for authenticated and anon roles
GRANT SELECT, INSERT, UPDATE ON TABLE public.questionnaire_responses TO anon, authenticated;

-- RLS Policies
DROP POLICY IF EXISTS "Allow participant and anon insert questionnaire responses" ON public.questionnaire_responses;
CREATE POLICY "Allow participant and anon insert questionnaire responses"
ON public.questionnaire_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow participant and admin read questionnaire responses" ON public.questionnaire_responses;
CREATE POLICY "Allow participant and admin read questionnaire responses"
ON public.questionnaire_responses
FOR SELECT
TO anon, authenticated
USING (true);

