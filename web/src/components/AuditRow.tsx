export interface AuditRowProps {
  seq: number;
  tool: string;
  amount: string;
  timestamp: string;
  matched: boolean;
}

export const AuditRow = ({ seq, tool, amount, timestamp, matched }: AuditRowProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-ink last:border-b-0 font-mono text-sm hover:bg-paper2 transition-colors">
      <div className="flex items-center gap-6">
        <span className="text-ink-mut w-16">#{seq}</span>
        <span className="text-ink">{tool}</span>
        <span className="text-forge">{amount}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-ink-mut">{timestamp}</span>
        {matched ? (
          <span className="text-ok flex items-center gap-2">✓ matched</span>
        ) : (
          <span className="text-forge flex items-center gap-2">⚠ unmatched</span>
        )}
      </div>
    </div>
  );
};
