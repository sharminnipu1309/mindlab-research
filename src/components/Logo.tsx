import memtivaLogoUrl from '../assets/memtiva-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white' | 'indigo' | 'ocean';
}

export default function Logo({ size = 'md', variant = 'default' }: LogoProps) {
  const isDarkBg = variant === 'white' || variant === 'indigo';

  const heights = {
    sm: 34,
    md: 44,
    lg: 62,
  };
  const h = heights[size];

  return (
    <div
      className={`inline-flex items-center gap-2 select-none transition-all ${
        isDarkBg ? 'bg-white/95 dark:bg-white/95 px-2.5 py-1 rounded-xl shadow-xs' : ''
      }`}
    >
      <img
        src={memtivaLogoUrl}
        alt="Memtiva — Cognitive Research & Analytics"
        style={{ height: h, width: 'auto', objectFit: 'contain' }}
        className="transition-transform hover:scale-105 duration-200"
      />
    </div>
  );
}
