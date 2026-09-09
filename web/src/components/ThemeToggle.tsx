import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Active: ${theme} (${resolvedTheme}). Click to toggle.`}
      className={`border border-ink px-2.5 py-1 font-mono text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer bg-paper text-ink hover:bg-paper2 select-none ${className}`}
      aria-label="Toggle light or dark theme"
    >
      {resolvedTheme === 'dark' ? (
        <>
          <Sun size={13} className="text-forge shrink-0" />
          {!compact && <span className="font-bold tracking-tight">LIGHT</span>}
        </>
      ) : (
        <>
          <Moon size={13} className="text-forge shrink-0" />
          {!compact && <span className="font-bold tracking-tight">DARK</span>}
        </>
      )}
    </button>
  );
}
