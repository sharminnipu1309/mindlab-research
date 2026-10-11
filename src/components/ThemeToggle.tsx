import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getInitialTheme, toggleTheme, Theme } from '../utils/theme';

interface Props {
  className?: string;
  variant?: 'nav' | 'compact' | 'pill';
}

export default function ThemeToggle({ className = '', variant = 'nav' }: Props) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : getInitialTheme());
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  if (variant === 'pill') {
    return (
      <button
        onClick={handleToggle}
        aria-label="Toggle dark mode"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
          theme === 'dark'
            ? 'bg-[#171B3A] border-[#2D356D] text-[#A5B4FC] hover:bg-[#1E2452]'
            : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#11152F] hover:bg-[#F8F9FD]'
        } ${className}`}
      >
        {theme === 'dark' ? (
          <>
            <Sun size={14} className="text-[#FBBF24] transition-transform duration-300 rotate-0 hover:rotate-90" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon size={14} className="text-[#6D5AE6] transition-transform duration-300 -rotate-12" />
            <span>Dark</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      aria-label="Toggle dark mode"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2 rounded-xl transition-all duration-200 border flex items-center justify-center ${
        theme === 'dark'
          ? 'bg-[#171E42] border-[#2E3C75] text-[#FBBF24] hover:bg-[#1E2756] hover:border-[#4B5EAA]'
          : 'bg-[#F8F8FC] border-[#E2E8F0] text-[#64748B] hover:text-[#6D5AE6] hover:bg-white hover:border-[#C5C1F1]'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={17} className="transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={17} className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
