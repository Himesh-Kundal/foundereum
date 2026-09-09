export interface PricePillProps {
  price: string;
}

export const PricePill = ({ price }: PricePillProps) => {
  return (
    <span className="px-3 py-0.5 rounded-full border border-ink font-mono text-sm text-ink">
      {price}
    </span>
  );
};

export interface StatusPillProps {
  status: string;
}

export const StatusPill = ({ status }: StatusPillProps) => {
  const getBorderColor = () => {
    const s = status.toLowerCase();
    if (s === 'settled' || s === 'matched') return 'border-ok text-ok';
    if (s === 'pending') return 'border-forge text-forge';
    if (s === 'rejected' || s === 'failed' || s === 'unmatched') return 'border-err text-err';
    return 'border-ink text-ink';
  };

  return (
    <span className={`px-2 py-0.5 border font-mono text-xs lowercase ${getBorderColor()}`}>
      {status}
    </span>
  );
};
