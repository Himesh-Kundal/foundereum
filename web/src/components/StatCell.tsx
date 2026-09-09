import { Cell } from './Cell';

export interface StatCellProps {
  label: string;
  value: string;
  delta?: string;
}

export const StatCell = ({ label, value, delta }: StatCellProps) => {
  return (
    <Cell className="flex flex-col">
      <span className="text-[12px] font-mono uppercase text-ink-mut mb-2">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className="text-[28px] font-mono font-medium text-ink">{value}</span>
        {delta && <span className="text-sm font-mono text-ink-mut">{delta}</span>}
      </div>
    </Cell>
  );
};
