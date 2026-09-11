import { useState } from 'react';
import { BlockButton, PillButton } from '../Buttons';

export interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: (amount: string) => Promise<void>;
}

export function TopUpModal({ isOpen, onClose, onTopUp }: TopUpModalProps) {
  const [amount, setAmount] = useState('5.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) return;
    setIsSubmitting(true);
    try {
      await onTopUp(amount.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink p-6 max-w-md w-full flex flex-col gap-4 font-mono">
        <div className="flex justify-between items-center border-b border-ink pb-2">
          <h3 className="font-bold uppercase text-lg">TOP UP AGENT WALLET</h3>
          <button 
            type="button" 
            onClick={onClose}
            className="hover:text-forge font-bold cursor-pointer"
          >
            [X]
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-ink-mut">
            Transfer HTS USDC from the multi-sig Treasury wallet to the policy-bound Agent wallet.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-ink-mut font-bold">Amount (USDC)</label>
            <div className="flex gap-2 mb-2">
              {['2.00', '5.00', '10.00', '25.00'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`text-xs border border-ink px-2.5 py-1 font-bold cursor-pointer ${
                    amount === amt ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper2'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border border-ink bg-paper2 p-2 font-mono text-sm outline-none focus:border-forge"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <PillButton type="button" onClick={onClose}>CANCEL</PillButton>
            <BlockButton type="submit">{isSubmitting ? 'TRANSFERRING...' : 'TRANSFER USDC'}</BlockButton>
          </div>
        </form>
      </div>
    </div>
  );
}
