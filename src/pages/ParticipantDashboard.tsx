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
  Home,
} from 'lucide-react';
import {
  refreshParticipantSessionStatus,
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

  // Sync latest session status and trial counts directly from Supabase on mount
  useEffect(() => {
    refreshParticipantSessionStatus(participant).then(updated => {
      setCurrentParticipant(updated);
    });
  }, [participant]);

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

  const challengeStages: Array<{
    id: string;
    label: string;
    title: string;
    status: ExperimentStatus;
    progressCount: number;
    color: string;
    bg: string;
    locked: boolean;
    roomPage: Page;
  }> = [
    {
      id: 'hanoi',
      label: 'STRATEGY',
      title: 'Tower of Hanoi',
      status: hanoiStatus,
      progressCount: currentParticipant.hanoiProgressCount || 0,
      color: '#435447',
      bg: '#EAF0EB',
      locked: false,
      roomPage: 'hanoi-room',
    },
    {
      id: 'corsi',
      label: 'MEMORY',
      title: 'Backward Corsi',
      status: corsiStatus,
      progressCount: currentParticipant.corsiProgressCount || 0,
      color: '#435447',
      bg: '#EAF0EB',
      locked: false,
      roomPage: 'corsi-room',
    },
    {
      id: 'stroop',
      label: 'ATTENTION',
      title: 'Stroop Task',
      status: stroopStatus,
      progressCount: currentParticipant.stroopProgressCount || 0,
      color: '#435447',
      bg: '#EAF0EB',
      locked: false,
      roomPage: 'stroop-room',
    },
    {
      id: 'task-switching',
      label: 'FLEXIBILITY',
      title: 'Task Switching',
      status: taskSwitchingStatus,
      progressCount: currentParticipant.taskSwitchingProgressCount || 0,
      color: '#435447',
      bg: '#EAF0EB',
      locked: false,
      roomPage: 'task-switching-room',
    },
  ];

  return (
    <div className="min-h-screen bg-[#D7E0D8] dark:bg-[#1D221E] text-[#282E28] dark:text-[#D7E0D8] font-['Inter',sans-serif] transition-colors duration-200">
      {/* Participant Navigation */}
      <ParticipantNav navigate={navigate} participantId={currentParticipant.id} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-10">
        {/* ─── HEADER SECTION ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
              Active Research Session
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              {completedActivities > 0 || hasInterrupted
                ? 'Welcome back!'
                : `Welcome, ${currentParticipant.name.split(' ')[0]}`}
            </h1>
            <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] mt-1 font-medium">
              Choose your cognitive challenge to begin or continue your session.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white dark:bg-[#282E28] border border-[#CBD7CE] dark:border-[#354238] shadow-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3D7A4F] dark:bg-[#A8B9AA] animate-pulse" />
              <span className="text-xs font-semibold text-[#435447] dark:text-[#B6C7B8]">ID:</span>
              <span className="text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] font-['JetBrains_Mono',monospace]">
                {currentParticipant.id}
              </span>
            </div>
          </div>
        </div>

        {/* ─── COGNITIVE CHALLENGE PROGRESS TRACKER ────────────────────── */}
        <div className="bg-white dark:bg-[#282E28] rounded-3xl border border-[#CBD7CE] dark:border-[#354238] p-5 sm:p-7 md:p-8 shadow-[0_2px_16px_rgba(40,46,40,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif] mb-1.5">
                Cognitive Challenge Progress
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <span className="text-base sm:text-2xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
                  {completedActivities} of {totalActivities} Challenges Completed
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1.5 shadow-xs ${
                    allDone
                      ? 'bg-[#EAF2EC] text-[#244E31] border border-[#A8B9AA] dark:bg-[#233527] dark:text-[#A8B9AA] dark:border-[#3E5C46]'
                      : completedActivities > 0 || hasInterrupted
                      ? 'bg-[#FAF4EB] text-[#8C5D23] border border-[#E8D4B8] dark:bg-[#2B251B] dark:text-[#E0B880] dark:border-[#6E5530]'
                      : 'bg-[#F1F4F1] text-[#435447] border border-[#CBD7CE] dark:bg-[#1D221E] dark:text-[#B6C7B8] dark:border-[#354238]'
                  }`}
                >
                  {allDone ? (
                    <>
                      <Check size={12} strokeWidth={3} />
                      All Completed
                    </>
                  ) : completedActivities > 0 || hasInterrupted ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B47836] dark:bg-[#E0B880] animate-pulse" />
                      In Progress
                    </>
                  ) : (
                    'Not Started'
                  )}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#526356] dark:text-[#A8B9AA] font-medium flex items-center gap-1.5">
              <span>Tasks can be completed in any order</span>
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
                  onClick={() => {
                    if (isInProgress) {
                      setInterruptedModalTask({
                        id: stage.id,
                        title: stage.title,
                        roomPage: stage.roomPage,
                        recordedTrials: stage.progressCount,
                      });
                      // navigate(stage.roomPage);
                    }
                  }}
                  onKeyDown={e => {
                    if (isInProgress && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setInterruptedModalTask({
                        id: stage.id,
                        title: stage.title,
                        roomPage: stage.roomPage,
                        recordedTrials: stage.progressCount,
                      });
                      // navigate(stage.roomPage);
                    }
                  }}
                  role={isInProgress ? 'button' : undefined}
                  tabIndex={isInProgress ? 0 : undefined}
                  aria-label={
                    isInProgress
                      ? `Resume ${stage.title} challenge`
                      : isCompleted
                      ? `${stage.title} completed`
                      : `${stage.title} (${stage.label})`
                  }
                  title={isInProgress ? `Click to resume ${stage.title}` : undefined}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center gap-2.5 sm:gap-3.5 select-none ${
                    isCompleted
                      ? 'border-[#A8B9AA] dark:border-[#3E5C46] bg-[#F5F8F6] dark:bg-[#1D221E] shadow-xs cursor-default'
                      : isInProgress
                      ? 'border-[#FDE68A] dark:border-[#8C6B38] bg-[#FEFDF2] dark:bg-[#24211A] shadow-xs cursor-pointer hover:border-[#D97706] hover:bg-[#FEF3C7]/40 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ring-2 ring-[#D97706]/15 dark:ring-[#8C6B38]/30'
                      : 'border-[#CBD7CE] dark:border-[#354238] bg-white dark:bg-[#1D221E]/60 hover:border-[#435447]/60 dark:hover:border-[#435447]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] flex-shrink-0 shadow-xs ${
                      isCompleted
                        ? 'bg-[#435447] dark:bg-[#A8B9AA] text-white dark:text-[#1D221E]'
                        : isInProgress
                        ? 'bg-[#B47836] dark:bg-[#C08A3E] text-white dark:text-[#1D221E]'
                        : 'bg-[#EAF0EB] dark:bg-[#354238] text-[#435447] dark:text-[#D7E0D8]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={14} strokeWidth={3} className="sm:w-4 sm:h-4 text-white dark:text-[#1D221E]" />
                    ) : isInProgress ? (
                      <RotateCcw size={13} strokeWidth={2.5} className="sm:w-3.5 sm:h-3.5 text-white dark:text-[#1D221E]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                      <span className={isCompleted ? 'text-[#2F4F38] dark:text-[#A8B9AA]' : isInProgress ? 'text-[#9C6524] dark:text-[#E0B880]' : 'text-[#526356] dark:text-[#B6C7B8]'}>
                        {isCompleted ? '✓ Completed' : isInProgress ? 'In Progress' : stage.label}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] truncate font-['Plus_Jakarta_Sans',sans-serif]">
                      {stage.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Continuous Progress Bar */}
          <div className="w-full bg-[#E4ECE5] dark:bg-[#1D221E] h-2.5 rounded-full overflow-hidden mt-5 sm:mt-6 border border-[#CBD7CE]/50 dark:border-[#354238]">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#435447] to-[#282E28] dark:from-[#8FA892] dark:to-[#A8B9AA] shadow-xs"
              style={{
                width: `${progressPct}%`,
              }}
            />
          </div>
        </div>

        {/* ─── 4 LARGE CHALLENGE CARDS (2x2 GRID) ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 mb-8 sm:mb-10">
          {/* ─── CARD 1: ROOM 01 — TOWER OF HANOI (Strategy) ────────────── */}
          <div
            onClick={() => {
              if (hanoiStatus === 'in_progress') {
                setInterruptedModalTask({
                  id: 'hanoi',
                  title: 'Tower of Hanoi',
                  roomPage: 'hanoi-room',
                  recordedTrials: currentParticipant.hanoiProgressCount || 0,
                });
              }
            }}
            onKeyDown={e => {
              if (hanoiStatus === 'in_progress' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setInterruptedModalTask({
                  id: 'hanoi',
                  title: 'Tower of Hanoi',
                  roomPage: 'hanoi-room',
                  recordedTrials: currentParticipant.hanoiProgressCount || 0,
                });
              }
            }}
            role={hanoiStatus === 'in_progress' ? 'button' : undefined}
            tabIndex={hanoiStatus === 'in_progress' ? 0 : undefined}
            aria-label={hanoiStatus === 'in_progress' ? 'Resume Tower of Hanoi challenge' : undefined}
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              hanoiStatus === 'completed'
                ? 'border-[#A8B9AA]/60 dark:border-[#354238] bg-white dark:bg-[#282E28] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]'
                : hanoiStatus === 'in_progress'
                ? 'border-[#D97706] dark:border-[#8C6B38] bg-white dark:bg-[#282E28] hover:border-[#B45309] dark:hover:border-[#D4A359] shadow-[0_4px_20px_rgba(40,46,40,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#D97706] dark:focus:ring-[#C08A3E]'
                : 'border-[#CBD7CE] dark:border-[#354238] bg-white dark:bg-[#282E28] hover:border-[#282E28] dark:hover:border-[#A8B9AA] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className="sm:w-[40%] bg-[#EAF0EB] dark:bg-[#1D221E] border-b sm:border-b-0 sm:border-r border-[#CBD7CE]/60 dark:border-[#354238] p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden">
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 01
                </span>
                {hanoiStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF5F0] dark:bg-[#233327] text-[#2F4F38] dark:text-[#A8B9AA] border border-[#A8B9AA] dark:border-[#3E5C46] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : hanoiStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] dark:bg-[#2B251B] text-[#8C5D23] dark:text-[#E0B880] border border-[#E8D4B8] dark:border-[#6E5530] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B47836] dark:bg-[#E0B880] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-[#282E28] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-[#282E28] shadow-sm border border-[#CBD7CE]/70 dark:border-[#354238] flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <HanoiVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/95 dark:bg-[#282E28]/95 border border-[#CBD7CE]/70 dark:border-[#354238] text-[#282E28] dark:text-[#D7E0D8] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Strategy Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[60%] p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#282E28]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Strategy Challenge
                  </span>
                  {hanoiStatus === 'in_progress' && (
                    <span className="text-[11px] font-bold text-[#8C5D23] dark:text-[#E0B880] bg-[#FAF4EB] dark:bg-[#2B251B] border border-[#E8D4B8] dark:border-[#6E5530] px-2 py-0.5 rounded-md">
                      {currentParticipant.hanoiProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-1 tracking-tight">
                  Tower of Hanoi
                </h3>
                <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] font-semibold leading-relaxed mb-2.5">
                  Planning & problem-solving
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-[#526356] dark:text-[#B6C7B8] leading-relaxed mb-4">
                  Solve 6 disc puzzles. Each one harder than the last. Rules need to be followed exactly.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#CBD7CE]/50 dark:border-[#354238] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#526356] dark:text-[#B6C7B8] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#282E28] dark:text-[#D7E0D8] font-bold">
                    <Layers size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>6 puzzles</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>~12 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {hanoiStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#EFF5F0] dark:bg-[#1D221E] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#435447] dark:text-[#A8B9AA]" />
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
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#B47836] hover:bg-[#9B642A] dark:bg-[#C08A3E] dark:hover:bg-[#D49E4F] text-white dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('hanoi-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] dark:bg-[#A8B9AA] dark:hover:bg-[#BCCBBC] text-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
            onClick={() => {
              if (corsiStatus === 'in_progress') {
                setInterruptedModalTask({
                  id: 'corsi',
                  title: 'Backward Corsi',
                  roomPage: 'corsi-room',
                  recordedTrials: currentParticipant.corsiProgressCount || 0,
                });
              }
            }}
            onKeyDown={e => {
              if (corsiStatus === 'in_progress' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setInterruptedModalTask({
                  id: 'corsi',
                  title: 'Backward Corsi',
                  roomPage: 'corsi-room',
                  recordedTrials: currentParticipant.corsiProgressCount || 0,
                });
              }
            }}
            role={corsiStatus === 'in_progress' ? 'button' : undefined}
            tabIndex={corsiStatus === 'in_progress' ? 0 : undefined}
            aria-label={corsiStatus === 'in_progress' ? 'Resume Backward Corsi challenge' : undefined}
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              corsiStatus === 'completed'
                ? 'border-[#A8B9AA]/60 dark:border-[#354238] bg-white dark:bg-[#282E28] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]'
                : corsiStatus === 'in_progress'
                ? 'border-[#D97706] dark:border-[#8C6B38] bg-white dark:bg-[#282E28] hover:border-[#B45309] dark:hover:border-[#D4A359] shadow-[0_4px_20px_rgba(40,46,40,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#D97706] dark:focus:ring-[#C08A3E]'
                : 'border-[#CBD7CE] dark:border-[#354238] bg-white dark:bg-[#282E28] hover:border-[#282E28] dark:hover:border-[#A8B9AA] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className="sm:w-[40%] bg-[#EAF0EB] dark:bg-[#1D221E] border-b sm:border-b-0 sm:border-r border-[#CBD7CE]/60 dark:border-[#354238] p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden">
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 02
                </span>
                {corsiStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF5F0] dark:bg-[#233327] text-[#2F4F38] dark:text-[#A8B9AA] border border-[#A8B9AA] dark:border-[#3E5C46] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : corsiStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] dark:bg-[#2B251B] text-[#8C5D23] dark:text-[#E0B880] border border-[#E8D4B8] dark:border-[#6E5530] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B47836] dark:bg-[#E0B880] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-[#282E28] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-[#282E28] shadow-sm border border-[#CBD7CE]/70 dark:border-[#354238] flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <CorsiVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/95 dark:bg-[#282E28]/95 border border-[#CBD7CE]/70 dark:border-[#354238] text-[#282E28] dark:text-[#D7E0D8] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Memory Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[60%] p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#282E28]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Memory Challenge
                  </span>
                  {corsiStatus === 'in_progress' && (
                    <span className="text-[11px] font-bold text-[#8C5D23] dark:text-[#E0B880] bg-[#FAF4EB] dark:bg-[#2B251B] border border-[#E8D4B8] dark:border-[#6E5530] px-2 py-0.5 rounded-md">
                      {currentParticipant.corsiProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-1 tracking-tight">
                  Backward Corsi Block
                </h3>
                <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] font-semibold leading-relaxed mb-2.5">
                  Spatial working memory
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-[#526356] dark:text-[#B6C7B8] leading-relaxed mb-4">
                  Watch the squares light up on a 3×3 grid. Then tap them back in the opposite order.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#CBD7CE]/50 dark:border-[#354238] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#526356] dark:text-[#B6C7B8] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#282E28] dark:text-[#D7E0D8] font-bold">
                    <Grid3X3 size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>8 levels</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>~8–10 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {corsiStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#EFF5F0] dark:bg-[#1D221E] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#435447] dark:text-[#A8B9AA]" />
                    Challenge Completed
                  </button>
                ) : corsiStatus === 'in_progress' ? (
                  <button
                    onClick={() =>
                      setInterruptedModalTask({
                        id: 'corsi',
                        title: 'Backward Corsi',
                        roomPage: 'corsi-room',
                        recordedTrials: currentParticipant.corsiProgressCount || 0,
                      })
                    }
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#B47836] hover:bg-[#9B642A] dark:bg-[#C08A3E] dark:hover:bg-[#D49E4F] text-white dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('corsi-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] dark:bg-[#A8B9AA] dark:hover:bg-[#BCCBBC] text-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
            onClick={() => {
              if (stroopStatus === 'in_progress') {
                setInterruptedModalTask({
                  id: 'stroop',
                  title: 'Stroop Task',
                  roomPage: 'stroop-room',
                  recordedTrials: currentParticipant.stroopProgressCount || 0,
                });
              }
            }}
            onKeyDown={e => {
              if (stroopStatus === 'in_progress' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setInterruptedModalTask({
                  id: 'stroop',
                  title: 'Stroop Task',
                  roomPage: 'stroop-room',
                  recordedTrials: currentParticipant.stroopProgressCount || 0,
                });
              }
            }}
            role={stroopStatus === 'in_progress' ? 'button' : undefined}
            tabIndex={stroopStatus === 'in_progress' ? 0 : undefined}
            aria-label={stroopStatus === 'in_progress' ? 'Resume Stroop Task challenge' : undefined}
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              stroopStatus === 'completed'
                ? 'border-[#A8B9AA]/60 dark:border-[#354238] bg-white dark:bg-[#282E28] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]'
                : stroopStatus === 'in_progress'
                ? 'border-[#D97706] dark:border-[#8C6B38] bg-white dark:bg-[#282E28] hover:border-[#B45309] dark:hover:border-[#D4A359] shadow-[0_4px_20px_rgba(40,46,40,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#D97706] dark:focus:ring-[#C08A3E]'
                : 'border-[#CBD7CE] dark:border-[#354238] bg-white dark:bg-[#282E28] hover:border-[#282E28] dark:hover:border-[#A8B9AA] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className="sm:w-[40%] bg-[#EAF0EB] dark:bg-[#1D221E] border-b sm:border-b-0 sm:border-r border-[#CBD7CE]/60 dark:border-[#354238] p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden">
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 03
                </span>
                {stroopStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF5F0] dark:bg-[#233327] text-[#2F4F38] dark:text-[#A8B9AA] border border-[#A8B9AA] dark:border-[#3E5C46] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : stroopStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] dark:bg-[#2B251B] text-[#8C5D23] dark:text-[#E0B880] border border-[#E8D4B8] dark:border-[#6E5530] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B47836] dark:bg-[#E0B880] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-[#282E28] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-[#282E28] shadow-sm border border-[#CBD7CE]/70 dark:border-[#354238] flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <StroopVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/95 dark:bg-[#282E28]/95 border border-[#CBD7CE]/70 dark:border-[#354238] text-[#282E28] dark:text-[#D7E0D8] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Attention Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[60%] p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#282E28]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Attention Challenge
                  </span>
                  {stroopStatus === 'in_progress' && (
                    <span className="text-[11px] font-bold text-[#8C5D23] dark:text-[#E0B880] bg-[#FAF4EB] dark:bg-[#2B251B] border border-[#E8D4B8] dark:border-[#6E5530] px-2 py-0.5 rounded-md">
                      {currentParticipant.stroopProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-1 tracking-tight">
                  Stroop Task
                </h3>
                <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] font-semibold leading-relaxed mb-2.5">
                  Selective attention & control
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-[#526356] dark:text-[#B6C7B8] leading-relaxed mb-4">
                  Click the button that matches the COLOR of the displayed word. Ignore the word's meaning, focus only on the display color.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#CBD7CE]/50 dark:border-[#354238] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#526356] dark:text-[#B6C7B8] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#282E28] dark:text-[#D7E0D8] font-bold">
                    <Zap size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>128 trials</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>~7 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {stroopStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#EFF5F0] dark:bg-[#1D221E] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#435447] dark:text-[#A8B9AA]" />
                    Challenge Completed
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
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#B47836] hover:bg-[#9B642A] dark:bg-[#C08A3E] dark:hover:bg-[#D49E4F] text-white dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('stroop-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] dark:bg-[#A8B9AA] dark:hover:bg-[#BCCBBC] text-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
            onClick={() => {
              if (taskSwitchingStatus === 'in_progress') {
                setInterruptedModalTask({
                  id: 'task-switching',
                  title: 'Task Switching',
                  roomPage: 'task-switching-room',
                  recordedTrials: currentParticipant.taskSwitchingProgressCount || 0,
                });
              }
            }}
            onKeyDown={e => {
              if (taskSwitchingStatus === 'in_progress' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setInterruptedModalTask({
                  id: 'task-switching',
                  title: 'Task Switching',
                  roomPage: 'task-switching-room',
                  recordedTrials: currentParticipant.taskSwitchingProgressCount || 0,
                });
              }
            }}
            role={taskSwitchingStatus === 'in_progress' ? 'button' : undefined}
            tabIndex={taskSwitchingStatus === 'in_progress' ? 0 : undefined}
            aria-label={taskSwitchingStatus === 'in_progress' ? 'Resume Task Switching challenge' : undefined}
            className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col sm:flex-row group ${
              taskSwitchingStatus === 'completed'
                ? 'border-[#A8B9AA]/60 dark:border-[#354238] bg-white dark:bg-[#282E28] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]'
                : taskSwitchingStatus === 'in_progress'
                ? 'border-[#D97706] dark:border-[#8C6B38] bg-white dark:bg-[#282E28] hover:border-[#B45309] dark:hover:border-[#D4A359] shadow-[0_4px_20px_rgba(40,46,40,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#D97706] dark:focus:ring-[#C08A3E]'
                : 'border-[#CBD7CE] dark:border-[#354238] bg-white dark:bg-[#282E28] hover:border-[#282E28] dark:hover:border-[#A8B9AA] shadow-[0_4px_20px_rgba(40,46,40,0.05)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            {/* Left Visual Panel */}
            <div className="sm:w-[40%] bg-[#EAF0EB] dark:bg-[#1D221E] border-b sm:border-b-0 sm:border-r border-[#CBD7CE]/60 dark:border-[#354238] p-4 sm:p-6 relative flex flex-col items-center justify-between min-h-[160px] sm:min-h-[220px] overflow-hidden">
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif]">
                  Room 04
                </span>
                {taskSwitchingStatus === 'completed' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF5F0] dark:bg-[#233327] text-[#2F4F38] dark:text-[#A8B9AA] border border-[#A8B9AA] dark:border-[#3E5C46] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1">
                    <Check size={11} strokeWidth={3} /> Completed
                  </span>
                ) : taskSwitchingStatus === 'in_progress' ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF4EB] dark:bg-[#2B251B] text-[#8C5D23] dark:text-[#E0B880] border border-[#E8D4B8] dark:border-[#6E5530] font-['Plus_Jakarta_Sans',sans-serif] flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B47836] dark:bg-[#E0B880] animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-[#282E28] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] font-['Plus_Jakarta_Sans',sans-serif]">
                    Not Started
                  </span>
                )}
              </div>

              {/* Elevated Circular Badge with Miniature Visual */}
              <div className="my-auto relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white dark:bg-[#282E28] shadow-sm border border-[#CBD7CE]/70 dark:border-[#354238] flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <TaskSwitchingVisual size="md" variant="card" />
              </div>

              {/* Bottom Pill Badge */}
              <div className="relative z-10 px-3 py-1 rounded-full bg-white/95 dark:bg-[#282E28]/95 border border-[#CBD7CE]/70 dark:border-[#354238] text-[#282E28] dark:text-[#D7E0D8] text-[10px] font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif] shadow-xs">
                Flexibility Challenge
              </div>
            </div>

            {/* Right Details Panel */}
            <div className="sm:w-[60%] p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-[#282E28]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-bold text-[#435447] dark:text-[#A8B9AA] uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                    Flexibility Challenge
                  </span>
                  {taskSwitchingStatus === 'in_progress' && (
                    <span className="text-[11px] font-bold text-[#8C5D23] dark:text-[#E0B880] bg-[#FAF4EB] dark:bg-[#2B251B] border border-[#E8D4B8] dark:border-[#6E5530] px-2 py-0.5 rounded-md">
                      {currentParticipant.taskSwitchingProgressCount || 0} recorded
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-1 tracking-tight">
                  Task Switching
                </h3>
                <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] font-semibold leading-relaxed mb-2.5">
                  Cognitive flexibility
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-[#526356] dark:text-[#B6C7B8] leading-relaxed mb-4">
                  Categorize letter-number stimuli while alternating between letter and number decision rules.
                </p>
              </div>

              <div>
                {/* Divider Line */}
                <div className="border-t border-[#CBD7CE]/50 dark:border-[#354238] pt-3 sm:pt-4 mb-4 sm:mb-5 flex items-center gap-4 sm:gap-5 text-xs text-[#526356] dark:text-[#B6C7B8] font-medium font-['Plus_Jakarta_Sans',sans-serif]">
                  <div className="flex items-center gap-1.5 text-[#282E28] dark:text-[#D7E0D8] font-bold">
                    <Repeat size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>128 trials</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                    <span>~6 min</span>
                  </div>
                </div>

                {/* CTA Button */}
                {taskSwitchingStatus === 'completed' ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl font-bold text-xs font-['Plus_Jakarta_Sans',sans-serif] bg-[#EFF5F0] dark:bg-[#1D221E] text-[#435447] dark:text-[#B6C7B8] border border-[#CBD7CE] dark:border-[#354238] cursor-not-allowed flex items-center justify-center gap-2 opacity-90 shadow-none"
                    title="This challenge was already completed in this session and cannot be repeated."
                  >
                    <CheckCircle size={15} className="text-[#435447] dark:text-[#A8B9AA]" />
                    Challenge Completed
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
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#B47836] hover:bg-[#9B642A] dark:bg-[#C08A3E] dark:hover:bg-[#D49E4F] text-white dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    Continue Challenge
                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('task-switching-room')}
                    className="w-full py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] dark:bg-[#A8B9AA] dark:hover:bg-[#BCCBBC] text-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
          <div className="bg-white dark:bg-[#282E28] rounded-3xl border border-[#A8B9AA] dark:border-[#3E5C46] p-5 sm:p-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6 animate-pop-in shadow-md mb-8">
            <div className="flex items-center gap-3.5 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#282E28] dark:bg-[#A8B9AA] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                <CheckCircle size={28} className="text-[#D7E0D8] dark:text-[#1D221E] sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif]">
                  All Four Challenges Completed!
                </h3>
                <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] font-medium mt-0.5">
                  Your cognitive performance session has been successfully recorded. View your complete session summary below.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('task-completion')}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm font-['Plus_Jakarta_Sans',sans-serif] bg-[#282E28] hover:bg-[#354238] dark:bg-[#A8B9AA] dark:hover:bg-[#BCCBBC] text-[#D7E0D8] dark:text-[#1D221E] flex items-center justify-center gap-2.5 shadow-md flex-shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
            >
              View Summary
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ─── CONFIDENTIALITY / PROTOCOL FOOTER NOTE ──────────────────── */}
        <div className="flex items-start gap-3 text-xs text-[#526356] dark:text-[#B6C7B8] px-2 py-4">
          <Lock size={14} className="mt-0.5 flex-shrink-0 text-[#435447] dark:text-[#A8B9AA]" />
          <span>
            Challenges are configured for this academic research session. Performance metrics are recorded for empirical study purposes and protected under university research ethics standards.
          </span>
        </div>
      </div>

      {/* ─── INTERRUPTED SESSION PROTOCOL MODAL ───────────────────────── */}
      {interruptedModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D221E]/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#282E28] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#CBD7CE] dark:border-[#354238] text-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF4EB] dark:bg-[#2B251B] text-[#B47836] dark:text-[#E0B880] flex items-center justify-center mx-auto mb-4 border border-[#E8D4B8] dark:border-[#6E5530]">
              <RotateCcw size={28} />
            </div>
            <div className="text-[11px] font-bold text-[#8C5D23] dark:text-[#E0B880] uppercase tracking-[0.16em] font-['Plus_Jakarta_Sans',sans-serif] mb-1">
              Interrupted Session Notice
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] mb-2">
              {interruptedModalTask.title}
            </h3>
            <p className="text-xs sm:text-sm text-[#435447] dark:text-[#B6C7B8] leading-relaxed mb-4">
              You previously recorded{' '}
              <strong className="text-[#282E28] dark:text-[#D7E0D8]">
                {interruptedModalTask.recordedTrials}{' '}
                {interruptedModalTask.id === 'hanoi'
                  ? 'puzzle(s)'
                  : interruptedModalTask.id === 'corsi'
                  ? 'level(s)'
                  : 'trial(s)'}
              </strong>{' '}
              in this challenge.
            </p>

            <div className="bg-[#EAF0EB] dark:bg-[#1D221E] border border-[#CBD7CE] dark:border-[#354238] rounded-2xl p-4 text-left mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] mb-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                <Info size={14} className="text-[#435447] dark:text-[#A8B9AA]" />
                Cognitive Measurement Protocol
              </div>
              <p className="text-[11px] sm:text-xs text-[#526356] dark:text-[#B6C7B8] leading-relaxed">
                These tests need you to focus without stopping. The tests measure how well you remember, recall, and switch tasks. Resuming an old session would make the results less accurate.
              </p>
              <div className="mt-2.5 p-2.5 rounded-xl bg-[#FAF4EB] dark:bg-[#2B251B] border border-[#E8D4B8] dark:border-[#6E5530] text-[11px] sm:text-xs text-[#8C5D23] dark:text-[#E0B880] font-medium leading-relaxed">
                The dependent measure for Tower of Hanoi was the total number of moves taken to complete the last five trials, including the wrong moves.
              </div>
              <div className="mt-2 text-[11px] text-[#2F4F38] dark:text-[#A8B9AA] font-medium flex items-center gap-1.5">
                <CheckCircle size={13} className="flex-shrink-0" />
                <span>Your previous trial records remain preserved in research logs.</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setInterruptedModalTask(null)}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-[#282E28] dark:text-[#D7E0D8] bg-[#EAF0EB] dark:bg-[#354238] hover:bg-[#CBD7CE] dark:hover:bg-[#1D221E] border border-[#CBD7CE] dark:border-[#435447] transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  const room = interruptedModalTask.roomPage;
                  setInterruptedModalTask(null);
                  navigate(room);
                }}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-[#D7E0D8] dark:text-[#1D221E] bg-[#282E28] hover:bg-[#354238] dark:bg-[#A8B9AA] dark:hover:bg-[#BCCBBC] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Start Fresh Attempt
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
