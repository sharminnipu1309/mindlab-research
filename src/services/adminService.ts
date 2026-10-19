import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  demoParticipants,
  hanoiTrialData,
  corsiTrialData,
  stroopTrialData,
  taskSwitchingTrialData,
} from '../data/demo';
import {
  ExperimentSessionOptions,
  DataMeasurementsConfig,
  DEFAULT_SESSION_OPTIONS,
  DEFAULT_DATA_MEASUREMENTS,
  HanoiPuzzleConfig,
  DEFAULT_HANOI_PUZZLES,
} from '../types';

export interface AdminAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Authenticates admin researcher using Supabase Auth.
 * Falls back to demo credentials check if Supabase is unconfigured.
 */
export async function signInAdmin(password: string, email: string = 'admin@memtiva.io'): Promise<AdminAuthResult> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'User authentication failed.' };
      }

      // Verify admin role in admin_users
      const { data: adminRecord, error: roleError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (roleError || !adminRecord) {
        await supabase.auth.signOut();
        return { success: false, error: 'Unauthorized researcher account. User is not registered in admin_users.' };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication network error';
      return { success: false, error: message };
    }
  }

  // Graceful local demo authentication fallback (supports memtiva2024 and mindlab2024)
  if (password === 'memtiva2024' || password === 'mindlab2024') {
    return { success: true };
  }
  return { success: false, error: 'Incorrect credentials. (Hint: try "memtiva2024")' };
}

/**
 * Checks if current user is an authenticated researcher.
 */
export async function checkAdminSession(): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return Boolean(session?.user);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Signs out admin researcher.
 */
export async function signOutAdmin(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }
}

/**
 * Fetches all participants and their session progress.
 */
export async function fetchParticipantsList() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const [
        { data, error },
        { data: hanoiPuzzles },
        { data: corsiTrials },
        { data: stroopTrials },
        { data: tsTrials }
      ] = await Promise.all([
        supabase
          .from('participants')
          .select(`
            id,
            participant_code,
            name,
            age,
            gender,
            adhd_diagnosis,
            email,
            created_at,
            sessions (
              id,
              session_status,
              hanoi_completed,
              corsi_completed,
              stroop_completed,
              task_switching_completed
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('hanoi_puzzles').select('id, session_id, puzzle_index, outcome'),
        supabase.from('corsi_trials').select('id, session_id, level, is_correct'),
        supabase.from('stroop_trials').select('id, session_id, phase'),
        supabase.from('task_switching_trials').select('id, session_id, phase')
      ]);

      if (!error && data) {
        if (data.length === 0) return [];
        return data.map((p: any) => {
          const sessionsArr = Array.isArray(p.sessions) ? p.sessions : (p.sessions ? [p.sessions] : []);
          const s = sessionsArr[0] || {};
          // 1. Hanoi Real Activity Metrics
          const sessionHanoi = (hanoiPuzzles || []).filter((h: any) => h.session_id === s.id);
          const hanoiAttempts = sessionHanoi.length;
          const hanoiCompletedCount = sessionHanoi.filter((h: any) => h.outcome === 'Completed').length;
          const hanoiDone = Boolean(hanoiCompletedCount === 6 || (s.hanoi_completed && hanoiCompletedCount > 0));

          // 2. Corsi Real Activity Metrics based strictly on 6-trial stopping rule
          const sessionCorsiTrials = (corsiTrials || []).filter((ct: any) => ct.session_id === s.id);
          const corsiTrialsCount = sessionCorsiTrials.length;

          let maxCompletedLevel = 0;
          let correctAtMaxLevel = 0;
          let corsiIsCompleted = false;

          for (let lvl = 1; lvl <= 8; lvl++) {
            const lvlTrials = sessionCorsiTrials.filter((t: any) => t.level === lvl);
            if (lvlTrials.length === 0) break;
            const correctCount = lvlTrials.filter((t: any) => t.is_correct).length;
            if (lvlTrials.length >= 6) {
              if (correctCount >= 4) {
                maxCompletedLevel = lvl;
                correctAtMaxLevel = correctCount;
                if (lvl === 8) {
                  corsiIsCompleted = true;
                }
              } else {
                // Completed full 6 trials of level with < 4 correct -> stopping threshold reached
                corsiIsCompleted = true;
                break;
              }
            } else {
              // Interrupted / abandoned mid-level before completing 6 trials
              break;
            }
          }

          const corsiDone = corsiIsCompleted;
          const corsiMaxSpan = corsiIsCompleted ? (maxCompletedLevel > 0 ? maxCompletedLevel + 1 : 0) : null;
          const corsiProductScore = corsiIsCompleted && corsiMaxSpan !== null ? corsiMaxSpan * correctAtMaxLevel : null;
          const corsiTrialAccuracy = corsiTrialsCount > 0
            ? Math.round((sessionCorsiTrials.filter((t: any) => t.is_correct).length / corsiTrialsCount) * 100)
            : null;

          // 3. Stroop Real Activity Metrics
          const sessionStroop = (stroopTrials || []).filter((t: any) => t.session_id === s.id);
          const stroopExpCount = sessionStroop.filter((t: any) => t.phase === 'experiment').length;
          const stroopPracticeCount = sessionStroop.filter((t: any) => t.phase === 'practice').length;
          const stroopDone = Boolean(stroopExpCount >= 128 || (stroopExpCount >= 80 && s.stroop_completed));

          // 4. Task Switching Real Activity Metrics
          const sessionTS = (tsTrials || []).filter((t: any) => t.session_id === s.id);
          const taskSwitchingExpCount = sessionTS.filter((t: any) => t.phase === 'experimental').length;
          const taskSwitchingPracticeCount = sessionTS.filter((t: any) => t.phase === 'practice').length;
          const taskSwitchingDone = Boolean(taskSwitchingExpCount >= 128 || (taskSwitchingExpCount >= 64 && s.task_switching_completed));

          // 5. Overall 4-Experiment Battery Status
          const hasAnyData = hanoiAttempts > 0 || corsiTrialsCount > 0 || stroopExpCount > 0 || stroopPracticeCount > 0 || taskSwitchingExpCount > 0 || taskSwitchingPracticeCount > 0;
          const isAllBatteryCompleted = hanoiDone && corsiDone && stroopDone && taskSwitchingDone;
          const isPracticeOnly = !isAllBatteryCompleted && (stroopPracticeCount > 0 || taskSwitchingPracticeCount > 0) && stroopExpCount === 0 && taskSwitchingExpCount === 0 && hanoiAttempts === 0 && corsiTrialsCount === 0;

          let status: 'Completed' | 'In Progress' | 'Practice Only' | 'Incomplete' | 'Not Started';
          if (!hasAnyData) {
            status = 'Not Started';
          } else if (isAllBatteryCompleted) {
            status = 'Completed';
          } else if (isPracticeOnly) {
            status = 'Practice Only';
          } else if (s.session_status === 'completed' || s.session_status === 'abandoned' || (!hanoiDone && hanoiAttempts > 0) || (!corsiDone && corsiTrialsCount > 0)) {
            status = 'Incomplete';
          } else {
            status = 'In Progress';
          }

          return {
            id: p.participant_code,
            dbId: p.id,
            sessionId: s.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            email: p.email || undefined,
            registered: new Date(p.created_at).toISOString().split('T')[0],
            createdAt: p.created_at,
            status,
            hanoiDone,
            hanoiAttempts,
            hanoiCompletedCount,
            corsiDone,
            corsiTrialsCount,
            corsiMaxSpan,
            corsiProductScore,
            corsiTrialAccuracy,
            corsiIsCompleted,
            stroopDone,
            stroopExpCount,
            stroopPracticeCount,
            taskSwitchingDone,
            taskSwitchingExpCount,
            taskSwitchingPracticeCount,
          };
        });
      }
      if (error) {
        console.error('[Supabase] Error fetching participants list:', error);
      }
      return [];
    } catch (err) {
      console.error('[Supabase] Exception fetching participants:', err);
      return [];
    }
  }

  return demoParticipants;
}

/**
 * Fetches Tower of Hanoi analysis data from Supabase or fallback.
 */
export async function fetchHanoiAnalysisData() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('hanoi_puzzles')
        .select(`
          id,
          puzzle_index,
          disk_count,
          move_limit,
          valid_moves,
          invalid_moves,
          first_reaction_time_ms,
          completion_time_ms,
          outcome,
          initial_state,
          goal_state,
          created_at,
          sessions (
            participant_id,
            participants ( participant_code, name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] Error fetching Hanoi data:', error);
        return { trials: [], isLive: true };
      }

      if (data) {
        if (data.length === 0) {
          return { trials: [], isLive: true };
        }
        const mapped = data.map((row: any) => {
          const sessionObj = Array.isArray(row.sessions) ? row.sessions[0] : row.sessions;
          const participantObj = sessionObj?.participants;
          const pCode = (Array.isArray(participantObj) ? participantObj[0]?.participant_code : participantObj?.participant_code) || 'Anonymous';
          return {
            id: row.id,
            participantId: pCode,
            puzzle: row.puzzle_index + 1,
            puzzleIndex: row.puzzle_index,
            diskCount: row.disk_count,
            moveLimit: row.move_limit,
            firstReaction: row.first_reaction_time_ms !== null && row.first_reaction_time_ms !== undefined ? Number(row.first_reaction_time_ms) : null,
            completionTime: row.completion_time_ms !== null && row.completion_time_ms !== undefined ? Number(row.completion_time_ms) : 0,
            validMoves: row.valid_moves,
            invalidMoves: row.invalid_moves,
            outcome: row.outcome,
            attemptNumber: row.attempt_number || 1,
          };
        });
        return { trials: mapped, isLive: true };
      }
      return { trials: [], isLive: true };
    } catch (err) {
      console.error('[Supabase] Exception fetching Hanoi data:', err);
      return { trials: [], isLive: true };
    }
  }

  return { trials: hanoiTrialData, isLive: false };
}

/**
 * Fetches granular Tower of Hanoi move telemetry from Supabase.
 */
export async function fetchHanoiMovesData() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('hanoi_moves')
        .select(`
          id,
          hanoi_puzzle_id,
          session_id,
          puzzle_index,
          move_number,
          source_rod,
          dest_rod,
          disk_size,
          is_valid,
          timestamp_ms
        `)
        .order('timestamp_ms', { ascending: true });

      if (error) {
        console.error('[Supabase] Error fetching Hanoi moves:', error);
        return { moves: [], isLive: true };
      }

      if (data) {
        return { moves: data, isLive: true };
      }
      return { moves: [], isLive: true };
    } catch (err) {
      console.error('[Supabase] Exception fetching Hanoi moves:', err);
      return { moves: [], isLive: true };
    }
  }

  return { moves: [], isLive: false };
}

/**
 * Fetches Backward Corsi analysis data from Supabase or fallback.
 */
export async function fetchCorsiAnalysisData() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: trials, error } = await supabase
        .from('corsi_trials')
        .select(`
          id,
          session_id,
          level,
          sequence_length,
          trial_number,
          presented_sequence,
          recalled_sequence,
          is_correct,
          correct_positions_count,
          total_positions,
          reaction_time_ms,
          timestamp_ms,
          created_at,
          sessions (
            participant_id,
            participants ( participant_code, name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] Error fetching Corsi data:', error);
        return { trials: [], isLive: true };
      }

      if (trials) {
        if (trials.length === 0) {
          return { trials: [], isLive: true };
        }
        const mapped = trials.map((t: any) => {
          const sessionObj = Array.isArray(t.sessions) ? t.sessions[0] : t.sessions;
          const participantObj = sessionObj?.participants;
          const pCode = (Array.isArray(participantObj) ? participantObj[0]?.participant_code : participantObj?.participant_code) || 'Anonymous';
          return {
            id: t.id,
            participantId: pCode,
            level: t.level,
            seqLen: t.sequence_length,
            trial: t.trial_number,
            correct: t.is_correct,
            positions: t.correct_positions_count !== null && t.correct_positions_count !== undefined ? Number(t.correct_positions_count) : null,
            reactionTimeMs: t.reaction_time_ms !== null && t.reaction_time_ms !== undefined ? Number(t.reaction_time_ms) : null,
            timestampMs: t.timestamp_ms,
          };
        });
        return { trials: mapped, isLive: true };
      }
      return { trials: [], isLive: true };
    } catch (err) {
      console.error('[Supabase] Exception fetching Corsi data:', err);
      return { trials: [], isLive: true };
    }
  }

  return { trials: corsiTrialData, isLive: false };
}

/**
 * Fetches Stroop analysis summary & trial data from Supabase or fallback.
 */
export async function fetchStroopAnalysisData() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: trials, error } = await supabase
        .from('stroop_trials')
        .select(`
          id,
          session_id,
          trial_number,
          phase,
          word,
          ink_color,
          condition,
          correct_response,
          participant_response,
          is_correct,
          reaction_time_ms,
          timestamp_ms,
          created_at,
          sessions (
            participant_id,
            participants ( participant_code, name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] Error fetching Stroop data:', error);
        return { trials: [], isLive: true };
      }

      if (trials) {
        if (trials.length === 0) {
          return { trials: [], isLive: true };
        }
        const mapped = trials.map((t: any) => {
          const sessionObj = Array.isArray(t.sessions) ? t.sessions[0] : t.sessions;
          const participantObj = sessionObj?.participants;
          const pCode = (Array.isArray(participantObj) ? participantObj[0]?.participant_code : participantObj?.participant_code) || 'Anonymous';
          return {
            id: t.id,
            participantId: pCode,
            trialNumber: t.trial_number,
            phase: t.phase,
            word: t.word,
            inkColor: t.ink_color,
            condition: t.condition,
            correctResponse: t.correct_response,
            participantResponse: t.participant_response,
            isCorrect: t.is_correct,
            reactionTimeMs: Number(t.reaction_time_ms) || 0,
            timestampMs: t.timestamp_ms,
          };
        });
        return { trials: mapped, isLive: true };
      }
      return { trials: [], isLive: true };
    } catch (err) {
      console.error('[Supabase] Exception fetching Stroop data:', err);
      return { trials: [], isLive: true };
    }
  }

  return { trials: stroopTrialData, isLive: false };
}

/**
 * Fetches Task Switching analysis summary & trial data from Supabase or fallback.
 */
export async function fetchTaskSwitchingAnalysisData() {
  if (isSupabaseConfigured() && supabase) {
    try {
      let queryRes: any = await supabase
        .from('task_switching_trials')
        .select(`
          id,
          session_id,
          trial_number,
          phase,
          block_type,
          task_type,
          letter,
          number,
          correct_response,
          participant_response,
          is_correct,
          status,
          is_task_switch,
          is_task_repeat,
          reaction_time_ms,
          timestamp_ms,
          stimulus_position,
          consistency,
          is_consistent,
          created_at,
          sessions (
            participant_id,
            participants ( participant_code, name )
          )
        `)
        .order('created_at', { ascending: false });

      if (queryRes.error && queryRes.error.message && (queryRes.error.message.includes('stimulus_position') || queryRes.error.message.includes('consistency') || queryRes.error.message.includes('column'))) {
        // Fallback for unmigrated database
        queryRes = await supabase
          .from('task_switching_trials')
          .select(`
            id,
            session_id,
            trial_number,
            phase,
            block_type,
            task_type,
            letter,
            number,
            correct_response,
            participant_response,
            is_correct,
            status,
            is_task_switch,
            is_task_repeat,
            reaction_time_ms,
            timestamp_ms,
            created_at,
            sessions (
              participant_id,
              participants ( participant_code, name )
            )
          `)
          .order('created_at', { ascending: false });
      }

      const { data: trials, error } = queryRes;

      if (error) {
        console.error('[Supabase] Error fetching Task Switching data:', error);
        return { trials: [], isLive: true };
      }

      if (trials) {
        if (trials.length === 0) {
          return { trials: [], isLive: true };
        }
        const mapped = trials.map((t: any) => {
          const sessionObj = Array.isArray(t.sessions) ? t.sessions[0] : t.sessions;
          const participantObj = sessionObj?.participants;
          const pCode = (Array.isArray(participantObj) ? participantObj[0]?.participant_code : participantObj?.participant_code) || 'Anonymous';
          return {
            id: t.id,
            participantId: pCode,
            trialNumber: t.trial_number,
            phase: t.phase,
            blockType: t.block_type,
            taskType: t.task_type,
            letter: t.letter,
            number: t.number,
            correctResponse: t.correct_response,
            participantResponse: t.participant_response,
            isCorrect: t.is_correct,
            status: t.status,
            isTaskSwitch: t.is_task_switch,
            isTaskRepeat: t.is_task_repeat,
            reactionTimeMs: Number(t.reaction_time_ms) || 0,
            timestampMs: t.timestamp_ms,
            stimulusPosition: t.stimulus_position || null,
            consistency: t.consistency || null,
            isConsistent: t.is_consistent ?? null,
          };
        });
        return { trials: mapped, isLive: true };
      }
      return { trials: [], isLive: true };
    } catch (err) {
      console.error('[Supabase] Exception fetching Task Switching data:', err);
      return { trials: [], isLive: true };
    }
  }

  return { trials: taskSwitchingTrialData, isLive: false };
}

export const SESSION_OPTIONS_STORAGE_KEY = 'mindlab_experiment_session_options';
export const DATA_MEASUREMENTS_STORAGE_KEY = 'mindlab_data_measurements_config';
export const HANOI_PUZZLES_STORAGE_KEY = 'mindlab_hanoi_puzzles_config';

/**
 * Validates Tower of Hanoi puzzles configuration array, enforcing safe defaults.
 */
export function validateHanoiPuzzlesConfig(raw: any): HanoiPuzzleConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_HANOI_PUZZLES;
  }
  return DEFAULT_HANOI_PUZZLES.map((defaultP, idx) => {
    const found = raw.find((p: any) => p && p.puzzleIndex === idx);
    if (!found) return defaultP;
    const limit = Number(found.moveLimit);
    const validLimit = !isNaN(limit) && limit >= 1 && limit <= 500 ? Math.round(limit) : defaultP.moveLimit;
    const enabled = typeof found.enabled === 'boolean' ? found.enabled : defaultP.enabled;
    return {
      ...defaultP,
      moveLimit: validLimit,
      enabled,
    };
  });
}

/**
 * Loads Tower of Hanoi puzzles configuration from Supabase (or localStorage fallback).
 */
export async function fetchHanoiPuzzlesConfig(): Promise<HanoiPuzzleConfig[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('experiment_configs')
        .select('config')
        .eq('key', 'hanoi_puzzles')
        .maybeSingle();

      if (!error && data?.config) {
        const validated = validateHanoiPuzzlesConfig(data.config);
        try {
          localStorage.setItem(HANOI_PUZZLES_STORAGE_KEY, JSON.stringify(validated));
        } catch {}
        return validated;
      }
    } catch (err) {
      console.warn('Error fetching hanoi puzzles config from Supabase:', err);
    }
  }

  try {
    const local = localStorage.getItem(HANOI_PUZZLES_STORAGE_KEY);
    if (local) {
      return validateHanoiPuzzlesConfig(JSON.parse(local));
    }
  } catch {}

  return DEFAULT_HANOI_PUZZLES;
}

/**
 * Persists Tower of Hanoi puzzles configuration to Supabase and localStorage.
 */
export async function saveHanoiPuzzlesConfig(puzzles: HanoiPuzzleConfig[]): Promise<boolean> {
  const validated = validateHanoiPuzzlesConfig(puzzles);
  try {
    localStorage.setItem(HANOI_PUZZLES_STORAGE_KEY, JSON.stringify(validated));
  } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('experiment_configs')
        .upsert(
          { key: 'hanoi_puzzles', config: validated, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) {
        console.error('Error saving hanoi puzzles config to Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception saving hanoi puzzles config to Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Loads experiment session options from Supabase (or localStorage fallback).
 */
export async function fetchExperimentSessionOptions(): Promise<ExperimentSessionOptions> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('experiment_configs')
        .select('config')
        .eq('key', 'session_options')
        .maybeSingle();

      if (!error && data?.config) {
        const merged: ExperimentSessionOptions = { ...DEFAULT_SESSION_OPTIONS, ...data.config };
        try {
          localStorage.setItem(SESSION_OPTIONS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } catch (err) {
      console.warn('Error fetching experiment session options from Supabase:', err);
    }
  }

  try {
    const local = localStorage.getItem(SESSION_OPTIONS_STORAGE_KEY);
    if (local) {
      return { ...DEFAULT_SESSION_OPTIONS, ...JSON.parse(local) };
    }
  } catch {}

  return DEFAULT_SESSION_OPTIONS;
}

/**
 * Persists experiment session options to Supabase and localStorage.
 */
export async function saveExperimentSessionOptions(options: ExperimentSessionOptions): Promise<boolean> {
  try {
    localStorage.setItem(SESSION_OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('experiment_configs')
        .upsert(
          { key: 'session_options', config: options, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) {
        console.error('Error saving experiment session options to Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception saving experiment session options to Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Loads data collection measurement configuration from Supabase (or localStorage fallback).
 */
export async function fetchDataMeasurementsConfig(): Promise<DataMeasurementsConfig> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('experiment_configs')
        .select('config')
        .eq('key', 'data_measurements')
        .maybeSingle();

      if (!error && data?.config) {
        const merged: DataMeasurementsConfig = { ...DEFAULT_DATA_MEASUREMENTS, ...data.config };
        try {
          localStorage.setItem(DATA_MEASUREMENTS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } catch (err) {
      console.warn('Error fetching data measurements config from Supabase:', err);
    }
  }

  try {
    const local = localStorage.getItem(DATA_MEASUREMENTS_STORAGE_KEY);
    if (local) {
      return { ...DEFAULT_DATA_MEASUREMENTS, ...JSON.parse(local) };
    }
  } catch {}

  return DEFAULT_DATA_MEASUREMENTS;
}

/**
 * Persists data collection measurement configuration to Supabase and localStorage.
 */
export async function saveDataMeasurementsConfig(config: DataMeasurementsConfig): Promise<boolean> {
  try {
    localStorage.setItem(DATA_MEASUREMENTS_STORAGE_KEY, JSON.stringify(config));
  } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('experiment_configs')
        .upsert(
          { key: 'data_measurements', config, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) {
        console.error('Error saving data measurements config to Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Exception saving data measurements config to Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Fetches live row counts for all export cards from Supabase.
 */
export async function fetchExportRowCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (!isSupabaseConfigured() || !supabase) return counts;

  try {
    const [
      hanoiPuzzlesRes,
      hanoiMovesRes,
      corsiTrialsRes,
      stroopTrialsRes,
      taskSwitchingTrialsRes,
      participantsRes,
      sessionsRes,
    ] = await Promise.all([
      supabase.from('hanoi_puzzles').select('*', { count: 'exact', head: true }),
      supabase.from('hanoi_moves').select('*', { count: 'exact', head: true }),
      supabase.from('corsi_trials').select('*', { count: 'exact', head: true }),
      supabase.from('stroop_trials').select('*', { count: 'exact', head: true }),
      supabase.from('task_switching_trials').select('*', { count: 'exact', head: true }),
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
    ]);

    const numHanoiPuzzles = hanoiPuzzlesRes.count || 0;
    const numHanoiMoves = hanoiMovesRes.count || 0;
    const numCorsiTrials = corsiTrialsRes.count || 0;
    const numStroopTrials = stroopTrialsRes.count || 0;
    const numTsTrials = taskSwitchingTrialsRes.count || 0;
    const numParticipants = participantsRes.count || 0;
    const numSessions = sessionsRes.count || 0;

    counts['hanoi-summary'] = numHanoiPuzzles;
    counts['hanoi-moves'] = numHanoiMoves;
    counts['hanoi-reaction'] = numHanoiMoves;
    counts['corsi-summary'] = numParticipants;
    counts['corsi-trials'] = numCorsiTrials;
    counts['corsi-positions'] = numCorsiTrials > 0 ? numCorsiTrials * 3 : 0;
    counts['stroop-summary'] = numParticipants;
    counts['stroop-trials'] = numStroopTrials;
    counts['task-switching-summary'] = numParticipants;
    counts['task-switching-trials'] = numTsTrials;
    counts['participants'] = numParticipants;
    counts['sessions'] = numSessions;
  } catch (err) {
    console.warn('Error fetching live export counts:', err);
  }
  return counts;
}

/**
 * Fetches live Supabase data formatted for CSV / Excel research export.
 */
export async function fetchExportTableData(tableKey: string): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    // Build participant and session lookup maps for readable identifiers
    const { data: pList } = await supabase.from('participants').select('id, participant_code');
    const pMap = new Map((pList || []).map(p => [p.id, p.participant_code]));

    const { data: sList } = await supabase.from('sessions').select('id, participant_id');
    const sMap = new Map((sList || []).map(s => [s.id, pMap.get(s.participant_id) || s.participant_id]));

    switch (tableKey) {
      case 'hanoi-summary': {
        const { data } = await supabase.from('hanoi_puzzles').select('*').order('created_at', { ascending: true });
        return (data || []).map(p => ({
          participant_id: sMap.get(p.session_id) || p.session_id,
          session_id: p.session_id,
          puzzle_num: p.puzzle_index + 1,
          disk_count: p.disk_count,
          move_limit: p.move_limit,
          valid_moves: p.valid_moves,
          invalid_moves: p.invalid_moves,
          completion_time_ms: p.outcome === 'Completed' ? p.completion_time_ms : null,
          elapsed_time_ms: p.completion_time_ms,
          first_reaction_ms: p.first_reaction_time_ms,
          outcome: p.outcome,
          attempt_num: (p as any).attempt_number || 1,
        }));
      }
      case 'hanoi-moves': {
        const { data } = await supabase.from('hanoi_moves').select('*').order('timestamp_ms', { ascending: true });
        return (data || []).map(m => ({
          participant_id: sMap.get(m.session_id) || m.session_id,
          puzzle_num: m.puzzle_index + 1,
          move_num: m.move_number,
          move_type: m.is_valid ? 'valid' : 'invalid',
          source_rod: m.source_rod,
          dest_rod: m.dest_rod,
          disk_size: m.disk_size,
          timestamp_ms: m.timestamp_ms,
          is_valid: m.is_valid,
        }));
      }
      case 'hanoi-reaction': {
        const { data } = await supabase.from('hanoi_moves').select('*').order('timestamp_ms', { ascending: true });
        const movesByPuzzle = new Map<string, any[]>();
        (data || []).forEach(m => {
          const k = `${m.session_id}_${m.puzzle_index}`;
          if (!movesByPuzzle.has(k)) movesByPuzzle.set(k, []);
          movesByPuzzle.get(k)!.push(m);
        });
        const reactionRows: Record<string, unknown>[] = [];
        movesByPuzzle.forEach(list => {
          const hasTimestamps = list.some(m => m.timestamp_ms !== null && m.timestamp_ms !== undefined);
          const firstTime = hasTimestamps ? (list.find(m => m.timestamp_ms !== null && m.timestamp_ms !== undefined)?.timestamp_ms || 0) : null;
          list.forEach((m, idx) => {
            let rt: number | null = null;
            let cum: number | null = null;
            if (m.timestamp_ms !== null && m.timestamp_ms !== undefined) {
              const prevWithTime = idx > 0 ? list.slice(0, idx).reverse().find(pm => pm.timestamp_ms !== null && pm.timestamp_ms !== undefined)?.timestamp_ms : null;
              rt = prevWithTime !== null && prevWithTime !== undefined ? (m.timestamp_ms - prevWithTime) : 0;
              cum = firstTime !== null ? (m.timestamp_ms - firstTime) : null;
            }
            reactionRows.push({
              participant_id: sMap.get(m.session_id) || m.session_id,
              puzzle_num: m.puzzle_index + 1,
              move_num: m.move_number,
              reaction_time_ms: rt,
              cumulative_time_ms: cum,
              disk_size: m.disk_size,
              is_valid: m.is_valid,
            });
          });
        });
        return reactionRows;
      }
      case 'corsi-summary': {
        const { data } = await supabase.from('corsi_session_summaries_view').select('*');
        return (data || []).map(s => ({
          participant_id: pMap.get(s.participant_id) || s.participant_id,
          session_id: s.session_id,
          max_level: s.max_completed_level,
          sequence_length: s.max_completed_span,
          product_score: s.product_score,
          trial_accuracy: s.trial_accuracy,
          position_accuracy: s.block_position_accuracy,
          total_trials: s.total_trials,
          total_correct_trials: s.total_correct_trials,
        }));
      }
      case 'corsi-trials': {
        const { data } = await supabase.from('corsi_trials').select('*').order('created_at', { ascending: true });
        return (data || []).map(t => ({
          participant_id: sMap.get(t.session_id) || t.session_id,
          level: t.level,
          trial_num: t.trial_number,
          sequence_length: t.sequence_length,
          presented_sequence: Array.isArray(t.presented_sequence) ? t.presented_sequence.join(' ') : JSON.stringify(t.presented_sequence),
          expected_reverse: Array.isArray(t.presented_sequence) ? [...t.presented_sequence].reverse().join(' ') : '',
          participant_response: Array.isArray(t.recalled_sequence) ? t.recalled_sequence.join(' ') : JSON.stringify(t.recalled_sequence),
          is_correct: t.is_correct,
          correct_positions_count: t.correct_positions_count,
          total_positions: t.total_positions,
          reaction_time_ms: t.reaction_time_ms,
          timestamp_ms: t.timestamp_ms,
        }));
      }
      case 'corsi-positions': {
        const { data } = await supabase.from('corsi_trials').select('*').order('created_at', { ascending: true });
        const positionRows: Record<string, unknown>[] = [];
        (data || []).forEach(t => {
          const presented = Array.isArray(t.presented_sequence) ? t.presented_sequence : [];
          const expected = [...presented].reverse();
          const recalled = Array.isArray(t.recalled_sequence) ? t.recalled_sequence : [];
          expected.forEach((expBlock, posIdx) => {
            const respBlock = recalled[posIdx];
            positionRows.push({
              participant_id: sMap.get(t.session_id) || t.session_id,
              level: t.level,
              trial_num: t.trial_number,
              position_num: posIdx + 1,
              block_id: expBlock,
              expected_block: expBlock,
              responded_block: respBlock !== undefined ? respBlock : '',
              is_correct: expBlock === respBlock,
            });
          });
        });
        return positionRows;
      }
      case 'stroop-summary': {
        const { data } = await supabase.from('stroop_session_summaries_view').select('*');
        return (data || []).map(s => ({
          participant_id: pMap.get(s.participant_id) || s.participant_id,
          session_id: s.session_id,
          total_trials: s.total_experimental_trials,
          congruent_accuracy: s.congruent_accuracy,
          incongruent_accuracy: s.incongruent_accuracy,
          overall_accuracy: s.overall_accuracy,
          congruent_mean_rt_ms: s.congruent_mean_rt_ms,
          incongruent_mean_rt_ms: s.incongruent_mean_rt_ms,
          stroop_effect_ms: s.stroop_effect_ms,
        }));
      }
      case 'stroop-trials': {
        const { data } = await supabase.from('stroop_trials').select('*').order('created_at', { ascending: true });
        return (data || []).map(t => ({
          participant_id: sMap.get(t.session_id) || t.session_id,
          trial_num: t.trial_number,
          phase: t.phase,
          word: t.word,
          ink_color: t.ink_color,
          condition: t.condition,
          correct_response: t.correct_response,
          participant_response: t.participant_response,
          is_correct: t.is_correct,
          reaction_time_ms: t.reaction_time_ms,
          timestamp_ms: t.timestamp_ms,
        }));
      }
      case 'task-switching-summary': {
        const { data } = await supabase.from('task_switching_session_summaries_view').select('*');
        return (data || []).map(s => ({
          participant_id: pMap.get(s.participant_id) || s.participant_id,
          session_id: s.session_id,
          total_trials: s.total_experimental_trials,
          overall_accuracy: s.overall_accuracy,
          pure_letter_rt_ms: s.pure_letter_mean_rt_ms,
          pure_number_rt_ms: s.pure_number_mean_rt_ms,
          mixed_repeat_rt_ms: s.mixed_repeat_mean_rt_ms,
          mixed_switch_rt_ms: s.mixed_switch_mean_rt_ms,
          switch_cost_ms: s.switch_cost_ms,
          consistent_trials: s.consistent_trials ?? null,
          consistent_mean_rt_ms: s.consistent_mean_rt_ms ?? null,
          inconsistent_trials: s.inconsistent_trials ?? null,
          inconsistent_mean_rt_ms: s.inconsistent_mean_rt_ms ?? null,
          shift_cost_ms: s.shift_cost_ms ?? null,
        }));
      }
      case 'task-switching-trials': {
        const { data } = await supabase.from('task_switching_trials').select('*').order('created_at', { ascending: true });
        return (data || []).map(t => ({
          participant_id: sMap.get(t.session_id) || t.session_id,
          trial_num: t.trial_number,
          phase: t.phase,
          block_type: t.block_type,
          task_type: t.task_type,
          letter: t.letter,
          number: t.number,
          stimulus_position: t.stimulus_position || null,
          consistency: t.consistency || null,
          is_consistent: t.is_consistent ?? null,
          is_switch: t.is_task_switch,
          is_repeat: t.is_task_repeat,
          correct_response: t.correct_response,
          participant_response: t.participant_response,
          is_correct: t.is_correct,
          reaction_time_ms: t.reaction_time_ms,
          timestamp_ms: t.timestamp_ms,
        }));
      }
      case 'participants': {
        const { data } = await supabase.from('participants').select('*').order('created_at', { ascending: true });
        return (data || []).map(p => ({
          participant_id: p.participant_code,
          name: p.name,
          age: p.age,
          gender: p.gender,
          adhd_diagnosis: p.adhd_diagnosis,
          email: p.email || '',
          registration_date: new Date(p.created_at).toISOString().split('T')[0],
          created_at: p.created_at,
        }));
      }
      case 'sessions': {
        const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: true });
        return (data || []).map(s => ({
          participant_id: pMap.get(s.participant_id) || s.participant_id,
          session_id: s.id,
          session_status: s.session_status,
          session_start: s.started_at,
          session_end: s.completed_at || '',
          hanoi_completed: s.hanoi_completed,
          hanoi_complete: s.hanoi_completed_at || '',
          corsi_completed: s.corsi_completed,
          corsi_complete: s.corsi_completed_at || '',
          stroop_completed: s.stroop_completed,
          stroop_complete: s.stroop_completed_at || '',
          task_switching_completed: s.task_switching_completed,
          task_switching_complete: s.task_switching_completed_at || '',
        }));
      }
      default:
        return [];
    }
  } catch (err) {
    console.error('Error fetching export table data:', err);
    return [];
  }
}
