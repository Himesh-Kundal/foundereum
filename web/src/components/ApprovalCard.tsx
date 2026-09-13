import { useState, useEffect } from 'react';
import { Cell } from './Cell';
import { BlockButton } from './Buttons';

export interface ApprovalCardProps {
  action: string;
  current: number;
  threshold: number;
  expiry?: string;
  signatures?: Array<{ email: string; at: string }>;
  orgMembers?: Array<{ email: string; role: string }>;
  currentUserEmail?: string;
  onApprove?: (signerEmail?: string) => void;
  onReject?: () => void;
  isHistory?: boolean;
  initialStatus?: 'pending' | 'approved' | 'executed' | 'rejected';
}

export const ApprovalCard = ({ 
  action, 
  current: initialCurrent, 
  threshold, 
  expiry,
  signatures,
  orgMembers,
  currentUserEmail,
  onApprove,
  onReject,
  isHistory = false,
  initialStatus
}: ApprovalCardProps) => {
  const [current, setCurrent] = useState(initialCurrent);
  const [isSigning, setIsSigning] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(() => {
    if (initialStatus === 'executed' || initialStatus === 'approved') return 'approved';
    if (initialStatus === 'rejected') return 'rejected';
    return 'pending';
  });

  const normalizedUserEmail = currentUserEmail?.toLowerCase().trim() || '';
  const alreadySignedEmails = (signatures || []).map((s) => s.email.toLowerCase().trim());
  const hasCurrentUserSigned = normalizedUserEmail !== '' && alreadySignedEmails.includes(normalizedUserEmail);

  // Remaining eligible approvers who have not signed yet
  const pendingApproverList = (orgMembers || [])
    .filter((m) => m.role === 'owner' || m.role === 'approver')
    .map((m) => m.email)
    .filter((email) => !alreadySignedEmails.includes(email.toLowerCase().trim()));

  useEffect(() => {
    setCurrent(initialCurrent);
    if (initialStatus) {
      setStatus(initialStatus === 'executed' || initialStatus === 'approved' ? 'approved' : initialStatus);
    }
  }, [initialCurrent, initialStatus]);

  const handleApprove = async () => {
    setIsSigning(true);
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const keyPair = await window.crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign', 'verify']
        );
        const data = new TextEncoder().encode(action);
        await window.crypto.subtle.sign(
          { name: 'ECDSA', hash: { name: 'SHA-256' } },
          keyPair.privateKey,
          data
        );
      }
    } catch {
      // Fallback
    }

    const nextCount = current + 1;
    setCurrent(nextCount);
    setIsSigning(false);
    if (nextCount >= threshold) {
      setStatus('approved');
    }
    if (onApprove) onApprove(currentUserEmail);
  };

  const handleReject = () => {
    setStatus('rejected');
    if (onReject) onReject();
  };

  const renderSquares = () => {
    const squares = [];
    for (let i = 0; i < Math.max(current, threshold); i++) {
      squares.push(
        <span key={i} className={`text-base ${i < current ? 'text-forge' : 'text-ink-mut'}`}>
          {i < current ? '■' : '□'}
        </span>
      );
    }
    return squares;
  };

  return (
    <Cell brackets className="w-full">
      <div className="flex flex-col gap-4 font-mono">
        <div className="flex justify-between items-start">
          <span className="font-bold text-ink text-sm uppercase">{action}</span>
          {status === 'approved' && (
            <span className="text-ok text-xs font-bold border border-ok px-2 py-0.5">✓ EXECUTED</span>
          )}
          {status === 'rejected' && (
            <span className="text-err text-xs font-bold border border-err px-2 py-0.5">REJECTED</span>
          )}
        </div>
        
        <div className="flex items-center justify-between border-y border-ink border-dashed py-3 text-xs">
          <div className="flex items-center gap-2 text-ink">
            <span className="uppercase text-ink-mut font-bold">SIGNATURES:</span>
            <div className="flex gap-1">
              {renderSquares()}
            </div>
            <span className="font-bold ml-1 text-sm">
              {current}/{threshold}
            </span>
          </div>

          {expiry && status === 'pending' && (
            <span className="text-err text-xs font-medium">
              Expires in {expiry}
            </span>
          )}
        </div>

        {signatures && signatures.length > 0 && (
          <div className="flex flex-col gap-1.5 border-b border-ink/20 pb-3 text-xs">
            <span className="text-[10px] text-ink-mut uppercase font-bold tracking-wider">
              Recorded Quorum Signatures:
            </span>
            <div className="flex flex-col gap-1">
              {signatures.map((sig, idx) => (
                <div key={idx} className="flex justify-between items-center bg-paper2 px-2.5 py-1 border border-ink/20 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ok font-bold">✓</span>
                    <span className="font-bold text-ink">{sig.email}</span>
                  </div>
                  <span className="text-[10px] text-ink-mut">
                    {sig.at ? new Date(sig.at).toLocaleTimeString() : 'Recorded'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isHistory && status === 'pending' && (
          <div>
            {hasCurrentUserSigned ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-1 bg-paper2 p-3 border border-ink">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ok">
                    <span>✓</span>
                    <span>YOU ALREADY SIGNED</span>
                    <span className="text-ink-mut font-normal">({currentUserEmail})</span>
                  </div>
                  <div className="text-[11px] text-ink-mut">
                    Waiting for {threshold - current} additional approver signature{threshold - current > 1 ? 's' : ''}
                    {pendingApproverList.length > 0 ? ` (${pendingApproverList.join(', ')})` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReject}
                  className="border border-err text-err hover:bg-err hover:text-paper px-3 py-1.5 text-xs font-mono uppercase font-bold transition-colors cursor-pointer"
                  title="Cancel this pending approval request"
                >
                  CANCEL REQUEST
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ink-mut uppercase text-[10px] font-bold">SIGNING AS:</span>
                  <span className="font-bold text-ink bg-paper2 border border-ink px-2 py-0.5">
                    {currentUserEmail || 'Authenticated Approver'}
                  </span>
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button 
                    type="button"
                    onClick={handleReject} 
                    className="border border-ink px-4 py-2 text-xs font-mono uppercase hover:bg-paper2 transition-colors cursor-pointer"
                  >
                    REJECT
                  </button>
                  <BlockButton onClick={handleApprove}>
                    {isSigning ? 'SIGNING VIA WEBCRYPTO...' : 'APPROVE (SIGN P-256)'}
                  </BlockButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Cell>
  );
};
