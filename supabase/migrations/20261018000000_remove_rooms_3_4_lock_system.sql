-- Migration: 20261018000000_remove_rooms_3_4_lock_system.sql
-- MindLab — Homepage Cleanup and Room Access Changes
-- Safely removes Room 3 and Room 4 lock triggers and access restrictions while preserving all historical data.

-- 1. Drop trial insertion lock enforcement triggers
DROP TRIGGER IF EXISTS trg_enforce_stroop_unlock ON stroop_trials;
DROP TRIGGER IF EXISTS trg_enforce_ts_unlock ON task_switching_trials;
DROP TRIGGER IF EXISTS trg_enforce_rooms_3_4_session_update ON sessions;

-- 2. Update check_rooms_3_4_access RPC function to return immediately unlocked
CREATE OR REPLACE FUNCTION check_rooms_3_4_access(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'room_2_started', true,
    'room_2_started_at', NOW(),
    'rooms_3_4_unlock_at', NULL,
    'unlocked', true,
    'remaining_seconds', 0,
    'server_now', NOW()
  );
END;
$$;

-- 3. Update record_room_2_start RPC function to return immediately unlocked
CREATE OR REPLACE FUNCTION record_room_2_start(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sessions
  SET
    room_2_started_at = COALESCE(room_2_started_at, NOW()),
    rooms_3_4_unlock_at = COALESCE(rooms_3_4_unlock_at, NOW() - INTERVAL '1 second')
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'room_2_started', true,
    'room_2_started_at', NOW(),
    'rooms_3_4_unlock_at', NULL,
    'unlocked', true,
    'remaining_seconds', 0,
    'server_now', NOW()
  );
END;
$$;

-- 4. Set comments documenting research protocol update
COMMENT ON FUNCTION check_rooms_3_4_access(UUID) IS 'Protocol update: Room 3 and Room 4 are immediately accessible without 24-hour waiting restriction.';
COMMENT ON FUNCTION record_room_2_start(UUID) IS 'Protocol update: Room 2 start recorded without locking Rooms 3 & 4.';
