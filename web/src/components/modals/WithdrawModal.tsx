import { useState } from 'react';
import { BlockButton, PillButton } from '../Buttons';
import type { ProjectSummary } from '../../types';

export interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectSummary | null;
  onWithdraw: (account: string, amount: string) => Promise<void>;
}

export function WithdrawModal({ isOpen, onClose, currentProject, onWithdraw }: WithdrawModalProps) {
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('100.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAccount.trim() || !withdrawAmount.trim()) return;
    setIsSubmitting(true);
    try {
      await onWithdraw(withdrawAccount.trim(), withdrawAmount.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const minQuorum = parseFloat(currentProject?.withdraw_quorum_min_usd || '100');
  const reqQuorum = parseFloat(withdrawAmount || '0') >= minQuorum;

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink p-6 max-w-md w-full flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-ink pb-2">
          <h3 className="font-bold uppercase text-lg">WITHDRAW FROM TREASURY</h3>
          <button 
            type="button" 
            onClick={onClose}
            className="hover:text-forge font-bold cursor-pointer"
          >
            [X]
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-ink-mut font-bold">Recipient Hedera Account ID</label>
            <input
              type="text"
              placeholder="e.g. 0.0.123456"
              value={withdrawAccount}
              onChange={(e) => setWithdrawAccount(e.target.value)}
              className="border border-ink bg-paper2 p-2 font-mono text-sm outline-none focus:border-forge"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-ink-mut font-bold">Amount (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="1.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="border border-ink bg-paper2 p-2 font-mono text-sm outline-none focus:border-forge"
              required
              disabled={isSubmitting}
            />
          </div>
          {reqQuorum && (
            <div className="p-2 border border-forge bg-forge/10 text-xs text-ink font-bold">
              ⚡ Amounts ≥ ${minQuorum} require {currentProject?.quorum_threshold || 2}-of-3 multi-party quorum signatures before execution.
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <PillButton onClick={onClose}>CANCEL</PillButton>
            <BlockButton variant="danger">
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT WITHDRAWAL'}
            </BlockButton>
          </div>
        </form>
      </div>
    </div>
  );
}
