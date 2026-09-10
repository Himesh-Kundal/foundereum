import { BlockButton } from '../Buttons';
import { CopyField } from '../CopyField';

export interface RotatedKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  rotatedKey: string | null;
}

export function RotatedKeyModal({ isOpen, onClose, rotatedKey }: RotatedKeyModalProps) {
  if (!isOpen || !rotatedKey) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink p-6 max-w-md w-full flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-ink pb-2">
          <h3 className="font-bold uppercase text-lg">KEY ROTATED SUCCESSFULLY</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="font-mono text-sm hover:text-forge cursor-pointer"
          >
            [X]
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-xs font-mono text-ink">
            A new API key has been created. The previous key will remain valid for a 1-hour grace window before retirement.
          </p>
          <p className="text-xs font-mono text-err font-bold">
            ⚠ SAVE THIS NEW KEY NOW. This is the only time it will be shown in full.
          </p>
          <CopyField value={rotatedKey} />
          <div className="flex justify-end mt-2">
            <BlockButton onClick={onClose}>DONE</BlockButton>
          </div>
        </div>
      </div>
    </div>
  );
}
