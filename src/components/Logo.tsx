interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white' | 'indigo' | 'ocean';
}

export default function Logo({ size = 'md', variant = 'default' }: LogoProps) {
  const isWhite = variant === 'white' || variant === 'indigo';
  const textColor = isWhite ? '#FFFFFF' : 'var(--logo-text, #183B4A)';
  const accentColor = isWhite ? '#38BDF8' : 'var(--logo-accent, #245D72)';
  const secondaryAccent = isWhite ? '#A78BFA' : '#4D91AD';
  const subColor = isWhite ? 'rgba(234, 244, 248, 0.85)' : 'var(--logo-sub, #526E7B)';

  const sizes = {
    sm: { mark: 24, text: 16, sub: 9 },
    md: { mark: 32, text: 21, sub: 10 },
    lg: { mark: 44, text: 28, sub: 12 },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5 select-none transition-colors">
      {/* Memtiva Modern Logo Mark: Intertwined Neural Memory 'M' with Synaptic Radiance */}
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-200"
      >
        <defs>
          <linearGradient id="memtivaGrad1" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor={secondaryAccent} />
          </linearGradient>
          <linearGradient id="memtivaGlow" x1="12" y1="8" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={secondaryAccent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Soft rounded hexagonal containment shield */}
        <rect
          x="3"
          y="3"
          width="38"
          height="38"
          rx="12"
          fill="url(#memtivaGlow)"
          stroke="url(#memtivaGrad1)"
          strokeWidth="1.75"
        />

        {/* Intersecting Dynamic 'M' Synaptic Pathways */}
        <path
          d="M12 30V15C12 13.5 13.5 12.5 15 13.5L22 20.5L29 13.5C30.5 12.5 32 13.5 32 15V30"
          stroke="url(#memtivaGrad1)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Cognitive Energy Loop */}
        <path
          d="M16 23C16 19 28 19 28 23C28 27.5 16 27.5 16 31"
          stroke={secondaryAccent}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="2.5 2.5"
          opacity="0.85"
        />

        {/* Synaptic Memory Nodes */}
        <circle cx="12" cy="15" r="2.5" fill={accentColor} />
        <circle cx="22" cy="20.5" r="2.75" fill={isWhite ? '#FFFFFF' : '#0D9488'} />
        <circle cx="32" cy="15" r="2.5" fill={secondaryAccent} />
        <circle cx="12" cy="30" r="2" fill={subColor} />
        <circle cx="32" cy="30" r="2" fill={subColor} />
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col leading-none gap-0.5">
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: s.text,
            fontWeight: 800,
            color: textColor,
            letterSpacing: '-0.02em',
          }}
          className={!isWhite ? 'text-[#183B4A] dark:text-[#F1F8FB]' : ''}
        >
          Memtiva
        </span>
        {size !== 'sm' && (
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: s.sub,
              fontWeight: 700,
              color: subColor,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
            className={!isWhite ? 'text-[#526E7B] dark:text-[#63B8C6]' : ''}
          >
            Research
          </span>
        )}
      </div>
    </div>
  );
}
