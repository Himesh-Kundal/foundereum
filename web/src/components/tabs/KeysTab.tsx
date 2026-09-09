import { BlockButton } from '../Buttons';
import { StatusPill } from '../Pills';
import type { APIKey } from '../../types';

export interface KeysTabProps {
  keys: APIKey[];
  onOpenNewKeyModal: () => void;
  onRotateKey: (keyId: string) => Promise<void>;
  onRevokeKey: (keyId: string) => Promise<void>;
}

export function KeysTab({
  keys,
  onOpenNewKeyModal,
  onRotateKey,
  onRevokeKey,
}: KeysTabProps) {
  return (
    <div className="flex flex-col gap-6 font-mono">
      <div className="flex justify-between items-center">
        <h2 className="text-xl uppercase font-bold">API Keys ({keys.length})</h2>
        <BlockButton onClick={onOpenNewKeyModal}>+ NEW KEY</BlockButton>
      </div>
      <div className="border border-ink flex flex-col bg-paper">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-ink bg-paper2 text-sm text-ink-mut uppercase font-bold">
          <div>NAME</div>
          <div>PREFIX</div>
          <div>STATUS</div>
          <div className="text-right">ACTIONS</div>
        </div>
        {keys.length > 0 ? (
          keys.map((k, i) => (
            <div 
              key={k.id} 
              className={`grid grid-cols-4 gap-4 p-4 items-center ${
                i < keys.length - 1 ? 'border-b border-ink border-dashed' : ''
              } text-sm`}
            >
              <div className="font-bold">{k.name}</div>
              <div className="text-ink-mut">{k.prefix}...</div>
              <div><StatusPill status={k.status} /></div>
              <div className="text-right">
                {k.status === 'active' && (
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => onRotateKey(k.id)}
                      className="text-xs text-forge font-bold uppercase underline hover:opacity-80 cursor-pointer"
                      title="Rotate key with 1-hour grace period"
                    >
                      Rotate
                    </button>
                    <button
                      type="button"
                      onClick={() => onRevokeKey(k.id)}
                      className="text-xs text-err font-bold uppercase underline hover:opacity-80 cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-ink-mut">No API keys provisioned for this project.</div>
        )}
      </div>
    </div>
  );
}
