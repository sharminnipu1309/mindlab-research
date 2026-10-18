interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white' | 'indigo' | 'ocean';
}

export default function Logo({ size = 'md', variant = 'default' }: LogoProps) {
  const isWhite = variant === 'white' || variant === 'indigo';
  const textColor = isWhite ? '#FFFFFF' : 'var(--logo-text, #263B46)';
  const accentColor = isWhite ? '#63B8C6' : 'var(--logo-accent, #4D91AD)';
  const subColor = isWhite ? 'rgba(234, 244, 248, 0.9)' : 'var(--logo-sub, #526E7B)';

  const sizes = {
    sm: { mark: 22, text: 15, sub: 9 },
    md: { mark: 30, text: 20, sub: 11 },
    lg: { mark: 42, text: 28, sub: 13 },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5 select-none transition-colors">
      {/* Abstract mark: neural connection / geometric maze */}
      <svg width={s.mark} height={s.mark} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        {/* Outer circle */}
        <circle cx="20" cy="20" r="18" stroke={accentColor} strokeWidth="1.5" opacity="0.45" />
        {/* Inner geometric structure */}
        <circle cx="20" cy="20" r="3.5" fill={accentColor} />
        {/* Neural connection lines */}
        <line x1="20" y1="20" x2="8" y2="12" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="32" y2="12" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="8" y2="28" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="32" y2="28" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="20" y2="5" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Node dots */}
        <circle cx="8" cy="12" r="2.5" fill={subColor} />
        <circle cx="32" cy="12" r="2.5" fill={subColor} />
        <circle cx="8" cy="28" r="2.5" fill={subColor} />
        <circle cx="32" cy="28" r="2.5" fill={subColor} />
        <circle cx="20" cy="5" r="2.5" fill={accentColor} />
        {/* Cross connections */}
        <line x1="8" y1="12" x2="32" y2="12" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
        <line x1="8" y1="28" x2="32" y2="28" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
        <line x1="8" y1="12" x2="8" y2="28" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
        <line x1="32" y1="12" x2="32" y2="28" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col leading-none gap-0.5">
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: s.text,
            fontWeight: 800,
            color: textColor,
            letterSpacing: '-0.01em',
          }}
          className={!isWhite ? 'text-[#263B46] dark:text-[#EAF4F8]' : ''}
        >
          MindLab
        </span>
        {size !== 'sm' && (
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: s.sub,
              fontWeight: 600,
              color: subColor,
              letterSpacing: '0.08em',
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
