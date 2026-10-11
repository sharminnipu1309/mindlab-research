import { useState, useEffect, useCallback, useRef } from 'react';
import { Page, ParticipantSession, CorsiTrialRecord, CorsiSessionResult } from '../types';
import ParticipantNav, { ConfirmExitModal } from '../components/ParticipantNav';
import { CheckCircle, X, ArrowRight, Eye, MousePointerClick } from 'lucide-react';
import {
  persistCorsiTrial,
  persistCorsiResults,
  getStoredSessionContext,
  getExperimentSessionOptions,
  getDataMeasurementsConfig,
  recordRoom2Start,
  triggerUnlockNotificationEmail,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
  sessionId?: string;
  onComplete: (result: CorsiSessionResult) => void;
}

type Phase = 'intro' | 'watching' | 'recall' | 'feedback' | 'levelComplete' | 'taskComplete';

const TOTAL_LEVELS = 8;
const TRIALS_PER_LEVEL = 6;
const REQUIRED_CORRECT = 4;
const HIGHLIGHT_DURATION = 600;
const INTER_BLOCK_PAUSE = 500;

function getSequenceLength(level: number) { return level + 1; }

function generateSequence(length: number): number[] {
  const indices = Array.from({ length: 9 }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, length);
}

function CorsiBoard({
  highlighted,
  flashBlock,
  disabled,
  onBlockClick,
}: {
  highlighted: number | null;
  flashBlock: number | null;
  disabled: boolean;
  onBlockClick: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
      {Array.from({ length: 9 }, (_, i) => {
        const isHighlighted = highlighted === i;
        const isFlashing = flashBlock === i;
        return (
          <div
            key={i}
            className={`corsi-block w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 ${
              isHighlighted ? 'highlighted' :
              isFlashing ? 'selected' :
              'bg-[#E9E8F2]'
            } ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onBlockClick(i)}
            style={{ cursor: disabled ? 'default' : 'pointer' }}
          />
        );
      })}
    </div>
  );
}

export default function CorsiRoom({ navigate, participant, sessionId, onComplete }: Props) {
  const [level, setLevel] = useState(1);
  const [trialNumber, setTrialNumber] = useState(1);
  const [correctTrials, setCorrectTrials] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [sequence, setSequence] = useState<number[]>([]);
  const [highlightedBlock, setHighlightedBlock] = useState<number | null>(null);
  const [flashingBlock, setFlashingBlock] = useState<number | null>(null);
  const [playerResponse, setPlayerResponse] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showExit, setShowExit] = useState(false);
  const sessionOptionsRef = useRef(getExperimentSessionOptions());
  const sessionOptions = sessionOptionsRef.current;
  const dataConfigRef = useRef(getDataMeasurementsConfig());
  const dataConfig = dataConfigRef.current;
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exact trial-level records and span tracking
  const allTrialsRef = useRef<CorsiTrialRecord[]>([]);
  const highestCompletedLevelRef = useRef<number>(0);
  const correctAtHighestCompletedLevelRef = useRef<number>(0);

  const seqLen = getSequenceLength(level);

  const clearAnimTimers = () => {
    if (animRef.current) clearTimeout(animRef.current);
  };

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

  // Record authoritative server/database timestamp immediately when Room 2 starts
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
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

        // Schedule unlock notification: 1 second after countdown finishes
        const remSec = status?.remainingSeconds ?? 5;
        const totalDelayMs = (Math.max(0, remSec) + 1) * 1000;
        console.log(`[CorsiRoom] Room 2 started. Next level unlocks in ${remSec}s. Email scheduled in ${totalDelayMs}ms.`);
        timer = setTimeout(() => {
          triggerUnlockNotificationEmail({
            sessionId: activeSid,
            recipientEmail: participant?.email || getStoredSessionContext()?.participantData?.email,
            participantName: participant?.name || getStoredSessionContext()?.participantData?.name,
            participantCode: participant?.id || getStoredSessionContext()?.participantData?.id,
            delayMs: 0,
          }).catch(err => {
            console.warn('[CorsiRoom] Auto-dispatch error:', err);
          });
        }, totalDelayMs);
      }).catch(err => {
        console.error('[CorsiRoom] Error recording Room 2 start timestamp:', err);
      });
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, participant?.id]);

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

  useEffect(() => () => {
    clearAnimTimers();
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

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

    // Required formulas:
    // Trial Accuracy = correct trials / total scored trials * 100
    const trialAccuracy = totalTrials > 0 ? (totalCorrectTrials / totalTrials) * 100 : 0;
    // Block-Position Accuracy = correct positions / total scored positions * 100 (null if disabled)
    const blockPositionAccuracy = dataConfig.recordBlockPositionAccuracy
      ? (totalScoredPositions > 0 ? (totalCorrectPositions / totalScoredPositions) * 100 : 0)
      : null;
    // Product Score = highest successfully completed sequence length * number of correct trials at that level
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

    // Record trial data
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
      // Send unlock email 1 second after finishing Room 2 (next level unlocked)
      triggerUnlockNotificationEmail({
        sessionId: activeSid,
        recipientEmail: participant?.email || getStoredSessionContext()?.participantData?.email,
        participantName: participant?.name || getStoredSessionContext()?.participantData?.name,
        participantCode: participant?.id || getStoredSessionContext()?.participantData?.id,
        delayMs: 1000,
      }).catch(() => {});
    }
    onComplete(result);
    navigate('participant-dashboard');
  };

  const currentResult = computeCorsiResult();

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
            <div className="text-[10px] font-bold text-[#69AFA8] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
              Room 02 — Backward Corsi Block Task
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-0.5">
              <span className="text-xs sm:text-sm font-bold text-[#252640] font-['Plus_Jakarta_Sans',sans-serif]">
                Level {level} of {TOTAL_LEVELS}
              </span>
              <span className="text-xs text-[#73758C]">·</span>
              <span className="text-xs text-[#73758C]">
                Sequence: <strong className="font-['JetBrains_Mono',monospace] text-[#252640]">{seqLen}</strong> blocks
              </span>
            </div>
          </div>

          {phase !== 'intro' && phase !== 'levelComplete' && phase !== 'taskComplete' && (
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">Trial</div>
                <div className="text-base sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#252640]">
                  {trialNumber}/{TRIALS_PER_LEVEL}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#9597AB] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">Correct</div>
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
                        : 'bg-[#E9E8F2]'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10">

        {/* INTRO */}
        {phase === 'intro' && (
          <div className="text-center max-w-lg w-full animate-fade-in-up">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#E4F2F0] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Eye size={26} className="text-[#69AFA8] sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              Backward Corsi Block Task
            </h2>
            <p className="text-xs sm:text-base text-[#73758C] leading-relaxed mb-2 sm:mb-3">
              Watch the highlighted blocks carefully. When the sequence ends, tap the blocks in <strong className="text-[#252640]">reverse order</strong> — last block first.
            </p>
            <p className="text-xs sm:text-sm text-[#9597AB] mb-6 sm:mb-8">
              The sequence will get longer as you progress through the levels. You must get at least 4 out of 6 trials correct to advance.
            </p>
            <div className="bg-white rounded-xl border border-[#E9E8F2] p-4 sm:p-5 mb-6 sm:mb-8 text-left text-xs sm:text-sm text-[#73758C] space-y-2.5">
              <div className="flex gap-3 items-center">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#6567C9] rounded-md flex-shrink-0" />
                <span>Blocks light up in <strong className="text-[#252640]">blue</strong> during presentation</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#69AFA8] rounded-md flex-shrink-0" />
                <span>Blocks flash briefly in <strong className="text-[#252640]">teal</strong> when clicked during recall</span>
              </div>
            </div>
            <button
              onClick={() => startTrial(level)}
              className="btn-primary px-8 sm:px-10 py-3 sm:py-3.5 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              Begin Activity
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* WATCHING / RECALL / FEEDBACK */}
        {(phase === 'watching' || phase === 'recall' || phase === 'feedback') && (
          <div className="flex flex-col items-center gap-4 sm:gap-6 animate-fade-in w-full">
            {/* Phase label */}
            <div className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] transition-all text-center ${
              phase === 'watching'
                ? 'bg-[#EDEAF8] text-[#6567C9]'
                : phase === 'recall'
                ? 'bg-[#E4F2F0] text-[#69AFA8]'
                : lastResult === 'correct'
                ? 'bg-[#D1EDE5] text-[#4A9B7F]'
                : 'bg-[#FCEFD9] text-[#D4813A]'
            }`}>
              {phase === 'watching' && (
                <>
                  <Eye size={15} />
                  Watching sequence — do not click
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

            {/* Instruction */}
            {phase === 'watching' && (
              <p className="text-xs text-[#9597AB] text-center">
                Sequence length: <strong className="font-['JetBrains_Mono',monospace] text-[#73758C]">{seqLen}</strong> blocks
              </p>
            )}
            {phase === 'recall' && (
              <p className="text-xs text-[#9597AB]">
                Selected: <strong className="font-['JetBrains_Mono',monospace] text-[#73758C]">{playerResponse.length}</strong> of {seqLen} blocks
              </p>
            )}

            {/* Board */}
            <div className="bg-white rounded-2xl border border-[#E9E8F2] shadow-sm p-4 sm:p-10 max-w-full overflow-hidden">
              <CorsiBoard
                highlighted={phase === 'watching' ? highlightedBlock : null}
                flashBlock={flashingBlock}
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
                  className="btn-primary text-xs sm:text-sm py-2.5 px-6 sm:px-7 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  Done
                  <CheckCircle size={15} />
                </button>
              </div>
            )}

            {/* Feedback */}
            {phase === 'feedback' && (
              <div className={`rounded-xl border p-4 sm:p-5 w-full max-w-sm text-center ${
                lastResult === 'correct'
                  ? 'bg-[#D1EDE5] border-[#4A9B7F]/20'
                  : 'bg-[#FCEFD9] border-[#F0CFA0]'
              }`}>
                <p className="text-xs sm:text-sm font-semibold text-[#252640] mb-1 font-['Plus_Jakarta_Sans',sans-serif]">
                  {lastResult === 'correct' ? 'Correct sequence!' : 'Incorrect sequence'}
                </p>
                <p className="text-xs text-[#73758C]">
                  {trialNumber < TRIALS_PER_LEVEL
                    ? `Next trial starting shortly... (${correctTrials}/${trialNumber} correct so far)`
                    : 'Level complete — calculating result...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* LEVEL COMPLETE */}
        {phase === 'levelComplete' && (
          <div className="text-center max-w-sm w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">Level completed</h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-2.5 sm:mb-3">
              You answered {correctTrials} of {TRIALS_PER_LEVEL} trials correctly (threshold: 4/6).
            </p>
            <p className="text-xs sm:text-sm text-[#9597AB] mb-6 sm:mb-8">
              You're ready for the next sequence length.
              <br />Sequences will now contain <strong className="text-[#252640] font-['JetBrains_Mono',monospace]">{seqLen + 1}</strong> blocks.
            </p>
            <div className="bg-white rounded-xl border border-[#E9E8F2] p-4 mb-6 sm:mb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2.5 sm:p-3 bg-[#F8F8FC] rounded-lg">
                  <div className="text-xs text-[#73758C] mb-1">Level Reached</div>
                  <div className="text-lg sm:text-xl font-bold text-[#252640] font-['JetBrains_Mono',monospace]">{level}</div>
                </div>
                <div className="text-center p-2.5 sm:p-3 bg-[#F8F8FC] rounded-lg">
                  <div className="text-xs text-[#73758C] mb-1">Level Accuracy</div>
                  <div className="text-lg sm:text-xl font-bold text-[#4A9B7F] font-['JetBrains_Mono',monospace]">
                    {Math.round((correctTrials / TRIALS_PER_LEVEL) * 100)}%
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleNextLevel} className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm">
              Begin Level {level + 1}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* TASK COMPLETE */}
        {phase === 'taskComplete' && (
          <div className="text-center max-w-sm w-full animate-pop-in p-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-8">
              Thank you for completing the Backward Corsi Block Task.
            </p>

            <button
              onClick={handleFinish}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md"
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

