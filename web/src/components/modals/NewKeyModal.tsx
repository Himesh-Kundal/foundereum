import { useState } from 'react';
import { BlockButton, PillButton } from '../Buttons';
import { CopyField } from '../CopyField';

export interface NewKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<string | null>;
}

export function NewKeyModal({ isOpen, onClose, onCreate }: NewKeyModalProps) {
  const [name, setName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const key = await onCreate(name.trim());
      if (key) {
        setGeneratedKey(key);
      } else {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setGeneratedKey(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink p-6 max-w-md w-full flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-ink pb-2">
          <h3 className="font-bold uppercase text-lg">GENERATE API KEY</h3>
          <button 
            type="button"
            onClick={handleClose} 
            className="font-mono text-sm hover:text-forge cursor-pointer"
          >
            [X]
          </button>
        </div>
        {!generatedKey ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-ink-mut font-bold">Key Description / Client Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude Desktop Agent" 
                className="border border-ink bg-paper2 p-2 font-mono text-sm outline-none focus:border-forge"
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <PillButton type="button" onClick={handleClose}>CANCEL</PillButton>
              <BlockButton type="submit">{isSubmitting ? 'GENERATING...' : 'GENERATE KEY'}</BlockButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-mono text-err font-bold">
              ⚠ SAVE THIS KEY NOW. This is the only time it will be shown in full.
            </p>
            <CopyField value={generatedKey} />
            <div className="flex justify-end mt-2">
              <BlockButton onClick={handleClose}>DONE</BlockButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
