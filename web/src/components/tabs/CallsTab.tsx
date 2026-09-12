import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PillButton } from '../Buttons';
import { CallRow } from '../CallRow';
import { EmptyState } from '../EmptyState';
import type { CallRecord, CallFilter } from '../../types';

export interface CallsTabProps {
  calls: CallRecord[];
}

export function CallsTab({ calls }: CallsTabProps) {
  const [filter, setFilter] = useState<CallFilter>('ALL');

  const settledCalls = calls.filter((c) => c.status === 'succeeded');
  const totalSettledUsd = settledCalls.reduce(
    (acc, c) => acc + parseFloat(c.actual_usd || c.estimate_usd || '0'),
    0
  );

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Settled Revenue & Volume Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-paper2 border border-ink p-3 text-xs">
        <div>
          <span className="text-ink-mut uppercase block text-[10px] font-bold">TOTAL SETTLED VOLUME</span>
          <span className="text-lg font-bold text-forge font-mono">${totalSettledUsd.toFixed(4)}</span>
        </div>
        <div>
          <span className="text-ink-mut uppercase block text-[10px] font-bold">SETTLED REQUESTS</span>
          <span className="text-lg font-bold text-ink font-mono">{settledCalls.length} / {calls.length}</span>
        </div>
        <div>
          <span className="text-ink-mut uppercase block text-[10px] font-bold">PLATFORM ACCOUNT (x402 payTo)</span>
          <a
            href="https://hashscan.io/testnet/account/0.0.10413602"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ink hover:text-forge flex items-center gap-1 transition-colors font-bold font-mono mt-1"
            title="View Platform Account on HashScan"
          >
            <span>0.0.10413602</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="flex gap-2 pb-4 border-b border-ink items-center">
        <span className="text-xs uppercase text-ink-mut mr-2 font-bold">Filter:</span>
        {(['ALL', 'SETTLED', 'PENDING', 'REJECTED'] as const).map((f) => (
          <PillButton
            key={f}
            className={filter === f ? 'bg-ink text-paper' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </PillButton>
        ))}
      </div>
      <div className="flex flex-col border border-ink bg-paper">
        {calls.map((c) => {
          const normStatus = c.status === 'succeeded' ? 'settled' : c.status === 'pending' ? 'pending' : 'rejected';
          if (filter !== 'ALL' && normStatus.toUpperCase() !== filter) {
            return null;
          }
          return (
            <CallRow
              key={c.id}
              tool={c.tool}
              status={normStatus}
              price={`$${c.actual_usd || c.estimate_usd}`}
              time={new Date(c.started_at).toLocaleTimeString()}
              txId={c.tx_hash}
              latency={`${c.latency_ms}ms`}
              reason={c.reason}
              args={c.args}
              meteringBreakdown={c.metered_bytes ? `${c.metered_bytes} bytes metered via x402` : undefined}
            />
          );
        })}
        {calls.length === 0 && (
          <EmptyState title="No calls recorded" description="Invoke tools via MCP client or HTTP gateway to stream calls." />
        )}
      </div>
    </div>
  );
}
