-- =============================================================================
-- Migration: 20261020000000_hanoi_time_limit_and_unlimited_moves.sql
-- Description: Supports unlimited moves and 3-minute timer outcome ('Time Limit Reached')
--              for Tower of Hanoi, and ensures telemetry captures moves and incorrect moves.
-- =============================================================================

-- 1. Relax outcome check constraint on hanoi_puzzles to support 'Time Limit Reached'
ALTER TABLE public.hanoi_puzzles DROP CONSTRAINT IF EXISTS hanoi_puzzles_outcome_check;

ALTER TABLE public.hanoi_puzzles 
    ADD CONSTRAINT hanoi_puzzles_outcome_check 
    CHECK (outcome IN ('Completed', 'Move Limit Reached', 'Time Limit Reached', 'Skipped'));

-- 2. Ensure move_limit has a sensible default (0 = unlimited moves)
ALTER TABLE public.hanoi_puzzles ALTER COLUMN move_limit SET DEFAULT 0;

-- 3. Confirm valid_moves and invalid_moves columns exist and default to 0
ALTER TABLE public.hanoi_puzzles ADD COLUMN IF NOT EXISTS valid_moves INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.hanoi_puzzles ADD COLUMN IF NOT EXISTS invalid_moves INTEGER NOT NULL DEFAULT 0;
