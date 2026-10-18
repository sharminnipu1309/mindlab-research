import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Page,
  ParticipantSession,
  StroopColor,
  StroopCondition,
  StroopTrialRecord,
  StroopSessionResult,
  STROOP_COLORS,
  STROOP_COLOR_HEX,
  STROOP_COLOR_LABELS,
} from '../types';
import ParticipantNav, { ConfirmExitModal } from '../components/ParticipantNav';
import { CheckCircle, X, ArrowRight, Sparkles, Zap, Clock, Monitor, Volume2 } from 'lucide-react';
import {
  persistStroopTrial,
  persistStroopResults,
  getStoredSessionContext,
  getExperimentSessionOptions,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
  sessionId?: string;
  onComplete: (result: StroopSessionResult) => void;
}

type Phase = 'intro' | 'practice' | 'practiceComplete' | 'experiment' | 'taskComplete';
type TrialStage = 'fixation' | 'stimulus' | 'feedback' | 'interTrial';

// Neutral stimulus words (concrete common words without intrinsic color associations)
const NEUTRAL_WORDS = ['EGG', 'BED', 'SHIP', 'FORK', 'DESK', 'LAMP', 'DOOR', 'BOOK', 'PEN', 'CAT'];

// Trial counts: balanced 3 conditions (Congruent, Incongruent, Neutral) across 4 colors (R, G, B, Y)
const PRACTICE_COUNT = 12; // 4 Congruent, 4 Incongruent, 4 Neutral (1 for each ink color)
const EXPERIMENTAL_COUNT = 84; // 28 Congruent, 28 Incongruent, 28 Neutral (7 for each ink color)

// Timings in milliseconds
const FIXATION_DURATION = 400; // ms
const RESPONSE_TIMEOUT_MS = 1500; // 1500ms response window (times out if no response made)
const FEEDBACK_DURATION = 650; // ms (visible text and sound feedback)
const INTER_TRIAL_DURATION = 150; // ms

interface TrialItem {
  word: string;
  inkColor: StroopColor;
  condition: StroopCondition;
}

/**
 * Web Audio API synthesized sounds:
 * - Jingle: pleasant, cheerful ascending chime for correct response
 * - Buzzer: low downward buzz for incorrect response or timeout
 * Works offline, cross-platform, with zero asset loading latency.
 */
function playJingleSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    // Ascending melodic chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.22);
    });
  } catch (e) {
    console.warn('[StroopAudio] Jingle error:', e);
  }
}

function playBuzzerSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    // Distinctive downward sawtooth buzzer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.24, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    console.warn('[StroopAudio] Buzzer error:', e);
  }
}

/**
 * Generates 12 practice trials balanced across 3 conditions:
 * - 4 Congruent (RED in Red, GREEN in Green, BLUE in Blue, YELLOW in Yellow)
 * - 4 Incongruent (GREEN in Red, RED in Green, YELLOW in Blue, BLUE in Yellow)
 * - 4 Neutral (EGG in Red, BED in Green, SHIP in Blue, FORK in Yellow)
 * Shuffled with constraint that no consecutive trials have the same ink color.
 */
function generatePracticeTrials(): TrialItem[] {
  const list: TrialItem[] = [];

  // 1. Congruent practice items (1 for each of 4 colors)
  STROOP_COLORS.forEach(color => {
    list.push({ word: color, inkColor: color, condition: 'congruent' });
  });

  // 2. Incongruent practice items (1 for each of 4 ink colors)
  const incongruentBase: Array<{ word: string; inkColor: StroopColor }> = [
    { word: 'GREEN', inkColor: 'RED' },
    { word: 'RED', inkColor: 'GREEN' },
    { word: 'YELLOW', inkColor: 'BLUE' },
    { word: 'BLUE', inkColor: 'YELLOW' },
  ];
  incongruentBase.forEach(pair => list.push({ ...pair, condition: 'incongruent' }));

  // 3. Neutral practice items (1 for each of 4 ink colors)
  list.push({ word: 'EGG', inkColor: 'RED', condition: 'neutral' });
  list.push({ word: 'BED', inkColor: 'GREEN', condition: 'neutral' });
  list.push({ word: 'SHIP', inkColor: 'BLUE', condition: 'neutral' });
  list.push({ word: 'FORK', inkColor: 'YELLOW', condition: 'neutral' });

  // Shuffle ensuring no consecutive same ink color
  for (let attempt = 0; attempt < 200; attempt++) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let valid = true;
    for (let i = 1; i < shuffled.length; i++) {
      if (shuffled[i].inkColor === shuffled[i - 1].inkColor) {
        valid = false;
        break;
      }
    }
    if (valid) return shuffled;
  }

  return list;
}

/**
 * Generates 84 experimental trials:
 * - 28 Congruent trials (7 for each of the 4 colors)
 * - 28 Incongruent trials (7 for each of the 4 ink colors)
 * - 28 Neutral trials (7 for each of the 4 ink colors)
 * Strictly enforces: NO consecutive trials have the same ink color
 */
function generateExperimentalTrials(): TrialItem[] {
  const pool: TrialItem[] = [];

  // 1. 28 Congruent trials (7 per color)
  STROOP_COLORS.forEach(color => {
    for (let i = 0; i < 7; i++) {
      pool.push({ word: color, inkColor: color, condition: 'congruent' });
    }
  });

  // 2. 28 Incongruent trials (7 per ink color)
  const incPairs: Array<{ word: string; inkColor: StroopColor }> = [];
  STROOP_COLORS.forEach(w => {
    STROOP_COLORS.forEach(ink => {
      if (w !== ink) incPairs.push({ word: w, inkColor: ink });
    });
  });
  // 12 distinct incongruent pairs * 2 = 24 trials (6 per ink color)
  incPairs.forEach(pair => {
    for (let i = 0; i < 2; i++) {
      pool.push({ ...pair, condition: 'incongruent' });
    }
  });
  // 4 extra incongruent pairs (1 per ink color) -> 28 total
  pool.push({ word: 'YELLOW', inkColor: 'RED', condition: 'incongruent' });
  pool.push({ word: 'BLUE', inkColor: 'GREEN', condition: 'incongruent' });
  pool.push({ word: 'RED', inkColor: 'BLUE', condition: 'incongruent' });
  pool.push({ word: 'GREEN', inkColor: 'YELLOW', condition: 'incongruent' });

  // 3. 28 Neutral trials (7 per ink color)
  STROOP_COLORS.forEach((ink, inkIdx) => {
    for (let i = 0; i < 7; i++) {
      const neutralWord = NEUTRAL_WORDS[(i + inkIdx * 2) % NEUTRAL_WORDS.length];
      pool.push({ word: neutralWord, inkColor: ink, condition: 'neutral' });
    }
  });

  // 4. Shuffle with max-frequency heuristic ensuring no two consecutive trials have the same ink color
  for (let attempt = 0; attempt < 500; attempt++) {
    const remaining = [...pool];
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    const sequence: TrialItem[] = [];
    let possible = true;

    while (remaining.length > 0) {
      const prevInk = sequence.length > 0 ? sequence[sequence.length - 1].inkColor : null;
      const candidates = remaining.filter(item => item.inkColor !== prevInk);
      if (candidates.length === 0) {
        possible = false;
        break;
      }

      const countsByColor: Record<string, number> = {};
      candidates.forEach(c => {
        countsByColor[c.inkColor] = (countsByColor[c.inkColor] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(countsByColor));
      const bestCandidates = candidates.filter(c => countsByColor[c.inkColor] === maxCount);

      const pick = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
      const idx = remaining.indexOf(pick);
      remaining.splice(idx, 1);
      sequence.push(pick);
    }

    if (possible && sequence.length === EXPERIMENTAL_COUNT) {
      let valid = true;
      for (let i = 1; i < sequence.length; i++) {
        if (sequence[i].inkColor === sequence[i - 1].inkColor) {
          valid = false;
          break;
        }
      }
      if (valid) return sequence;
    }
  }

  return pool;
}

export default function StroopRoom({ navigate, participant, sessionId, onComplete }: Props) {
  const isResuming = (participant?.stroopProgressCount || 0) > 0 || participant?.stroopStatus === 'in_progress';
  const resumedTrialIndex = (() => {
    const count = participant?.stroopProgressCount || 0;
    return Math.min(count, EXPERIMENTAL_COUNT - 1);
  })();

  const [phase, setPhase] = useState<Phase>(() => (isResuming ? 'practiceComplete' : 'intro'));
  const [trialIndex, setTrialIndex] = useState<number>(resumedTrialIndex);
  const [trialStage, setTrialStage] = useState<TrialStage>('fixation');
  const [showExit, setShowExit] = useState<boolean>(false);
  const sessionOptionsRef = useRef(getExperimentSessionOptions());
  const sessionOptions = sessionOptionsRef.current;

  // Visual feedback state (shown for both correct, incorrect, and timeout)
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    isTimeout?: boolean;
  } | null>(null);

  // Stable trial lists
  const practiceTrialsRef = useRef<TrialItem[]>([]);
  const experimentalTrialsRef = useRef<TrialItem[]>([]);

  // Results records
  const practiceRecordsRef = useRef<StroopTrialRecord[]>([]);
  const experimentalRecordsRef = useRef<StroopTrialRecord[]>([]);

  // Timing refs
  const stimulusStartTimeRef = useRef<number>(0);
  const isAcceptingResponseRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize trial lists once on mount
  useEffect(() => {
    practiceTrialsRef.current = generatePracticeTrials();
    experimentalTrialsRef.current = generateExperimentalTrials();
  }, []);

  const clearActiveTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearActiveTimers();
  }, []);

  // Compute final session metrics
  const computeStroopResult = (): StroopSessionResult => {
    const trials = experimentalRecordsRef.current;
    const totalTrials = trials.length;
    const totalCorrectTrials = trials.filter(t => t.isCorrect).length;
    const overallAccuracy = totalTrials > 0 ? (totalCorrectTrials / totalTrials) * 100 : 0;

    const congruentTrialsList = trials.filter(t => t.condition === 'congruent');
    const incongruentTrialsList = trials.filter(t => t.condition === 'incongruent');
    const neutralTrialsList = trials.filter(t => t.condition === 'neutral');

    const congruentTrials = congruentTrialsList.length;
    const congruentCorrect = congruentTrialsList.filter(t => t.isCorrect).length;
    const congruentAccuracy = congruentTrials > 0 ? (congruentCorrect / congruentTrials) * 100 : 0;

    const incongruentTrials = incongruentTrialsList.length;
    const incongruentCorrect = incongruentTrialsList.filter(t => t.isCorrect).length;
    const incongruentAccuracy = incongruentTrials > 0 ? (incongruentCorrect / incongruentTrials) * 100 : 0;

    const neutralTrials = neutralTrialsList.length;
    const neutralCorrect = neutralTrialsList.filter(t => t.isCorrect).length;
    const neutralAccuracy = neutralTrials > 0 ? (neutralCorrect / neutralTrials) * 100 : 0;

    // Reaction times calculated on valid correct trials
    const correctCongruent = congruentTrialsList.filter(t => t.isCorrect);
    const correctIncongruent = incongruentTrialsList.filter(t => t.isCorrect);
    const correctNeutral = neutralTrialsList.filter(t => t.isCorrect);

    const congruentMeanRtMs = correctCongruent.length > 0
      ? correctCongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctCongruent.length
      : 0;

    const incongruentMeanRtMs = correctIncongruent.length > 0
      ? correctIncongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctIncongruent.length
      : 0;

    const neutralMeanRtMs = correctNeutral.length > 0
      ? correctNeutral.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctNeutral.length
      : 0;

    const stroopEffectMs = (correctCongruent.length > 0 && correctIncongruent.length > 0)
      ? incongruentMeanRtMs - congruentMeanRtMs
      : 0;

    return {
      totalTrials,
      totalCorrectTrials,
      overallAccuracy,
      congruentTrials,
      congruentCorrect,
      congruentAccuracy,
      incongruentTrials,
      incongruentCorrect,
      incongruentAccuracy,
      neutralTrials,
      neutralCorrect,
      neutralAccuracy,
      congruentMeanRtMs,
      incongruentMeanRtMs,
      neutralMeanRtMs,
      stroopEffectMs,
      trials,
      practiceTrials: practiceRecordsRef.current,
    };
  };

  // Advance to next trial or completion
  const advanceTrial = useCallback(() => {
    const isPracticePhase = phase === 'practice';
    const maxTrials = isPracticePhase ? PRACTICE_COUNT : EXPERIMENTAL_COUNT;

    if (trialIndex + 1 >= maxTrials) {
      if (isPracticePhase) {
        setPhase('practiceComplete');
      } else {
        setPhase('taskComplete');
        const finalRes = computeStroopResult();
        const activeSid = sessionId || getStoredSessionContext()?.sessionId;
        if (activeSid) {
          persistStroopResults(activeSid, finalRes).catch(err => {
            console.error('[StroopRoom] Failed to auto-persist Stroop results on completion:', err);
          });
        }
      }
    } else {
      setTrialIndex(prev => prev + 1);
      setTrialStage('interTrial');
      timerRef.current = setTimeout(() => {
        runTrialStage('fixation');
      }, INTER_TRIAL_DURATION);
    }
  }, [phase, trialIndex, sessionId]);

  // Timeout handler: triggered when participant fails to respond within RESPONSE_TIMEOUT_MS
  const handleTimeout = useCallback(() => {
    if (!isAcceptingResponseRef.current) return;
    isAcceptingResponseRef.current = false;
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    const isPracticePhase = phase === 'practice';
    const trialList = isPracticePhase ? practiceTrialsRef.current : experimentalTrialsRef.current;
    const currentItem = trialList[trialIndex];
    if (!currentItem) return;

    // Play wrong buzzer sound for timeout
    playBuzzerSound();

    const record: StroopTrialRecord = {
      trialNumber: trialIndex + 1,
      phase: isPracticePhase ? 'practice' : 'experiment',
      word: currentItem.word,
      inkColor: currentItem.inkColor,
      condition: currentItem.condition,
      correctResponse: currentItem.inkColor,
      participantResponse: 'TIMEOUT',
      isCorrect: false,
      reactionTimeMs: RESPONSE_TIMEOUT_MS,
      timestampMs: Date.now(),
    };

    if (isPracticePhase) {
      practiceRecordsRef.current.push(record);
    } else {
      experimentalRecordsRef.current.push(record);
    }

    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistStroopTrial(activeSid, record).catch(err => {
        console.error('[StroopRoom] Failed to persist timeout trial:', err);
      });
    }

    // Show visual timeout feedback
    setFeedback({ isCorrect: false, isTimeout: true });
    setTrialStage('feedback');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFeedback(null);
      advanceTrial();
    }, FEEDBACK_DURATION);
  }, [phase, trialIndex, sessionId, advanceTrial]);

  // Start trial stage flow
  const runTrialStage = useCallback((stage: TrialStage) => {
    clearActiveTimers();
    setTrialStage(stage);

    if (stage === 'fixation') {
      isAcceptingResponseRef.current = false;
      timerRef.current = setTimeout(() => {
        setTrialStage('stimulus');
        stimulusStartTimeRef.current = performance.now();
        isAcceptingResponseRef.current = true;

        // Set response timeout window (e.g. 1500ms)
        responseTimeoutRef.current = setTimeout(() => {
          handleTimeout();
        }, RESPONSE_TIMEOUT_MS);
      }, FIXATION_DURATION);
    }
  }, [handleTimeout]);

  // Begin practice
  const handleStartPractice = () => {
    practiceRecordsRef.current = [];
    setTrialIndex(0);
    setPhase('practice');
    runTrialStage('fixation');
  };

  // Begin experimental trials
  const handleStartExperiment = () => {
    experimentalRecordsRef.current = [];
    const count = participant?.stroopProgressCount || 0;
    setTrialIndex(Math.min(count, EXPERIMENTAL_COUNT - 1));
    setPhase('experiment');
    runTrialStage('fixation');
  };

  // Response handler (invoked by keyboard key or click)
  const handleResponse = useCallback((responseColor: StroopColor) => {
    if (!isAcceptingResponseRef.current) return;
    if (trialStage !== 'stimulus') return;

    // Immediately close the response window
    isAcceptingResponseRef.current = false;
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    const reactionTimeMs = performance.now() - stimulusStartTimeRef.current;

    const isPracticePhase = phase === 'practice';
    const trialList = isPracticePhase ? practiceTrialsRef.current : experimentalTrialsRef.current;
    const currentItem = trialList[trialIndex];
    if (!currentItem) return;

    // Correct response is ALWAYS the printed font ink color
    const isCorrect = responseColor === currentItem.inkColor;

    // Audio feedback: Jingle for correct, Buzzer for wrong
    if (isCorrect) {
      playJingleSound();
    } else {
      playBuzzerSound();
    }

    const record: StroopTrialRecord = {
      trialNumber: trialIndex + 1,
      phase: isPracticePhase ? 'practice' : 'experiment',
      word: currentItem.word,
      inkColor: currentItem.inkColor,
      condition: currentItem.condition,
      correctResponse: currentItem.inkColor,
      participantResponse: responseColor,
      isCorrect,
      reactionTimeMs: Math.round(reactionTimeMs * 10) / 10,
      timestampMs: Date.now(),
    };

    if (isPracticePhase) {
      practiceRecordsRef.current.push(record);
    } else {
      experimentalRecordsRef.current.push(record);
    }

    // Immediately persist each trial to Supabase
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistStroopTrial(activeSid, record).catch(err => {
        console.error('[StroopRoom] Failed to persist trial:', err);
      });
    }

    // Visual text feedback displayed on EVERY trial (for both practice and experimental)
    setFeedback({ isCorrect, isTimeout: false });
    setTrialStage('feedback');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFeedback(null);
      advanceTrial();
    }, FEEDBACK_DURATION);
  }, [phase, trialIndex, trialStage, sessionId, advanceTrial]);

  // Global keyboard listener
  useEffect(() => {
    if (phase !== 'practice' && phase !== 'experiment') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toUpperCase();
      if (key === 'R') handleResponse('RED');
      else if (key === 'G') handleResponse('GREEN');
      else if (key === 'B') handleResponse('BLUE');
      else if (key === 'Y') handleResponse('YELLOW');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse]);

  const handleFinish = () => {
    const result = computeStroopResult();
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistStroopResults(activeSid, result).catch(err => {
        console.error('[StroopRoom] Error persisting Stroop results on finish:', err);
      });
    }
    onComplete(result);
    navigate('participant-dashboard');
  };

  const isPractice = phase === 'practice';
  const activeList = isPractice ? practiceTrialsRef.current : experimentalTrialsRef.current;
  const currentTrial = activeList[trialIndex];
  const currentTotal = isPractice ? PRACTICE_COUNT : EXPERIMENTAL_COUNT;

  return (
    <div className="min-h-screen bg-[#EAF4F8] dark:bg-[#131F27] flex flex-col font-['Inter',sans-serif] transition-colors">
      <ParticipantNav
        navigate={navigate}
        participantId={participant?.id}
        showExit={sessionOptions.allowMidSessionExit}
        onExit={() => setShowExit(true)}
      />

      {showExit && (
        <ConfirmExitModal
          onConfirm={() => navigate('participant-dashboard')}
          onCancel={() => setShowExit(false)}
        />
      )}

      {/* Header strip */}
      <div className="bg-white dark:bg-[#1A2B36] border-b border-[#C5DCE4] dark:border-[#314E62] px-4 sm:px-8 py-3 sm:py-4 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <div className="text-[10px] font-black text-[#183B4A] dark:text-[#63B8C6] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
              Room 03 — Stroop Color-Word Task
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#F1F8FB] font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
              Selective Attention & Cognitive Inhibition
            </div>
          </div>

          {(phase === 'practice' || phase === 'experiment') && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  {isPractice ? 'Practice' : 'Trial'}
                </div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white">
                  {trialIndex + 1}/{currentTotal}
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-24 sm:w-32 h-2 rounded-full bg-[#E9E8F2] dark:bg-[#252E63] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${((trialIndex + 1) / currentTotal) * 100}%`,
                    background: isPractice ? '#69AFA8' : '#E11D48',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10">
        {/* 1. INTRO PHASE */}
        {phase === 'intro' && (
          <div className="text-center max-w-xl w-full animate-fade-in-up">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FCE8EB] dark:bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xs border border-rose-200/50 dark:border-rose-800/40">
              <Sparkles size={26} className="text-[#E11D48] sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Stroop Task
            </h2>
            <p className="text-xs sm:text-base text-[#252640] dark:text-slate-100 font-medium leading-relaxed mb-4">
              You will see a color word appear on the screen. Your task is to respond to the{' '}
              <strong className="text-[#252640] dark:text-white">INK COLOR</strong> of the word as quickly and accurately as possible, while{' '}
              <strong className="text-[#E11D48]">ignoring what the word means</strong>.
            </p>

            {/* Desktop / PC Recommendation Banner */}
            <div className="bg-[#EFF6FF] dark:bg-blue-950/40 border-2 border-[#93C5FD] dark:border-blue-700 rounded-xl p-3 sm:p-3.5 mb-5 text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-[#1E3A8A] dark:text-blue-200">
                <Monitor size={17} className="text-[#2563EB] dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  For the best experience, please complete this task on a desktop or PC.
                </p>
              </div>
            </div>

            {/* 3 Stimulus Types Educational Card */}
            <div className="bg-white dark:bg-[#15193B] rounded-2xl border-2 border-[#E9E8F2] dark:border-[#252E63] p-4 sm:p-6 mb-5 text-left shadow-xs">
              <div className="text-xs font-bold text-[#E11D48] uppercase tracking-wider mb-2.5">
                3 STIMULUS TYPES IN THIS TASK
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 text-xs">
                <div className="p-3 rounded-xl bg-[#F8F8FC] dark:bg-[#1A2248] border border-[#E9E8F2] dark:border-[#252E63]">
                  <div className="font-bold text-[#252640] dark:text-white mb-1">1. Neutral</div>
                  <div className="text-[#2563EB] font-black text-sm tracking-wide mb-1 font-['Plus_Jakarta_Sans',sans-serif]">EGG / BED</div>
                  <p className="text-[#64748B] dark:text-slate-300 text-[11px] leading-snug">
                    Random word written in blue 🔵. Correct response = <strong className="text-[#2563EB]">Blue</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F8FC] dark:bg-[#1A2248] border border-[#E9E8F2] dark:border-[#252E63]">
                  <div className="font-bold text-[#252640] dark:text-white mb-1">2. Congruent</div>
                  <div className="text-[#2563EB] font-black text-sm tracking-wide mb-1 font-['Plus_Jakarta_Sans',sans-serif]">BLUE</div>
                  <p className="text-[#64748B] dark:text-slate-300 text-[11px] leading-snug">
                    Word name matches ink color. Correct response = <strong className="text-[#2563EB]">Blue</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F8FC] dark:bg-[#1A2248] border border-[#E9E8F2] dark:border-[#252E63]">
                  <div className="font-bold text-[#252640] dark:text-white mb-1">3. Incongruent</div>
                  <div className="text-[#2563EB] font-black text-sm tracking-wide mb-1 font-['Plus_Jakarta_Sans',sans-serif]">RED</div>
                  <p className="text-[#64748B] dark:text-slate-300 text-[11px] leading-snug">
                    Word says &quot;RED&quot; in blue ink 🔵. Correct response = <strong className="text-[#2563EB]">Blue</strong>.
                  </p>
                </div>
              </div>

              {/* Centered Example Box */}
              <div className="text-xs font-bold text-[#9597AB] uppercase tracking-wider mb-2">
                EXAMPLE
              </div>
              <div className="bg-[#F8F8FC] dark:bg-[#1A2248] rounded-2xl p-4 sm:p-5 mb-4 border border-[#E9E8F2] dark:border-[#252E63] flex flex-col items-center justify-center text-center">
                <div className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-wide text-[#DC2626] mb-2 sm:mb-2.5">
                  GREEN
                </div>
                <p className="text-xs sm:text-sm text-[#73758C] dark:text-slate-300 font-medium mb-1">
                  The word says &quot;GREEN&quot;, but the ink is <strong className="text-[#DC2626] font-bold">RED</strong>.
                </p>
                <p className="text-xs sm:text-sm text-[#474864] dark:text-slate-200 font-medium">
                  Correct response = <strong className="text-[#252640] dark:text-white font-['JetBrains_Mono',monospace]">R</strong> <strong className="text-[#252640] dark:text-white font-semibold">(Red)</strong>
                </p>
              </div>

              {/* Feedback & Timer Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#474864] dark:text-slate-200">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <Volume2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Instant Feedback:</strong> Jingle sound &amp; text for correct; Buzzer &amp; text for wrong.
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <Clock size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>1.5s Response Limit:</strong> Respond quickly before the timer runs out!
                  </span>
                </div>
              </div>

              {/* Response Key Mapping Legend */}
              <div className="text-xs font-bold text-[#9597AB] uppercase tracking-wider mt-4 mb-2">
                RESPONSE KEY MAPPINGS
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#FCE8EB] dark:bg-rose-950/40 text-[#DC2626] dark:text-rose-300 font-semibold border border-[#F9CFD5] dark:border-rose-900/60">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1E2552] rounded shadow-xs text-xs font-mono font-bold mr-1">R</kbd>
                  Red
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#EBF7EE] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-300 font-semibold border border-[#CEEED6] dark:border-emerald-900/60">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1E2552] rounded shadow-xs text-xs font-mono font-bold mr-1">G</kbd>
                  Green
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#EDF4FD] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-300 font-semibold border border-[#CFE1FB] dark:border-blue-900/60">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1E2552] rounded shadow-xs text-xs font-mono font-bold mr-1">B</kbd>
                  Blue
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#FEFCE8] dark:bg-amber-950/40 text-[#A16207] dark:text-amber-300 font-semibold border border-[#FEF08A] dark:border-amber-900/60">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1E2552] rounded shadow-xs text-xs font-mono font-bold mr-1">Y</kbd>
                  Yellow
                </div>
              </div>
            </div>

            <div className="bg-[#EDEAF8] dark:bg-[#1E2552] rounded-xl p-3.5 sm:p-4 mb-6 sm:mb-8 text-left text-xs text-[#6567C9] dark:text-[#A5A6F6] flex items-center gap-3">
              <Zap size={18} className="flex-shrink-0" />
              <span>
                You will complete <strong>{PRACTICE_COUNT} practice trials</strong> first with feedback, followed by <strong>{EXPERIMENTAL_COUNT} experimental trials</strong>.
              </span>
            </div>

            <button
              onClick={handleStartPractice}
              className="btn-primary px-8 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-base shadow-md w-full sm:w-auto justify-center font-bold"
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              Begin Practice ({PRACTICE_COUNT} Trials)
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 2. PRACTICE PHASE & 3. EXPERIMENT PHASE */}
        {(phase === 'practice' || phase === 'experiment') && currentTrial && (
          <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xl animate-fade-in">
            {/* Phase Badge */}
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] bg-white dark:bg-[#15193B] border border-[#E9E8F2] dark:border-[#252E63] shadow-xs text-[#73758C] dark:text-slate-300 text-center">
              {isPractice ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#69AFA8] animate-pulse" />
                  Practice Phase ({trialIndex + 1} of {PRACTICE_COUNT})
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-pulse" />
                  Experimental Phase ({trialIndex + 1} of {EXPERIMENTAL_COUNT})
                </>
              )}
            </div>

            {/* Stimulus Card */}
            <div className="w-full h-48 sm:h-56 bg-white dark:bg-[#223847] rounded-3xl border border-[#C5DCE4] dark:border-[#314E62] shadow-sm flex flex-col items-center justify-center relative overflow-hidden select-none px-4 transition-colors">
              {trialStage === 'fixation' && (
                <div className="text-3xl sm:text-4xl font-light text-[#526E7B] dark:text-[#A2C4D6] font-mono select-none animate-scale-in">
                  +
                </div>
              )}

              {trialStage === 'stimulus' && (
                <div className="flex flex-col items-center justify-center w-full animate-fade-in">
                  <div
                    className="text-4xl sm:text-5xl md:text-6xl font-black tracking-wider font-['Plus_Jakarta_Sans',sans-serif] select-none uppercase transition-none text-center"
                    style={{ color: STROOP_COLOR_HEX[currentTrial.inkColor] }}
                  >
                    {currentTrial.word}
                  </div>
                  {/* Shrinking visual countdown timer bar */}
                  <div className="w-44 sm:w-60 h-1.5 bg-[#C5DCE4] dark:bg-[#314E62] rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full"
                      style={{
                        animation: `shrinkWidth ${RESPONSE_TIMEOUT_MS}ms linear forwards`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Visual Text Feedback: Visible for both sound & silent environments on EVERY trial */}
              {trialStage === 'feedback' && feedback && (
                <div className="flex flex-col items-center justify-center gap-2 animate-pop-in">
                  {feedback.isTimeout ? (
                    <div className="flex items-center gap-2.5 px-5 py-2 sm:py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-500 text-amber-800 dark:text-amber-200 text-base sm:text-lg font-black shadow-md">
                      <Clock size={22} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                      <span>Time Out! Respond Faster</span>
                    </div>
                  ) : feedback.isCorrect ? (
                    <div className="flex items-center gap-2.5 px-6 py-2 sm:py-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-400 text-emerald-800 dark:text-emerald-200 text-base sm:text-lg font-black shadow-md">
                      <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Correct!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 px-6 py-2 sm:py-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-500 dark:border-rose-400 text-rose-800 dark:text-rose-200 text-base sm:text-lg font-black shadow-md">
                      <X size={22} className="text-rose-600 dark:text-rose-400" />
                      <span>Incorrect</span>
                    </div>
                  )}
                </div>
              )}

              {trialStage === 'interTrial' && (
                <div className="w-2 h-2 rounded-full bg-[#C5DCE4] dark:bg-[#314E62]" />
              )}
            </div>

            {/* Response Options Legend (Accessible on both Desktop keyboard & Mobile tap) */}
            <div className="w-full">
              <div className="text-center text-xs sm:text-sm text-[#263B46] dark:text-[#A2C4D6] mb-3 font-semibold">
                Click or press the key corresponding to the <strong className="text-[#183B4A] dark:text-[#F1F8FB] font-extrabold underline decoration-[#4D91AD] decoration-2 underline-offset-2">INK COLOR</strong> (ignoring what the word means)
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {STROOP_COLORS.map(color => {
                  const meta = STROOP_COLOR_LABELS[color];
                  return (
                    <button
                      key={color}
                      onClick={e => {
                        e.currentTarget.blur();
                        handleResponse(color);
                      }}
                      disabled={trialStage !== 'stimulus'}
                      className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-[#223847] border-2 border-[#C5DCE4] dark:border-[#314E62] shadow-xs hover:border-[#4D91AD] dark:hover:border-[#63B8C6] hover:bg-[#EAF4F8] dark:hover:bg-[#1A2B36] active:scale-95 transition-all ${
                        trialStage === 'stimulus' ? 'cursor-pointer hover:shadow-md' : 'opacity-85 cursor-default'
                      }`}
                    >
                      <kbd className="px-2.5 py-1 bg-[#EAF4F8] dark:bg-[#1A2B36] border border-[#B8D7E3] dark:border-[#314E62] rounded-lg text-xs sm:text-sm font-black font-['JetBrains_Mono',monospace] text-[#183B4A] dark:text-[#F1F8FB] mb-1.5 shadow-2xs">
                        {meta.key}
                      </kbd>
                      <div
                        className="w-3.5 h-3.5 rounded-full mb-1 ring-2 ring-black/10 dark:ring-white/20 shadow-xs"
                        style={{ backgroundColor: STROOP_COLOR_HEX[color] }}
                      />
                      <span className="text-xs sm:text-sm font-bold text-[#183B4A] dark:text-[#F1F8FB] font-['Plus_Jakarta_Sans',sans-serif]">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. PRACTICE COMPLETE TRANSITION */}
        {phase === 'practiceComplete' && (
          <div className="text-center max-w-md w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              {isResuming && (participant?.stroopProgressCount || 0) > 0
                ? 'Resume Experiment'
                : 'Practice Completed'}
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] dark:text-slate-300 mb-4">
              {isResuming && (participant?.stroopProgressCount || 0) > 0
                ? `Continuing your test from trial ${(participant?.stroopProgressCount || 0) + 1} of ${EXPERIMENTAL_COUNT}.`
                : 'You are now ready for the official research experiment.'}
            </p>
            <div className="bg-white dark:bg-[#15193B] rounded-2xl border border-[#E9E8F2] dark:border-[#252E63] p-4 sm:p-5 mb-6 sm:mb-8 text-left text-xs sm:text-sm text-[#73758C] dark:text-slate-300 space-y-2.5">
              <div className="flex gap-2.5 items-start">
                <Clock size={16} className="text-[#6567C9] flex-shrink-0 mt-0.5" />
                <span>
                  You will complete <strong>{EXPERIMENTAL_COUNT} trials</strong> (Neutral, Congruent, and Incongruent).
                </span>
              </div>
              <div className="flex gap-2.5 items-start">
                <Zap size={16} className="text-[#E11D48] flex-shrink-0 mt-0.5" />
                <span>
                  Remember: Always respond to the <strong>INK COLOR</strong> as quickly and accurately as you can!
                </span>
              </div>
            </div>
            <button
              onClick={handleStartExperiment}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-base shadow-md font-bold"
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              {isResuming && (participant?.stroopProgressCount || 0) > 0
                ? `Resume Experiment (Trial ${(participant?.stroopProgressCount || 0) + 1} of ${EXPERIMENTAL_COUNT})`
                : `Begin ${EXPERIMENTAL_COUNT}-Trial Experiment`}
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 5. TASK COMPLETE SUMMARY */}
        {phase === 'taskComplete' && (
          <div className="text-center max-w-sm w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] dark:text-slate-300 mb-6 sm:mb-8">
              Thank you for completing the Stroop Task.
            </p>

            <button
              onClick={handleFinish}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md font-bold"
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              Return to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
