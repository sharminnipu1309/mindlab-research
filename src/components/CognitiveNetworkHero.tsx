import React from 'react';
import { HanoiVisual, CorsiVisual, StroopVisual, TaskSwitchingVisual } from './TaskVisuals';

interface Props {
  onSelectTask?: (taskId: string) => void;
}

export default function CognitiveNetworkHero({ onSelectTask }: Props) {
  return (
    <div className="relative w-full max-w-[620px] aspect-[1.15/1] mx-auto flex items-center justify-center select-none">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-radial from-[#354238]/15 dark:from-[#A3B9A5]/15 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* SVG Background Coordinate & Connection System */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 620 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle geometric orbital rings */}
        <circle cx="310" cy="270" r="230" stroke="currentColor" className="text-[#354238]/20 dark:text-[#A3B9A5]/20" strokeWidth="1" />
        <circle cx="310" cy="270" r="170" stroke="currentColor" className="text-[#354238]/25 dark:text-[#A3B9A5]/25" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="310" cy="270" r="110" stroke="currentColor" className="text-[#354238]/30 dark:text-[#A3B9A5]/30" strokeWidth="1.2" />
        <circle cx="310" cy="270" r="60" stroke="currentColor" className="text-[#354238]/40 dark:text-[#A3B9A5]/40" strokeWidth="1" />

        {/* Connection rays from center (310, 270) to 4 node anchor points */}
        <line x1="310" y1="270" x2="140" y2="105" stroke="currentColor" className="text-[#354238]/50 dark:text-[#A3B9A5]/60" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="310" y1="270" x2="480" y2="105" stroke="currentColor" className="text-[#354238]/50 dark:text-[#A3B9A5]/60" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="310" y1="270" x2="150" y2="435" stroke="currentColor" className="text-[#354238]/50 dark:text-[#A3B9A5]/60" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="310" y1="270" x2="470" y2="435" stroke="currentColor" className="text-[#354238]/50 dark:text-[#A3B9A5]/60" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Outer subtle node accent dots */}
        <circle cx="140" cy="105" r="3" fill="#354238" className="dark:fill-[#A3B9A5]" />
        <circle cx="480" cy="105" r="3" fill="#354238" className="dark:fill-[#A3B9A5]" />
        <circle cx="150" cy="435" r="3" fill="#354238" className="dark:fill-[#A3B9A5]" />
        <circle cx="470" cy="435" r="3" fill="#354238" className="dark:fill-[#A3B9A5]" />
      </svg>

      {/* Floating Network Badge 1 (Top Left Ray) */}
      <div className="absolute top-[32%] left-[24%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-[#1D221E]/90 border border-[#BAC8BD] dark:border-[#445448] backdrop-blur-md shadow-md">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
        <span className="text-[10px] font-bold text-[#282E28] dark:text-[#D7E0D8] tracking-wider font-['Plus_Jakarta_Sans',sans-serif] uppercase">
          Live Response Data
        </span>
      </div>

      {/* Floating Network Badge 2 (Bottom Right Ray) */}
      <div className="absolute bottom-[32%] right-[22%] translate-x-1/2 translate-y-1/2 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-[#1D221E]/90 border border-[#BAC8BD] dark:border-[#445448] backdrop-blur-md shadow-md">
        <span className="text-[10px] font-bold text-[#47564A] dark:text-[#B6C7B8] tracking-wider font-['Plus_Jakarta_Sans',sans-serif] uppercase">
          4 Research Tasks
        </span>
      </div>

      {/* ─── CENTRAL HUB NODE ────────────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-white/80 to-[#E4EBE5] dark:from-[#354238]/60 dark:to-[#1D221E] border-2 border-[#BAC8BD] dark:border-[#445448] p-1.5 sm:p-2 backdrop-blur-xl flex items-center justify-center shadow-lg transition-all hover:scale-105 duration-300">
          <div className="w-full h-full rounded-full bg-white dark:bg-[#1D221E] border border-[#BAC8BD] dark:border-[#445448] flex flex-col items-center justify-center text-center p-2 sm:p-3 relative overflow-hidden">
            <div className="relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#E4EBE5] dark:bg-[#354238] border border-[#BAC8BD] dark:border-[#445448] flex items-center justify-center mb-0.5 sm:mb-1 text-[#282E28] dark:text-[#A3B9A5]">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                <path d="M12 5v13" />
              </svg>
            </div>

            <div className="relative z-10 text-xs sm:text-sm font-extrabold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              MindLab
            </div>
            <div className="relative z-10 text-[8px] sm:text-[9px] font-bold text-[#47564A] dark:text-[#A3B9A5] tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
              Cognitive Profile
            </div>
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 1: TOWER OF HANOI (Top Left) ────────────────── */}
      <div
        onClick={() => onSelectTask?.('hanoi-room')}
        className="absolute top-[4%] sm:top-[6%] left-[2%] sm:left-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#354238]/95 border border-[#BAC8BD] dark:border-[#445448] hover:border-[#282E28] dark:hover:border-[#A3B9A5] shadow-md backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#E4EBE5] dark:bg-[#282E28] border border-[#CAD5CC] dark:border-[#445448] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0">
          <HanoiVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
            Tower of Hanoi
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#47564A] dark:text-[#A3B9A5] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Planning
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 2: BACKWARD CORSI (Top Right) ───────────────── */}
      <div
        onClick={() => onSelectTask?.('corsi-room')}
        className="absolute top-[4%] sm:top-[6%] right-[2%] sm:right-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#354238]/95 border border-[#BAC8BD] dark:border-[#445448] hover:border-[#282E28] dark:hover:border-[#A3B9A5] shadow-md backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#E4EBE5] dark:bg-[#282E28] border border-[#CAD5CC] dark:border-[#445448] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0">
          <CorsiVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
            Backward Corsi
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#47564A] dark:text-[#A3B9A5] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Spatial Memory
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 3: STROOP TASK (Bottom Left) ────────────────── */}
      <div
        onClick={() => onSelectTask?.('stroop-room')}
        className="absolute bottom-[4%] sm:bottom-[6%] left-[2%] sm:left-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#354238]/95 border border-[#BAC8BD] dark:border-[#445448] hover:border-[#282E28] dark:hover:border-[#A3B9A5] shadow-md backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#E4EBE5] dark:bg-[#282E28] border border-[#CAD5CC] dark:border-[#445448] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0">
          <StroopVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
            Stroop Task
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#47564A] dark:text-[#A3B9A5] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Attention
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 4: TASK SWITCHING (Bottom Right) ─────────────── */}
      <div
        onClick={() => onSelectTask?.('task-switching-room')}
        className="absolute bottom-[4%] sm:bottom-[6%] right-[2%] sm:right-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#354238]/95 border border-[#BAC8BD] dark:border-[#445448] hover:border-[#282E28] dark:hover:border-[#A3B9A5] shadow-md backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#E4EBE5] dark:bg-[#282E28] border border-[#CAD5CC] dark:border-[#445448] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0">
          <TaskSwitchingVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-[#282E28] dark:text-[#D7E0D8] font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
            Task Switching
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#47564A] dark:text-[#A3B9A5] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Flexibility
          </div>
        </div>
      </div>
    </div>
  );
}
