import React from 'react';

interface VisualProps {
  variant?: 'light' | 'dark' | 'card' | 'node';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Tower of Hanoi Miniature Visual Representation
 * 3 vertical poles with stacked colored discs, subtle concentric rings & puzzle feel.
 */
export function HanoiVisual({ variant = 'light', size = 'md', className = '' }: VisualProps) {
  const isDark = variant === 'dark' || variant === 'node';
  const width = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;
  const height = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Subtle background concentric rings / grid lines */}
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#63B8C6' : '#245D72'} strokeWidth="1.5" opacity={isDark ? '0.35' : '0.22'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#63B8C6' : '#4D91AD'} strokeWidth="1.5" strokeDasharray="3 3" opacity={isDark ? '0.45' : '0.32'} />

        {/* Base */}
        <rect x="16" y="73" width="68" height="6" rx="3" fill={isDark ? '#314E62' : '#263B46'} />

        {/* 3 Poles */}
        <rect x="28" y="30" width="4" height="43" rx="2" fill={isDark ? '#63B8C6' : '#526E7B'} />
        <rect x="48" y="30" width="4" height="43" rx="2" fill={isDark ? '#63B8C6' : '#526E7B'} />
        <rect x="68" y="30" width="4" height="43" rx="2" fill={isDark ? '#63B8C6' : '#526E7B'} />

        {/* Pole 1 Discs (Stacked: Large, Medium, Small) */}
        <rect x="18" y="65" width="24" height="8" rx="4" fill="#183B4A" stroke={isDark ? '#314E62' : '#0F2630'} strokeWidth="0.5" />
        <rect x="21" y="56" width="18" height="8" rx="4" fill="#245D72" stroke={isDark ? '#4D91AD' : '#163A4A'} strokeWidth="0.5" />
        <rect x="24" y="47" width="12" height="8" rx="4" fill="#0D9488" stroke={isDark ? '#5EEAD4' : '#0A7369'} strokeWidth="0.5" />

        {/* Subtle accent highlight glow */}
        <circle cx="28" cy="51" r="1.5" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  );
}

/**
 * Backward Corsi Block Task Miniature Visual Representation
 * 3x3 square grid with illuminated sequence blocks in teal/cyan.
 */
export function CorsiVisual({ variant = 'light', size = 'md', className = '' }: VisualProps) {
  const isDark = variant === 'dark' || variant === 'node';
  const width = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;
  const height = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;

  // Blocks 0..8 (3x3 grid)
  const blocks = [
    { id: 0, active: false },
    { id: 1, active: true, order: 1 },
    { id: 2, active: false },
    { id: 3, active: false },
    { id: 4, active: true, order: 2 },
    { id: 5, active: false },
    { id: 6, active: false },
    { id: 7, active: false },
    { id: 8, active: true, order: 3 },
  ];

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background concentric rings */}
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#63B8C6' : '#245D72'} strokeWidth="1.5" opacity={isDark ? '0.35' : '0.22'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#63B8C6' : '#4D91AD'} strokeWidth="1.5" strokeDasharray="3 3" opacity={isDark ? '0.45' : '0.32'} />

        {/* 3x3 Grid of rounded blocks */}
        {blocks.map(b => {
          const row = Math.floor(b.id / 3);
          const col = b.id % 3;
          const x = 25 + col * 18;
          const y = 25 + row * 18;

          return (
            <g key={b.id}>
              {b.active ? (
                <>
                  <rect
                    x={x - 1.5}
                    y={y - 1.5}
                    width="17"
                    height="17"
                    rx="5"
                    fill={b.order === 2 ? '#0D9488' : '#2563EB'}
                    opacity="0.25"
                  />
                  <rect
                    x={x}
                    y={y}
                    width="14"
                    height="14"
                    rx="4"
                    fill={b.order === 2 ? '#0D9488' : '#2563EB'}
                    stroke={b.order === 2 ? '#042F2E' : '#1E3A8A'}
                    strokeWidth="0.5"
                  />
                  <circle cx={x + 7} cy={y + 7} r="2" fill="#FFFFFF" opacity="0.95" />
                </>
              ) : (
                <rect
                  x={x}
                  y={y}
                  width="14"
                  height="14"
                  rx="4"
                  fill={isDark ? '#1A2B36' : '#E2EFF4'}
                  stroke={isDark ? '#314E62' : '#94A3B8'}
                  strokeWidth="1"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Stroop Task Miniature Visual Representation
 * Color word in contrasting ink color or attention focus symbol in coral/red.
 */
export function StroopVisual({ variant = 'light', size = 'md', className = '' }: VisualProps) {
  const isDark = variant === 'dark' || variant === 'node';
  const width = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;
  const height = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background concentric rings */}
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#F87171' : '#DC2626'} strokeWidth="1.5" opacity={isDark ? '0.35' : '0.22'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#F87171' : '#DC2626'} strokeWidth="1.5" strokeDasharray="3 3" opacity={isDark ? '0.45' : '0.32'} />

        {/* Attention eye / focus icon */}
        <path
          d="M24 50C24 50 33 34 50 34C67 34 76 50 76 50C76 50 67 66 50 66C33 66 24 50 24 50Z"
          stroke="#DC2626"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="8" fill="#DC2626" />
        <circle cx="52.5" cy="47.5" r="2.5" fill="#FFFFFF" />

        {/* Small calibration crosshair ticks */}
        <line x1="50" y1="21" x2="50" y2="28" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="72" x2="50" y2="79" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="21" y1="50" x2="15" y2="50" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="85" y1="50" x2="79" y2="50" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Task Switching Miniature Visual Representation
 * Letter + number classification with dynamic switching arrows in blue/teal.
 */
export function TaskSwitchingVisual({ variant = 'light', size = 'md', className = '' }: VisualProps) {
  const isDark = variant === 'dark' || variant === 'node';
  const width = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;
  const height = size === 'sm' ? 44 : size === 'lg' ? 140 : 80;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background concentric rings */}
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#60A5FA' : '#2563EB'} strokeWidth="1.5" opacity={isDark ? '0.35' : '0.22'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#60A5FA' : '#2563EB'} strokeWidth="1.5" strokeDasharray="3 3" opacity={isDark ? '0.45' : '0.32'} />

        {/* Dual arrows for dynamic cognitive switching */}
        {/* Top arrow pointing right */}
        <path
          d="M32 42H64M64 42L56 34M64 42L56 50"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom arrow pointing left */}
        <path
          d="M68 58H36M36 58L44 50M36 58L44 66"
          stroke="#0D9488"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

