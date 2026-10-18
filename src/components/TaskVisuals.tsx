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
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#A3B9A5' : '#354238'} strokeWidth="1" opacity={isDark ? '0.25' : '0.15'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#D7E0D8' : '#354238'} strokeWidth="1" strokeDasharray="3 3" opacity={isDark ? '0.3' : '0.2'} />

        {/* Base */}
        <rect x="18" y="74" width="64" height="5" rx="2.5" fill={isDark ? '#4B5563' : '#CBD5E1'} />

        {/* 3 Poles */}
        <rect x="28.5" y="32" width="3" height="42" rx="1.5" fill={isDark ? '#A3B9A5' : '#94A3B8'} opacity="0.85" />
        <rect x="48.5" y="32" width="3" height="42" rx="1.5" fill={isDark ? '#A3B9A5' : '#94A3B8'} opacity="0.85" />
        <rect x="68.5" y="32" width="3" height="42" rx="1.5" fill={isDark ? '#A3B9A5' : '#94A3B8'} opacity="0.85" />

        {/* Pole 1 Discs (Stacked: Large, Medium, Small) */}
        <rect x="20" y="66" width="20" height="7" rx="3.5" fill="#354238" />
        <rect x="22.5" y="58" width="15" height="7" rx="3.5" fill="#47564A" />
        <rect x="25" y="50" width="10" height="7" rx="3.5" fill="#A3B9A5" />

        {/* Pole 3 Disc (Target placement demonstration) */}
        <rect x="62" y="66" width="16" height="7" rx="3.5" fill={isDark ? '#A3B9A5' : '#354238'} opacity="0.4" strokeDasharray="2 2" stroke={isDark ? '#D7E0D8' : '#354238'} />

        {/* Subtle accent highlight glow */}
        <circle cx="30" cy="53.5" r="2" fill="#FFFFFF" opacity="0.8" />
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
  // Illuminated blocks at indices 1, 4, 8 to demonstrate spatial sequence
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
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#0D9488' : '#0D9488'} strokeWidth="1" opacity={isDark ? '0.2' : '0.12'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#14B8A6' : '#0D9488'} strokeWidth="1" strokeDasharray="3 3" opacity={isDark ? '0.3' : '0.18'} />

        {/* 3x3 Grid of rounded blocks */}
        {blocks.map(b => {
          const row = Math.floor(b.id / 3);
          const col = b.id % 3;
          const x = 25 + col * 18;
          const y = 25 + row * 18;

          return (
            <g key={b.id}>
              {b.active && (
                <rect
                  x={x - 1.5}
                  y={y - 1.5}
                  width="17"
                  height="17"
                  rx="4.5"
                  fill="#0D9488"
                  opacity={isDark ? '0.35' : '0.25'}
                />
              )}
              <rect
                x={x}
                y={y}
                width="14"
                height="14"
                rx="3.5"
                fill={b.active ? '#0D9488' : isDark ? '#1E293B' : '#E2E8F0'}
              />
              {b.active && (
                <circle cx={x + 7} cy={y + 7} r="2" fill="#FFFFFF" opacity="0.9" />
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
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#EF4444' : '#EF4444'} strokeWidth="1" opacity={isDark ? '0.2' : '0.12'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#F87171' : '#EF4444'} strokeWidth="1" strokeDasharray="3 3" opacity={isDark ? '0.3' : '0.18'} />

        {/* Attention eye / focus icon */}
        <path
          d="M24 50C24 50 33 34 50 34C67 34 76 50 76 50C76 50 67 66 50 66C33 66 24 50 24 50Z"
          stroke="#EF4444"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="8" fill="#EF4444" />
        <circle cx="52.5" cy="47.5" r="2.5" fill="#FFFFFF" />

        {/* Small top/bottom calibration ticks */}
        <line x1="50" y1="23" x2="50" y2="28" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="72" x2="50" y2="77" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="23" y1="50" x2="18" y2="50" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        <line x1="82" y1="50" x2="77" y2="50" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  );
}

/**
 * Task Switching Miniature Visual Representation
 * Letter + number classification with dynamic switching arrows in blue/violet.
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
        <circle cx="50" cy="50" r="46" stroke={isDark ? '#2563EB' : '#2563EB'} strokeWidth="1" opacity={isDark ? '0.2' : '0.12'} />
        <circle cx="50" cy="50" r="32" stroke={isDark ? '#60A5FA' : '#2563EB'} strokeWidth="1" strokeDasharray="3 3" opacity={isDark ? '0.3' : '0.18'} />

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
          stroke="#3B82F6"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
