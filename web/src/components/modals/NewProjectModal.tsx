import { useState, useEffect } from 'react';
import { BlockButton, PillButton } from '../Buttons';
import { generateProjectName } from '../../utils/randomNames';
import { Dices } from 'lucide-react';

export interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, preset: string) => Promise<void>;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && !name) {
      setName(generateProjectName());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate(name.trim(), preset);
      setName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink p-6 max-w-md w-full flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-ink pb-2">
          <h3 className="font-bold uppercase text-lg">PROVISION NEW PROJECT</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="font-mono text-sm hover:text-forge cursor-pointer"
          >
            [X]
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase text-ink-mut font-bold">Project / Agent Name</label>
              <button
                type="button"
                onClick={() => setName(generateProjectName())}
                className="text-[11px] text-ink hover:text-forge flex items-center gap-1 font-bold cursor-pointer transition-colors"
                title="Roll random agent name"
              >
                <Dices size={12} />
                <span>RANDOMIZE</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. neural-scout" 
                className="flex-1 border border-ink bg-paper2 p-2 font-mono text-sm outline-none focus:border-forge"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-ink-mut font-bold">Policy Template</label>
            <select 
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="border border-ink bg-paper2 p-2 font-mono text-sm outline-none cursor-pointer"
              disabled={isSubmitting}
            >
              <option value="conservative">Conservative ($10/day, $0.05/call)</option>
              <option value="standard">Standard ($25/day, $1.00/call)</option>
              <option value="high_throughput">High Throughput ($100/day, $5.00/call)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-ink-mut font-bold">Quorum Threshold</label>
            <div className="text-xs text-ink-mut border border-ink p-2 bg-paper2">
              2-of-3 signatures required for withdrawals over $100
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <PillButton type="button" onClick={onClose}>CANCEL</PillButton>
            <BlockButton type="submit">{isSubmitting ? 'PROVISIONING...' : 'PROVISION ON HEDERA'}</BlockButton>
          </div>
        </form>
      </div>
    </div>
  );
}
