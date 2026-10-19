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
import { CheckCircle, X, ArrowRight, Sparkles, Zap, Clock, LogOut } from 'lucide-react';
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

// Trial counts: 128 experimental trials (96 Congruent, 32 Incongruent; 75%/25% ratio) and 20 practice trials
const PRACTICE_COUNT = 20; // 12 Congruent, 8 Incongruent
const EXPERIMENTAL_COUNT = 128; // 96 Congruent, 32 Incongruent (24 congruent per color, 8 incongruent per ink color)

// Timings in milliseconds
const FIXATION_DURATION = 400; // ms
const FEEDBACK_DURATION = 650; // ms (visible text and sound feedback)
const INTER_TRIAL_DURATION = 150; // ms

interface TrialItem {
  word: string;
  inkColor: StroopColor;
  condition: StroopCondition;
}



/**
 * Generates 20 practice trials balanced across 2 conditions (12 Congruent, 8 Incongruent):
 * - 12 Congruent (3 for each of the 4 colors: RED, GREEN, BLUE, YELLOW)
 * - 8 Incongruent (2 for each of the 4 ink colors)
 * Shuffled with constraint that no consecutive trials have the same ink color.
 */
function generatePracticeTrials(): TrialItem[] {
  const list: TrialItem[] = [];

  // 1. 12 Congruent practice items (3 for each of 4 colors)
  STROOP_COLORS.forEach(color => {
    for (let i = 0; i < 3; i++) {
      list.push({ word: color, inkColor: color, condition: 'congruent' });
    }
  });

  // 2. 8 Incongruent practice items (2 for each of 4 ink colors)
  const incongruentBase: Array<{ word: string; inkColor: StroopColor }> = [
    { word: 'GREEN', inkColor: 'RED' },
    { word: 'YELLOW', inkColor: 'RED' },
    { word: 'RED', inkColor: 'GREEN' },
    { word: 'BLUE', inkColor: 'GREEN' },
    { word: 'YELLOW', inkColor: 'BLUE' },
    { word: 'RED', inkColor: 'BLUE' },
    { word: 'BLUE', inkColor: 'YELLOW' },
    { word: 'GREEN', inkColor: 'YELLOW' },
  ];
  incongruentBase.forEach(pair => list.push({ ...pair, condition: 'incongruent' }));

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
 * Generates exactly 128 experimental trials:
 * - 96 Congruent trials (24 for each of the 4 colors: RED, GREEN, BLUE, YELLOW)
 * - 32 Incongruent trials (8 for each of the 4 ink colors, 8 for each word color)
 * - Ratio: 75% Congruent, 25% Incongruent
 * Strictly enforces: NO consecutive trials have the same ink color
 */
function generateExperimentalTrials(): TrialItem[] {
  const pool: TrialItem[] = [];

  // 1. 96 Congruent trials (24 per color)
  STROOP_COLORS.forEach(color => {
    for (let i = 0; i < 24; i++) {
      pool.push({ word: color, inkColor: color, condition: 'congruent' });
    }
  });

  // 2. 32 Incongruent trials (8 per ink color, 8 per word color)
  // All 12 distinct incongruent pairs repeated twice = 24 trials (6 per ink color)
  const incPairs: Array<{ word: string; inkColor: StroopColor }> = [];
  STROOP_COLORS.forEach(w => {
    STROOP_COLORS.forEach(ink => {
      if (w !== ink) incPairs.push({ word: w, inkColor: ink });
    });
  });
  incPairs.forEach(pair => {
    for (let i = 0; i < 2; i++) {
      pool.push({ ...pair, condition: 'incongruent' });
    }
  });
  // 8 extra balanced incongruent trials (2 per ink color, 2 per word color) -> 32 total
  pool.push({ word: 'YELLOW', inkColor: 'RED', condition: 'incongruent' });
  pool.push({ word: 'BLUE', inkColor: 'RED', condition: 'incongruent' });
  pool.push({ word: 'RED', inkColor: 'GREEN', condition: 'incongruent' });
  pool.push({ word: 'YELLOW', inkColor: 'GREEN', condition: 'incongruent' });
  pool.push({ word: 'GREEN', inkColor: 'BLUE', condition: 'incongruent' });
  pool.push({ word: 'RED', inkColor: 'BLUE', condition: 'incongruent' });
  pool.push({ word: 'BLUE', inkColor: 'YELLOW', condition: 'incongruent' });
  pool.push({ word: 'GREEN', inkColor: 'YELLOW', condition: 'incongruent' });

  // 3. Shuffle with max-frequency heuristic ensuring no two consecutive trials have the same ink color
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

  // Visual feedback state (shown for both correct and incorrect)
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
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

    const congruentTrials = congruentTrialsList.length;
    const congruentCorrect = congruentTrialsList.filter(t => t.isCorrect).length;
    const congruentAccuracy = congruentTrials > 0 ? (congruentCorrect / congruentTrials) * 100 : 0;

    const incongruentTrials = incongruentTrialsList.length;
    const incongruentCorrect = incongruentTrialsList.filter(t => t.isCorrect).length;
    const incongruentAccuracy = incongruentTrials > 0 ? (incongruentCorrect / incongruentTrials) * 100 : 0;

    // Reaction times calculated on valid correct trials
    const correctCongruent = congruentTrialsList.filter(t => t.isCorrect);
    const correctIncongruent = incongruentTrialsList.filter(t => t.isCorrect);

    const congruentMeanRtMs = correctCongruent.length > 0
      ? Math.round(correctCongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctCongruent.length)
      : 0;

    const incongruentMeanRtMs = correctIncongruent.length > 0
      ? Math.round(correctIncongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctIncongruent.length)
      : 0;

    const stroopEffectMs = (correctCongruent.length > 0 && correctIncongruent.length > 0)
      ? Math.round(incongruentMeanRtMs - congruentMeanRtMs)
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
      neutralTrials: 0,
      neutralCorrect: 0,
      neutralAccuracy: 0,
      congruentMeanRtMs,
      incongruentMeanRtMs,
      neutralMeanRtMs: 0,
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
      }, FIXATION_DURATION);
    }
  }, []);

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

    const reactionTimeMs = performance.now() - stimulusStartTimeRef.current;

    const isPracticePhase = phase === 'practice';
    const trialList = isPracticePhase ? practiceTrialsRef.current : experimentalTrialsRef.current;
    const currentItem = trialList[trialIndex];
    if (!currentItem) return;

    // Correct response is ALWAYS the printed font ink color
    const isCorrect = responseColor === currentItem.inkColor;

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
    setFeedback({ isCorrect });
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
      <div className="bg-white dark:bg-white border-b border-[#C5DCE4] px-4 sm:px-8 py-3 sm:py-4 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="text-left">
              <div className="text-[10px] font-black text-[#183B4A] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                Room 03 — Stroop Color-Word Task
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#183B4A] font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
                Selective Attention & Cognitive Inhibition
              </div>
            </div>
            {/* Mobile Exit Option in room header */}
            <button
              onClick={() => setShowExit(true)}
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ml-auto"
              title="Exit task and return to dashboard"
            >
              <LogOut size={13} />
              <span>Exit</span>
            </button>
          </div>

          {(phase === 'practice' || phase === 'experiment') && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#526E7B] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  {isPractice ? 'Practice' : 'Trial'}
                </div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#183B4A]">
                  {trialIndex + 1}/{currentTotal}
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-24 sm:w-32 h-2 rounded-full bg-[#EAF4F8] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${((trialIndex + 1) / currentTotal) * 100}%`,
                    background: isPractice ? '#2E6B82' : '#E11D48',
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
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#F1F8FB] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Stroop Task
            </h2>
            <p className="text-xs sm:text-base text-[#263B46] dark:text-[#EAF4F8] font-medium leading-relaxed mb-4">
              You will see a color word appear on the screen. Your task is to respond to the{' '}
              <strong className="text-[#183B4A] dark:text-white">INK COLOR</strong> of the word as quickly and accurately as possible, while{' '}
              <strong className="text-[#E11D48]">ignoring what the word means</strong>.
            </p>

            {/* 2 Stimulus Types Educational Card */}
            <div className="bg-white dark:bg-white rounded-2xl border-2 border-[#C5DCE4] dark:border-[#C5DCE4] p-4 sm:p-6 mb-5 text-left shadow-xs">
              <div className="text-xs font-bold text-[#E11D48] uppercase tracking-wider mb-2.5">
                2 STIMULUS TYPES IN THIS TASK
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FBFC] dark:bg-[#F8FBFC] border border-[#C5DCE4] dark:border-[#C5DCE4]">
                  <div className="font-bold text-[#183B4A] dark:text-[#183B4A] mb-1">1. Congruent</div>
                  <div className="text-[#2563EB] font-black text-sm tracking-wide mb-1 font-['Plus_Jakarta_Sans',sans-serif]">BLUE</div>
                  <p className="text-[#526E7B] dark:text-[#526E7B] text-[11px] leading-snug">
                    Word name matches ink color. Correct response = <strong className="text-[#2563EB]">Blue</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FBFC] dark:bg-[#F8FBFC] border border-[#C5DCE4] dark:border-[#C5DCE4]">
                  <div className="font-bold text-[#183B4A] dark:text-[#183B4A] mb-1">2. Incongruent</div>
                  <div className="text-[#2563EB] font-black text-sm tracking-wide mb-1 font-['Plus_Jakarta_Sans',sans-serif]">RED</div>
                  <p className="text-[#526E7B] dark:text-[#526E7B] text-[11px] leading-snug">
                    Word says &quot;RED&quot; in blue ink 🔵. Correct response = <strong className="text-[#2563EB]">Blue</strong>.
                  </p>
                </div>
              </div>

              {/* Centered Example Box */}
              <div className="text-xs font-bold text-[#526E7B] dark:text-[#526E7B] uppercase tracking-wider mb-2">
                EXAMPLE
              </div>
              <div className="bg-[#F8FBFC] dark:bg-[#F8FBFC] rounded-2xl p-4 sm:p-5 mb-4 border border-[#C5DCE4] dark:border-[#C5DCE4] flex flex-col items-center justify-center text-center">
                <div className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-wide text-[#DC2626] mb-2 sm:mb-2.5">
                  GREEN
                </div>
                <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#526E7B] font-medium mb-1">
                  The word says &quot;GREEN&quot;, but the ink is <strong className="text-[#DC2626] font-bold">RED</strong>.
                </p>
                <p className="text-xs sm:text-sm text-[#183B4A] dark:text-[#183B4A] font-medium">
                  Correct response = <strong className="text-[#183B4A] dark:text-[#183B4A] font-['JetBrains_Mono',monospace]">R</strong> <strong className="text-[#183B4A] dark:text-[#183B4A] font-semibold">(Red)</strong>
                </p>
              </div>

              {/* Response Key Mapping Legend */}
              <div className="text-xs font-bold text-[#526E7B] dark:text-[#526E7B] uppercase tracking-wider mt-4 mb-2">
                RESPONSE KEY MAPPINGS
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#FCE8EB] dark:bg-[#FCE8EB] text-[#DC2626] dark:text-[#DC2626] font-semibold border border-[#F9CFD5] dark:border-[#F9CFD5]">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-white text-[#183B4A] dark:text-[#183B4A] rounded shadow-xs text-xs font-mono font-bold mr-1">R</kbd>
                  Red
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#EBF7EE] dark:bg-[#EBF7EE] text-[#16A34A] dark:text-[#16A34A] font-semibold border border-[#CEEED6] dark:border-[#CEEED6]">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-white text-[#183B4A] dark:text-[#183B4A] rounded shadow-xs text-xs font-mono font-bold mr-1">G</kbd>
                  Green
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#EDF4FD] dark:bg-[#EDF4FD] text-[#2563EB] dark:text-[#2563EB] font-semibold border border-[#CFE1FB] dark:border-[#CFE1FB]">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-white text-[#183B4A] dark:text-[#183B4A] rounded shadow-xs text-xs font-mono font-bold mr-1">B</kbd>
                  Blue
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#FEFCE8] dark:bg-[#FEFCE8] text-[#A16207] dark:text-[#A16207] font-semibold border border-[#FEF08A] dark:border-[#FEF08A]">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-white text-[#183B4A] dark:text-[#183B4A] rounded shadow-xs text-xs font-mono font-bold mr-1">Y</kbd>
                  Yellow
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-white rounded-xl border border-[#C5DCE4] dark:border-[#C5DCE4] p-3.5 sm:p-4 mb-6 sm:mb-8 text-left text-xs text-[#205266] dark:text-[#205266] flex items-center gap-3 shadow-xs">
              <Zap size={18} className="flex-shrink-0 text-[#205266]" />
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
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] bg-white dark:bg-white border border-[#C5DCE4] dark:border-[#C5DCE4] shadow-xs text-[#183B4A] dark:text-[#183B4A] text-center">
              {isPractice ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#2E6B82] animate-pulse" />
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
            <div className="w-full h-48 sm:h-56 bg-white dark:bg-white rounded-3xl border-2 border-[#C5DCE4] dark:border-[#C5DCE4] shadow-md flex flex-col items-center justify-center relative overflow-hidden select-none px-4 transition-colors">
              {trialStage === 'fixation' && (
                <div className="text-3xl sm:text-4xl font-light text-[#526E7B] dark:text-[#526E7B] font-mono select-none animate-scale-in">
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
                </div>
              )}

              {/* Visual Text Feedback: Visible for both sound & silent environments on EVERY trial */}
              {trialStage === 'feedback' && feedback && (
                <div className="flex flex-col items-center justify-center gap-2 animate-pop-in">
                  {feedback.isCorrect ? (
                    <div className="flex items-center gap-2.5 px-6 py-2 sm:py-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-100 border-2 border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-900 text-base sm:text-lg font-black shadow-md">
                      <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-600" />
                      <span>Correct!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 px-6 py-2 sm:py-2.5 rounded-2xl bg-rose-100 dark:bg-rose-100 border-2 border-rose-500 dark:border-rose-500 text-rose-900 dark:text-rose-900 text-base sm:text-lg font-black shadow-md">
                      <X size={22} className="text-rose-600 dark:text-rose-600" />
                      <span>Incorrect</span>
                    </div>
                  )}
                </div>
              )}

              {trialStage === 'interTrial' && (
                <div className="w-2 h-2 rounded-full bg-[#C5DCE4] dark:bg-[#C5DCE4]" />
              )}
            </div>

            {/* Response Options Legend (Accessible on both Desktop keyboard & Mobile tap) */}
            <div className="w-full">
              <div className="text-center text-xs sm:text-sm text-[#263B46] dark:text-[#EAF4F8] mb-3 font-semibold">
                Click or press the key corresponding to the <strong className="text-[#183B4A] dark:text-white font-extrabold underline decoration-[#4D91AD] decoration-2 underline-offset-2">INK COLOR</strong> (ignoring what the word means)
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
                      className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-white border-2 border-[#C5DCE4] dark:border-[#C5DCE4] shadow-xs hover:border-[#245D72] dark:hover:border-[#245D72] hover:bg-[#EAF4F8] dark:hover:bg-[#EAF4F8] active:scale-95 transition-all ${
                        trialStage === 'stimulus' ? 'cursor-pointer hover:shadow-md' : 'opacity-85 cursor-default'
                      }`}
                    >
                      <kbd className="px-2.5 py-1 bg-[#EAF4F8] dark:bg-[#EAF4F8] border border-[#B8D7E3] dark:border-[#B8D7E3] rounded-lg text-xs sm:text-sm font-black font-['JetBrains_Mono',monospace] text-[#183B4A] dark:text-[#183B4A] mb-1.5 shadow-2xs">
                        {meta.key}
                      </kbd>
                      <div
                        className="w-3.5 h-3.5 rounded-full mb-1 ring-2 ring-black/10 dark:ring-white/20 shadow-xs"
                        style={{ backgroundColor: STROOP_COLOR_HEX[color] }}
                      />
                      <span className="text-xs sm:text-sm font-bold text-[#183B4A] dark:text-[#183B4A] font-['Plus_Jakarta_Sans',sans-serif]">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Exit Option below trial area */}
            <div className="sm:hidden mt-3 pt-2 flex justify-center w-full">
              <button
                onClick={() => setShowExit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#DC2626] bg-rose-50/90 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <LogOut size={13} />
                <span>Exit Task</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. PRACTICE COMPLETE TRANSITION */}
        {phase === 'practiceComplete' && (
          <div className="text-center max-w-md w-full animate-pop-in p-6 bg-white dark:bg-white rounded-3xl border border-[#C5DCE4] shadow-md">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#183B4A] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              {isResuming && (participant?.stroopProgressCount || 0) > 0
                ? 'Resume Experiment'
                : 'Practice Completed'}
            </h2>
            <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#526E7B] mb-4">
              {isResuming && (participant?.stroopProgressCount || 0) > 0
                ? `Continuing your test from trial ${(participant?.stroopProgressCount || 0) + 1} of ${EXPERIMENTAL_COUNT}.`
                : 'You are now ready for the official research experiment.'}
            </p>
            <div className="bg-[#F8FBFC] dark:bg-[#F8FBFC] rounded-2xl border border-[#C5DCE4] dark:border-[#C5DCE4] p-4 sm:p-5 mb-6 sm:mb-8 text-left text-xs sm:text-sm text-[#183B4A] dark:text-[#183B4A] space-y-2.5">
              <div className="flex gap-2.5 items-start">
                <Clock size={16} className="text-[#205266] flex-shrink-0 mt-0.5" />
                <span>
                  You will complete <strong>{EXPERIMENTAL_COUNT} trials</strong> (Congruent and Incongruent).
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
          <div className="text-center max-w-sm w-full animate-pop-in p-6 bg-white dark:bg-white rounded-3xl border border-[#C5DCE4] shadow-md">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183B4A] dark:text-[#183B4A] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#526E7B] mb-6 sm:mb-8">
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
