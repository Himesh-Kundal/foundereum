import type { ReactNode } from 'react';

export interface CellProps {
  number?: string;
  title?: string;
  brackets?: boolean;
  className?: string;
  fill?: 'paper' | 'paper2';
  children?: ReactNode;
}

export const Cell = ({
  number,
  title,
  brackets,
  className = '',
  fill = 'paper',
  children
}: CellProps) => {
  return (
    <div
      className={`border border-ink relative ${fill === 'paper2' ? 'bg-paper2' : 'bg-paper'} ${brackets ? 'cell-brackets' : ''} ${className}`}
    >
      {(number || title) && (
        <div className="flex items-center gap-4 p-4 border-b border-ink">
          {number && <span className="text-[12px] uppercase text-ink-mut font-mono">{number}</span>}
          {title && <h3 className="uppercase font-mono text-ink m-0">{title}</h3>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
