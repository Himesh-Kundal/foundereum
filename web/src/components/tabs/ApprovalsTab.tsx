import { ApprovalCard } from '../ApprovalCard';
import type { Approval } from '../../types';

export interface ApprovalsTabProps {
  approvals: Approval[];
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
}

export function ApprovalsTab({ approvals, onApprove, onReject }: ApprovalsTabProps) {
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const historyApprovals = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className="flex flex-col gap-8 font-mono">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg border-b border-ink pb-2 uppercase font-bold">
          PENDING APPROVALS ({pendingApprovals.length})
        </h2>
        {pendingApprovals.map((app) => (
          <ApprovalCard
            key={app.id}
            action={`${app.type.toUpperCase()}: ${app.payload?.amount_usdc || '0'} USDC → ${app.payload?.to_account || 'destination'}`}
            current={app.signatures?.length || 1}
            threshold={app.threshold || 2}
            initialStatus="pending"
            expiry={app.expires_at}
            onApprove={() => onApprove(app.id)}
            onReject={() => onReject(app.id)}
          />
        ))}
        {pendingApprovals.length === 0 && (
          <div className="border border-ink p-8 text-center text-ink-mut">No pending approvals in inbox.</div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg border-b border-ink pb-2 text-ink-mut uppercase font-bold">
          HISTORY
        </h2>
        {historyApprovals.map((app) => (
          <ApprovalCard
            key={app.id}
            action={`${app.type.toUpperCase()}: ${app.payload?.amount_usdc || '0'} USDC`}
            current={app.signatures?.length || app.threshold}
            threshold={app.threshold || 2}
            initialStatus={app.status as any}
            isHistory
          />
        ))}
      </div>
    </div>
  );
}
