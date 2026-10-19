import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Page,
  ParticipantSession,
  DEFAULT_HANOI_PUZZLES,
  HanoiPuzzleConfig,
  MAX_HANOI_ATTEMPTS,
  DISK_COLORS,
  HanoiMoveRecord,
  HanoiPuzzleResult,
  HanoiSessionResult,
} from '../types';
import ParticipantNav, { ConfirmExitModal } from '../components/ParticipantNav';
import { AlertTriangle, CheckCircle, ArrowRight, RotateCcw, Clock, Sparkles, LogOut } from 'lucide-react';
import {
  persistHanoiPuzzle,
  persistHanoiResults,
  getStoredSessionContext,
  getExperimentSessionOptions,
  getDataMeasurementsConfig,
  getHanoiPuzzlesConfig,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
  sessionId?: string;
  onComplete: (result: HanoiSessionResult) => void;
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function isGoalStateReached(current: number[][], goal: number[][]): boolean {
  if (current.length !== goal.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i].length !== goal[i].length) return false;
    for (let j = 0; j < current[i].length; j++) {
      if (current[i][j] !== goal[i][j]) return false;
    }
  }
  return true;
}

/**
 * BFS Solver to find the next optimal move from any state to goal state.
 * Used exclusively to provide visual arrows/guidance for Trials 1 & 2.
 */
function getNextTutorialMove(
  current: number[][],
  goal: number[][]
): { from: number; to: number; disk: number } | null {
  if (isGoalStateReached(current, goal)) return null;

  const stateKey = (r: number[][]) => r.map(col => col.join(',')).join('|');
  const targetKey = stateKey(goal);

  const queue: Array<{
    state: number[][];
    firstMove: { from: number; to: number; disk: number } | null;
  }> = [{ state: current, firstMove: null }];

  const visited = new Set<string>();
  visited.add(stateKey(current));

  while (queue.length > 0) {
    const { state, firstMove } = queue.shift()!;
    if (stateKey(state) === targetKey) {
      return firstMove;
    }

    for (let from = 0; from < 3; from++) {
      if (state[from].length === 0) continue;
      const disk = state[from][state[from].length - 1];

      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        const targetTop = state[to].length > 0 ? state[to][state[to].length - 1] : Infinity;

        if (disk < targetTop) {
          const nextState = state.map((r, idx) => {
            if (idx === from) return r.slice(0, -1);
            if (idx === to) return [...r, disk];
            return [...r];
          });
          const nextKey = stateKey(nextState);

          if (!visited.has(nextKey)) {
            visited.add(nextKey);
            queue.push({
              state: nextState,
              firstMove: firstMove || { from, to, disk },
            });
          }
        }
      }
    }
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
   Goal State Mini Preview Components (Exact visual match to interactive puzzle)
────────────────────────────────────────────────────────────────────────── */
function HanoiGoalDisk({ size, maxSize }: { size: number; maxSize: number }) {
  const widthPct = 22 + ((size - 1) / Math.max(maxSize - 1, 1)) * 62;
  const color = DISK_COLORS[size] || '#6567C9';
  return (
    <div
      className="select-none flex items-center justify-center transition-all"
      style={{
        width: `${widthPct}%`,
        height: 18,
        borderRadius: 6,
        backgroundColor: color,
        boxShadow: `0 2px 6px ${color}40`,
      }}
    />
  );
}

function HanoiGoalRod({
  disks,
  maxSize,
  rodLabel,
  boardHeight,
}: {
  disks: number[];
  maxSize: number;
  rodLabel: string;
  boardHeight: number;
}) {
  const poleHeight = boardHeight - 20;
  return (
    <div
      className="relative flex flex-col items-center select-none"
      style={{ flex: 1, height: boardHeight, padding: '0 8px' }}
    >
      {/* Mini Pole */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-t-full bg-[#C5C1F1]"
        style={{
          width: 6,
          height: poleHeight,
          bottom: 12,
        }}
      />
      {/* Mini Base */}
      <div
        className="absolute rounded-full bg-[#E9E8F2]"
        style={{
          bottom: 0,
          left: '6px',
          right: '6px',
          height: 10,
        }}
      />
      {/* Mini Disks (bottom to top, flex-col-reverse) */}
      <div
        className="absolute left-0 right-0 flex flex-col-reverse items-center"
        style={{ bottom: 10, gap: 3 }}
      >
        {disks.map((size, idx) => (
          <HanoiGoalDisk key={idx} size={size} maxSize={maxSize} />
        ))}
      </div>
      {/* Mini Rod Label */}
      <div
        className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-['Plus_Jakarta_Sans',sans-serif] bg-[#F8F8FC] text-[#73758C] border border-[#E9E8F2]"
      >
        {rodLabel}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Actual Interactive Board Components
────────────────────────────────────────────────────────────────────────── */
function HanoiDisk({ size, maxSize, isSelected }: { size: number; maxSize: number; isSelected: boolean }) {
  const widthPct = 22 + ((size - 1) / Math.max(maxSize - 1, 1)) * 62;
  const color = DISK_COLORS[size] || '#6567C9';
  return (
    <div
      className={`hanoi-disk ${isSelected ? 'selected' : ''}`}
      style={{
        width: `${widthPct}%`,
        backgroundColor: color,
        boxShadow: `0 2px 8px ${color}40`,
      }}
    />
  );
}

function HanoiRod({
  disks,
  maxSize,
  rodLabel,
  isSelected,
  isHovered,
  isTutorialSource,
  isTutorialTarget,
  onClick,
  boardHeight,
}: {
  disks: number[];
  maxSize: number;
  rodLabel: string;
  isSelected: boolean;
  isHovered: boolean;
  isTutorialSource?: boolean;
  isTutorialTarget?: boolean;
  onClick: () => void;
  boardHeight: number;
}) {
  const poleHeight = boardHeight - 20;
  return (
    <div
      className={`relative flex flex-col items-center cursor-pointer rounded-2xl transition-all select-none px-1 sm:px-3 ${
        isHovered ? 'hanoi-rod-hover' : ''
      } ${isTutorialSource ? 'ring-2 ring-[#8B5CF6]/50 bg-[#8B5CF6]/5' : ''} ${
        isTutorialTarget ? 'ring-2 ring-dashed ring-[#4A9B7F]/60 bg-[#4A9B7F]/5' : ''
      }`}
      style={{ flex: 1, height: boardHeight }}
      onClick={onClick}
    >
      {/* Pole */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-t-full"
        style={{
          width: 8,
          height: poleHeight,
          bottom: 18,
          background: isSelected
            ? 'linear-gradient(180deg, #8183D4 0%, #6567C9 100%)'
            : isTutorialSource
            ? '#8B5CF6'
            : isHovered
            ? '#B8B5E8'
            : '#C5C1F1',
          transition: 'background 0.2s',
        }}
      />
      {/* Base */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: 0,
          left: '4px',
          right: '4px',
          height: 12,
          background: isSelected ? '#A9A2E8' : '#E9E8F2',
          transition: 'background 0.2s',
        }}
      />
      {/* Disks */}
      <div
        className="absolute left-0 right-0 flex flex-col-reverse items-center"
        style={{ bottom: 12, gap: 3 }}
      >
        {disks.map((size, idx) => (
          <HanoiDisk
            key={idx}
            size={size}
            maxSize={maxSize}
            isSelected={isSelected && idx === disks.length - 1}
          />
        ))}
      </div>
      {/* Rod label */}
      <div
        className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold font-['Plus_Jakarta_Sans',sans-serif] transition-all"
        style={{
          background: isSelected ? '#6567C9' : isTutorialSource ? '#8B5CF6' : '#F8F8FC',
          color: isSelected || isTutorialSource ? 'white' : '#73758C',
          border: `1.5px solid ${isSelected ? '#6567C9' : isTutorialSource ? '#8B5CF6' : '#E9E8F2'}`,
        }}
      >
        {rodLabel}
      </div>
    </div>
  );
}

type GamePhase = 'playing' | 'pausing' | 'completed' | 'limitReached' | 'maxAttemptsReached' | 'allDone';

export default function TowerOfHanoiRoom({ navigate, participant, sessionId, onComplete }: Props) {
  const [puzzles, setPuzzles] = useState<HanoiPuzzleConfig[]>(() => {
    const loaded = getHanoiPuzzlesConfig().filter(p => p.enabled);
    return loaded.length > 0 ? loaded : DEFAULT_HANOI_PUZZLES;
  });
  const [puzzleIdx, setPuzzleIdx] = useState(() => {
    const startIdx = participant?.hanoiProgressCount || 0;
    return Math.min(startIdx, 5);
  });
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [rods, setRods] = useState<number[][]>(() => {
    const loaded = getHanoiPuzzlesConfig().filter(p => p.enabled);
    const list = loaded.length > 0 ? loaded : DEFAULT_HANOI_PUZZLES;
    const startIdx = Math.min(participant?.hanoiProgressCount || 0, Math.max(list.length - 1, 0));
    const initialPuzzle = list[startIdx] || DEFAULT_HANOI_PUZZLES[0];
    return initialPuzzle.initialState.map(r => [...r]);
  });
  const [selectedRod, setSelectedRod] = useState<number | null>(null);
  const [hoveredRod, setHoveredRod] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [invalidMoves, setInvalidMoves] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [showInvalid, setShowInvalid] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const isSubmittingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionOptionsRef = useRef(getExperimentSessionOptions());
  const sessionOptions = sessionOptionsRef.current;
  const dataConfigRef = useRef(getDataMeasurementsConfig());
  const dataConfig = dataConfigRef.current;

  // Move tracking & research metrics
  const currentMoveLogRef = useRef<HanoiMoveRecord[]>([]);
  const puzzleResultsRef = useRef<HanoiPuzzleResult[]>([]);
  const firstReactionTimeMsRef = useRef<number | null>(null);

  // Sync saved admin configuration on mount
  useEffect(() => {
    const fresh = getHanoiPuzzlesConfig().filter(p => p.enabled);
    if (fresh.length > 0) {
      setPuzzles(fresh);
    }
  }, []);

  const puzzle = puzzles[puzzleIdx] || DEFAULT_HANOI_PUZZLES[puzzleIdx] || DEFAULT_HANOI_PUZZLES[0];
  const diskCount = puzzle.diskCount;
  const moveLimit = puzzle.moveLimit;
  const boardHeight = diskCount === 3 ? 220 : diskCount === 4 ? 260 : 300;
  const goalPreviewHeight = diskCount === 5 ? 140 : diskCount === 4 ? 125 : 110;

  // First two trials have tutorial assistance
  const isTutorial = puzzleIdx < 2 && phase === 'playing';
  const tutorialMove = isTutorial ? getNextTutorialMove(rods, puzzle.goalState) : null;

  // Timer
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const initPuzzle = useCallback((idx: number, customPuzzles?: HanoiPuzzleConfig[]) => {
    const list = customPuzzles || puzzles;
    const p = list[idx] || DEFAULT_HANOI_PUZZLES[idx] || DEFAULT_HANOI_PUZZLES[0];
    setRods(p.initialState.map(r => [...r]));
    setSelectedRod(null);
    setHoveredRod(null);
    setMoves(0);
    setInvalidMoves(0);
    setElapsedMs(0);
    setPhase('playing');
    currentMoveLogRef.current = [];
    firstReactionTimeMsRef.current = null;
    isSubmittingRef.current = false;
    startTimeRef.current = Date.now();
  }, [puzzles]);

  const handleRodClick = (rodIndex: number) => {
    if (phase !== 'playing' || isSubmittingRef.current) return;

    if (selectedRod === null) {
      if (rods[rodIndex].length > 0) setSelectedRod(rodIndex);
      return;
    }
    if (rodIndex === selectedRod) {
      setSelectedRod(null);
      return;
    }

    const src = rods[selectedRod];
    const dest = rods[rodIndex];
    const movingDisk = src[src.length - 1];
    const destTop = dest[dest.length - 1];

    if (dest.length === 0 || destTop > movingDisk) {
      // Valid move
      const now = Date.now();
      if (firstReactionTimeMsRef.current === null && dataConfig.recordFirstMoveRt) {
        firstReactionTimeMsRef.current = now - startTimeRef.current;
      }

      currentMoveLogRef.current.push({
        moveNumber: moves + 1,
        sourceRod: selectedRod,
        destRod: rodIndex,
        diskSize: movingDisk,
        timestampMs: dataConfig.recordMoveTimestamps ? now : null,
        isValid: true,
      });

      const newRods = rods.map(r => [...r]);
      const disk = newRods[selectedRod].pop()!;
      newRods[rodIndex].push(disk);
      const newMoves = moves + 1;
      setRods(newRods);
      setMoves(newMoves);
      setSelectedRod(null);

      // Check completion: current state strictly matches trial goalState
      if (isGoalStateReached(newRods, puzzle.goalState)) {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        const pResult: HanoiPuzzleResult = {
          puzzleIndex: puzzleIdx,
          diskCount,
          moveLimit,
          validMoves: newMoves,
          invalidMoves,
          completionTimeMs: now - startTimeRef.current,
          firstReactionTimeMs: dataConfig.recordFirstMoveRt ? firstReactionTimeMsRef.current : null,
          outcome: 'Completed',
          moveLog: [...currentMoveLogRef.current],
          initialState: puzzle.initialState,
          goalState: puzzle.goalState,
          attemptNumber,
        };
        const existingIdx = puzzleResultsRef.current.findIndex(r => r.puzzleIndex === puzzleIdx);
        if (existingIdx >= 0) {
          puzzleResultsRef.current[existingIdx] = pResult;
        } else {
          puzzleResultsRef.current.push(pResult);
        }

        // Immediate persistence for live research data collection
        const activeSid = sessionId || getStoredSessionContext()?.sessionId;
        if (activeSid) {
          persistHanoiPuzzle(activeSid, pResult);
          if (puzzleIdx >= puzzles.length - 1) {
            const sessionResult: HanoiSessionResult = {
              puzzlesCompleted: puzzleResultsRef.current.filter(p => p.outcome === 'Completed').length,
              totalPuzzles: puzzles.length,
              totalTimeMs: puzzleResultsRef.current.reduce((s, p) => s + p.completionTimeMs, 0),
              totalValidMoves: puzzleResultsRef.current.reduce((s, p) => s + p.validMoves, 0),
              totalInvalidMoves: puzzleResultsRef.current.reduce((s, p) => s + p.invalidMoves, 0),
              puzzles: puzzleResultsRef.current,
            };
            persistHanoiResults(activeSid, sessionResult).catch(err => {
              console.error('[HanoiRoom] Error auto-persisting Hanoi session results on completion:', err);
            });
          }
        }

        // Stop timer immediately at the moment of actual puzzle completion
        if (timerRef.current) clearInterval(timerRef.current);

        // Natural pause (1.3s) before showing completion modal
        setPhase('pausing');
        setTimeout(() => {
          setPhase('completed');
        }, 1300);
      } else if (newMoves >= moveLimit) {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        const pResult: HanoiPuzzleResult = {
          puzzleIndex: puzzleIdx,
          diskCount,
          moveLimit,
          validMoves: newMoves,
          invalidMoves,
          completionTimeMs: now - startTimeRef.current,
          firstReactionTimeMs: dataConfig.recordFirstMoveRt ? firstReactionTimeMsRef.current : null,
          outcome: 'Move Limit Reached',
          moveLog: [...currentMoveLogRef.current],
          initialState: puzzle.initialState,
          goalState: puzzle.goalState,
          attemptNumber,
        };
        const existingIdx = puzzleResultsRef.current.findIndex(r => r.puzzleIndex === puzzleIdx);
        if (existingIdx >= 0) {
          puzzleResultsRef.current[existingIdx] = pResult;
        } else {
          puzzleResultsRef.current.push(pResult);
        }

        // Immediate persistence for live research data collection
        const activeSid = sessionId || getStoredSessionContext()?.sessionId;
        if (activeSid) {
          persistHanoiPuzzle(activeSid, pResult);
        }

        if (timerRef.current) clearInterval(timerRef.current);

        setPhase('pausing');
        setTimeout(() => {
          if (attemptNumber >= MAX_HANOI_ATTEMPTS) {
            // Discontinue / terminate Hanoi session after 3 unsuccessful attempts
            if (activeSid) {
              const sessionResult: HanoiSessionResult = {
                puzzlesCompleted: puzzleResultsRef.current.filter(p => p.outcome === 'Completed').length,
                totalPuzzles: puzzles.length,
                totalTimeMs: puzzleResultsRef.current.reduce((s, p) => s + p.completionTimeMs, 0),
                totalValidMoves: puzzleResultsRef.current.reduce((s, p) => s + p.validMoves, 0),
                totalInvalidMoves: puzzleResultsRef.current.reduce((s, p) => s + p.invalidMoves, 0),
                puzzles: puzzleResultsRef.current,
              };
              persistHanoiResults(activeSid, sessionResult).catch(err => {
                console.error('[HanoiRoom] Error auto-persisting session results on discontinue:', err);
              });
            }
            setPhase('maxAttemptsReached');
          } else {
            setPhase('limitReached');
          }
        }, 500);
      }
    } else {
      // Invalid move: record only if configured
      if (sessionOptions.recordInvalidMoves && dataConfig.recordInvalidMoveAttempts) {
        const now = Date.now();
        currentMoveLogRef.current.push({
          moveNumber: moves + 1,
          sourceRod: selectedRod,
          destRod: rodIndex,
          diskSize: movingDisk,
          timestampMs: dataConfig.recordMoveTimestamps ? now : null,
          isValid: false,
        });

        const newInvalid = invalidMoves + 1;
        setInvalidMoves(newInvalid);
      }

      setSelectedRod(null);
      setShowInvalid(true);
      setTimeout(() => setShowInvalid(false), 2500);
    }
  };

  // Continue to the next puzzle (for puzzles 0 through 4)
  const handleNextPuzzle = () => {
    if (puzzleIdx < puzzles.length - 1) {
      setPuzzleIdx(puzzleIdx + 1);
      setAttemptNumber(1);
      initPuzzle(puzzleIdx + 1);
    }
  };

  // Retry the exact same puzzle when move limit is reached
  const handleRetryPuzzle = () => {
    if (attemptNumber >= MAX_HANOI_ATTEMPTS) return;
    setAttemptNumber(prev => prev + 1);
    initPuzzle(puzzleIdx);
  };

  // Finish entire session (after puzzle 6 is completed or discontinue reached)
  const handleFinishActivity = () => {
    const totalValidMoves = puzzleResultsRef.current.reduce((s, p) => s + p.validMoves, 0);
    const totalInvalidMoves = puzzleResultsRef.current.reduce((s, p) => s + p.invalidMoves, 0);
    const totalTimeMs = puzzleResultsRef.current.reduce((s, p) => s + p.completionTimeMs, 0);
    const puzzlesCompleted = puzzleResultsRef.current.filter(p => p.outcome === 'Completed').length;

    const sessionResult: HanoiSessionResult = {
      puzzlesCompleted,
      totalPuzzles: puzzles.length,
      totalTimeMs,
      totalValidMoves,
      totalInvalidMoves,
      puzzles: puzzleResultsRef.current,
    };

    onComplete(sessionResult);
    setPhase('allDone');
    navigate('participant-dashboard');
  };

  const remaining = moveLimit - moves;
  const isLastPuzzle = puzzleIdx >= puzzles.length - 1;

  // Calculate SVG arrow coordinates for tutorial
  const getTutorialArrowPath = () => {
    if (!tutorialMove) return null;
    const xCoords = [100, 300, 500];
    const x1 = xCoords[tutorialMove.from];
    const x2 = xCoords[tutorialMove.to];
    const midX = (x1 + x2) / 2;
    const isAdjacent = Math.abs(tutorialMove.from - tutorialMove.to) === 1;
    const midY = isAdjacent ? 20 : 5;
    return {
      d: `M ${x1},75 Q ${midX},${midY} ${x2},75`,
      midX,
      midY,
    };
  };

  const arrowPath = getTutorialArrowPath();

  return (
    <div className="min-h-screen bg-[#EAF4F8] dark:bg-[#131F27] flex flex-col transition-colors">
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
      <div className="bg-white dark:bg-white border-b border-[#C5DCE4] px-4 sm:px-8 py-3 sm:py-4 transition-colors">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-between sm:justify-start w-full sm:w-auto gap-3 sm:gap-6">
            <div>
              <div className="text-[10px] font-black text-[#183B4A] dark:text-[#183B4A] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                Room 01 — Tower of Hanoi
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-[#183B4A] dark:text-[#183B4A] font-['Plus_Jakarta_Sans',sans-serif]">
                  Puzzle {puzzleIdx + 1} of {puzzles.length}
                </span>
                <span className="text-xs text-[#526E7B]">·</span>
                <span className="text-xs font-semibold text-[#20748F]">Attempt {attemptNumber} of {MAX_HANOI_ATTEMPTS}</span>
                <span className="text-xs text-[#526E7B]">·</span>
                <span className="text-xs font-medium text-[#526E7B]">{diskCount} discs</span>
              </div>
            </div>

            {/* Mobile Exit Option in room header */}
            <button
              onClick={() => setShowExit(true)}
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ml-auto"
              title="Exit puzzle and return to dashboard"
            >
              <LogOut size={13} />
              <span>Exit</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            {/* Puzzle progress dots */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {puzzles.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className={`rounded-full transition-all ${
                      i < puzzleIdx
                        ? 'w-2 h-2 bg-[#0D9488]'
                        : i === puzzleIdx
                        ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#4D91AD] ring-2 ring-[#4D91AD]/30'
                        : 'w-2 h-2 bg-[#C5DCE4]'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* HUD */}
          <div className="flex items-center gap-4 sm:gap-6">
            {sessionOptions.showMoveCounter && [
              { label: 'ATTEMPT', value: `${attemptNumber}/${MAX_HANOI_ATTEMPTS}`, mono: true, colorClass: 'text-[#20748F]' },
              { label: 'MOVES', value: moves, mono: true, colorClass: 'text-[#183B4A]' },
              { label: 'LIMIT', value: moveLimit, mono: true, colorClass: 'text-[#183B4A]' },
              {
                label: 'REMAINING',
                value: remaining,
                mono: true,
                colorClass: remaining <= 3 ? 'text-[#DC2626]' : remaining <= 8 ? 'text-[#D97706]' : 'text-[#183B4A]',
              },
            ].map(({ label, value, colorClass }) => (
              <div key={label} className="text-center">
                <div className="text-[8px] sm:text-[9px] font-bold text-[#526E7B] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                  {label}
                </div>
                <div
                  className={`text-base sm:text-xl font-bold font-['JetBrains_Mono',monospace] leading-none mt-0.5 ${colorClass}`}
                >
                  {value}
                </div>
              </div>
            ))}
            {sessionOptions.showTimer && (
              <>
                {sessionOptions.showMoveCounter && <div className="h-6 sm:h-8 w-px bg-[#C5DCE4]" />}
                <div className="text-center">
                  <div className="text-[8px] sm:text-[9px] font-bold text-[#526E7B] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
                    <Clock size={9} className="inline mr-0.5" /> TIME
                  </div>
                  <div className="text-sm sm:text-lg font-bold font-['JetBrains_Mono',monospace] text-[#183B4A] leading-none mt-0.5">
                    {formatTime(elapsedMs)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-8 py-4 sm:py-6">
        {/* Simplified Instructions */}
        <div className="bg-white dark:bg-white border border-[#C5DCE4] rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 mb-3 sm:mb-4 text-center text-xs sm:text-sm text-[#526E7B] max-w-xl shadow-xs transition-colors">
          <div className="font-bold text-[#183B4A] dark:text-[#183B4A]">Move the discs to match the Goal State.</div>
          <div className="text-[11px] sm:text-xs text-[#526E7B] mt-0.5 font-medium">
            Move one disc at a time. Never place a larger disc on a smaller disc.
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#20748F] font-medium mt-1.5 pt-1.5 border-t border-[#C5DCE4]">
            The dependent measure for Tower of Hanoi was the total number of moves taken to complete the last five trials, including the wrong moves.
          </div>
        </div>

        {/* GOAL STATE: Small, Compact Visual Preview (Exact miniature replica) */}
        <div className="w-full max-w-md bg-white dark:bg-white rounded-2xl border border-[#C5DCE4] shadow-xs px-3 sm:px-6 py-2 sm:py-3 mb-3 sm:mb-4 flex flex-col items-center animate-fade-in transition-colors">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <div className="w-2 h-2 rounded-full bg-[#4D91AD]" />
            <span className="text-[10px] sm:text-[11px] font-bold text-[#183B4A] dark:text-[#183B4A] uppercase tracking-widest font-['Plus_Jakarta_Sans',sans-serif]">
              Goal State
            </span>
          </div>
          <div className="flex gap-0 items-end w-full" style={{ height: goalPreviewHeight }}>
            {['A', 'B', 'C'].map((label, ri) => (
              <HanoiGoalRod
                key={ri}
                disks={puzzle.goalState[ri] || []}
                maxSize={diskCount}
                rodLabel={label}
                boardHeight={goalPreviewHeight}
              />
            ))}
          </div>
        </div>

        {/* Tutorial Guide Banner (Trials 1 and 2 Only) */}
        {isTutorial && tutorialMove && (
          <div className="w-full max-w-2xl mb-3 bg-[#EDEAF8] border border-[#C5C1F1] rounded-2xl px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm text-[#6567C9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white flex items-center justify-center text-[#6567C9] shadow-xs flex-shrink-0 font-bold text-xs">
                <Sparkles size={14} />
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">
                  Guided Tutorial (Trial {puzzleIdx + 1} of 2)
                </div>
                <div className="font-semibold text-[#252640] text-xs sm:text-sm">
                  {selectedRod === null
                    ? `Tap on the disc on Pole ${['A', 'B', 'C'][tutorialMove.from]} to move to Pole ${['A', 'B', 'C'][tutorialMove.to]}`
                    : selectedRod === tutorialMove.from
                    ? `Click Pole ${['A', 'B', 'C'][tutorialMove.to]} to place the disc`
                    : `Click Pole ${['A', 'B', 'C'][tutorialMove.from]} to select the correct disc`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg text-[11px] sm:text-xs font-bold text-[#6D5AE6] font-['JetBrains_Mono',monospace] border border-[#E9E8F2] flex-shrink-0">
              Pole {['A', 'B', 'C'][tutorialMove.from]} → Pole {['A', 'B', 'C'][tutorialMove.to]}
            </div>
          </div>
        )}

        {/* Invalid move toast */}
        {showInvalid && (
          <div className="animate-toast mb-3 sm:mb-4 flex items-center gap-2.5 sm:gap-3 bg-[#FCEFD9] border border-[#F0CFA0] text-[#8B5A1F] rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm shadow-sm">
            <AlertTriangle size={16} className="text-[#D4813A] flex-shrink-0" />
            <span className="font-medium">
              Invalid move — a larger disc cannot be placed on a smaller disc.
            </span>
          </div>
        )}

        {/* ACTUAL INTERACTIVE PUZZLE BOARD */}
        <div
          className="bg-white dark:bg-white rounded-3xl border border-[#C5DCE4] shadow-sm px-3 sm:px-10 pb-4 sm:pb-6 pt-6 sm:pt-10 w-full max-w-2xl relative overflow-hidden transition-colors"
          style={{ minHeight: boardHeight + 50 }}
        >
          {/* SVG Curved Tutorial Arrow (Trials 1 & 2 only) */}
          {isTutorial && arrowPath && (
            <div className="absolute top-2 left-4 sm:left-10 right-4 sm:right-10 pointer-events-none h-24 z-10">
              <svg
                viewBox="0 0 600 100"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <marker
                    id="hanoi-arrow-marker"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#4D91AD" />
                  </marker>
                </defs>
                <path
                  d={arrowPath.d}
                  fill="none"
                  stroke="#4D91AD"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  markerEnd="url(#hanoi-arrow-marker)"
                />
              </svg>
            </div>
          )}

          <div
            className="flex gap-0 items-end"
            style={{ height: boardHeight }}
            onMouseLeave={() => setHoveredRod(null)}
          >
            {['A', 'B', 'C'].map((label, ri) => (
              <HanoiRod
                key={ri}
                disks={rods[ri]}
                maxSize={diskCount}
                rodLabel={label}
                isSelected={selectedRod === ri}
                isHovered={hoveredRod === ri && selectedRod !== null && selectedRod !== ri}
                isTutorialSource={isTutorial && tutorialMove?.from === ri && selectedRod === null}
                isTutorialTarget={isTutorial && tutorialMove?.to === ri && selectedRod === tutorialMove?.from}
                onClick={() => handleRodClick(ri)}
                boardHeight={boardHeight}
              />
            ))}
          </div>
        </div>

        {/* Selection hint */}
        {selectedRod !== null && phase === 'playing' && (
          <div className="mt-4 text-xs text-[#20748F] dark:text-[#63B8C6] font-semibold animate-fade-in">
            Disc selected from Pole {['A', 'B', 'C'][selectedRod]} — click a destination pole to place it
          </div>
        )}
        {selectedRod === null && phase === 'playing' && !isTutorial && rods.some(r => r.length > 0) && (
          <div className="mt-4 text-xs text-[#526E7B] dark:text-[#A2C4D6] font-medium">Click a pole to select the top disc</div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-4 text-xs text-[#526E7B] dark:text-[#A2C4D6]">
          <span>
            Valid moves: <strong className="text-[#263B46] dark:text-[#F1F8FB] font-['JetBrains_Mono',monospace]">{moves}</strong>
          </span>
          <span>
            Invalid attempts: <strong className="text-[#DC2626] dark:text-[#F87171] font-['JetBrains_Mono',monospace]">{invalidMoves}</strong>
          </span>
        </div>

        {/* Mobile quick exit button */}
        <div className="sm:hidden mt-5 mb-2 flex justify-center w-full">
          <button
            onClick={() => setShowExit(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#DC2626] bg-rose-50/90 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            <LogOut size={14} />
            <span>Exit Puzzle</span>
          </button>
        </div>
      </div>

      {/* PUZZLE COMPLETION OVERLAY (Puzzles 1 through 5) */}
      {phase === 'completed' && !isLastPuzzle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#252640]/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl text-center animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Puzzle Completed!
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-5 sm:mb-6">
              Well done. You solved Puzzle {puzzleIdx + 1} of {puzzles.length}.
            </p>

            <button
              onClick={handleNextPuzzle}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #6567C9, #5052AC)' }}
            >
              Continue to Next Puzzle
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FINAL ACTIVITY COMPLETION OVERLAY (Puzzle 6 Finished) */}
      {phase === 'completed' && isLastPuzzle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#252640]/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl text-center animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D1EDE5] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CheckCircle size={28} className="text-[#4A9B7F] sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Activity Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-8">
              Thank you for completing the Tower of Hanoi task.
            </p>

            <button
              onClick={handleFinishActivity}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #6567C9, #5052AC)' }}
            >
              Return to Dashboard →
            </button>
          </div>
        </div>
      )}

      {/* MOVE LIMIT REACHED OVERLAY (Must Retry Same Puzzle, up to 3 attempts) */}
      {phase === 'limitReached' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#252640]/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl text-center animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FCEFD9] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <RotateCcw size={24} className="text-[#D4813A] sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Move Limit Reached
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-2 font-medium">
              Attempt {attemptNumber} of {MAX_HANOI_ATTEMPTS}
            </p>
            <p className="text-xs sm:text-sm text-[#73758C] mb-5 sm:mb-6">
              You reached the {moveLimit}-move limit before matching the Goal State. You have {MAX_HANOI_ATTEMPTS - attemptNumber} {MAX_HANOI_ATTEMPTS - attemptNumber === 1 ? 'attempt' : 'attempts'} remaining.
            </p>
            <button
              onClick={handleRetryPuzzle}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #6567C9, #5052AC)' }}
            >
              <RotateCcw size={16} />
              Try Again (Attempt {attemptNumber + 1} of {MAX_HANOI_ATTEMPTS})
            </button>
          </div>
        </div>
      )}

      {/* 3 ATTEMPTS EXCEEDED OVERLAY (Discontinue rule) */}
      {phase === 'maxAttemptsReached' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#252640]/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-5 sm:p-8 max-w-sm w-full mx-auto shadow-2xl text-center animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FCE8E6] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <AlertTriangle size={24} className="text-[#D93025] sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#252640] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Maximum Attempts Reached
            </h2>
            <p className="text-xs sm:text-sm text-[#73758C] mb-2 font-medium">
              3 of 3 Attempts Completed
            </p>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-8">
              You have completed all 3 allowed attempts for this puzzle. In accordance with the study protocol, your Tower of Hanoi session has concluded.
            </p>
            <button
              onClick={handleFinishActivity}
              className="btn-primary w-full justify-center py-3 sm:py-3.5 text-xs sm:text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #6567C9, #5052AC)' }}
            >
              Return to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
