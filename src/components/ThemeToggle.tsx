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
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#354238] border-[#445448] text-[#D7E0D8] hover:bg-[#3F4F43]'
            : 'bg-white border-[#BAC8BD] text-[#282E28] hover:bg-[#E4EBE5]'
        } ${className}`}
      >
        {theme === 'dark' ? (
          <>
            <Sun size={14} className="text-[#A3B9A5] transition-transform duration-300 rotate-0 hover:rotate-90" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon size={14} className="text-[#354238] transition-transform duration-300 -rotate-12" />
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
      className={`p-2 rounded-xl transition-all duration-200 border flex items-center justify-center cursor-pointer shadow-2xs ${
        theme === 'dark'
          ? 'bg-[#354238] border-[#445448] text-[#D7E0D8] hover:bg-[#3F4F43] hover:text-[#A3B9A5] hover:border-[#A3B9A5]/60'
          : 'bg-white border-[#BAC8BD] text-[#282E28] hover:text-[#354238] hover:bg-[#E4EBE5] hover:border-[#354238]'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={17} className="text-[#A3B9A5] transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={17} className="text-[#354238] transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
