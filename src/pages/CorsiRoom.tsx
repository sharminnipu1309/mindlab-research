import { useState, useEffect, useCallback, useRef } from 'react';
import { Page, ParticipantSession, CorsiTrialRecord, CorsiSessionResult } from '../types';
import ParticipantNav, { ConfirmExitModal } from '../components/ParticipantNav';
import {
  CheckCircle,
  X,
  ArrowRight,
  Eye,
  MousePointerClick,
  AlertTriangle,
  RotateCcw,
  Undo2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  persistCorsiTrial,
  persistCorsiResults,
  getStoredSessionContext,
  getExperimentSessionOptions,
  getDataMeasurementsConfig,
  recordRoom2Start,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
  sessionId?: string;
  onComplete: (result: CorsiSessionResult) => void;
}

type Phase =
  | 'tutorialIntro'      // Tutorial instructions with visual directional arrows and diagrams
  | 'practiceWatching'   // Practice sequence presentation
  | 'practiceRecall'     // Practice sequence reverse recall
  | 'practiceFeedback'   // Detailed educational feedback after each practice trial
  | 'preExperiment'      // Prominent warning before starting the actual experiment
  | 'watching'           // Official experiment sequence presentation
  | 'recall'             // Official experiment reverse recall
  | 'feedback'           // Official experiment brief feedback
  | 'levelComplete'      // Official level completion
  | 'taskComplete';      // Full task completion

const TOTAL_LEVELS = 8;
const TRIALS_PER_LEVEL = 6;
const REQUIRED_CORRECT = 4;
const HIGHLIGHT_DURATION = 600;
const INTER_BLOCK_PAUSE = 500;

function getSequenceLength(level: number) {
  return level + 1;
}

function generateSequence(length: number): number[] {
  const indices = Array.from({ length: 9 }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, length);
}

// 3 Practice Trials increasing gradually in difficulty (2 -> 3 -> 4 blocks)
interface PracticeTrialConfig {
  trialNumber: number;
  sequenceLength: number;
  sequence: number[];
  title: string;
  description: string;
}

const PRACTICE_TRIALS: PracticeTrialConfig[] = [
  {
    trialNumber: 1,
    sequenceLength: 2,
    sequence: [1, 7], // Block 2 (top-center) -> Block 8 (bottom-center)
    title: 'Practice Trial 1 of 3 (Introductory — 2 Blocks)',
    description: 'A simple 2-block sequence to learn reverse recall. Tap the LAST block that lit up first, then the FIRST block.',
  },
  {
    trialNumber: 2,
    sequenceLength: 3,
    sequence: [0, 4, 8], // Block 1 (top-left) -> Block 5 (center) -> Block 9 (bottom-right)
    title: 'Practice Trial 2 of 3 (Moderate — 3 Blocks)',
    description: 'A 3-block sequence. Watch all 3 blocks carefully, then tap them in reverse order (3rd → 2nd → 1st).',
  },
  {
    trialNumber: 3,
    sequenceLength: 4,
    sequence: [2, 6, 3, 5], // Block 3 (top-right) -> Block 7 (bottom-left) -> Block 4 (middle-left) -> Block 6 (middle-right)
    title: 'Practice Trial 3 of 3 (Challenging — 4 Blocks)',
    description: 'A 4-block sequence to test your reverse recall before starting the official experiment (4th → 3rd → 2nd → 1st).',
  },
];

/**
 * CorsiBoard Component
 * Slightly reduced grid size (~20% smaller than original 96px on desktop)
 * while maintaining responsive touch targets and clear visibility.
 */
function CorsiBoard({
  highlighted,
  flashBlock,
  playerResponse,
  disabled,
  onBlockClick,
}: {
  highlighted: number | null;
  flashBlock: number | null;
  playerResponse: number[];
  disabled: boolean;
  onBlockClick: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
      {Array.from({ length: 9 }, (_, i) => {
        const isHighlighted = highlighted === i;
        const isFlashing = flashBlock === i;
        const responseIndex = playerResponse.indexOf(i);
        const isSelected = responseIndex !== -1;

        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            aria-label={`Block ${i + 1}`}
            className={`corsi-block w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 ${
              isHighlighted
                ? 'highlighted'
                : isFlashing || isSelected
                ? 'selected'
                : 'bg-[#E9E8F2] dark:bg-[#1A2248]'
            } ${disabled ? 'disabled cursor-default' : 'cursor-pointer hover:scale-[1.03]'}`}
            onClick={() => !disabled && onBlockClick(i)}
            style={{ cursor: disabled ? 'default' : 'pointer' }}
          >
            {isSelected && (
              <span className="text-sm sm:text-base font-black font-['JetBrains_Mono',monospace] text-white drop-shadow-xs select-none">
                {responseIndex + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function CorsiRoom({ navigate, participant, sessionId, onComplete }: Props) {
  // Main phase state starts with tutorial introduction
  const [phase, setPhase] = useState<Phase>('tutorialIntro');

  // Practice state (strictly separated from research dataset)
  const [practiceIndex, setPracticeIndex] = useState(0); // 0, 1, 2
  const [practiceLastResult, setPracticeLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [practicePlayerResponse, setPracticePlayerResponse] = useState<number[]>([]);
  const [practiceSequence, setPracticeSequence] = useState<number[]>([]);

  // Experimental state (official research trials)
  const [level, setLevel] = useState(1);
  const [trialNumber, setTrialNumber] = useState(1);
  const [correctTrials, setCorrectTrials] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerResponse, setPlayerResponse] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);

  // Common UI states
  const [highlightedBlock, setHighlightedBlock] = useState<number | null>(null);
  const [flashingBlock, setFlashingBlock] = useState<number | null>(null);
  const [showExit, setShowExit] = useState(false);

  // Configuration refs
  const sessionOptionsRef = useRef(getExperimentSessionOptions());
  const sessionOptions = sessionOptionsRef.current;
  const dataConfigRef = useRef(getDataMeasurementsConfig());
  const dataConfig = dataConfigRef.current;
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exact trial-level records and span tracking (only populated during official trials)
  const allTrialsRef = useRef<CorsiTrialRecord[]>([]);
  const highestCompletedLevelRef = useRef<number>(0);
  const correctAtHighestCompletedLevelRef = useRef<number>(0);

  const seqLen = getSequenceLength(level);
  const currentPracticeConfig = PRACTICE_TRIALS[practiceIndex] || PRACTICE_TRIALS[0];

  const clearAnimTimers = () => {
    if (animRef.current) clearTimeout(animRef.current);
  };

  // Record authoritative server/database timestamp immediately when Room 2 starts
  useEffect(() => {
    let isMounted = true;
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      recordRoom2Start(activeSid).then(status => {
        if (!isMounted) return;
        if (status && participant) {
          participant.room2StartedAt = status.room2StartedAt;
          participant.rooms3And4UnlockAt = status.unlockAt;
          participant.rooms3And4Unlocked = status.unlocked;
        }
      }).catch(err => {
        console.error('[CorsiRoom] Error recording Room 2 start timestamp:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [sessionId, participant?.id]);

  useEffect(() => () => {
    clearAnimTimers();
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  // ==========================================
  // PRACTICE TRIAL LOGIC (Zero Supabase Leakage)
  // ==========================================

  const startPracticeTrial = useCallback((idx: number) => {
    const config = PRACTICE_TRIALS[idx] || PRACTICE_TRIALS[0];
    const seq = [...config.sequence];
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashingBlock(null);
    setPracticeSequence(seq);
    setPracticePlayerResponse([]);
    setPracticeLastResult(null);

    setPhase('practiceWatching');
    setHighlightedBlock(null);

    let delay = 400;
    seq.forEach((blockIdx, i) => {
      animRef.current = setTimeout(() => {
        setHighlightedBlock(blockIdx);
        animRef.current = setTimeout(() => {
          setHighlightedBlock(null);
          if (i === seq.length - 1) {
            animRef.current = setTimeout(() => {
              setPhase('practiceRecall');
              setPracticePlayerResponse([]);
            }, 400);
          }
        }, HIGHLIGHT_DURATION);
      }, delay);
      delay += HIGHLIGHT_DURATION + INTER_BLOCK_PAUSE;
    });
  }, []);

  const handlePracticeBlockClick = (i: number) => {
    if (phase !== 'practiceRecall') return;
    if (practicePlayerResponse.includes(i)) return;
    if (practicePlayerResponse.length >= practiceSequence.length) return;

    setPracticePlayerResponse(prev => [...prev, i]);

    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashingBlock(i);
    flashTimeoutRef.current = setTimeout(() => {
      setFlashingBlock(null);
    }, 200);
  };

  const handlePracticeClear = () => {
    if (phase !== 'practiceRecall') return;
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashingBlock(null);
    setPracticePlayerResponse([]);
  };

  const handlePracticeDone = () => {
    if (phase !== 'practiceRecall') return;
    const expected = [...practiceSequence].reverse();
    const isCorrect =
      practicePlayerResponse.length === expected.length &&
      practicePlayerResponse.every((val, i) => val === expected[i]);

    setPracticeLastResult(isCorrect ? 'correct' : 'incorrect');
    setPhase('practiceFeedback');
  };

  const handleRetryPracticeTrial = () => {
    startPracticeTrial(practiceIndex);
  };

  const handleAdvancePractice = () => {
    if (practiceIndex < PRACTICE_TRIALS.length - 1) {
      const nextIdx = practiceIndex + 1;
      setPracticeIndex(nextIdx);
      startPracticeTrial(nextIdx);
    } else {
      // Completed all 3 practice trials -> Proceed to the pre-experiment warning
      setPhase('preExperiment');
    }
  };

  // ==========================================
  // OFFICIAL EXPERIMENTAL TRIAL LOGIC
  // ==========================================

  const playSequence = useCallback((seq: number[]) => {
    setPhase('watching');
    setHighlightedBlock(null);

    let delay = 300;
    seq.forEach((blockIdx, i) => {
      animRef.current = setTimeout(() => {
        setHighlightedBlock(blockIdx);
        animRef.current = setTimeout(() => {
          setHighlightedBlock(null);
          if (i === seq.length - 1) {
            animRef.current = setTimeout(() => {
              setPhase('recall');
              setPlayerResponse([]);
            }, 400);
          }
        }, HIGHLIGHT_DURATION);
      }, delay);
      delay += HIGHLIGHT_DURATION + INTER_BLOCK_PAUSE;
    });
  }, []);

  const startTrial = useCallback((lvl: number) => {
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      recordRoom2Start(activeSid).catch(() => {});
    }
    const seq = generateSequence(getSequenceLength(lvl));
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashingBlock(null);
    setSequence(seq);
    setPlayerResponse([]);
    setLastResult(null);
    playSequence(seq);
  }, [playSequence, sessionId]);

  const handleBlockClick = (i: number) => {
    if (phase !== 'recall') return;
    if (playerResponse.includes(i)) return;
    if (playerResponse.length >= seqLen) return;

    setPlayerResponse(prev => [...prev, i]);

    // Brief visual flash on click (200ms)
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    setFlashingBlock(i);
    flashTimeoutRef.current = setTimeout(() => {
      setFlashingBlock(null);
    }, 200);
  };

  const computeCorsiResult = (): CorsiSessionResult => {
    const trials = allTrialsRef.current;
    const totalTrials = trials.length;
    const totalCorrectTrials = trials.filter(t => t.isCorrect).length;
    const totalScoredPositions = trials.reduce((sum, t) => sum + (t.totalPositions ?? 0), 0);
    const totalCorrectPositions = trials.reduce((sum, t) => sum + (t.correctPositionsCount ?? 0), 0);

    const maxCompletedLevel = highestCompletedLevelRef.current;
    const maxCompletedSpan = maxCompletedLevel > 0 ? getSequenceLength(maxCompletedLevel) : 0;
    const correctTrialsAtMaxSpan = correctAtHighestCompletedLevelRef.current;

    // Standard research metrics formulas:
    const trialAccuracy = totalTrials > 0 ? (totalCorrectTrials / totalTrials) * 100 : 0;
    const blockPositionAccuracy = dataConfig.recordBlockPositionAccuracy
      ? (totalScoredPositions > 0 ? (totalCorrectPositions / totalScoredPositions) * 100 : 0)
      : null;
    const productScore = maxCompletedSpan * correctTrialsAtMaxSpan;

    return {
      maxCompletedLevel,
      maxCompletedSpan,
      correctTrialsAtMaxSpan,
      productScore,
      trialAccuracy,
      blockPositionAccuracy,
      totalTrials,
      totalCorrectTrials,
      totalScoredPositions,
      totalCorrectPositions,
      trials,
    };
  };

  const handleDone = () => {
    if (phase !== 'recall') return;
    const expected = [...sequence].reverse();

    // Calculate position accuracy
    let correctPositionsCount = 0;
    for (let idx = 0; idx < expected.length; idx++) {
      if (playerResponse[idx] === expected[idx]) {
        correctPositionsCount++;
      }
    }
    const isCorrect = correctPositionsCount === expected.length && playerResponse.length === expected.length;
    const newCorrect = isCorrect ? correctTrials + 1 : correctTrials;

    // Record official trial data
    const recordAccuracy = dataConfig.recordBlockPositionAccuracy;
    const trialRecord: CorsiTrialRecord = {
      level,
      sequenceLength: seqLen,
      trialNumber,
      presentedSequence: sequence,
      recalledSequence: playerResponse,
      isCorrect,
      correctPositionsCount: recordAccuracy ? correctPositionsCount : null,
      totalPositions: recordAccuracy ? seqLen : null,
      timestampMs: Date.now(),
    };
    allTrialsRef.current.push(trialRecord);

    // Immediate trial persistence to Supabase
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistCorsiTrial(activeSid, trialRecord).catch(err => {
        console.error('[CorsiRoom] Failed to persist trial:', err);
      });
    } else {
      console.warn('[CorsiRoom] No session ID available for trial persistence');
    }

    setLastResult(isCorrect ? 'correct' : 'incorrect');
    setCorrectTrials(newCorrect);
    setPhase('feedback');

    setTimeout(() => {
      if (trialNumber === TRIALS_PER_LEVEL) {
        if (newCorrect >= REQUIRED_CORRECT) {
          // Successfully completed this level
          highestCompletedLevelRef.current = level;
          correctAtHighestCompletedLevelRef.current = newCorrect;

          if (level >= TOTAL_LEVELS) {
            setPhase('taskComplete');
            // Auto-persist full results immediately on task completion
            const finalResult = computeCorsiResult();
            if (activeSid) {
              persistCorsiResults(activeSid, finalResult).catch(err => {
                console.error('[CorsiRoom] Error auto-persisting Corsi results on completion:', err);
              });
            }
          } else {
            setPhase('levelComplete');
          }
        } else {
          // Stopping rule triggered: failed to reach 4/6 threshold
          setPhase('taskComplete');
          // Auto-persist full results immediately on stopping rule
          const finalResult = computeCorsiResult();
          if (activeSid) {
            persistCorsiResults(activeSid, finalResult).catch(err => {
              console.error('[CorsiRoom] Error auto-persisting Corsi results on stopping rule:', err);
            });
          }
        }
      } else {
        setTrialNumber(t => t + 1);
        setCorrectTrials(newCorrect);
        startTrial(level);
      }
    }, 1800);
  };

  const handleClearResponse = () => {
    if (phase !== 'recall') return;
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashingBlock(null);
    setPlayerResponse([]);
  };

  const handleStartOfficialExperiment = () => {
    setLevel(1);
    setTrialNumber(1);
    setCorrectTrials(0);
    allTrialsRef.current = [];
    highestCompletedLevelRef.current = 0;
    correctAtHighestCompletedLevelRef.current = 0;
    startTrial(1);
  };

  const handleNextLevel = () => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setTrialNumber(1);
    setCorrectTrials(0);
    setLastResult(null);
    startTrial(nextLevel);
  };

  const handleFinish = () => {
    const result = computeCorsiResult();
    const activeSid = sessionId || getStoredSessionContext()?.sessionId;
    if (activeSid) {
      persistCorsiResults(activeSid, result).catch(err => {
        console.error('[CorsiRoom] Error persisting Corsi results on finish:', err);
      });
    }
    onComplete(result);
    navigate('participant-dashboard');
  };

  const isPracticeMode =
    phase === 'practiceWatching' || phase === 'practiceRecall' || phase === 'practiceFeedback';
  const isOfficialMode = phase === 'watching' || phase === 'recall' || phase === 'feedback';

  return (
    <div className="min-h-screen bg-[#F8F8FC] dark:bg-[#0D1026] flex flex-col transition-colors">
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
      <div className="bg-white dark:bg-[#15193B] border-b border-[#E9E8F2] dark:border-[#252E63] px-4 sm:px-8 py-3 sm:py-4 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <div className="text-[10px] font-bold text-[#69AFA8] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
              Room 02 — Backward Corsi Block Task
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-1 flex-wrap">
              {isPracticeMode ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E4F2F0] text-[#0D9488] dark:bg-teal-950/60 dark:text-teal-300">
                    Practice Trial {practiceIndex + 1} of 3
                  </span>
                  <span className="text-xs text-[#73758C]">·</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EDEAF8] dark:bg-[#1E2552] text-xs font-medium text-[#6567C9] dark:text-[#A5A6F6]">
                    <span>Sequence:</span>
                    <strong className="text-sm font-black font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white">
                      {currentPracticeConfig.sequenceLength}
                    </strong>
                    <span>blocks</span>
                  </div>
                </>
              ) : isOfficialMode ? (
                <>
                  <span className="text-xs sm:text-sm font-bold text-[#252640] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    Level {level} of {TOTAL_LEVELS}
                  </span>
                  <span className="text-xs text-[#73758C]">·</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EDEAF8] dark:bg-[#1E2552] text-xs font-medium text-[#6567C9] dark:text-[#A5A6F6]">
                    <span>Sequence:</span>
                    <strong className="text-sm font-black font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white">
                      {seqLen}
                    </strong>
                    <span>blocks</span>
                  </div>
                </>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-[#252640] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  {phase === 'tutorialIntro' ? 'Tutorial & Practice Phase' : 'Pre-Experiment Briefing'}
                </span>
              )}
            </div>
          </div>

          {/* Practice Phase Header Indicator */}
          {isPracticeMode && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  Practice
                </div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white">
                  {practiceIndex + 1}/3
                </div>
              </div>
              <div className="flex gap-1.5">
                {PRACTICE_TRIALS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i < practiceIndex
                        ? 'bg-[#4A9B7F]'
                        : i === practiceIndex
                        ? 'bg-[#6567C9] scale-125'
                        : 'bg-[#E9E8F2] dark:bg-[#252E63]'
                    }`}
                  />
                ))}
              </div>
              <span className="hidden xs:inline-block px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50">
                Not Scored
              </span>
            </div>
          )}

          {/* Official Trials Header Indicator */}
          {isOfficialMode && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  Trial
                </div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white">
                  {trialNumber}/{TRIALS_PER_LEVEL}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  Correct
                </div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#4A9B7F]">
                  {correctTrials}
                </div>
              </div>
              {/* Trial progress dots */}
              <div className="flex gap-1 sm:gap-1.5">
                {Array.from({ length: TRIALS_PER_LEVEL }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < trialNumber - 1
                        ? 'bg-[#4A9B7F]'
                        : i === trialNumber - 1
                        ? 'bg-[#6567C9] scale-125'
                        : 'bg-[#E9E8F2] dark:bg-[#252E63]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10">

        {/* 1. TUTORIAL & PRACTICE INTRO SECTION */}
        {phase === 'tutorialIntro' && (
          <div className="text-center max-w-xl w-full animate-fade-in-up">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#E4F2F0] dark:bg-teal-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <Eye size={28} className="text-[#69AFA8] dark:text-teal-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4F2F0] dark:bg-teal-950/60 text-[#0D9488] dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={14} />
              Interactive Tutorial & Practice
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Backward Corsi Block Task
            </h2>

            <p className="text-xs sm:text-base text-[#73758C] dark:text-slate-300 leading-relaxed mb-4">
              Watch the highlighted blocks carefully. When the sequence ends, select the blocks in{' '}
              <strong className="text-[#252640] dark:text-white">REVERSE ORDER</strong> — tapping the{' '}
              <strong className="text-[#6567C9] dark:text-[#A5A6F6]">last block shown first</strong>.
            </p>

            {/* Visual Directional Tutorial Box */}
            <div className="bg-white dark:bg-[#15193B] rounded-2xl border border-[#E9E8F2] dark:border-[#252E63] p-4 sm:p-5 mb-5 text-left shadow-xs">
              <div className="text-xs font-bold text-[#6567C9] dark:text-[#A5A6F6] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info size={15} />
                How Reverse Recall Works (Visual Example)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Step 1: Presentation */}
                <div className="p-3.5 rounded-xl bg-[#F8F8FC] dark:bg-[#1A2248] border border-[#E9E8F2] dark:border-[#252E63]">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#6567C9] dark:text-[#A5A6F6]">
                    <Eye size={15} />
                    <span>STEP 1: WATCH SEQUENCE</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#73758C] dark:text-slate-400 mb-2.5">
                    Blocks highlight in forward presentation order:
                  </p>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#6567C9] text-white font-mono text-xs font-bold shadow-xs">
                      Box A <span className="text-[10px] opacity-80">(1st)</span>
                    </div>
                    <ArrowRight size={14} className="text-[#6567C9] flex-shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#6567C9] text-white font-mono text-xs font-bold shadow-xs">
                      Box B <span className="text-[10px] opacity-80">(2nd)</span>
                    </div>
                    <ArrowRight size={14} className="text-[#6567C9] flex-shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#6567C9] text-white font-mono text-xs font-bold shadow-xs ring-2 ring-amber-400">
                      Box C <span className="text-[10px] opacity-80">(Last)</span>
                    </div>
                  </div>
                </div>

                {/* Step 2: Reverse Recall */}
                <div className="p-3.5 rounded-xl bg-[#E4F2F0]/60 dark:bg-[#132E35] border border-[#69AFA8]/30">
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#4A9B7F] dark:text-emerald-400">
                    <Undo2 size={15} />
                    <span>STEP 2: REVERSE RECALL</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#73758C] dark:text-slate-300 mb-2.5">
                    Tap in <strong>reverse order</strong> (last block first!):
                  </p>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#4A9B7F] text-white font-mono text-xs font-bold shadow-xs ring-2 ring-emerald-300">
                      Box C <span className="text-[10px] opacity-90">(1st Tap)</span>
                    </div>
                    <ArrowRight size={14} className="text-[#4A9B7F] flex-shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#4A9B7F] text-white font-mono text-xs font-bold shadow-xs">
                      Box B <span className="text-[10px] opacity-90">(2nd Tap)</span>
                    </div>
                    <ArrowRight size={14} className="text-[#4A9B7F] flex-shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#4A9B7F] text-white font-mono text-xs font-bold shadow-xs">
                      Box A <span className="text-[10px] opacity-90">(3rd Tap)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Directional takeaway */}
              <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F0EEFB] dark:bg-[#1E2552] border border-[#6567C9]/20 text-xs text-[#474864] dark:text-slate-200">
                <RotateCcw size={16} className="text-[#6567C9] dark:text-[#A5A6F6] flex-shrink-0" />
                <span>
                  <strong>Directional Rule:</strong> Think <em>"Last In, First Out"</em>. The last block to illuminate must always be your first tap.
                </span>
              </div>
            </div>

            {/* Practice overview note */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-xl p-3.5 mb-6 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5 text-left">
              <Sparkles size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>
                You will complete <strong>3 practice trials</strong> (gradually increasing from 2 to 4 blocks) with feedback before the real assessment starts. Practice trials are <strong>not scored</strong> for research.
              </span>
            </div>

            <button
              onClick={() => {
                setPracticeIndex(0);
                startPracticeTrial(0);
              }}
              className="btn-primary px-8 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-base w-full sm:w-auto justify-center font-bold"
            >
              Begin Practice (3 Trials)
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 2. PRACTICE PHASE (Watching / Recall / Feedback) */}
        {isPracticeMode && (
          <div className="flex flex-col items-center gap-4 sm:gap-5 animate-fade-in w-full max-w-lg">
            {/* Practice trial banner */}
            <div className="flex items-center justify-between w-full px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Practice Trial {practiceIndex + 1} of 3</span>
              </div>
              <span className="text-[11px] font-normal opacity-90">
                {currentPracticeConfig.title}
              </span>
            </div>

            {/* Phase pill */}
            <div
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all text-center ${
                phase === 'practiceWatching'
                  ? 'bg-[#EDEAF8] text-[#6567C9] dark:bg-[#1E2552] dark:text-[#A5A6F6]'
                  : phase === 'practiceRecall'
                  ? 'bg-[#E4F2F0] text-[#69AFA8] dark:bg-teal-950/60 dark:text-teal-300'
                  : practiceLastResult === 'correct'
                  ? 'bg-[#D1EDE5] text-[#4A9B7F] dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-[#FCEFD9] text-[#D4813A] dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {phase === 'practiceWatching' && (
                <>
                  <Eye size={15} />
                  Watching sequence — do not tap
                </>
              )}
              {phase === 'practiceRecall' && (
                <>
                  <MousePointerClick size={15} />
                  Now tap the blocks in REVERSE order
                </>
              )}
              {phase === 'practiceFeedback' && practiceLastResult === 'correct' && (
                <>
                  <CheckCircle size={15} />
                  Practice Trial Correct!
                </>
              )}
              {phase === 'practiceFeedback' && practiceLastResult === 'incorrect' && (
                <>
                  <X size={15} />
                  Practice Trial Incorrect
                </>
              )}
            </div>

            {/* Prominent Sequence Number Text */}
            <div className="flex items-center justify-center gap-2.5 px-5 py-2 rounded-xl bg-white dark:bg-[#15193B] border border-[#E9E8F2] dark:border-[#252E63] shadow-xs">
              {phase === 'practiceWatching' ? (
                <div className="flex items-center gap-2 text-sm sm:text-base text-[#474864] dark:text-slate-300">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#73758C] dark:text-slate-400">
                    Sequence Length:
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace] text-[#6567C9] dark:text-[#A5A6F6] tracking-tight">
                    {currentPracticeConfig.sequenceLength}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#474864] dark:text-slate-300">
                    blocks
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm sm:text-base text-[#474864] dark:text-slate-300">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#73758C] dark:text-slate-400">
                    Selected:
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace] text-[#69AFA8] dark:text-[#5EEAD4] tracking-tight">
                    {practicePlayerResponse.length}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-[#9597AB]">/</span>
                  <span className="text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white tracking-tight">
                    {currentPracticeConfig.sequenceLength}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#474864] dark:text-slate-300">
                    blocks
                  </span>
                </div>
              )}
            </div>

            {/* Slightly Smaller Corsi Grid Container */}
            <div className="bg-white dark:bg-[#15193B] rounded-2xl border border-[#E9E8F2] dark:border-[#252E63] shadow-sm p-3.5 sm:p-7 max-w-full overflow-hidden transition-colors">
              <CorsiBoard
                highlighted={phase === 'practiceWatching' ? highlightedBlock : null}
                flashBlock={flashingBlock}
                playerResponse={practicePlayerResponse}
                disabled={phase !== 'practiceRecall'}
                onBlockClick={handlePracticeBlockClick}
              />
            </div>

            {/* Practice Recall Controls */}
            {phase === 'practiceRecall' && (
              <div className="flex gap-2.5 sm:gap-3">
                <button
                  onClick={handlePracticeClear}
                  disabled={practicePlayerResponse.length === 0}
                  className="btn-secondary text-xs sm:text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear response
                </button>
                <button
                  onClick={handlePracticeDone}
                  disabled={practicePlayerResponse.length === 0}
                  className="btn-primary text-xs sm:text-sm py-2 px-6 sm:px-7 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                  Done
                  <CheckCircle size={15} />
                </button>
              </div>
            )}

            {/* Detailed Practice Feedback Card */}
            {phase === 'practiceFeedback' && (
              <div
                className={`w-full rounded-2xl border p-4 sm:p-5 text-center shadow-sm animate-fade-in ${
                  practiceLastResult === 'correct'
                    ? 'bg-[#EAF7F3] dark:bg-emerald-950/40 border-[#4A9B7F]/30 dark:border-emerald-700/50'
                    : 'bg-[#FFF8EE] dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50'
                }`}
              >
                <h3 className="text-base sm:text-lg font-bold text-[#252640] dark:text-white mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
                  {practiceLastResult === 'correct'
                    ? `Practice Trial ${practiceIndex + 1} of 3 — Correct!`
                    : `Practice Trial ${practiceIndex + 1} of 3 — Incorrect`}
                </h3>

                <p className="text-xs text-[#73758C] dark:text-slate-300 mb-3 leading-relaxed">
                  {practiceLastResult === 'correct'
                    ? 'Well done! You correctly recalled the sequence in reverse order.'
                    : 'Remember: Tap the blocks in reverse order. The LAST block that lit up must be tapped first.'}
                </p>

                {/* Sequence Comparison */}
                <div className="bg-white dark:bg-[#15193B] rounded-xl border border-[#E9E8F2] dark:border-[#252E63] p-3 text-xs text-left space-y-1.5 mb-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[#73758C] dark:text-slate-400">
                    <span className="font-semibold text-[#252640] dark:text-slate-200">Sequence Presented:</span>
                    <span className="font-mono font-bold text-[#6567C9] dark:text-[#A5A6F6]">
                      {practiceSequence.map(b => `Block ${b + 1}`).join(' → ')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[#73758C] dark:text-slate-400 border-t border-[#E9E8F2] dark:border-[#252E63] pt-1.5">
                    <span className="font-semibold text-[#252640] dark:text-slate-200">Correct Reverse Order:</span>
                    <span className="font-mono font-bold text-[#4A9B7F] dark:text-emerald-400">
                      {[...practiceSequence].reverse().map(b => `Block ${b + 1}`).join(' → ')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[#73758C] dark:text-slate-400 border-t border-[#E9E8F2] dark:border-[#252E63] pt-1.5">
                    <span className="font-semibold text-[#252640] dark:text-slate-200">Your Selection:</span>
                    <span
                      className={`font-mono font-bold ${
                        practiceLastResult === 'correct' ? 'text-[#4A9B7F]' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {practicePlayerResponse.length > 0
                        ? practicePlayerResponse.map(b => `Block ${b + 1}`).join(' → ')
                        : 'None'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  {practiceLastResult === 'incorrect' && (
                    <button
                      onClick={handleRetryPracticeTrial}
                      className="btn-secondary text-xs py-2 px-4 justify-center"
                    >
                      <RotateCcw size={14} />
                      Retry Practice Trial
                    </button>
                  )}
                  <button
                    onClick={handleAdvancePractice}
                    className="btn-primary text-xs py-2 px-5 justify-center font-bold"
                  >
                    {practiceIndex < PRACTICE_TRIALS.length - 1
                      ? `Next Practice Trial (${practiceIndex + 2} of 3)`
                      : 'Proceed to Pre-Experiment Briefing'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PRE-EXPERIMENT WARNING SECTION */}
        {phase === 'preExperiment' && (
          <div className="text-center max-w-lg w-full animate-fade-in-up p-2 sm:p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-300 dark:border-amber-700">
              <AlertTriangle size={30} className="text-amber-600 dark:text-amber-400" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              Practice Complete — Official Study Session
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Pre-Experiment Briefing
            </h2>

            <p className="text-xs sm:text-sm text-[#73758C] dark:text-slate-300 leading-relaxed mb-4">
              You have completed all 3 practice trials. Please read the following requirement carefully before starting the official research session.
            </p>

            {/* Prominent Warning Callout */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-500 rounded-2xl p-4 sm:p-6 mb-5 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                  Critical Assessment Rule
                </span>
              </div>
              <p className="text-sm sm:text-base text-amber-950 dark:text-amber-100 leading-snug">
                <strong>Important: You must correctly recall at least 4 blocks to proceed to the next level.</strong>
              </p>
            </div>

            {/* Protocol Summary Card */}
            <div className="bg-white dark:bg-[#15193B] rounded-xl border border-[#E9E8F2] dark:border-[#252E63] p-4 text-left text-xs sm:text-sm text-[#474864] dark:text-slate-300 space-y-2.5 mb-6">
              <div className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-[#4A9B7F] flex-shrink-0 mt-0.5" />
                <span><strong>6 trials per level:</strong> Each level contains 6 sequences of the same length.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-[#4A9B7F] flex-shrink-0 mt-0.5" />
                <span><strong>Advancement threshold:</strong> You must correctly recall at least 4 out of 6 trials (4/6) to advance to the next level.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-[#6567C9] flex-shrink-0 mt-0.5" />
                <span><strong>Official research records:</strong> All responses in this phase will be recorded in the research database.</span>
              </div>
            </div>

            <button
              onClick={handleStartOfficialExperiment}
              className="btn-primary w-full justify-center py-3.5 sm:py-4 text-sm sm:text-base shadow-md font-bold"
              style={{ background: 'linear-gradient(135deg, #6567C9, #4B4DAA)' }}
            >
              Begin Official Experiment
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 4. OFFICIAL EXPERIMENT (Watching / Recall / Feedback) */}
        {isOfficialMode && (
          <div className="flex flex-col items-center gap-4 sm:gap-5 animate-fade-in w-full max-w-lg">
            {/* Phase pill */}
            <div
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all text-center ${
                phase === 'watching'
                  ? 'bg-[#EDEAF8] text-[#6567C9] dark:bg-[#1E2552] dark:text-[#A5A6F6]'
                  : phase === 'recall'
                  ? 'bg-[#E4F2F0] text-[#69AFA8] dark:bg-teal-950/60 dark:text-teal-300'
                  : lastResult === 'correct'
                  ? 'bg-[#D1EDE5] text-[#4A9B7F] dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-[#FCEFD9] text-[#D4813A] dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {phase === 'watching' && (
                <>
                  <Eye size={15} />
                  Watching sequence — do not tap
                </>
              )}
              {phase === 'recall' && (
                <>
                  <MousePointerClick size={15} />
                  Now tap the blocks in reverse order
                </>
              )}
              {phase === 'feedback' && lastResult === 'correct' && (
                <>
                  <CheckCircle size={15} />
                  Correct!
                </>
              )}
              {phase === 'feedback' && lastResult === 'incorrect' && (
                <>
                  <X size={15} />
                  Incorrect — continue to the next trial
                </>
              )}
            </div>

            {/* Prominent Sequence Number Text */}
            <div className="flex items-center justify-center gap-2.5 px-5 py-2 rounded-xl bg-white dark:bg-[#15193B] border border-[#E9E8F2] dark:border-[#252E63] shadow-xs">
              {phase === 'watching' ? (
                <div className="flex items-center gap-2 text-sm sm:text-base text-[#474864] dark:text-slate-300">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#73758C] dark:text-slate-400">
                    Sequence Length:
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace] text-[#6567C9] dark:text-[#A5A6F6] tracking-tight">
                    {seqLen}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#474864] dark:text-slate-300">
                    blocks
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm sm:text-base text-[#474864] dark:text-slate-300">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#73758C] dark:text-slate-400">
                    Selected:
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace] text-[#69AFA8] dark:text-[#5EEAD4] tracking-tight">
                    {playerResponse.length}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-[#9597AB]">/</span>
                  <span className="text-xl sm:text-2xl font-black font-['JetBrains_Mono',monospace] text-[#252640] dark:text-white tracking-tight">
                    {seqLen}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#474864] dark:text-slate-300">
                    blocks
                  </span>
                </div>
              )}
            </div>

            {/* Slightly Smaller Corsi Grid Container */}
            <div className="bg-white dark:bg-[#15193B] rounded-2xl border border-[#E9E8F2] dark:border-[#252E63] shadow-sm p-3.5 sm:p-7 max-w-full overflow-hidden transition-colors">
              <CorsiBoard
                highlighted={phase === 'watching' ? highlightedBlock : null}
                flashBlock={flashingBlock}
                playerResponse={playerResponse}
                disabled={phase !== 'recall'}
                onBlockClick={handleBlockClick}
              />
            </div>

            {/* Recall controls */}
            {phase === 'recall' && (
              <div className="flex gap-2.5 sm:gap-3">
                <button
                  onClick={handleClearResponse}
                  disabled={playerResponse.length === 0}
                  className="btn-secondary text-xs sm:text-sm py-2.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear response
                </button>
                <button
                  onClick={handleDone}
                  disabled={playerResponse.length === 0}
                  className="btn-primary text-xs sm:text-sm py-2.5 px-6 sm:px-7 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none font-bold"
                >
                  Done
                  <CheckCircle size={15} />
                </button>
              </div>
            )}

            {/* Trial Feedback */}
            {phase === 'feedback' && (
              <div
                className={`rounded-xl border p-4 sm:p-5 w-full max-w-sm text-center ${
                  lastResult === 'correct'
                    ? 'bg-[#D1EDE5] dark:bg-emerald-950/60 border-[#4A9B7F]/20'
                    : 'bg-[#FCEFD9] dark:bg-amber-950/60 border-[#F0CFA0]'
                }`}
              >
                <p className="text-xs sm:text-sm font-semibold text-[#252640] dark:text-white mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
                  {lastResult === 'correct' ? 'Correct sequence!' : 'Incorrect sequence'}
                </p>
                <p className="text-xs text-[#73758C] dark:text-slate-300">
                  {trialNumber < TRIALS_PER_LEVEL
                    ? `Next trial starting shortly... (${correctTrials}/${trialNumber} correct so far)`
                    : 'Level complete — calculating result...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. LEVEL COMPLETE */}
        {phase === 'levelComplete' && (
          <div className="text-center max-w-sm w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Level completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] dark:text-slate-300 mb-2.5 sm:mb-3">
              You answered {correctTrials} of {TRIALS_PER_LEVEL} trials correctly (threshold: 4/6).
            </p>
            <p className="text-xs sm:text-sm text-[#9597AB] mb-6 sm:mb-8">
              You're ready for the next sequence length.
              <br />
              Sequences will now contain{' '}
              <strong className="text-[#252640] dark:text-white font-['JetBrains_Mono',monospace]">
                {seqLen + 1}
              </strong>{' '}
              blocks.
            </p>
            <div className="bg-white dark:bg-[#15193B] rounded-xl border border-[#E9E8F2] dark:border-[#252E63] p-4 mb-6 sm:mb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2.5 sm:p-3 bg-[#F8F8FC] dark:bg-[#1A2248] rounded-lg">
                  <div className="text-xs text-[#73758C] dark:text-slate-400 mb-1">Level Reached</div>
                  <div className="text-lg sm:text-xl font-bold text-[#252640] dark:text-white font-['JetBrains_Mono',monospace]">
                    {level}
                  </div>
                </div>
                <div className="text-center p-2.5 sm:p-3 bg-[#F8F8FC] dark:bg-[#1A2248] rounded-lg">
                  <div className="text-xs text-[#73758C] dark:text-slate-400 mb-1">Level Accuracy</div>
                  <div className="text-lg sm:text-xl font-bold text-[#4A9B7F] font-['JetBrains_Mono',monospace]">
                    {Math.round((correctTrials / TRIALS_PER_LEVEL) * 100)}%
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleNextLevel}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm font-bold"
            >
              Begin Level {level + 1}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* 6. TASK COMPLETE */}
        {phase === 'taskComplete' && (
          <div className="text-center max-w-sm w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] dark:text-white mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] dark:text-slate-300 mb-6 sm:mb-8">
              Thank you for completing the Backward Corsi Block Task.
            </p>

            <button
              onClick={handleFinish}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md font-bold"
              style={{ background: 'linear-gradient(135deg, #69AFA8, #4A9B7F)' }}
            >
              Return to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
