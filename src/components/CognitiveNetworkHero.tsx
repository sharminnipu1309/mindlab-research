import React from 'react';
import { HanoiVisual, CorsiVisual, StroopVisual, TaskSwitchingVisual } from './TaskVisuals';

interface Props {
  onSelectTask?: (taskId: string) => void;
}

export default function CognitiveNetworkHero({ onSelectTask }: Props) {
  return (
    <div className="relative w-full max-w-[620px] aspect-[1.15/1] mx-auto flex items-center justify-center select-none">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-radial from-[#1E255E]/40 via-[#13173D]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* SVG Background Coordinate & Connection System */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 620 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle geometric orbital rings */}
        <circle cx="310" cy="270" r="230" stroke="#1F2653" strokeWidth="1" opacity="0.4" />
        <circle cx="310" cy="270" r="170" stroke="#252E63" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <circle cx="310" cy="270" r="110" stroke="#2D3877" strokeWidth="1.2" opacity="0.6" />
        <circle cx="310" cy="270" r="60" stroke="#6D5AE6" strokeWidth="1" opacity="0.25" />

        {/* Connection rays from center (310, 270) to 4 node anchor points */}
        {/* Ray 1: to Top-Left (120, 105) */}
        <line
          x1="310"
          y1="270"
          x2="140"
          y2="105"
          stroke="#6D5AE6"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.65"
        />

        {/* Ray 2: to Top-Right (500, 105) */}
        <line
          x1="310"
          y1="270"
          x2="480"
          y2="105"
          stroke="#0D9488"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.65"
        />

        {/* Ray 3: to Bottom-Left (130, 435) */}
        <line
          x1="310"
          y1="270"
          x2="150"
          y2="435"
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.65"
        />

        {/* Ray 4: to Bottom-Right (490, 435) */}
        <line
          x1="310"
          y1="270"
          x2="470"
          y2="435"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.65"
        />

        {/* Outer subtle node accent dots */}
        <circle cx="140" cy="105" r="3" fill="#6D5AE6" />
        <circle cx="480" cy="105" r="3" fill="#0D9488" />
        <circle cx="150" cy="435" r="3" fill="#EF4444" />
        <circle cx="470" cy="435" r="3" fill="#2563EB" />
      </svg>

      {/* Floating Network Badge 1 (Top Left Ray) */}
      <div className="absolute top-[32%] left-[24%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#171B3A]/90 border border-[#2D356D] backdrop-blur-md shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
        <span className="text-[10px] font-bold text-[#A5B4FC] tracking-wider font-['Plus_Jakarta_Sans',sans-serif] uppercase">
          Live Response Data
        </span>
      </div>

      {/* Floating Network Badge 2 (Bottom Right Ray) */}
      <div className="absolute bottom-[32%] right-[22%] translate-x-1/2 translate-y-1/2 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#171B3A]/90 border border-[#2D356D] backdrop-blur-md shadow-lg">
        <span className="text-[10px] font-bold text-[#94A3B8] tracking-wider font-['Plus_Jakarta_Sans',sans-serif] uppercase">
          4 Research Tasks
        </span>
      </div>

      {/* ─── CENTRAL HUB NODE ────────────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        {/* Outer glowing pulsing aura */}
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-[#6D5AE6]/20 to-[#1F2452]/40 border-2 border-[#6D5AE6]/50 p-1.5 sm:p-2 backdrop-blur-xl flex items-center justify-center shadow-[0_0_35px_rgba(109,90,230,0.35)] transition-all hover:scale-105 duration-300">
          {/* Inner ring */}
          <div className="w-full h-full rounded-full bg-[#171B3A] border border-[#3E4888] flex flex-col items-center justify-center text-center p-2 sm:p-3 relative overflow-hidden">
            {/* Ambient inner reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#6D5AE6]/10 to-transparent" />

            {/* Brain icon representation */}
            <div className="relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#6D5AE6]/20 border border-[#6D5AE6]/40 flex items-center justify-center mb-0.5 sm:mb-1 text-[#A5B4FC]">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
                <path d="M12 5v13" />
              </svg>
            </div>

            <div className="relative z-10 text-xs sm:text-sm font-extrabold text-white font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              MindLab
            </div>
            <div className="relative z-10 text-[8px] sm:text-[9px] font-bold text-[#818CF8] tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
              Cognitive Profile
            </div>

            {/* Glowing cyan node dot */}
            <div className="absolute top-1.5 sm:top-2 right-2.5 sm:right-4 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#06B6D4] shadow-[0_0_8px_#06B6D4]" />
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 1: TOWER OF HANOI (Top Left) ────────────────── */}
      <div
        onClick={() => onSelectTask?.('hanoi-room')}
        className="absolute top-[4%] sm:top-[6%] left-[2%] sm:left-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-[#171B3A]/90 border border-[#2E376E] hover:border-[#6D5AE6] hover:bg-[#1E2452] shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#23295C] border border-[#3E498E] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0 group-hover:border-[#6D5AE6] transition-colors">
          <HanoiVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-[#A5B4FC] transition-colors leading-tight">
            Tower of Hanoi
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#818CF8] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Planning
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 2: BACKWARD CORSI (Top Right) ───────────────── */}
      <div
        onClick={() => onSelectTask?.('corsi-room')}
        className="absolute top-[4%] sm:top-[6%] right-[2%] sm:right-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-[#171B3A]/90 border border-[#2E376E] hover:border-[#0D9488] hover:bg-[#1E2452] shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#17303D] border border-[#23585F] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0 group-hover:border-[#0D9488] transition-colors">
          <CorsiVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-[#5EEAD4] transition-colors leading-tight">
            Backward Corsi
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#2DD4BF] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Spatial Memory
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 3: STROOP TASK (Bottom Left) ────────────────── */}
      <div
        onClick={() => onSelectTask?.('stroop-room')}
        className="absolute bottom-[4%] sm:bottom-[6%] left-[2%] sm:left-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-[#171B3A]/90 border border-[#2E376E] hover:border-[#EF4444] hover:bg-[#1E2452] shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#361E2E] border border-[#69293C] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0 group-hover:border-[#EF4444] transition-colors">
          <StroopVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-[#FCA5A5] transition-colors leading-tight">
            Stroop Task
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#F87171] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Attention
          </div>
        </div>
      </div>

      {/* ─── SATELLITE NODE 4: TASK SWITCHING (Bottom Right) ─────────────── */}
      <div
        onClick={() => onSelectTask?.('task-switching-room')}
        className="absolute bottom-[4%] sm:bottom-[6%] right-[2%] sm:right-[4%] z-20 flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl bg-[#171B3A]/90 border border-[#2E376E] hover:border-[#2563EB] hover:bg-[#1E2452] shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
      >
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#1E2C58] border border-[#2B4B8F] flex items-center justify-center p-1 sm:p-1.5 flex-shrink-0 group-hover:border-[#2563EB] transition-colors">
          <TaskSwitchingVisual size="sm" variant="dark" />
        </div>
        <div className="text-left">
          <div className="text-[10px] sm:text-xs font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-[#93C5FD] transition-colors leading-tight">
            Task Switching
          </div>
          <div className="text-[8px] sm:text-[9.5px] font-bold text-[#60A5FA] tracking-wider sm:tracking-widest font-['Plus_Jakarta_Sans',sans-serif] uppercase">
            Flexibility
          </div>
        </div>
      </div>
    </div>
  );
}
