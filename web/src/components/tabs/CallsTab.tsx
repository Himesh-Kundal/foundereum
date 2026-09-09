import { useState } from 'react';
import { PillButton } from '../Buttons';
import { CallRow } from '../CallRow';
import { EmptyState } from '../EmptyState';
import type { CallRecord, CallFilter } from '../../types';

export interface CallsTabProps {
  calls: CallRecord[];
}

export function CallsTab({ calls }: CallsTabProps) {
  const [filter, setFilter] = useState<CallFilter>('ALL');

  return (
    <div className="flex flex-col gap-4 font-mono">
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
