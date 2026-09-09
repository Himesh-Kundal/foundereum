import { useState, useEffect } from 'react';
import { Cell } from './Cell';
import { BlockButton } from './Buttons';

export interface ApprovalCardProps {
  action: string;
  current: number;
  threshold: number;
  expiry?: string;
  onApprove?: () => void;
  onReject?: () => void;
  isHistory?: boolean;
  initialStatus?: 'pending' | 'approved' | 'executed' | 'rejected';
}

export const ApprovalCard = ({ 
  action, 
  current: initialCurrent, 
  threshold, 
  expiry,
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

  useEffect(() => {
    setCurrent(initialCurrent);
    if (initialStatus) {
      setStatus(initialStatus === 'executed' || initialStatus === 'approved' ? 'approved' : initialStatus);
    }
  }, [initialCurrent, initialStatus]);

  const handleApprove = async () => {
    setIsSigning(true);
    try {
      // Simulate real in-browser WebCrypto P-256 signature generation
      if (window.crypto && window.crypto.subtle) {
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
    if (onApprove) onApprove();
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
            <span className="uppercase text-ink-mut">SIGNATURES:</span>
            <div className="flex gap-1">
              {renderSquares()}
            </div>
            <span className="font-bold ml-1">
              {current}/{threshold}
            </span>
          </div>

          {expiry && status === 'pending' && (
            <span className="text-err text-xs font-medium">
              Expires in {expiry}
            </span>
          )}
        </div>

        {!isHistory && status === 'pending' && (
          <div className="flex justify-end gap-3 mt-1">
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
        )}
      </div>
    </Cell>
  );
};
