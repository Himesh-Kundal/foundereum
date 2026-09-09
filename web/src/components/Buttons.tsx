import type { ReactNode } from 'react';

export interface PillButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export const PillButton = ({ children, onClick, href, className = '' }: PillButtonProps) => {
  const Component = href ? 'a' : 'button';
  return (
    <Component
      onClick={onClick}
      href={href}
      className={`px-4 py-2 uppercase font-mono text-sm border border-ink rounded-full bg-transparent text-ink hover:bg-ink hover:text-paper transition-colors ${className}`}
    >
      {children}
    </Component>
  );
};

export interface BlockButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger';
  className?: string;
  disabled?: boolean;
}

export const BlockButton = ({ children, onClick, variant = 'primary', className = '', disabled = false }: BlockButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 uppercase font-mono text-sm rounded-none border border-ink hover:opacity-90 transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        variant === 'danger' ? 'bg-err text-paper' : 'bg-forge text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
};
