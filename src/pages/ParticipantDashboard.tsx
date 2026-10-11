import { useState, useEffect, useRef } from 'react';
import { Page, ParticipantSession, ExperimentStatus, RoomUnlockStatus } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import { HanoiVisual, CorsiVisual, StroopVisual, TaskSwitchingVisual } from '../components/TaskVisuals';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Layers,
  Grid3X3,
  Zap,
  Repeat,
  Sparkles,
  Check,
  Lock,
  Unlock,
  RotateCcw,
  Info,
  AlertTriangle,
} from 'lucide-react';
import {
  refreshParticipantSessionStatus,
  checkRooms3And4Access,
  getStoredSessionContext,
} from '../services/participantService';

interface Props {
  navigate: (page: Page) => void;
  participant: ParticipantSession;
}

interface InterruptedModalData {
  id: string;
  title: string;
  roomPage: Page;
  recordedTrials: number;
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

function formatRemainingShort(seconds: number): string {
  if (seconds <= 0) return 'Ready';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function ParticipantDashboard({ navigate, participant }: Props) {
  const [currentParticipant, setCurrentParticipant] = useState<ParticipantSession>(participant);
  const [interruptedModalTask, setInterruptedModalTask] = useState<InterruptedModalData | null>(null);
  const [showUnlockAlertModal, setShowUnlockAlertModal] = useState<boolean>(false);
  const [unlockStatus, setUnlockStatus] = useState<RoomUnlockStatus | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const lastSyncRef = useRef<{ serverRemaining: number; syncPerfTime: number } | null>(null);

  // Sync latest session status and trial counts directly from Supabase on mount
  useEffect(() => {
    refreshParticipantSessionStatus(participant).then(updated => {
      setCurrentParticipant(updated);
    });
    const sid = participant.sessionId || currentParticipant.sessionId || getStoredSessionContext()?.sessionId;
    if (sid) {
      checkRooms3And4Access(sid).then(st => {
        setUnlockStatus(st);
        setRemainingSeconds(st.remainingSeconds);
        lastSyncRef.current = {
          serverRemaining: st.remainingSeconds,
          syncPerfTime: performance.now(),
        };

        // Show celebration alert once if newly unlocked
        if (st.unlocked && st.room2Started) {
          const alertKey = `mindlab_unlock_alert_shown_${sid}`;
          if (sessionStorage.getItem(alertKey) !== 'true') {
            setShowUnlockAlertModal(true);
            sessionStorage.setItem(alertKey, 'true');
          }
        }
      });
    }
  }, [participant]);

  // Monotonic ticker unaffected by OS date/clock alteration
  useEffect(() => {
    if (!unlockStatus || unlockStatus.unlocked || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      if (!lastSyncRef.current) return;
      const elapsedSec = Math.floor((performance.now() - lastSyncRef.current.syncPerfTime) / 1000);
      const updatedRemaining = Math.max(0, lastSyncRef.current.serverRemaining - elapsedSec);
      setRemainingSeconds(updatedRemaining);

      if (updatedRemaining <= 0) {
        // Countdown elapsed: trigger unlock state and show celebration alert immediately
        setUnlockStatus(prev => prev ? { ...prev, unlocked: true, remainingSeconds: 0 } : null);
        setCurrentParticipant(prev => ({ ...prev, rooms3And4Unlocked: true }));
        setShowUnlockAlertModal(true);

        const sid = currentParticipant.sessionId || participant.sessionId || getStoredSessionContext()?.sessionId;
        if (sid) {
          sessionStorage.setItem(`mindlab_unlock_alert_shown_${sid}`, 'true');
          checkRooms3And4Access(sid).then(st => {
            setUnlockStatus(st);
            setRemainingSeconds(st.remainingSeconds);
            if (st.unlocked) {
              setCurrentParticipant(prev => ({ ...prev, rooms3And4Unlocked: true }));
            }
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockStatus, remainingSeconds, currentParticipant.sessionId, participant.sessionId]);

  // Compute 3-state experiment status for each of the 4 cognitive tasks
  const hanoiStatus: ExperimentStatus =
    currentParticipant.hanoiStatus ||
    (currentParticipant.hanoiCompleted
      ? 'completed'
      : (currentParticipant.hanoiProgressCount || 0) > 0
      ? 'in_progress'
      : 'not_started');

  const corsiStatus: ExperimentStatus =
    currentParticipant.corsiStatus ||
    (currentParticipant.corsiCompleted
      ? 'completed'
      : (currentParticipant.corsiProgressCount || 0) > 0
      ? 'in_progress'
      : 'not_started');

  const stroopStatus: ExperimentStatus =
    currentParticipant.stroopStatus ||
    (currentParticipant.stroopCompleted
      ? 'completed'
      : (currentParticipant.stroopProgressCount || 0) > 0
      ? 'in_progress'
      : 'not_started');

  const taskSwitchingStatus: ExperimentStatus =
    currentParticipant.taskSwitchingStatus ||
    (currentParticipant.taskSwitchingCompleted
      ? 'completed'
      : (currentParticipant.taskSwitchingProgressCount || 0) > 0
      ? 'in_progress'
      : 'not_started');

  const totalActivities = 4;
  const completedActivities =
    (hanoiStatus === 'completed' ? 1 : 0) +
    (corsiStatus === 'completed' ? 1 : 0) +
    (stroopStatus === 'completed' ? 1 : 0) +
    (taskSwitchingStatus === 'completed' ? 1 : 0);

  const hasInterrupted =
    hanoiStatus === 'in_progress' ||
    corsiStatus === 'in_progress' ||
    stroopStatus === 'in_progress' ||
    taskSwitchingStatus === 'in_progress';

  const progressPct = (completedActivities / totalActivities) * 100;
  const allDone = completedActivities === totalActivities;

  const isRoom2Started = Boolean(
    unlockStatus?.room2Started ||
    currentParticipant.room2StartedAt ||
    (currentParticipant.corsiProgressCount || 0) > 0 ||
    currentParticipant.corsiCompleted
  );

  const areRooms3And4Unlocked = Boolean(
    unlockStatus
      ? unlockStatus.unlocked
      : (currentParticipant.rooms3And4Unlocked && isRoom2Started)
  );

  const challengeStages = [
    {
      id: 'hanoi',
      label: 'STRATEGY',
      title: 'Tower of Hanoi',
      status: hanoiStatus,
      progressCount: currentParticipant.hanoiProgressCount || 0,
      color: '#6D5AE6',
      bg: '#EDEAF8',
      locked: false,
    },
    {
      id: 'corsi',
      label: 'MEMORY',
      title: 'Backward Corsi',
      status: corsiStatus,
      progressCount: currentParticipant.corsiProgressCount || 0,
      color: '#0D9488',
      bg: '#E4F5F2',
      locked: false,
    },
    {
      id: 'stroop',
      label: 'ATTENTION',
      title: 'Stroop Task',
      status: stroopStatus,
      progressCount: currentParticipant.stroopProgressCount || 0,
      color: '#EF4444',
      bg: '#FDF0EE',
      locked: !areRooms3And4Unlocked && stroopStatus !== 'completed',
    },
    {
      id: 'task-switching',
      label: 'FLEXIBILITY',
      title: 'Task Switching',
      status: taskSwitchingStatus,
      progressCount: currentParticipant.taskSwitchingProgressCount || 0,
      color: '#2563EB',
      bg: '#EEF4FF',
      locked: !areRooms3And4Unlocked && taskSwitchingStatus !== 'completed',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#11152F] font-['Inter',sans-serif]">
      {/* Participant Navigation */}
      <ParticipantNav navigate={navigate} participantId={currentParticipant.id} />

      <div className="max-w-7xl mx-auto px-4 sm:px-10 py-6 sm:py-10">
        {/* ─── HEADER SECTION ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-[#6D5AE6] uppercase tracking-[0.15em] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
              Active Research Session
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              Welcome, {currentParticipant.name.split(' ')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
              Choose your cognitive challenge. Rooms 3 &amp; 4 unlock 24 hours after Room 2 is started.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-[#E2E8F0] shadow-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-semibold text-[#64748B]">ID:</span>
              <span className="text-xs font-bold text-[#11152F] font-['JetBrains_Mono',monospace]">
                {currentParticipant.id}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 24-HOUR WAITING INTERVAL BANNER ────────────────────────── */}
        {isRoom2Started && !areRooms3And4Unlocked && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-[#EDEAF8] via-[#EEF4FF] to-[#EDEAF8] border-2 border-[#C5C1F1] rounded-2xl p-4 sm:p-6 shadow-sm animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white text-[#6D5AE6] flex items-center justify-center flex-shrink-0 shadow-xs border border-[#C5C1F1]">
                  <Clock size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6D5AE6] font-['Plus_Jakarta_Sans',sans-serif]">
                      Study Protocol 24-Hour Interval Active
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif]">
                      <Lock size={10} /> Rooms 3 &amp; 4 Locked
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[#11152F] mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
                    Unlocks in <span className="font-['JetBrains_Mono',monospace] text-[#6D5AE6]">{formatRemainingDetailed(remainingSeconds)}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
                    Under our research design, Room 3 (Stroop) and Room 4 (Task Switching) unlock exactly 24 hours after you start Room 2. An on-screen notification will appear right here when your next levels are unlocked. You may safely exit and resume anytime using your Name and Email.
                  </p>
                </div>
              </div>
              {unlockStatus?.unlockAt && (
                <div className="bg-white dark:bg-[#162036] px-4 py-2.5 rounded-xl border border-[#C5C1F1] dark:border-[#2A374F] text-left sm:text-right flex-shrink-0 shadow-xs">
                  <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Target Unlock Time
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#11152F] dark:text-white font-['JetBrains_Mono',monospace] mt-0.5">
                    {new Date(unlockStatus.unlockAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ROOMS 3 & 4 UNLOCKED NOTIFICATION BANNER ────────────────── */}
        {isRoom2Started && areRooms3And4Unlocked && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-[#D1EDE5] via-[#E4F5F2] to-[#D1EDE5] dark:from-[#064E3B]/40 dark:via-[#065F46]/30 dark:to-[#064E3B]/40 border-2 border-[#10B981] dark:border-[#059669] rounded-2xl p-4 sm:p-6 shadow-sm animate-pop-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#059669] dark:text-[#34D399] font-['Plus_Jakarta_Sans',sans-serif]">
                      Study Protocol Update
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#065F46] dark:text-[#6EE7B7] border border-[#10B981]/40 flex items-center gap-1 font-['Plus_Jakarta_Sans',sans-serif]">
                      <Unlock size={10} /> Rooms 3 &amp; 4 Unlocked!
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-[#11152F] dark:text-white mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
                    🎉 Room 3 &amp; Room 4 are now officially unlocked and ready to solve!
                  </h2>
                  <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
                    The 24-hour interval has elapsed. You can now proceed with <strong>Room 03 (Stroop Attention Task)</strong> and <strong>Room 04 (Task Switching Flexibility)</strong> below.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── RETURNING PARTICIPANT RECOGNITION BANNER ───────────────── */}
        {(completedActivities > 0 || hasInterrupted) && (
          <div className="mb-6 p-4 rounded-2xl bg-[#EDEAF8]/70 border border-[#C5C1F1]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#6D5AE6] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif]">
                  Returning Participant Session Restored
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Welcome back! Your previous progress has been safely loaded. You can launch your unfinished challenges below.
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-[#6D5AE6] bg-white px-3 py-1.5 rounded-lg border border-[#C5C1F1] self-start sm:self-auto flex items-center gap-1.5 font-['JetBrains_Mono',monospace]">
              <span>ID:</span>
              <span>{currentParticipant.id}</span>
            </div>
          </div>
        )}

        {/* ─── COGNITIVE CHALLENGE PROGRESS TRACKER ────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-7 shadow-xs mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                Cognitive Challenge Progress
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <span className="text-base sm:text-lg font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif]">
                  {completedActivities} of {totalActivities} Challenges Completed
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] ${
                    allDone
                      ? 'bg-[#D1EDE5] text-[#0D9488]'
                      : completedActivities > 0
                      ? 'bg-[#EDEAF8] text-[#6D5AE6]'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {allDone ? '✓ All Completed' : completedActivities > 0 ? 'In Progress' : 'Not Started'}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#94A3B8] font-medium hidden md:block">
              Tasks can be completed in any order
            </div>
          </div>

          {/* 4 Interactive Stage Nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 relative">
            {challengeStages.map((stage, idx) => {
              const isCompleted = stage.status === 'completed';
              const isInProgress = stage.status === 'in_progress';

              return (
                <div
                  key={stage.id}
                  className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 flex items-center gap-2.5 sm:gap-3.5 ${
                    isCompleted
                      ? 'border-[#A7F3D0] bg-[#F0FDF4] shadow-xs'
                      : isInProgress
                      ? 'border-[#FDE68A] bg-[#FEFDF2] shadow-xs'
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] flex-shrink-0"
                    style={{
                      background: isCompleted ? stage.color : isInProgress ? '#D97706' : '#E2E8F0',
                      color: isCompleted || isInProgress ? '#FFFFFF' : '#64748B',
                    }}
                  >
                    {isCompleted ? (
                      <Check size={14} strokeWidth={3} className="sm:w-4 sm:h-4" />
                    ) : isInProgress ? (
                      <RotateCcw size={13} strokeWidth={2.5} className="sm:w-3.5 sm:h-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div className="min-w-0">
                    <div
                      className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]"
                      style={{ color: isCompleted ? stage.color : isInProgress ? '#D97706' : '#64748B' }}
                    >
                      {isCompleted ? '✓ Completed' : isInProgress ? 'In Progress' : stage.label}
                    </div>
                    <div className="text-[11px] sm:text-xs font-bold text-[#11152F] truncate font-['Plus_Jakarta_Sans',sans-serif]">
                      {stage.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Continuous Progress Bar */}
          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden mt-4 sm:mt-6">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, #6D5AE6 0%, #0D9488 50%, #2563EB 100%)',
              }}
            />
          </div>
        </div>

        {/* ─── 4 LARGE CHALLENGE CARDS (2x2 GRID) ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 mb-8 sm:mb-10">
          {/* ─── CARD 1: ROOM 01 — TOWER OF HANOI (Strategy) ────────────── */}
          <div
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              hanoiStatus === 'completed'
                ? 'border-[#D1EDE5] bg-white shadow-sm'
                : hanoiStatus === 'in_progress'
                ? 'border-[#FDE68A] bg-white hover:border-[#D97706] hover:shadow-xl hover:-translate-y-1'
                : 'border-[#E2E8F0] bg-white hover:border-[#6D5AE6] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className="sm:w-[42%] bg-[#EDEAF8] p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden">
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#6D5AE6] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 01
                </span>
                {hanoiStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D1EDE5] text-[#0D9488] border border-[#A7F3D0] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : hanoiStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#64748B] border border-[#E2E8F0] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-[0_8px_24px_rgba(109,90,230,0.14)] border border-[#C5C1F1]/50 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <HanoiVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/90 border border-[#C5C1F1] text-[#6D5AE6] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Strategy Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[58%] p-5 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#6D5AE6] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Strategy Challenge
                  </span>
                  {hanoiStatus === 'in_progress' && (
                    <span className="text-[11px] font-bold text-[#D97706]">
                      {currentParticipant.hanoiProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Tower of Hanoi
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed mb-3 sm:mb-4">
                  Planning & problem-solving
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Solve 6 multi-step disc manipulation puzzles of increasing complexity under strict rules.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#F1F3F9] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#64748B] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#11152F] font-bold">
                    <Layers size={14} className="text-[#6D5AE6]" />
                    <span>6 puzzles</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#6D5AE6]" />
                    <span>~12 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {hanoiStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#0D9488]" />
                    Challenge Completed
                  </button>
                ) : hanoiStatus === 'in_progress' ? (
                  <button
                    onClick={() =>
                      setInterruptedModalTask({
                        id: 'hanoi',
                        title: 'Tower of Hanoi',
                        roomPage: 'hanoi-room',
                        recordedTrials: currentParticipant.hanoiProgressCount || 0,
                      })
                    }
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#D97706] hover:bg-[#B45309] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.35)] transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('hanoi-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#6D5AE6] hover:bg-[#5B48D9] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(109,90,230,0.35)] hover:shadow-[0_6px_22px_rgba(109,90,230,0.5)] transition-all cursor-pointer"
                  >
                    Enter challenge
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── CARD 2: ROOM 02 — BACKWARD CORSI (Memory) ──────────────── */}
          <div
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              corsiStatus === 'completed'
                ? 'border-[#D1EDE5] bg-white shadow-sm'
                : corsiStatus === 'in_progress'
                ? 'border-[#FDE68A] bg-white hover:border-[#D97706] hover:shadow-xl hover:-translate-y-1'
                : 'border-[#E2E8F0] bg-white hover:border-[#0D9488] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className="sm:w-[42%] bg-[#E4F5F2] p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden">
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#0D9488] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 02
                </span>
                {corsiStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D1EDE5] text-[#0D9488] border border-[#A7F3D0] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : corsiStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#64748B] border border-[#E2E8F0] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-[0_8px_24px_rgba(13,148,136,0.14)] border border-[#0D9488]/30 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <CorsiVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/90 border border-[#8DC4BE] text-[#0D9488] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Memory Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[58%] p-5 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#0D9488] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Memory Challenge
                  </span>
                  {corsiStatus === 'in_progress' && (
                    <span className="text-[11px] font-bold text-[#D97706]">
                      {currentParticipant.corsiProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Backward Corsi Block
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed mb-3 sm:mb-4">
                  Spatial working memory
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Memorize sequences of highlighted blocks on a 3×3 grid and recall them in reverse order.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#F1F3F9] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#64748B] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#11152F] font-bold">
                    <Grid3X3 size={14} className="text-[#0D9488]" />
                    <span>8 levels</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#0D9488]" />
                    <span>~8–10 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {corsiStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#0D9488]" />
                    Challenge Completed
                  </button>
                ) : corsiStatus === 'in_progress' ? (
                  <button
                    onClick={() =>
                      setInterruptedModalTask({
                        id: 'corsi',
                        title: 'Backward Corsi Block',
                        roomPage: 'corsi-room',
                        recordedTrials: currentParticipant.corsiProgressCount || 0,
                      })
                    }
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#D97706] hover:bg-[#B45309] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.35)] transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('corsi-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#0D9488] hover:bg-[#0B7A70] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(13,148,136,0.35)] hover:shadow-[0_6px_22px_rgba(13,148,136,0.5)] transition-all cursor-pointer"
                  >
                    Enter challenge
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── CARD 3: ROOM 03 — STROOP TASK (Attention) ──────────────── */}
          <div
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              stroopStatus === 'completed'
                ? 'border-[#D1EDE5] bg-white shadow-sm'
                : !areRooms3And4Unlocked
                ? 'border-[#FECACA] bg-white opacity-95'
                : stroopStatus === 'in_progress'
                ? 'border-[#FDE68A] bg-white hover:border-[#D97706] hover:shadow-xl hover:-translate-y-1'
                : 'border-[#E2E8F0] bg-white hover:border-[#EF4444] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className={`sm:w-[42%] ${!areRooms3And4Unlocked ? 'bg-[#FDF2F2]' : 'bg-[#FDF0EE]'} p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden`}>
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#EF4444] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 03
                </span>
                {stroopStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D1EDE5] text-[#0D9488] border border-[#A7F3D0] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : !areRooms3And4Unlocked ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Lock size={11} strokeWidth={2.5} /> Locked
                  </span>
                ) : stroopStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#64748B] border border-[#E2E8F0] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-[0_8px_24px_rgba(239,68,68,0.14)] border border-[#EF4444]/30 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <StroopVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/90 border border-[#FCA5A5] text-[#EF4444] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Attention Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[58%] p-5 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#EF4444] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Attention Challenge
                  </span>
                  {stroopStatus === 'in_progress' && areRooms3And4Unlocked && (
                    <span className="text-[11px] font-bold text-[#D97706]">
                      {currentParticipant.stroopProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Stroop Task
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed mb-3 sm:mb-4">
                  Selective attention & control
                </p>

                {/* Lock Status Notice */}
                {!areRooms3And4Unlocked && stroopStatus !== 'completed' && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[11px] sm:text-xs text-[#DC2626] flex items-center gap-2 font-medium">
                    <Lock size={13} className="flex-shrink-0" />
                    <span>
                      {isRoom2Started
                        ? `Available in ${formatRemainingDetailed(remainingSeconds)}`
                        : 'Unlocks 24 hours after starting Room 2'}
                    </span>
                  </div>
                )}

                {/* Subtitle / Description */}
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Classify font ink colors (R/G/B/Y) while resolving cognitive semantic interference.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#F1F3F9] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#64748B] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#11152F] font-bold">
                    <Zap size={14} className="text-[#EF4444]" />
                    <span>128 trials</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#EF4444]" />
                    <span>~7 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {stroopStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#0D9488]" />
                    Challenge Completed
                  </button>
                ) : !areRooms3And4Unlocked ? (
                  <button
                    disabled
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
                    title={isRoom2Started ? `Locked under research protocol. Available in ${formatRemainingDetailed(remainingSeconds)}.` : 'Locked. Start Room 2 first.'}
                  >
                    <Lock size={15} className="text-[#94A3B8]" />
                    {isRoom2Started ? `Locked (Available in ${formatRemainingShort(remainingSeconds)})` : 'Locked (Start Room 2 First)'}
                  </button>
                ) : stroopStatus === 'in_progress' ? (
                  <button
                    onClick={() =>
                      setInterruptedModalTask({
                        id: 'stroop',
                        title: 'Stroop Task',
                        roomPage: 'stroop-room',
                        recordedTrials: currentParticipant.stroopProgressCount || 0,
                      })
                    }
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#D97706] hover:bg-[#B45309] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.35)] transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('stroop-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:shadow-[0_6px_22px_rgba(239,68,68,0.5)] transition-all cursor-pointer"
                  >
                    Enter challenge
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── CARD 4: ROOM 04 — TASK SWITCHING (Flexibility) ─────────── */}
          <div
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              taskSwitchingStatus === 'completed'
                ? 'border-[#D1EDE5] bg-white shadow-sm'
                : !areRooms3And4Unlocked
                ? 'border-[#FECACA] bg-white opacity-95'
                : taskSwitchingStatus === 'in_progress'
                ? 'border-[#FDE68A] bg-white hover:border-[#D97706] hover:shadow-xl hover:-translate-y-1'
                : 'border-[#E2E8F0] bg-white hover:border-[#2563EB] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className={`sm:w-[42%] ${!areRooms3And4Unlocked ? 'bg-[#FDF2F2]' : 'bg-[#EEF4FF]'} p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden`}>
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#2563EB] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 04
                </span>
                {taskSwitchingStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D1EDE5] text-[#0D9488] border border-[#A7F3D0] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : !areRooms3And4Unlocked ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Lock size={11} strokeWidth={2.5} /> Locked
                  </span>
                ) : taskSwitchingStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#64748B] border border-[#E2E8F0] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-[0_8px_24px_rgba(37,99,235,0.14)] border border-[#2563EB]/30 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <TaskSwitchingVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/90 border border-[#93C5FD] text-[#2563EB] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Flexibility Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[58%] p-5 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#2563EB] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Flexibility Challenge
                  </span>
                  {taskSwitchingStatus === 'in_progress' && areRooms3And4Unlocked && (
                    <span className="text-[11px] font-bold text-[#D97706]">
                      {currentParticipant.taskSwitchingProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
                  Task Switching
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed mb-3 sm:mb-4">
                  Cognitive flexibility
                </p>

                {/* Lock Status Notice */}
                {!areRooms3And4Unlocked && taskSwitchingStatus !== 'completed' && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[11px] sm:text-xs text-[#DC2626] flex items-center gap-2 font-medium">
                    <Lock size={13} className="flex-shrink-0" />
                    <span>
                      {isRoom2Started
                        ? `Available in ${formatRemainingDetailed(remainingSeconds)}`
                        : 'Unlocks 24 hours after starting Room 2'}
                    </span>
                  </div>
                )}

                {/* Subtitle / Description */}
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Categorize letter-number stimuli while alternating between letter and number decision rules.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#F1F3F9] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#64748B] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#11152F] font-bold">
                    <Repeat size={14} className="text-[#2563EB]" />
                    <span>64 trials</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#2563EB]" />
                    <span>~6 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {taskSwitchingStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#0D9488]" />
                    Challenge Completed
                  </button>
                ) : !areRooms3And4Unlocked ? (
                  <button
                    disabled
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
                    title={isRoom2Started ? `Locked under research protocol. Available in ${formatRemainingDetailed(remainingSeconds)}.` : 'Locked. Start Room 2 first.'}
                  >
                    <Lock size={15} className="text-[#94A3B8]" />
                    {isRoom2Started ? `Locked (Available in ${formatRemainingShort(remainingSeconds)})` : 'Locked (Start Room 2 First)'}
                  </button>
                ) : taskSwitchingStatus === 'in_progress' ? (
                  <button
                    onClick={() =>
                      setInterruptedModalTask({
                        id: 'task-switching',
                        title: 'Task Switching',
                        roomPage: 'task-switching-room',
                        recordedTrials: currentParticipant.taskSwitchingProgressCount || 0,
                      })
                    }
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#D97706] hover:bg-[#B45309] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(217,119,6,0.35)] transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('task-switching-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.5)] transition-all cursor-pointer"
                  >
                    Enter challenge
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── ALL CHALLENGES COMPLETED BANNER ────────────────────────── */}
        {allDone && (
          <div className="bg-gradient-to-r from-[#D1EDE5] via-[#E4F5F2] to-[#EDEAF8] rounded-3xl border border-[#0D9488]/30 p-5 sm:p-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6 animate-pop-in shadow-md mb-8">
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0D9488] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                <CheckCircle size={28} className="text-white sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif]">
                  All Four Challenges Completed!
                </h3>
                <p className="text-xs sm:text-sm text-[#0D9488] font-medium mt-0.5">
                  Your cognitive performance session has been successfully recorded. View your complete session summary below.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('task-completion')}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#11152F] hover:bg-[#1E2452] text-white flex items-center justify-center gap-2.5 shadow-lg flex-shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
            >
              View Summary
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ─── CONFIDENTIALITY / PROTOCOL FOOTER NOTE ──────────────────── */}
        <div className="flex items-start gap-3 text-xs text-[#94A3B8] px-2 py-4">
          <Lock size={14} className="mt-0.5 flex-shrink-0 text-[#64748B]" />
          <span>
            Challenges are configured for this academic research session. Performance metrics are recorded for empirical study purposes and protected under university research ethics standards.
          </span>
        </div>
      </div>

      {/* ─── INTERRUPTED SESSION PROTOCOL MODAL ───────────────────────── */}
      {interruptedModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11152F]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] text-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mx-auto mb-4 border border-[#FDE68A]">
              <RotateCcw size={28} />
            </div>
            <div className="text-[11px] font-bold text-[#D97706] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
              Interrupted Session Notice
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] mb-2">
              {interruptedModalTask.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed mb-4">
              You previously recorded{' '}
              <strong className="text-[#11152F]">
                {interruptedModalTask.recordedTrials} {interruptedModalTask.id === 'hanoi' ? 'puzzle(s)' : 'trial(s)'}
              </strong>{' '}
              in this challenge.
            </p>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 text-left mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[#11152F] mb-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                <Info size={14} className="text-[#6D5AE6]" />
                Cognitive Measurement Protocol
              </div>
              <p className="text-[11px] sm:text-xs text-[#64748B] leading-relaxed">
                Empirical cognitive metrics (working memory span, sequence recall, and task-switching reaction times) require continuous focus in an unbroken sitting. Resuming mid-sequence would compromise metric reliability.
              </p>
              <div className="mt-2 text-[11px] text-[#0D9488] font-medium flex items-center gap-1.5">
                <CheckCircle size={13} />
                <span>Your previous trial records remain preserved in research logs.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setInterruptedModalTask(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-[#64748B] hover:text-[#11152F] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  const room = interruptedModalTask.roomPage;
                  setInterruptedModalTask(null);
                  navigate(room);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#6D5AE6] hover:bg-[#5B48D9] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Start Fresh Attempt
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL UNLOCKED CELEBRATION ALERT MODAL ─────────────────── */}
      {showUnlockAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#11152F]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#162036] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-2 border-[#10B981] dark:border-[#059669] text-center animate-scale-up relative">
            <button
              onClick={() => setShowUnlockAlertModal(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#11152F] dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Close alert"
            >
              ✕
            </button>
            <div className="w-16 h-16 rounded-2xl bg-[#D1EDE5] dark:bg-[#064E3B]/60 text-[#0D9488] dark:text-[#34D399] flex items-center justify-center mx-auto mb-4 border border-[#A7F3D0] dark:border-[#059669] shadow-sm">
              <Sparkles size={32} />
            </div>
            <div className="text-[11px] font-extrabold text-[#0D9488] dark:text-[#34D399] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
              Study Protocol Update
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#11152F] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] mb-2">
              🎉 Room 3 &amp; Room 4 Unlocked!
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed mb-6 font-medium">
              The required interval has elapsed under our research protocol. You may now continue with <strong>Room 03 (Stroop Attention Task)</strong> and <strong>Room 04 (Task Switching Flexibility)</strong>!
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowUnlockAlertModal(false);
                  navigate('stroop-room');
                }}
                className="flex-1 py-3 px-5 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Room 03</span>
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => setShowUnlockAlertModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] text-[#64748B] dark:text-[#94A3B8] hover:text-[#11152F] dark:hover:text-white bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] transition-colors cursor-pointer"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
