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
            ? 'bg-[#203541] border-[#2D4654] text-[#EAF4F8] hover:bg-[#28414F]'
            : 'bg-white border-[#C5DCE4] text-[#263B46] hover:bg-[#EAF4F8]'
        } ${className}`}
      >
        {theme === 'dark' ? (
          <>
            <Sun size={14} className="text-[#63B8C6] transition-transform duration-300 rotate-0 hover:rotate-90" />
            <span>Light</span>
          </>
        ) : (
          <>
            <Moon size={14} className="text-[#4D91AD] transition-transform duration-300 -rotate-12" />
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
          ? 'bg-[#203541] border-[#2D4654] text-[#EAF4F8] hover:bg-[#28414F] hover:text-[#63B8C6] hover:border-[#63B8C6]/60'
          : 'bg-white border-[#C5DCE4] text-[#263B46] hover:text-[#4D91AD] hover:bg-[#EAF4F8] hover:border-[#4D91AD]'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={17} className="text-[#63B8C6] transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={17} className="text-[#4D91AD] transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
