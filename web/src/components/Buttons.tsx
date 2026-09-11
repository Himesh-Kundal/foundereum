import type { ReactNode } from 'react';

export interface PillButtonProps {
  children: ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  href?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const PillButton = ({ children, onClick, href, className = '', type = 'button' }: PillButtonProps) => {
  const Component = href ? 'a' : 'button';
  return (
    <Component
      type={href ? undefined : type}
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
  onClick?: (e?: React.MouseEvent) => void;
  variant?: 'primary' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const BlockButton = ({ children, onClick, variant = 'primary', className = '', disabled = false, type }: BlockButtonProps) => {
  const buttonType = type || (onClick ? 'button' : 'submit');
  return (
    <button
      type={buttonType}
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
