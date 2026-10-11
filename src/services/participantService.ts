import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ParticipantSession,
  HanoiSessionResult,
  CorsiSessionResult,
  CorsiTrialRecord,
  StroopSessionResult,
  StroopTrialRecord,
  TaskSwitchingSessionResult,
  TaskSwitchingTrialRecord,
  ExperimentSessionOptions,
  DataMeasurementsConfig,
  DEFAULT_SESSION_OPTIONS,
  DEFAULT_DATA_MEASUREMENTS,
  RoomUnlockStatus,
  HanoiPuzzleConfig,
  DEFAULT_HANOI_PUZZLES,
} from '../types';

const LOCAL_STORAGE_SESSION_KEY = 'mindlab_active_session';
const UNCONFIRMED_QUEUE_KEY = 'mindlab_unsaved_telemetry_queue';

interface StoredSessionContext {
  participantId: string;
  sessionId: string;
  participantCode: string;
  participantData: ParticipantSession;
}

interface QueuedItem {
  table: string;
  payload: unknown;
  onConflict?: string;
  timestamp: number;
}

/**
 * Local Queue for network resilience.
 * If Supabase is configured but a network glitch occurs, records are safely queued locally
 * and retried idempotently.
 */
function queueUnsavedPayload(table: string, payload: unknown, onConflict?: string) {
  try {
    const existing: QueuedItem[] = JSON.parse(localStorage.getItem(UNCONFIRMED_QUEUE_KEY) || '[]');
    existing.push({ table, payload, onConflict, timestamp: Date.now() });
    localStorage.setItem(UNCONFIRMED_QUEUE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to cache unsaved payload locally:', err);
  }
}

/**
 * Flush any queued unsaved payloads when network connection is restored.
 */
export async function flushUnsavedTelemetryQueue(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const queue: QueuedItem[] = JSON.parse(localStorage.getItem(UNCONFIRMED_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    const remaining: QueuedItem[] = [];
    let flushHalted = false;
    for (const item of queue) {
      if (flushHalted) {
        remaining.push(item);
        continue;
      }

      const query = item.onConflict
        ? supabase.from(item.table).upsert(item.payload as Record<string, unknown> | Record<string, unknown>[], { onConflict: item.onConflict })
        : supabase.from(item.table).insert(item.payload as Record<string, unknown> | Record<string, unknown>[]);

      const { error } = await query;
      if (error) {
        // If error is duplicate key (23505), it's already safely in the DB; do not halt queue
        if (error.code === '23505') {
          continue;
        }
        console.warn(`Retry failed for table ${item.table}:`, error.message);
        flushHalted = true;
        remaining.push(item);
      }
    }
    localStorage.setItem(UNCONFIRMED_QUEUE_KEY, JSON.stringify(remaining));
  } catch (err) {
    console.error('Error flushing telemetry queue:', err);
  }
}

/**
 * Ensures an anonymous participant auth session exists in Supabase.
 */
export async function ensureAnonymousAuth(forceFresh = false): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    if (!forceFresh) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return session.user.id;
      }
    } else {
      await supabase.auth.signOut();
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('Anonymous auth failed:', error.message);
      return null;
    }
    return data.user?.id || null;
  } catch (err) {
    console.warn('Supabase auth network error:', err);
    return null;
  }
}

/**
 * Registers participant and creates a new study session with client-deterministic UUIDs.
 */
export async function registerParticipantSession(
  participant: ParticipantSession
): Promise<{ participantId: string; sessionId: string } | null> {
  const generatedParticipantId = crypto.randomUUID();
  const generatedSessionId = crypto.randomUUID();

  let dbParticipantId = generatedParticipantId;
  let dbSessionId = generatedSessionId;

  // Synchronize latest researcher configuration before registering
  await initializeParticipantConfigs();

  if (isSupabaseConfigured() && supabase) {
    try {
      let authUserId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const isNotAnonymous = !session.user.is_anonymous || Boolean(session.user.email);
        // Check if existing auth user is already bound to a different participant code
        const { data: existingP } = await supabase
          .from('participants')
          .select('id, participant_code')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (isNotAnonymous || (existingP && existingP.participant_code !== participant.id)) {
          // If active user is an admin or tied to another participant, ensure a clean anonymous session
          authUserId = await ensureAnonymousAuth(true);
        } else {
          authUserId = session.user.id;
        }
      } else {
        authUserId = await ensureAnonymousAuth(false);
      }

      // 1. Insert or upsert participant record
      const participantPayload = {
        id: generatedParticipantId,
        auth_user_id: authUserId,
        participant_code: participant.id,
        name: participant.name,
        age: participant.age,
        gender: participant.gender,
        adhd_diagnosis: participant.adhdDiagnosis || 'prefer_not_to_say',
        email: participant.email || null,
      };

      const { data: pData, error: pError } = await supabase
        .from('participants')
        .upsert(participantPayload, { onConflict: 'participant_code' })
        .select('id')
        .single();

      if (pError) {
        console.error('[Supabase] Failed to upsert participant in Supabase:', pError);
        // Try recovering existing participant by code
        const { data: existingByCode } = await supabase
          .from('participants')
          .select('id')
          .eq('participant_code', participant.id)
          .maybeSingle();

        if (existingByCode) {
          dbParticipantId = existingByCode.id;
          console.log('[Supabase] Recovered existing participant id:', dbParticipantId);
        } else {
          queueUnsavedPayload('participants', participantPayload, 'participant_code');
        }
      } else if (pData) {
        dbParticipantId = pData.id;
      }

      // 2. Insert or upsert active study session idempotently
      const sessionPayload = {
        id: generatedSessionId,
        participant_id: dbParticipantId,
        session_status: 'in_progress',
      };

      const { data: sData, error: sError } = await supabase
        .from('sessions')
        .upsert(sessionPayload, { onConflict: 'id' })
        .select('id')
        .single();

      if (sError) {
        console.error('[Supabase] Failed to create session in Supabase:', sError);
        queueUnsavedPayload('sessions', sessionPayload, 'id');
      } else if (sData) {
        dbSessionId = sData.id;
      }
    } catch (err) {
      console.error('Database registration exception:', err);
    }
  }

  // Cache session context locally
  const ctx: StoredSessionContext = {
    participantId: dbParticipantId,
    sessionId: dbSessionId,
    participantCode: participant.id,
    participantData: participant,
  };
  try {
    sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(ctx));
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(ctx));
  } catch {
    // Ignore storage quota errors
  }

  return { participantId: dbParticipantId, sessionId: dbSessionId };
}

/**
 * Retrieves the stored session context for browser refresh recovery.
 */
export function getStoredSessionContext(): StoredSessionContext | null {
  try {
    const raw = sessionStorage.getItem(LOCAL_STORAGE_SESSION_KEY) || localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persists an individual Tower of Hanoi puzzle and its move telemetry immediately upon completion/attempt (Idempotent).
 */
export async function persistHanoiPuzzle(
  sessionId: string,
  p: import('../types').HanoiPuzzleResult
): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase || !sessionId) return null;

  try {
    const puzzlePayload: Record<string, any> = {
      session_id: sessionId,
      puzzle_index: p.puzzleIndex,
      disk_count: p.diskCount,
      move_limit: p.moveLimit,
      valid_moves: p.validMoves,
      invalid_moves: p.invalidMoves,
      first_reaction_time_ms: p.firstReactionTimeMs,
      completion_time_ms: p.completionTimeMs,
      outcome: p.outcome,
      initial_state: p.initialState || [],
      goal_state: p.goalState || [],
    };

    let { data: puzzleRow, error: pError } = await supabase
      .from('hanoi_puzzles')
      .upsert({ ...puzzlePayload, attempt_number: p.attemptNumber || 1 }, { onConflict: 'session_id,puzzle_index' })
      .select('id')
      .single();

    if (pError && pError.message && (pError.message.includes('attempt_number') || pError.message.includes('column'))) {
      // Safe fallback for unmigrated live database
      const retry = await supabase
        .from('hanoi_puzzles')
        .upsert(puzzlePayload, { onConflict: 'session_id,puzzle_index' })
        .select('id')
        .single();
      puzzleRow = retry.data;
      pError = retry.error;
    }

    if (pError) {
      console.error('Failed to persist hanoi_puzzles:', pError);
      queueUnsavedPayload('hanoi_puzzles', puzzlePayload, 'session_id,puzzle_index');
    }

    const activePuzzleId = puzzleRow?.id || crypto.randomUUID();

    // Insert moves batch idempotently
    if (p.moveLog && p.moveLog.length > 0) {
      const movesPayload = p.moveLog.map(m => ({
        hanoi_puzzle_id: activePuzzleId,
        session_id: sessionId,
        puzzle_index: p.puzzleIndex,
        move_number: m.moveNumber,
        source_rod: m.sourceRod,
        dest_rod: m.destRod,
        disk_size: m.diskSize,
        is_valid: m.isValid,
        timestamp_ms: m.timestampMs,
      }));

      if (pError) {
        // If parent puzzle insert failed, queue moves right after puzzle in queue
        queueUnsavedPayload('hanoi_moves', movesPayload, 'hanoi_puzzle_id,move_number');
      } else {
        // Clear prior moves for this puzzle so retried attempts do not have stale trailing moves
        await supabase.from('hanoi_moves').delete().eq('hanoi_puzzle_id', activePuzzleId);

        const { error: mError } = await supabase
          .from('hanoi_moves')
          .insert(movesPayload);

        if (mError) {
          console.error('Failed to persist hanoi_moves:', mError);
          queueUnsavedPayload('hanoi_moves', movesPayload, 'hanoi_puzzle_id,move_number');
        }
      }
    }

    return activePuzzleId;
  } catch (err) {
    console.error('Error persisting Hanoi puzzle telemetry:', err);
    return null;
  }
}

/**
 * Persists Tower of Hanoi puzzle and move telemetry asynchronously (Idempotent).
 */
export async function persistHanoiResults(
  sessionId: string,
  result: HanoiSessionResult
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.error('[Supabase] Cannot persist Hanoi results: No active session ID available.');
    return;
  }

  try {
    for (const p of result.puzzles) {
      await persistHanoiPuzzle(activeSessionId, p);
    }

    // Mark Hanoi completed in session (honor recordSessionTimestamps)
    const dataConfig = getDataMeasurementsConfig();
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        hanoi_completed: true,
        hanoi_completed_at: dataConfig.recordSessionTimestamps ? new Date().toISOString() : null,
      })
      .eq('id', activeSessionId);

    if (sessionError) {
      console.error('[Supabase] Error updating session hanoi_completed status:', sessionError.message, sessionError);
    } else {
      console.log(`[Supabase] Session ${activeSessionId} marked Hanoi completed.`);
    }
  } catch (err) {
    console.error('Error persisting Hanoi telemetry:', err);
  }
}

/**
 * Persists an individual Backward Corsi trial immediately upon trial completion.
 */
export async function persistCorsiTrial(
  sessionId: string,
  trial: CorsiTrialRecord
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.warn('[Supabase] persistCorsiTrial skipped: No active session ID available.');
    return;
  }

  const trialPayload = {
    session_id: activeSessionId,
    level: trial.level,
    sequence_length: trial.sequenceLength,
    trial_number: trial.trialNumber,
    presented_sequence: trial.presentedSequence,
    recalled_sequence: trial.recalledSequence,
    is_correct: trial.isCorrect,
    correct_positions_count: trial.correctPositionsCount,
    total_positions: trial.totalPositions,
    reaction_time_ms: trial.reactionTimeMs || null,
    timestamp_ms: trial.timestampMs,
  };

  try {
    const { error } = await supabase
      .from('corsi_trials')
      .upsert(trialPayload, { onConflict: 'session_id,level,trial_number' });

    if (error) {
      console.error('[Supabase] Failed to persist Corsi trial:', error.message, error);
      queueUnsavedPayload('corsi_trials', trialPayload, 'session_id,level,trial_number');
    } else {
      console.log(`[Supabase] Corsi trial saved: Level ${trial.level}, Trial ${trial.trialNumber}`);
    }
  } catch (err) {
    console.error('[Supabase] Error persisting Corsi trial:', err);
    queueUnsavedPayload('corsi_trials', trialPayload, 'session_id,level,trial_number');
  }
}

/**
 * Persists Backward Corsi trial telemetry and completion flag asynchronously (Idempotent).
 */
export async function persistCorsiResults(
  sessionId: string,
  result: CorsiSessionResult
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.error('[Supabase] Cannot persist Corsi results: No active session ID available.');
    return;
  }

  try {
    if (result.trials && result.trials.length > 0) {
      const trialsPayload = result.trials.map(t => ({
        session_id: activeSessionId,
        level: t.level,
        sequence_length: t.sequenceLength,
        trial_number: t.trialNumber,
        presented_sequence: t.presentedSequence,
        recalled_sequence: t.recalledSequence,
        is_correct: t.isCorrect,
        correct_positions_count: t.correctPositionsCount,
        total_positions: t.totalPositions,
        reaction_time_ms: t.reactionTimeMs || null,
        timestamp_ms: t.timestampMs,
      }));

      const { error } = await supabase
        .from('corsi_trials')
        .upsert(trialsPayload, { onConflict: 'session_id,level,trial_number' });

      if (error) {
        console.error('[Supabase] Failed to persist batch corsi_trials:', error.message, error);
        queueUnsavedPayload('corsi_trials', trialsPayload, 'session_id,level,trial_number');
      } else {
        console.log(`[Supabase] Successfully persisted ${trialsPayload.length} Corsi trials for session ${activeSessionId}`);
      }
    }

    // Mark Corsi completed in session (honor recordSessionTimestamps)
    const dataConfig = getDataMeasurementsConfig();
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        corsi_completed: true,
        corsi_completed_at: dataConfig.recordSessionTimestamps ? new Date().toISOString() : null,
      })
      .eq('id', activeSessionId);

    if (sessionError) {
      console.error('[Supabase] Error updating session corsi_completed status:', sessionError.message, sessionError);
    } else {
      console.log(`[Supabase] Session ${activeSessionId} marked Corsi completed.`);
    }
  } catch (err) {
    console.error('[Supabase] Error persisting Corsi telemetry:', err);
  }
}

/**
 * Persists an individual Stroop trial immediately upon response (practice or experimental).
 */
export async function persistStroopTrial(
  sessionId: string,
  trial: StroopTrialRecord
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.warn('[Supabase] persistStroopTrial skipped: No active session ID available.');
    return;
  }

  const trialPayload = {
    session_id: activeSessionId,
    trial_number: trial.trialNumber,
    phase: trial.phase,
    word: trial.word,
    ink_color: trial.inkColor,
    condition: trial.condition,
    correct_response: trial.correctResponse,
    participant_response: trial.participantResponse,
    is_correct: trial.isCorrect,
    reaction_time_ms: trial.reactionTimeMs,
    timestamp_ms: trial.timestampMs,
  };

  try {
    const { error } = await supabase
      .from('stroop_trials')
      .upsert(trialPayload, { onConflict: 'session_id,phase,trial_number', ignoreDuplicates: true });

    if (error) {
      console.error('[Supabase] Failed to persist Stroop trial:', error.message, error);
      queueUnsavedPayload('stroop_trials', trialPayload, 'session_id,phase,trial_number');
    } else {
      console.log(`[Supabase] Stroop trial saved: Phase ${trial.phase}, Trial ${trial.trialNumber} (${trial.condition})`);
    }
  } catch (err) {
    console.error('[Supabase] Error persisting Stroop trial:', err);
    queueUnsavedPayload('stroop_trials', trialPayload, 'session_id,phase,trial_number');
  }
}

/**
 * Persists Stroop trial telemetry asynchronously (Idempotent).
 */
export async function persistStroopResults(
  sessionId: string,
  result: StroopSessionResult
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.error('[Supabase] Cannot persist Stroop results: No active session ID available.');
    return;
  }

  try {
    const allTrials = [
      ...(result.practiceTrials || []),
      ...(result.trials || []),
    ];

    if (allTrials.length > 0) {
      const trialsPayload = allTrials.map(t => ({
        session_id: activeSessionId,
        trial_number: t.trialNumber,
        phase: t.phase,
        word: t.word,
        ink_color: t.inkColor,
        condition: t.condition,
        correct_response: t.correctResponse,
        participant_response: t.participantResponse,
        is_correct: t.isCorrect,
        reaction_time_ms: t.reactionTimeMs,
        timestamp_ms: t.timestampMs,
      }));

      const { error } = await supabase
        .from('stroop_trials')
        .upsert(trialsPayload, { onConflict: 'session_id,phase,trial_number', ignoreDuplicates: true });

      if (error) {
        console.error('[Supabase] Failed to persist stroop_trials:', error.message, error);
        queueUnsavedPayload('stroop_trials', trialsPayload, 'session_id,phase,trial_number');
      } else {
        console.log(`[Supabase] Successfully persisted ${trialsPayload.length} Stroop trials.`);
      }
    }

    // Mark Stroop completed in session (honor recordSessionTimestamps)
    const dataConfig = getDataMeasurementsConfig();
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        stroop_completed: true,
        stroop_completed_at: dataConfig.recordSessionTimestamps ? new Date().toISOString() : null,
      })
      .eq('id', activeSessionId);

    if (sessionError) {
      console.error('[Supabase] Error updating session stroop_completed status:', sessionError.message, sessionError);
    } else {
      console.log(`[Supabase] Session ${activeSessionId} marked Stroop completed.`);
    }
  } catch (err) {
    console.error('[Supabase] Error persisting Stroop telemetry:', err);
  }
}

/**
 * Persists an individual Task Switching trial immediately upon response (practice or experimental).
 */
export async function persistTaskSwitchingTrial(
  sessionId: string,
  trial: TaskSwitchingTrialRecord
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.warn('[Supabase] persistTaskSwitchingTrial skipped: No active session ID available.');
    return;
  }

  const baselinePayload = {
    session_id: activeSessionId,
    trial_number: trial.trialNumber,
    phase: trial.phase,
    block_type: trial.blockType,
    task_type: trial.taskType,
    letter: trial.letter,
    number: trial.number,
    correct_response: trial.correctResponse,
    participant_response: trial.participantResponse,
    is_correct: trial.isCorrect,
    status: trial.status,
    is_task_switch: trial.isTaskSwitch,
    is_task_repeat: trial.isTaskRepeat,
    reaction_time_ms: trial.reactionTimeMs,
    timestamp_ms: trial.timestampMs,
  };

  const trialPayload = {
    ...baselinePayload,
    stimulus_position: trial.stimulusPosition || null,
    consistency: trial.consistency || null,
    is_consistent: trial.isConsistent ?? null,
  };

  try {
    let { error } = await supabase
      .from('task_switching_trials')
      .upsert(trialPayload, { onConflict: 'session_id,phase,trial_number', ignoreDuplicates: true });

    if (error && error.message && (error.message.includes('stimulus_position') || error.message.includes('consistency') || error.message.includes('is_consistent') || error.message.includes('column'))) {
      // Safe fallback for unmigrated live database
      const retry = await supabase
        .from('task_switching_trials')
        .upsert(baselinePayload, { onConflict: 'session_id,phase,trial_number', ignoreDuplicates: true });
      error = retry.error;
    }

    if (error) {
      console.error('[Supabase] Failed to persist Task Switching trial:', error.message, error);
      queueUnsavedPayload('task_switching_trials', trialPayload, 'session_id,phase,trial_number');
    } else {
      console.log(`[Supabase] Task Switching trial saved: Phase ${trial.phase}, Block ${trial.blockType}, Trial ${trial.trialNumber} (${trial.taskType}, Pos: ${trial.stimulusPosition || 'N/A'}, Cons: ${trial.consistency || 'N/A'})`);
    }
  } catch (err) {
    console.error('[Supabase] Error persisting Task Switching trial:', err);
    queueUnsavedPayload('task_switching_trials', trialPayload, 'session_id,phase,trial_number');
  }
}

/**
 * Persists Task Switching trial telemetry asynchronously (Idempotent).
 */
export async function persistTaskSwitchingResults(
  sessionId: string,
  result: TaskSwitchingSessionResult
): Promise<void> {
  const activeSessionId = sessionId || getStoredSessionContext()?.sessionId;
  if (!isSupabaseConfigured() || !supabase) return;
  if (!activeSessionId) {
    console.error('[Supabase] Cannot persist Task Switching results: No active session ID available.');
    return;
  }

  try {
    const allTrials = [
      ...(result.practiceTrials || []),
      ...(result.trials || []),
    ];

    if (allTrials.length > 0) {
      const baselineTrialsPayload = allTrials.map(t => ({
        session_id: activeSessionId,
        trial_number: t.trialNumber,
        phase: t.phase,
        block_type: t.blockType,
        task_type: t.taskType,
        letter: t.letter,
        number: t.number,
        correct_response: t.correctResponse,
        participant_response: t.participantResponse,
        is_correct: t.isCorrect,
        status: t.status,
        is_task_switch: t.isTaskSwitch,
        is_task_repeat: t.isTaskRepeat,
        reaction_time_ms: t.reactionTimeMs,
        timestamp_ms: t.timestampMs,
      }));

      const trialsPayload = allTrials.map((t, idx) => ({
        ...baselineTrialsPayload[idx],
        stimulus_position: t.stimulusPosition || null,
        consistency: t.consistency || null,
        is_consistent: t.isConsistent ?? null,
      }));

      let { error } = await supabase
        .from('task_switching_trials')
        .upsert(trialsPayload, { onConflict: 'session_id,phase,trial_number', ignoreDuplicates: true });

      if (error && error.message && (error.message.includes('stimulus_position') || error.message.includes('consistency') || error.message.includes('is_consistent') || error.message.includes('column'))) {
        const retry = await supabase
          .from('task_switching_trials')
          .upsert(baselineTrialsPayload, { onConflict: 'session_id,phase,trial_number', ignoreDuplicates: true });
        error = retry.error;
      }

      if (error) {
        console.error('[Supabase] Failed to persist task_switching_trials:', error.message, error);
        queueUnsavedPayload('task_switching_trials', trialsPayload, 'session_id,phase,trial_number');
      } else {
        console.log(`[Supabase] Successfully persisted ${trialsPayload.length} Task Switching trials.`);
      }
    }

    // Mark Task Switching completed in session (honor recordSessionTimestamps)
    const dataConfig = getDataMeasurementsConfig();
    const sessionUpdatePayload: Record<string, any> = {
      task_switching_completed: true,
      task_switching_completed_at: dataConfig.recordSessionTimestamps ? new Date().toISOString() : null,
      task_switching_shift_cost_ms: result.shiftCostMs,
    };

    let { error: sessionError } = await supabase
      .from('sessions')
      .update(sessionUpdatePayload)
      .eq('id', activeSessionId);

    if (sessionError && sessionError.message && (sessionError.message.includes('shift_cost') || sessionError.message.includes('column'))) {
      const fallbackPayload = {
        task_switching_completed: true,
        task_switching_completed_at: dataConfig.recordSessionTimestamps ? new Date().toISOString() : null,
      };
      const retry = await supabase
        .from('sessions')
        .update(fallbackPayload)
        .eq('id', activeSessionId);
      sessionError = retry.error;
    }

    if (sessionError) {
      console.error('[Supabase] Error updating session task_switching_completed status:', sessionError.message, sessionError);
    } else {
      console.log(`[Supabase] Session ${activeSessionId} marked Task Switching completed (Shift Cost: ${result.shiftCostMs ?? 'N/A'}ms).`);
    }
  } catch (err) {
    console.error('[Supabase] Error persisting Task Switching telemetry:', err);
  }
}

/**
 * Finalizes study completion for a participant who completed all 4 tasks.
 */
export async function finalizeStudySession(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const dataConfig = getDataMeasurementsConfig();
    await supabase
      .from('sessions')
      .update({
        session_status: 'completed',
        completed_at: dataConfig.recordSessionTimestamps ? new Date().toISOString() : null,
      })
      .eq('id', sessionId);

    // Flush any pending telemetry items
    await flushUnsavedTelemetryQueue();
  } catch (err) {
    console.error('Error finalizing study session:', err);
  }
}

/**
 * Records authoritative server-side timestamp when a participant starts Room 2 (Backward Corsi).
 * Sets rooms_3_4_unlock_at to 1 minute (60 seconds) for immediate verification,
 * while study protocol descriptions on the website show 24 hours.
 * Idempotent: Never overwrites an established timestamp.
 */
export async function recordRoom2Start(
  sessionId?: string
): Promise<RoomUnlockStatus | null> {
  const stored = getStoredSessionContext();
  const activeSid = sessionId || stored?.sessionId;

  if (!activeSid) {
    console.warn('[recordRoom2Start] No active session ID available.');
    return null;
  }

  // 1. Try serverless endpoint first (runs with administrative privileges on Vercel)
  try {
    const resp = await fetch('/api/record-room-2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeSid }),
    });
    if (resp.ok) {
      const result = await resp.json();
      if (result.success) {
        const status: RoomUnlockStatus = {
          unlocked: Boolean(result.unlocked),
          room2Started: true,
          room2StartedAt: result.room_2_started_at || null,
          unlockAt: result.rooms_3_4_unlock_at || null,
          serverNow: result.server_now || new Date().toISOString(),
          remainingSeconds: Number(result.remaining_seconds) || 0,
        };

        if (stored && stored.participantData) {
          stored.participantData.room2StartedAt = status.room2StartedAt;
          stored.participantData.rooms3And4UnlockAt = status.unlockAt;
          stored.participantData.rooms3And4Unlocked = status.unlocked;
          try {
            sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(stored));
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(stored));
          } catch {}
        }

        return status;
      }
    }
  } catch (apiErr) {
    console.warn('[recordRoom2Start] /api/record-room-2 fetch error, trying RPC:', apiErr);
  }

  // 2. Direct Supabase RPC fallback
  if (isSupabaseConfigured() && supabase) {
    try {
      await ensureAnonymousAuth(false);
      const { data, error } = await supabase.rpc('record_room_2_start', {
        p_session_id: activeSid,
      });

      if (!error && data && data.success) {
        let effectiveUnlockAt = data.rooms_3_4_unlock_at;
        let remaining = Number(data.remaining_seconds) || 0;

        if (effectiveUnlockAt) {
          remaining = Math.max(0, Math.floor((new Date(effectiveUnlockAt).getTime() - Date.now()) / 1000));
        }

        const status: RoomUnlockStatus = {
          unlocked: remaining <= 0,
          room2Started: true,
          room2StartedAt: data.room_2_started_at || null,
          unlockAt: effectiveUnlockAt || null,
          serverNow: data.server_now || new Date().toISOString(),
          remainingSeconds: remaining,
        };

        if (stored && stored.participantData) {
          stored.participantData.room2StartedAt = status.room2StartedAt;
          stored.participantData.rooms3And4UnlockAt = status.unlockAt;
          stored.participantData.rooms3And4Unlocked = status.unlocked;
          try {
            sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(stored));
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(stored));
          } catch {}
        }

        return status;
      } else if (error) {
        console.warn('[recordRoom2Start] RPC error, attempting fallback update:', error.message);
      }
    } catch (err) {
      console.warn('[recordRoom2Start] Exception calling RPC:', err);
    }

    // Direct fallback if RPC is unavailable
    try {
      const { data: sRow } = await supabase
        .from('sessions')
        .select('room_2_started_at, rooms_3_4_unlock_at')
        .eq('id', activeSid)
        .maybeSingle();

      if (sRow) {
        let room2StartedAt = sRow.room_2_started_at;
        let unlockAt = sRow.rooms_3_4_unlock_at;

        if (!room2StartedAt) {
          const nowStr = new Date().toISOString();
          const unlockDate = new Date(Date.now() + 60 * 1000).toISOString();
          const { error: upErr } = await supabase
            .from('sessions')
            .update({
              room_2_started_at: nowStr,
              rooms_3_4_unlock_at: unlockDate,
              unlock_email_status: 'pending',
            })
            .eq('id', activeSid);

          if (!upErr) {
            room2StartedAt = nowStr;
            unlockAt = unlockDate;
          }
        }

        const unlocked = Boolean(unlockAt && new Date() >= new Date(unlockAt));
        const rem = unlockAt ? Math.max(0, Math.floor((new Date(unlockAt).getTime() - Date.now()) / 1000)) : 60;

        return {
          unlocked,
          room2Started: Boolean(room2StartedAt),
          room2StartedAt: room2StartedAt || null,
          unlockAt: unlockAt || null,
          serverNow: new Date().toISOString(),
          remainingSeconds: rem,
        };
      }
    } catch (fallbackErr) {
      console.error('[recordRoom2Start] Direct update fallback error:', fallbackErr);
    }
  }

  // Local-only fallback (1-minute timer)
  const now = new Date();
  const unlock = new Date(now.getTime() + 60 * 1000);
  return {
    unlocked: false,
    room2Started: true,
    room2StartedAt: now.toISOString(),
    unlockAt: unlock.toISOString(),
    serverNow: now.toISOString(),
    remainingSeconds: 60,
  };
}

/**
 * Checks authoritative server access status for Room 3 (Stroop) and Room 4 (Task Switching).
 */
export async function checkRooms3And4Access(
  sessionId?: string
): Promise<RoomUnlockStatus> {
  const stored = getStoredSessionContext();
  const activeSid = sessionId || stored?.sessionId;

  if (!activeSid) {
    return {
      unlocked: false,
      room2Started: false,
      room2StartedAt: null,
      unlockAt: null,
      serverNow: new Date().toISOString(),
      remainingSeconds: 60,
    };
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      await ensureAnonymousAuth(false);
      const { data, error } = await supabase.rpc('check_rooms_3_4_access', {
        p_session_id: activeSid,
      });

      if (!error && data && data.success) {
        return {
          unlocked: Boolean(data.unlocked),
          room2Started: Boolean(data.room_2_started),
          room2StartedAt: data.room_2_started_at || null,
          unlockAt: data.rooms_3_4_unlock_at || null,
          serverNow: data.server_now || new Date().toISOString(),
          remainingSeconds: Number(data.remaining_seconds) || 0,
        };
      }
    } catch (rpcErr) {
      console.warn('[checkRooms3And4Access] RPC error, using direct query:', rpcErr);
    }

    // Direct fallback query
    try {
      const { data: sRow } = await supabase
        .from('sessions')
        .select('room_2_started_at, rooms_3_4_unlock_at')
        .eq('id', activeSid)
        .maybeSingle();

      if (sRow) {
        const room2Started = Boolean(sRow.room_2_started_at);
        const unlockAt = sRow.rooms_3_4_unlock_at;
        const unlocked = Boolean(room2Started && unlockAt && new Date() >= new Date(unlockAt));
        const rem = (room2Started && unlockAt)
          ? Math.max(0, Math.floor((new Date(unlockAt).getTime() - Date.now()) / 1000))
          : 60;

        return {
          unlocked,
          room2Started,
          room2StartedAt: sRow.room_2_started_at || null,
          unlockAt: sRow.rooms_3_4_unlock_at || null,
          serverNow: new Date().toISOString(),
          remainingSeconds: rem,
        };
      }
    } catch (qErr) {
      console.warn('[checkRooms3And4Access] Direct fallback query error:', qErr);
    }
  }

  // Check stored context
  if (stored?.participantData?.room2StartedAt && stored?.participantData?.rooms3And4UnlockAt) {
    const unlockTime = new Date(stored.participantData.rooms3And4UnlockAt).getTime();
    const unlocked = Date.now() >= unlockTime;
    return {
      unlocked,
      room2Started: true,
      room2StartedAt: stored.participantData.room2StartedAt,
      unlockAt: stored.participantData.rooms3And4UnlockAt,
      serverNow: new Date().toISOString(),
      remainingSeconds: Math.max(0, Math.floor((unlockTime - Date.now()) / 1000)),
    };
  }

  return {
    unlocked: false,
    room2Started: false,
    room2StartedAt: null,
    unlockAt: null,
    serverNow: new Date().toISOString(),
    remainingSeconds: 60,
  };
}

/**
 * Triggers the Nodemailer unlock notification email 1 second after a level unlocks.
 * Calls /api/send-unlock-email with participant information.
 * Deduplicated per session to avoid sending multiple emails.
 */
export async function triggerUnlockNotificationEmail(_options?: {
  sessionId?: string;
  recipientEmail?: string;
  participantName?: string;
  participantCode?: string;
  delayMs?: number;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Automated email dispatching paused per user instructions (in-website notification is active)
  console.log('[Unlock Email] Automated email paused; in-website unlock notification is active.');
  return { success: true };
}


/**
 * Returns current experiment session options (cached or default).
 */
export function getExperimentSessionOptions(): ExperimentSessionOptions {
  try {
    const raw = localStorage.getItem('mindlab_experiment_session_options');
    if (raw) {
      return { ...DEFAULT_SESSION_OPTIONS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SESSION_OPTIONS;
}

/**
 * Returns current data collection measurements configuration.
 */
export function getDataMeasurementsConfig(): DataMeasurementsConfig {
  try {
    const raw = localStorage.getItem('mindlab_data_measurements_config');
    if (raw) {
      return { ...DEFAULT_DATA_MEASUREMENTS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_DATA_MEASUREMENTS;
}

/**
 * Returns current Tower of Hanoi puzzles configuration (cached or default).
 * Validates move limits (1..500) and preserves default puzzle layouts.
 */
export function getHanoiPuzzlesConfig(): HanoiPuzzleConfig[] {
  try {
    const raw = localStorage.getItem('mindlab_hanoi_puzzles_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return DEFAULT_HANOI_PUZZLES.map((defaultP, idx) => {
          const found = parsed.find((p: any) => p && p.puzzleIndex === idx);
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
    }
  } catch {}
  return DEFAULT_HANOI_PUZZLES;
}

/**
 * Asynchronously initializes and synchronizes participant configurations from Supabase.
 * Uses get_participant_config() RPC to securely retrieve sanitized researcher-configured settings.
 * Falls back gracefully to cached localStorage or defaults if offline / network error.
 */
export async function initializeParticipantConfigs(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { data, error } = await supabase.rpc('get_participant_config');
    if (error) {
      console.warn('[ParticipantConfig] get_participant_config RPC unavailable or failed, keeping local/defaults:', error.message);
      // Fallback query to experiment_configs for hanoi_puzzles if RPC unmigrated
      try {
        const { data: hConfig } = await supabase
          .from('experiment_configs')
          .select('config')
          .eq('key', 'hanoi_puzzles')
          .maybeSingle();
        if (hConfig?.config && Array.isArray(hConfig.config)) {
          localStorage.setItem('mindlab_hanoi_puzzles_config', JSON.stringify(hConfig.config));
        }
      } catch {}
      return;
    }

    if (data && typeof data === 'object') {
      const { session_options, data_measurements, hanoi_puzzles } = data as {
        session_options?: Partial<ExperimentSessionOptions>;
        data_measurements?: Partial<DataMeasurementsConfig>;
        hanoi_puzzles?: HanoiPuzzleConfig[];
      };

      if (session_options) {
        const mergedOptions = { ...DEFAULT_SESSION_OPTIONS, ...session_options };
        localStorage.setItem('mindlab_experiment_session_options', JSON.stringify(mergedOptions));
      }
      if (data_measurements) {
        const mergedMeasurements = { ...DEFAULT_DATA_MEASUREMENTS, ...data_measurements };
        localStorage.setItem('mindlab_data_measurements_config', JSON.stringify(mergedMeasurements));
      }
      if (hanoi_puzzles && Array.isArray(hanoi_puzzles)) {
        localStorage.setItem('mindlab_hanoi_puzzles_config', JSON.stringify(hanoi_puzzles));
      } else {
        // Direct query fallback if RPC didn't include hanoi_puzzles key yet
        try {
          const { data: hConfig } = await supabase
            .from('experiment_configs')
            .select('config')
            .eq('key', 'hanoi_puzzles')
            .maybeSingle();
          if (hConfig?.config && Array.isArray(hConfig.config)) {
            localStorage.setItem('mindlab_hanoi_puzzles_config', JSON.stringify(hConfig.config));
          }
        } catch {}
      }
      console.log('[ParticipantConfig] Synchronized participant configuration from Supabase.');
    }
  } catch (err) {
    console.warn('[ParticipantConfig] Exception synchronizing participant configuration:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME PARTICIPANT SESSION & RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────

const RESUME_RATE_LIMIT_KEY = 'mindlab_resume_rate_limit';
const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitState {
  failedAttempts: number;
  lastAttemptTime: number;
}

/**
 * Normalizes input string to canonical Participant ID (e.g. "1042" -> "ML-1042", "ml-1042" -> "ML-1042").
 */
export function normalizeParticipantCode(code: string): string {
  if (!code) return '';
  const trimmed = code.trim().toUpperCase();
  if (/^\d{4}$/.test(trimmed)) {
    return `ML-${trimmed}`;
  }
  return trimmed;
}

/**
 * Checks if resume lookup is currently rate-limited due to repeated failures.
 */
export function checkResumeRateLimit(): { allowed: boolean; remainingCooldownSeconds: number } {
  try {
    const raw = localStorage.getItem(RESUME_RATE_LIMIT_KEY);
    if (!raw) return { allowed: true, remainingCooldownSeconds: 0 };
    const state: RateLimitState = JSON.parse(raw);
    const elapsed = Date.now() - state.lastAttemptTime;

    if (elapsed > COOLDOWN_WINDOW_MS) {
      localStorage.removeItem(RESUME_RATE_LIMIT_KEY);
      return { allowed: true, remainingCooldownSeconds: 0 };
    }

    if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const remainingSeconds = Math.ceil((COOLDOWN_WINDOW_MS - elapsed) / 1000);
      return { allowed: false, remainingCooldownSeconds: remainingSeconds };
    }
  } catch {}
  return { allowed: true, remainingCooldownSeconds: 0 };
}

/**
 * Records an unsuccessful resume lookup attempt for rate-limiting protection.
 */
export function recordFailedResumeAttempt(): void {
  try {
    const raw = localStorage.getItem(RESUME_RATE_LIMIT_KEY);
    const now = Date.now();
    let state: RateLimitState = { failedAttempts: 1, lastAttemptTime: now };
    if (raw) {
      const prev: RateLimitState = JSON.parse(raw);
      if (now - prev.lastAttemptTime <= COOLDOWN_WINDOW_MS) {
        state.failedAttempts = prev.failedAttempts + 1;
      }
    }
    localStorage.setItem(RESUME_RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Clears rate-limit tracker upon successful verification.
 */
export function resetResumeRateLimit(): void {
  try {
    localStorage.removeItem(RESUME_RATE_LIMIT_KEY);
  } catch {}
}

export interface ResumeSessionResult {
  success: boolean;
  participant?: ParticipantSession;
  sessionId?: string;
  error?: string;
  isRateLimited?: boolean;
  cooldownSeconds?: number;
}

/**
 * Securely retrieves an existing participant session without creating duplicate profiles.
 * Protects participant privacy with first-name verification and exponential rate-limiting.
 */
export async function resumeParticipantSession(
  nameOrCode: string,
  emailOrName?: string,
  maybeEmail?: string
): Promise<ResumeSessionResult> {
  const rateLimit = checkResumeRateLimit();
  if (!rateLimit.allowed) {
    return {
      success: false,
      isRateLimited: true,
      cooldownSeconds: rateLimit.remainingCooldownSeconds,
      error: `Too many unsuccessful lookup attempts. For privacy protection, please wait ${rateLimit.remainingCooldownSeconds} seconds before trying again.`,
    };
  }

  // Normalize inputs: allow (name, email) or legacy (code, name, email)
  let name = '';
  let email = '';
  if (maybeEmail) {
    name = (emailOrName || '').trim();
    email = maybeEmail.trim().toLowerCase();
  } else if (emailOrName && emailOrName.includes('@')) {
    name = (nameOrCode || '').trim();
    email = emailOrName.trim().toLowerCase();
  } else if (nameOrCode && nameOrCode.includes('@')) {
    email = nameOrCode.trim().toLowerCase();
    name = (emailOrName || '').trim();
  } else {
    name = (nameOrCode || '').trim();
    email = (emailOrName || '').trim().toLowerCase();
  }

  if (!name) {
    return { success: false, error: 'Please enter your Name.' };
  }
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter your registered Email address.' };
  }

  // 1. Check local session context on this device
  const localCtx = getStoredSessionContext();
  if (localCtx && localCtx.participantData) {
    const localP = localCtx.participantData;
    const localEmail = (localP.email || '').trim().toLowerCase();
    const localName = (localP.name || '').trim().toLowerCase();
    const inputName = name.toLowerCase();

    if (
      localEmail === email &&
      (localName === inputName ||
        localName.split(' ')[0] === inputName.split(' ')[0] ||
        localName.includes(inputName) ||
        inputName.includes(localName.split(' ')[0]))
    ) {
      resetResumeRateLimit();
      return {
        success: true,
        participant: localP,
        sessionId: localCtx.sessionId,
      };
    }
  }

  // 2. Call serverless API endpoint /api/resume-session
  try {
    const apiRes = await fetch('/api/resume-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });

    const result = await apiRes.json().catch(() => ({}));

    if (apiRes.ok && result.success && result.participant && result.sessionId) {
      resetResumeRateLimit();
      const ctx: StoredSessionContext = {
        participantId: result.participant.dbId || result.participant.id,
        sessionId: result.sessionId,
        participantCode: result.participant.id,
        participantData: result.participant,
      };
      try {
        sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(ctx));
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(ctx));
      } catch {}

      return {
        success: true,
        participant: result.participant,
        sessionId: result.sessionId,
      };
    } else if (result.error && apiRes.status !== 404 && apiRes.status !== 500) {
      recordFailedResumeAttempt();
      return { success: false, error: result.error };
    }
  } catch (apiErr) {
    console.warn('[Resume] /api/resume-session error, trying direct Supabase lookup:', apiErr);
  }

  // 3. Fallback: Query Supabase RPC or direct lookup
  if (isSupabaseConfigured() && supabase) {
    try {
      await ensureAnonymousAuth(false);
      const { data, error } = await supabase.rpc('resume_participant_by_name_and_email', {
        p_name: name,
        p_email: email,
      });

      if (!error && data && data.success && data.participant && data.session) {
        resetResumeRateLimit();
        const p = data.participant;
        const sess = data.session;
        const participantData: ParticipantSession = {
          id: p.id,
          dbId: p.dbId,
          name: p.name,
          email: p.email,
          age: p.age || 0,
          gender: p.gender || 'unspecified',
          adhdDiagnosis: p.adhdDiagnosis || 'none',
          hanoiCompleted: p.hanoiCompleted,
          corsiCompleted: p.corsiCompleted,
          stroopCompleted: p.stroopCompleted,
          taskSwitchingCompleted: p.taskSwitchingCompleted,
          hanoiStatus: p.hanoiCompleted ? 'completed' : ((p.hanoiCount || 0) > 0 ? 'in_progress' : 'not_started'),
          corsiStatus: p.corsiCompleted ? 'completed' : ((p.corsiCount || 0) > 0 ? 'in_progress' : 'not_started'),
          stroopStatus: p.stroopCompleted ? 'completed' : ((p.stroopCount || 0) > 0 ? 'in_progress' : 'not_started'),
          taskSwitchingStatus: p.taskSwitchingCompleted ? 'completed' : ((p.tsCount || 0) > 0 ? 'in_progress' : 'not_started'),
          hanoiProgressCount: p.hanoiCount || 0,
          corsiProgressCount: p.corsiCount || 0,
          stroopProgressCount: p.stroopCount || 0,
          taskSwitchingProgressCount: p.tsCount || 0,
          room2StartedAt: sess.room2StartedAt || null,
          rooms3And4UnlockAt: sess.rooms3And4UnlockAt || null,
          rooms3And4Unlocked: sess.rooms3And4Unlocked,
        };

        const ctx: StoredSessionContext = {
          participantId: p.dbId,
          sessionId: sess.id,
          participantCode: p.id,
          participantData,
        };
        try {
          sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(ctx));
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(ctx));
        } catch {}

        return { success: true, participant: participantData, sessionId: sess.id };
      }
    } catch (rpcErr) {
      console.warn('[Resume] Supabase RPC lookup error:', rpcErr);
    }
  }

  recordFailedResumeAttempt();
  return {
    success: false,
    error: 'No active session found matching this Name and Email address. Please verify your details.',
  };
}

/**
 * Refreshes participant session completion status and trial counts directly from Supabase
 * if an active session exists.
 */
export async function refreshParticipantSessionStatus(
  currentParticipant: ParticipantSession
): Promise<ParticipantSession> {
  if (!isSupabaseConfigured() || !supabase) return currentParticipant;
  try {
    const sessionId = getStoredSessionContext()?.sessionId || currentParticipant.sessionId;
    if (!sessionId) return currentParticipant;

    const { data: sRow, error: sError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sError || !sRow) return currentParticipant;

    const [hCount, cCount, sCount, tsCount] = await Promise.all([
      supabase.from('hanoi_puzzles').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('corsi_trials').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('stroop_trials').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('task_switching_trials').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
    ]);

    const isUnlocked = Boolean(
      sRow.room_2_started_at &&
      sRow.rooms_3_4_unlock_at &&
      new Date() >= new Date(sRow.rooms_3_4_unlock_at)
    );

    const updated: ParticipantSession = {
      ...currentParticipant,
      hanoiCompleted: sRow.hanoi_completed ?? currentParticipant.hanoiCompleted,
      corsiCompleted: sRow.corsi_completed ?? currentParticipant.corsiCompleted,
      stroopCompleted: sRow.stroop_completed ?? currentParticipant.stroopCompleted,
      taskSwitchingCompleted: sRow.task_switching_completed ?? currentParticipant.taskSwitchingCompleted,
      hanoiStatus: sRow.hanoi_completed ? 'completed' : ((hCount.count || 0) > 0 ? 'in_progress' : 'not_started'),
      corsiStatus: sRow.corsi_completed ? 'completed' : ((cCount.count || 0) > 0 ? 'in_progress' : 'not_started'),
      stroopStatus: sRow.stroop_completed ? 'completed' : ((sCount.count || 0) > 0 ? 'in_progress' : 'not_started'),
      taskSwitchingStatus: sRow.task_switching_completed ? 'completed' : ((tsCount.count || 0) > 0 ? 'in_progress' : 'not_started'),
      hanoiProgressCount: hCount.count || 0,
      corsiProgressCount: cCount.count || 0,
      stroopProgressCount: sCount.count || 0,
      taskSwitchingProgressCount: tsCount.count || 0,
      room2StartedAt: sRow.room_2_started_at || currentParticipant.room2StartedAt || null,
      rooms3And4UnlockAt: sRow.rooms_3_4_unlock_at || currentParticipant.rooms3And4UnlockAt || null,
      rooms3And4Unlocked: isUnlocked || currentParticipant.rooms3And4Unlocked,
    };

    // Update local cache as well
    const stored = getStoredSessionContext();
    if (stored) {
      stored.participantData = updated;
      try {
        sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(stored));
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(stored));
      } catch {}
    }

    return updated;
  } catch (err) {
    console.warn('[refreshParticipantSessionStatus] Failed to refresh:', err);
    return currentParticipant;
  }
}

