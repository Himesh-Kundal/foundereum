import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusPill } from './Pills';

export interface CallRowProps {
  tool: string;
  price: string;
  status: 'settled' | 'pending' | 'rejected' | 'failed';
  txId?: string;
  latency?: string;
  time?: string;
  reason?: string;
  args?: Record<string, unknown>;
  meteringBreakdown?: string;
}

export const CallRow = ({ 
  tool, 
  price, 
  status, 
  txId, 
  latency = '0.8s', 
  time = 'Just now', 
  reason,
  args,
  meteringBreakdown
}: CallRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSparkClass = () => {
    switch(status) {
      case 'settled': return 'bg-ok';
      case 'pending': return 'bg-forge animate-pulse-spark';
      case 'rejected':
      case 'failed': return 'bg-err';
      default: return 'bg-ink';
    }
  };

  const displayArgs: Record<string, unknown> = args && Object.keys(args).length > 0
    ? args 
    : { status: "No arguments recorded" };

  const breakdown = meteringBreakdown || `Base settled rate: ${price}`;

  return (
    <div className="border-b border-ink last:border-b-0 font-mono text-sm bg-paper hover:bg-paper2/60 transition-colors">
      {/* Row Summary */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer select-none gap-3"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Spark motif: 8x8px square */}
          <div className={`w-2 h-2 shrink-0 ${getSparkClass()}`} title={`Status: ${status}`} />
          <span className="font-bold text-ink truncate">{tool}</span>
          <span className="text-forge font-medium shrink-0">{price}</span>
          
          {status === 'rejected' && reason && (
            <span className="text-err text-xs truncate">
              policy_rejected · {reason}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end text-xs">
          <StatusPill status={status} />
          {latency && <span className="text-ink-mut">{latency}</span>}
          {time && <span className="text-ink-mut hidden md:inline">{time}</span>}
          
          {txId && (
            <a 
              href={(() => {
                if (txId.startsWith('http')) return txId;
                const m = txId.match(/^(\d+\.\d+\.\d+)@(\d+)\.(\d+)$/);
                if (m) return `https://hashscan.io/testnet/transaction/${m[1]}-${m[2]}-${m[3]}`;
                if (txId.startsWith('0.0.') && !txId.includes('@') && !txId.includes('-')) {
                  return `https://hashscan.io/testnet/account/${txId}`;
                }
                return `https://hashscan.io/testnet/transaction/${txId}`;
              })()} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-ink hover:text-forge transition-colors font-mono"
              title="View on HashScan"
            >
              <span>{txId.length > 24 ? `${txId.slice(0, 10)}...${txId.slice(-6)}` : txId}</span>
              <ExternalLink size={12} />
            </a>
          )}

          <button type="button" className="text-ink-mut hover:text-ink">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Inspection Drawer (Doc 11 §4.10) */}
      {isExpanded && (
        <div className="p-4 bg-paper2 border-t border-ink border-dashed flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arguments */}
            <div className="flex flex-col gap-1">
              <span className="font-bold text-ink-mut uppercase">Payload Arguments:</span>
              <pre className="bg-[#14161D] text-[#E8E4DA] p-3 overflow-x-auto text-[11px] leading-relaxed border border-line">
                <code>{JSON.stringify(displayArgs, null, 2)}</code>
              </pre>
            </div>

            {/* Metering breakdown and Rail details */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-ink-mut uppercase">x402 Metering Formula:</span>
                <div className="p-2 border border-ink bg-paper text-ink font-mono text-[11px]">
                  {breakdown}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-bold text-ink-mut uppercase">Settlement Rail:</span>
                <div className="p-2 border border-ink bg-paper text-ink text-[11px] flex justify-between items-center">
                  <span>Hedera Testnet (HTS USDC) via Blocky402</span>
                  <span className="text-ok font-bold">✓ Gasless Facilitator</span>
                </div>
              </div>

              {status === 'rejected' && (
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-err uppercase">Denial Details:</span>
                  <div className="p-2 border border-err bg-err/10 text-err text-[11px]">
                    Violation of Privy policy rule: {reason || 'Contract or selector not allowlisted'} (default_action: DENY)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
