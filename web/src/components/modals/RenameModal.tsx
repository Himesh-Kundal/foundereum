import { useState, useEffect } from 'react';
import { BlockButton, PillButton } from '../Buttons';
import { generateOrgName, generateProjectName } from '../../utils/randomNames';
import { Dices } from 'lucide-react';

export interface RenameModalProps {
  isOpen: boolean;
  type: 'org' | 'project';
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
}

export function RenameModal({ isOpen, type, currentName, onClose, onSave }: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const isOrg = type === 'org';
  const title = isOrg ? 'RENAME WORKSPACE / ORGANIZATION' : 'RENAME AGENT PROJECT';
  const subtitle = isOrg
    ? 'Organizations represent company/team boundaries and hold your team members, approver quorums, and agent projects.'
    : 'Agent projects represent individual AI agents with their own Hedera treasury & agent wallets, spend policies, and API keys.';

  const handleRandomize = () => {
    setName(isOrg ? generateOrgName() : generateProjectName());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(name.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-ink pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-forge inline-block" />
            <h3 className="font-bold uppercase text-base text-ink">{title}</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="font-mono text-sm hover:text-forge cursor-pointer"
            title="Close"
          >
            [X]
          </button>
        </div>

        <p className="text-xs text-ink-mut leading-relaxed">
          {subtitle}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase text-ink-mut font-bold">
                {isOrg ? 'Organization Name' : 'Project / Agent Name'}
              </label>
              <button
                type="button"
                onClick={handleRandomize}
                className="text-[11px] text-ink hover:text-forge flex items-center gap-1 font-bold cursor-pointer transition-colors"
                title="Generate new random name"
              >
                <Dices size={12} />
                <span>RANDOMIZE</span>
              </button>
            </div>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder={isOrg ? 'e.g. Apex Dynamics' : 'e.g. neural-scout'} 
              className="border border-ink bg-paper2 p-2 font-mono text-sm outline-none focus:border-forge"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <PillButton type="button" onClick={onClose}>CANCEL</PillButton>
            <BlockButton type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
            </BlockButton>
          </div>
        </form>
      </div>
    </div>
  );
}
