export interface SpendMeterProps {
  spent: number;
  limit: number;
  label?: string;
}

export const SpendMeter = ({ spent, limit, label = '24h' }: SpendMeterProps) => {
  const percentage = Math.min((spent / limit) * 100, 100);
  const isNearLimit = percentage > 90;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm font-mono uppercase text-ink">
        <span>${spent.toFixed(2)} / ${limit.toFixed(2)}</span>
        <span className="text-ink-mut">{label}</span>
      </div>
      <div className="h-4 bg-paper2 border border-ink w-full relative">
        <div 
          className={`h-full border-r border-ink transition-all ${isNearLimit ? 'bg-err' : 'bg-forge'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
