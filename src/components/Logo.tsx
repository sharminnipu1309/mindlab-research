import { MEMTIVA_BRAIN_ICON } from '../assets/logoData';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'white' | 'indigo' | 'forest' | 'ocean';
  showSubtitle?: boolean;
  className?: string;
}

export default function Logo({
  size = 'md',
  variant = 'default',
  showSubtitle = true,
  className = '',
}: LogoProps) {
  const isWhite = variant === 'white' || variant === 'indigo';

  const sizes = {
    sm: { mark: 30, text: 17, sub: 8.5 },
    md: { mark: 38, text: 21, sub: 9.5 },
    lg: { mark: 52, text: 28, sub: 12 },
  };
  const s = sizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none group transition-all ${className}`}>
      {/* High-res Neural Brain Icon from official Memtiva asset */}
      <img
        src={MEMTIVA_BRAIN_ICON}
        alt="Memtiva Logo"
        style={{ height: s.mark, width: 'auto' }}
        className="shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
      />

      {/* Styled Wordmark: "Mem" + "tiva" + Subtitle */}
      <div className="flex flex-col leading-none gap-0.5 justify-center">
        <div
          className="flex items-baseline font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
          style={{ fontSize: s.text, letterSpacing: '-0.02em' }}
        >
          <span className={isWhite ? 'text-white' : 'text-[#183B4A] dark:text-[#EAF4F8]'}>
            Mem
          </span>
          <span className={isWhite ? 'text-[#63B8C6]' : 'text-[#2563EB] dark:text-[#60A5FA]'}>
            tiva
          </span>
        </div>

        {showSubtitle && size !== 'sm' && (
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: s.sub,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
            className={isWhite ? 'text-white/80' : 'text-[#526E7B] dark:text-[#9BB5C4]'}
          >
            Cognitive Research & Analytics
          </span>
        )}
      </div>
    </div>
  );
}
