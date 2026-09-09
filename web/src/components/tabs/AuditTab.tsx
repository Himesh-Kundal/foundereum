import { Cell } from '../Cell';
import { CopyField } from '../CopyField';
import { AuditRow } from '../AuditRow';
import type { AuditMessage, ProjectSummary } from '../../types';

export interface AuditTabProps {
  auditLog: { topic_id: string; hashscan_url: string; messages: AuditMessage[] };
  currentProject: ProjectSummary | null;
}

export function AuditTab({ auditLog, currentProject }: AuditTabProps) {
  const topicId = auditLog.topic_id || currentProject?.hcs_topic_id || 'Pending provisioning';

  return (
    <div className="flex flex-col gap-6 font-mono">
      <Cell title="HCS IMMUTABLE AUDIT TRAIL" number="01">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-mut leading-relaxed">
            Every settled payment is mirrored to a public Hedera Consensus Service topic. We can&apos;t edit it. That&apos;s the point.
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink-mut uppercase font-bold">HCS TOPIC ID</span>
            <div className="flex items-center gap-4">
              <CopyField value={topicId} />
              {auditLog.hashscan_url && (
                <a 
                  href={auditLog.hashscan_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm underline hover:text-forge text-ink transition-colors"
                >
                  HashScan Topic ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </Cell>
      <div className="flex flex-col border border-ink bg-paper">
        {auditLog.messages.length > 0 ? (
          auditLog.messages.map((log) => (
            <AuditRow
              key={log.seq}
              seq={log.seq}
              tool={log.tool}
              amount={`$${log.usd}`}
              timestamp={log.ts}
              matched={true}
            />
          ))
        ) : (
          <div className="p-8 text-center text-ink-mut">No audit messages published yet to HCS.</div>
        )}
      </div>
    </div>
  );
}
