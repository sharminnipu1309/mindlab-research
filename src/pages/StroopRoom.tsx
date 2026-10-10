import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Page,
  ParticipantSession,
  StroopColor,
  StroopCondition,
  StroopTrialRecord,
  StroopSessionResult,
  STROOP_COLORS,
  STROOP_KEY_MAP,
  STROOP_COLOR_HEX,
  STROOP_COLOR_LABELS,
} from '../types';
import ParticipantNav, { ConfirmExitModal } from '../components/ParticipantNav';
import { CheckCircle, X, ArrowRight, Sparkles, Zap, Clock, Lock } from 'lucide-react';
import {
  persistStroopTrial,
  persistStroopResults,
  getStoredSessionContext,
  getExperimentSessionOptions,
  checkRooms3And4Access,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
  sessionId?: string;
  onComplete: (result: StroopSessionResult) => void;
}

type Phase = 'intro' | 'practice' | 'practiceComplete' | 'experiment' | 'taskComplete';
type TrialStage = 'fixation' | 'stimulus' | 'feedback' | 'interTrial';

const PRACTICE_COUNT = 20;
const EXPERIMENTAL_COUNT = 128;
const FIXATION_DURATION = 400; // ms
const FEEDBACK_DURATION = 600; // ms
const INTER_TRIAL_DURATION = 150; // ms

interface TrialItem {
  word: StroopColor;
  inkColor: StroopColor;
  condition: StroopCondition;
}

function generatePracticeTrials(): TrialItem[] {
  const list: TrialItem[] = [];

  // 12 Congruent practice items (3 for each of the 4 colors)
  STROOP_COLORS.forEach(color => {
    for (let i = 0; i < 3; i++) {
      list.push({ word: color, inkColor: color, condition: 'congruent' });
    }
  });

  // 8 Incongruent practice items (2 for each color combination)
  const incongruentBase: Array<{ word: StroopColor; inkColor: StroopColor }> = [
    { word: 'RED', inkColor: 'GREEN' },
    { word: 'GREEN', inkColor: 'BLUE' },
    { word: 'BLUE', inkColor: 'YELLOW' },
    { word: 'YELLOW', inkColor: 'RED' },
    { word: 'RED', inkColor: 'BLUE' },
    { word: 'GREEN', inkColor: 'RED' },
    { word: 'BLUE', inkColor: 'GREEN' },
    { word: 'YELLOW', inkColor: 'BLUE' },
  ];
  incongruentBase.forEach(pair => list.push({ ...pair, condition: 'incongruent' }));

  // Fisher-Yates shuffle (Total: 12 + 8 = 20 practice trials)
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function generateExperimentalTrials(): TrialItem[] {
  const list: TrialItem[] = [];

  // Exactly 96 Congruent trials (75%) -> 24 for each of the 4 colors
  STROOP_COLORS.forEach(color => {
    for (let i = 0; i < 24; i++) {
      list.push({ word: color, inkColor: color, condition: 'congruent' });
    }
  });

  // Exactly 32 Incongruent trials (25%)
  const incongruentPairs: Array<{ word: StroopColor; inkColor: StroopColor }> = [];
  STROOP_COLORS.forEach(w => {
    STROOP_COLORS.forEach(ink => {
      if (w !== ink) incongruentPairs.push({ word: w, inkColor: ink });
    });
  });

  // 12 distinct incongruent pairs * 2 repetitions = 24 trials
  incongruentPairs.forEach(pair => {
    for (let i = 0; i < 2; i++) {
      list.push({ ...pair, condition: 'incongruent' });
    }
  });

  // 8 extra balanced incongruent pairs (2 for each ink color / word) = 32 incongruent trials total
  list.push({ word: 'YELLOW', inkColor: 'RED', condition: 'incongruent' });
  list.push({ word: 'BLUE', inkColor: 'RED', condition: 'incongruent' });
  list.push({ word: 'RED', inkColor: 'GREEN', condition: 'incongruent' });
  list.push({ word: 'YELLOW', inkColor: 'GREEN', condition: 'incongruent' });
  list.push({ word: 'GREEN', inkColor: 'BLUE', condition: 'incongruent' });
  list.push({ word: 'RED', inkColor: 'BLUE', condition: 'incongruent' });
  list.push({ word: 'BLUE', inkColor: 'YELLOW', condition: 'incongruent' });
  list.push({ word: 'GREEN', inkColor: 'YELLOW', condition: 'incongruent' });

  // Fisher-Yates shuffle (Total: 96 congruent + 32 incongruent = 128 trials)
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list;
}

function formatRemainingDetailed(seconds: number): string {
  if (seconds <= 0) return 'Available now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

export default function StroopRoom({ navigate, participant, sessionId, onComplete }: Props) {
  const [accessChecking, setAccessChecking] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [room2Started, setRoom2Started] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [unlockAt, setUnlockAt] = useState<string | null>(null);
  const lastSyncRef = useRef<{ serverRemaining: number; syncPerfTime: number } | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [trialIndex, setTrialIndex] = useState<number>(0);
  const [trialStage, setTrialStage] = useState<TrialStage>('fixation');
  const [showExit, setShowExit] = useState<boolean>(false);
  const sessionOptionsRef = useRef(getExperimentSessionOptions());
  const sessionOptions = sessionOptionsRef.current;

  // Authoritatively verify room access status against database
  useEffect(() => {
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      checkRooms3And4Access(activeSid).then(res => {
        setAccessChecking(false);
        if (!res.unlocked) {
          setIsLocked(true);
          setRoom2Started(res.room2Started);
          setRemainingSeconds(res.remainingSeconds);
          setUnlockAt(res.unlockAt);
          lastSyncRef.current = {
            serverRemaining: res.remainingSeconds,
            syncPerfTime: performance.now(),
          };
        } else {
          setIsLocked(false);
        }
      }).catch(err => {
        console.error('[StroopRoom] Error verifying room access:', err);
        setAccessChecking(false);
      });
    } else {
      setAccessChecking(false);
    }
  }, [sessionId]);

  // Monotonic timer for locked countdown
  useEffect(() => {
    if (!isLocked || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      if (!lastSyncRef.current) return;
      const elapsedSec = Math.floor((performance.now() - lastSyncRef.current.syncPerfTime) / 1000);
      const updatedRemaining = Math.max(0, lastSyncRef.current.serverRemaining - elapsedSec);
      setRemainingSeconds(updatedRemaining);

      if (updatedRemaining <= 0) {
        const activeSid = sessionId || getStoredSessionContext()?.sessionId;
        if (activeSid) {
          checkRooms3And4Access(activeSid).then(res => {
            if (res.unlocked) {
              setIsLocked(false);
            } else {
              setRemainingSeconds(res.remainingSeconds);
            }
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, remainingSeconds, sessionId]);

  // Response feedback state
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

  const clearActiveTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearActiveTimer();
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

    // Reaction times are calculated only on valid correct trials to avoid distortion from errors
    const correctCongruent = congruentTrialsList.filter(t => t.isCorrect);
    const correctIncongruent = incongruentTrialsList.filter(t => t.isCorrect);

    const congruentMeanRtMs = correctCongruent.length > 0
      ? correctCongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctCongruent.length
      : 0;

    const incongruentMeanRtMs = correctIncongruent.length > 0
      ? correctIncongruent.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctIncongruent.length
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
      congruentMeanRtMs,
      incongruentMeanRtMs,
      stroopEffectMs,
      trials,
      practiceTrials: practiceRecordsRef.current,
    };
  };

  // Start trial stimulus flow
  const runTrialStage = useCallback((stage: TrialStage) => {
    clearActiveTimer();
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
    setTrialIndex(0);
    setPhase('experiment');
    runTrialStage('fixation');
  };

  // Response handler (invoked by keyboard key or click)
  const handleResponse = useCallback((responseColor: StroopColor) => {
    if (!isAcceptingResponseRef.current) return;
    if (trialStage !== 'stimulus') return;

    // Immediately close the response window to prevent double presses
    isAcceptingResponseRef.current = false;
    const reactionTimeMs = performance.now() - stimulusStartTimeRef.current;

    const isPracticePhase = phase === 'practice';
    const trialList = isPracticePhase ? practiceTrialsRef.current : experimentalTrialsRef.current;
    const currentItem = trialList[trialIndex];
    if (!currentItem) return;

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
    } else {
      console.warn('[StroopRoom] No session ID available for trial persistence');
    }

    // Show simple feedback in both practice and experimental trials
    setFeedback({ isCorrect });
    setTrialStage('feedback');

    clearActiveTimer();
    timerRef.current = setTimeout(() => {
      setFeedback(null);
      if (isPracticePhase) {
        if (trialIndex + 1 >= PRACTICE_COUNT) {
          setPhase('practiceComplete');
        } else {
          setTrialIndex(prev => prev + 1);
          runTrialStage('fixation');
        }
      } else {
        if (trialIndex + 1 >= EXPERIMENTAL_COUNT) {
          setPhase('taskComplete');
          // Auto-persist full results immediately on task completion
          const finalRes = computeStroopResult();
          if (activeSid) {
            persistStroopResults(activeSid, finalRes).catch(err => {
              console.error('[StroopRoom] Failed to auto-persist Stroop results on completion:', err);
            });
          }
        } else {
          setTrialIndex(prev => prev + 1);
          runTrialStage('fixation');
        }
      }
    }, FEEDBACK_DURATION);
  }, [phase, trialIndex, trialStage, runTrialStage, sessionId]);

  // Global keyboard listener
  useEffect(() => {
    if (isLocked || accessChecking || (phase !== 'practice' && phase !== 'experiment')) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      const rawKey = e.key;
      const color = STROOP_KEY_MAP[rawKey] || STROOP_KEY_MAP[rawKey.toLowerCase()] || STROOP_KEY_MAP[rawKey.toUpperCase()];
      if (color) {
        handleResponse(color);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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
  const currentTrial = activeList[trialIndex] || null;
  const currentTotal = isPractice ? PRACTICE_COUNT : EXPERIMENTAL_COUNT;
  const finalResult = computeStroopResult();

  return (
    <div className="min-h-screen bg-[#F8F8FC] flex flex-col">
      <ParticipantNav
        navigate={navigate}
        participantId={participant.id}
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
      <div className="bg-white border-b border-[#E9E8F2] px-4 sm:px-8 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <div className="text-[10px] font-bold text-[#E11D48] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
              Room 03 — Stroop Task
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-0.5">
              <span className="text-xs sm:text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
                Selective Attention & Control
              </span>
              <span className="text-xs text-[#73758C]">·</span>
              <span className="text-xs text-[#73758C]">
                Identify <strong className="text-[#252640]">Ink Color</strong>
              </span>
            </div>
          </div>

          {(phase === 'practice' || phase === 'experiment') && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  {isPractice ? 'Practice' : 'Trial'}
                </div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#252640]">
                  {trialIndex + 1}/{currentTotal}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-20 sm:w-28 bg-[#F0EFFB] h-2 rounded-full overflow-hidden border border-[#E9E8F2]">
                <div
                  className="h-full rounded-full transition-all duration-300"
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
        {accessChecking ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-10 h-10 border-4 border-[#E11D48] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-[#73758C] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
              Verifying room access...
            </p>
          </div>
        ) : isLocked ? (
          <div className="max-w-lg w-full bg-white rounded-3xl border-2 border-[#FECACA] p-6 sm:p-8 text-center shadow-lg animate-fade-in my-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] text-[#DC2626] mx-auto flex items-center justify-center mb-5 border border-[#FECACA] shadow-xs">
              <Lock size={32} />
            </div>
            <div className="text-[11px] font-bold text-[#DC2626] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif] mb-1">
              Access Restricted · Research Protocol
            </div>
            <h2 className="text-2xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] mb-3">
              Room 03 is Currently Locked
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed mb-6">
              {room2Started
                ? 'Under the study design, Room 3 (Stroop) and Room 4 (Task Switching) unlock exactly 24 hours after you start Room 2. Your waiting interval is currently in progress.'
                : 'Room 2 (Backward Corsi) must be started before Rooms 3 and 4 unlock. Rooms 3 and 4 will become accessible exactly 24 hours after starting Room 2.'}
            </p>

            {room2Started && (
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 mb-6 text-center">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                  Time Remaining Until Unlock
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#DC2626] font-['JetBrains_Mono',monospace]">
                  {formatRemainingDetailed(remainingSeconds)}
                </div>
                {unlockAt && (
                  <div className="text-xs text-[#94A3B8] mt-1 font-medium">
                    Unlocks at {new Date(unlockAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                <p className="text-[11px] text-[#64748B] mt-2.5 pt-2.5 border-t border-[#E2E8F0]">
                  An automated notification will be sent to your registered email when this activity unlocks.
                </p>
              </div>
            )}

            <button
              onClick={() => navigate('participant-dashboard')}
              className="btn-primary w-full justify-center py-3 text-sm font-bold"
            >
              Return to Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>

        {/* 1. INTRO PHASE */}
        {phase === 'intro' && (
          <div className="text-center max-w-xl w-full animate-fade-in-up">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FCE8EB] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Sparkles size={26} className="text-[#E11D48] sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Stroop Task
            </h2>
            <p className="text-xs sm:text-base text-[#73758C] leading-relaxed mb-4">
              You will see a color word appear on the screen. Your task is to respond to the{' '}
              <strong className="text-[#252640]">INK COLOR</strong> of the word as quickly and accurately as possible, while{' '}
              <strong className="text-[#E11D48]">ignoring what the word says</strong>.
            </p>

            {/* Example demonstration */}
            <div className="bg-white rounded-xl border border-[#E9E8F2] p-4 sm:p-5 mb-5 sm:mb-6 text-left">
              <div className="text-xs font-bold text-[#9597AB] uppercase tracking-wider mb-2 sm:mb-3">Example</div>
              <div className="flex flex-col sm:flex-row items-center justify-between bg-[#F8F8FC] rounded-lg p-3 sm:p-4 mb-3 border border-[#E9E8F2] gap-2">
                <div className="text-xl sm:text-2xl font-black font-['Plus_Jakarta_Sans',sans-serif]" style={{ color: STROOP_COLOR_HEX.RED }}>
                  GREEN
                </div>
                <div className="text-xs text-[#73758C] text-center sm:text-right">
                  The word says "GREEN", but the ink is <strong className="text-[#DC2626]">RED</strong>.<br />
                  Correct response = <strong className="text-[#252640] font-['JetBrains_Mono',monospace]">R (Red)</strong>
                </div>
              </div>

              {/* Key Mapping Legend */}
              <div className="text-xs font-bold text-[#9597AB] uppercase tracking-wider mb-2">Response Key Mappings</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#FCE8EB] text-[#DC2626] font-semibold border border-[#F9CFD5]">
                  <kbd className="px-1.5 py-0.5 bg-white rounded shadow-xs text-xs font-mono font-bold mr-1">R</kbd>
                  Red
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#EBF7EE] text-[#16A34A] font-semibold border border-[#CEEED6]">
                  <kbd className="px-1.5 py-0.5 bg-white rounded shadow-xs text-xs font-mono font-bold mr-1">G</kbd>
                  Green
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#EDF4FD] text-[#2563EB] font-semibold border border-[#CFE1FB]">
                  <kbd className="px-1.5 py-0.5 bg-white rounded shadow-xs text-xs font-mono font-bold mr-1">B</kbd>
                  Blue
                </div>
                <div className="p-2 sm:p-2.5 rounded-lg bg-[#FEFCE8] text-[#A16207] font-semibold border border-[#FEF08A]">
                  <kbd className="px-1.5 py-0.5 bg-white rounded shadow-xs text-xs font-mono font-bold mr-1">Y</kbd>
                  Yellow
                </div>
              </div>
            </div>

            <div className="bg-[#EDEAF8] rounded-xl p-3.5 sm:p-4 mb-6 sm:mb-8 text-left text-xs text-[#6567C9] flex items-center gap-3">
              <Zap size={18} className="flex-shrink-0" />
              <span>
                You will complete <strong>20 practice trials</strong> first with feedback, followed by the <strong>128 experimental trials</strong>.
              </span>
            </div>

            <button
              onClick={handleStartPractice}
              className="btn-primary px-8 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-base shadow-md w-full sm:w-auto justify-center"
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              Begin Practice (20 Trials)
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 2. PRACTICE PHASE & 3. EXPERIMENT PHASE */}
        {(phase === 'practice' || phase === 'experiment') && currentTrial && (
          <div className="flex flex-col items-center gap-5 sm:gap-8 w-full max-w-xl animate-fade-in">
            {/* Phase Badge */}
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif] bg-white border border-[#E9E8F2] shadow-xs text-[#73758C] text-center">
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

            {/* Stimulus Card: Fixed height to eliminate layout shift */}
            <div className="w-full h-44 sm:h-56 bg-white rounded-3xl border border-[#E9E8F2] shadow-sm flex items-center justify-center relative overflow-hidden select-none px-4">
              {trialStage === 'fixation' && (
                <div className="text-3xl sm:text-4xl font-light text-[#9597AB] font-mono select-none animate-scale-in">
                  +
                </div>
              )}

              {trialStage === 'stimulus' && (
                <div
                  className="text-4xl sm:text-5xl md:text-6xl font-black tracking-wider font-['Plus_Jakarta_Sans',sans-serif] select-none uppercase transition-none text-center"
                  style={{ color: STROOP_COLOR_HEX[currentTrial.inkColor] }}
                >
                  {currentTrial.word}
                </div>
              )}

              {trialStage === 'feedback' && feedback && (
                <div className="flex flex-col items-center justify-center gap-2 animate-pop-in">
                  {feedback.isCorrect ? (
                    <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#16A34A] font-['Plus_Jakarta_Sans',sans-serif]">
                      <CheckCircle size={22} className="text-[#16A34A] sm:w-6 sm:h-6" />
                      <span>Correct Response</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#DC2626] font-['Plus_Jakarta_Sans',sans-serif]">
                      <X size={22} className="text-[#DC2626] sm:w-6 sm:h-6" />
                      <span>Incorrect Response</span>
                    </div>
                  )}
                </div>
              )}

              {trialStage === 'interTrial' && (
                <div className="w-2 h-2 rounded-full bg-[#E9E8F2]" />
              )}
            </div>

            {/* Response Options Legend */}
            <div className="w-full">
              {isPractice && (
                <div className="text-center text-xs text-[#9597AB] mb-2 sm:mb-3">
                  Press the key corresponding to the <strong className="text-[#252640]">INK COLOR</strong>
                </div>
              )}
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
                      className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl bg-white border border-[#E9E8F2] shadow-xs hover:border-[#C5C1F1] hover:bg-[#F8F8FC] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-default"
                    >
                      <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#F8F8FC] border border-[#E9E8F2] rounded text-xs font-bold font-['JetBrains_Mono',monospace] text-[#252640] mb-0.5 sm:mb-1">
                        {meta.key}
                      </kbd>
                      <span className="text-[11px] sm:text-xs font-semibold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Practice Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-4">
              You're now ready for the real experiment.
            </p>
            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-5 mb-6 sm:mb-8 text-left text-xs sm:text-sm text-[#73758C] space-y-2.5">
              <div className="flex gap-2.5 items-start">
                <Clock size={16} className="text-[#6567C9] flex-shrink-0 mt-0.5" />
                <span>You will now complete <strong>128 trials</strong>.</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <Zap size={16} className="text-[#E11D48] flex-shrink-0 mt-0.5" />
                <span>Remember to respond as <strong>quickly and accurately</strong> as you can to the <strong>INK COLOR</strong>.</span>
              </div>
            </div>
            <button
              onClick={handleStartExperiment}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-base shadow-md"
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              Begin 128-Trial Experiment
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 5. TASK COMPLETE SUMMARY */}
        {phase === 'taskComplete' && (
          <div className="text-center max-w-sm w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-8">
              Thank you for completing the Stroop Task.
            </p>

            <button
              onClick={handleFinish}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #E11D48, #BE123C)' }}
            >
              Return to Dashboard →
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
