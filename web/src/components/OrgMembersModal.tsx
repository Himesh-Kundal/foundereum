import { useState } from 'react';
import { BlockButton, PillButton } from './Buttons';
import { StatusPill } from './Pills';
import type { OrgMember } from '../api';

interface OrgMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: OrgMember[];
  currentOrg: { id: string; name: string };
  currentUser: { email: string; role: string };
  onInviteMember: (email: string, role: string) => Promise<void>;
}

export function OrgMembersModal({
  isOpen,
  onClose,
  members,
  currentOrg,
  currentUser,
  onInviteMember,
}: OrgMembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'approver' | 'viewer'>('approver');
  const [isSending, setIsSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) return;
    setIsSending(true);
    setMsg(null);
    try {
      await onInviteMember(inviteEmail, inviteRole);
      setMsg(`Invitation dispatched to ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
    } catch (err: unknown) {
      setMsg(`Error: ${(err as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono">
      <div className="bg-paper border border-ink max-w-2xl w-full p-6 md:p-8 flex flex-col gap-6 relative shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-ink pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-forge inline-block" />
              <span className="text-[11px] uppercase tracking-wider font-bold text-forge">
                ORGANIZATION &amp; ACCESS CONTROL
              </span>
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-ink mt-1">
              {currentOrg.name || 'Acme Ventures'}
            </h2>
            <p className="text-xs text-ink-mut">
              Multi-party governance, Approver Quorums &amp; Team Permissions (Doc 01 §3)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink hover:text-forge text-sm font-bold cursor-pointer p-1"
            title="Close"
          >
            [X]
          </button>
        </div>

        {/* Quorum Notice Banner */}
        <div className="bg-paper2 border border-ink p-3 text-xs flex flex-col gap-1">
          <div className="flex justify-between font-bold">
            <span className="uppercase text-ink">Quorum Withdrawal Threshold:</span>
            <span className="text-forge">2-of-N Signatures Required (&gt; $100 USDC)</span>
          </div>
          <p className="text-[11px] text-ink-mut leading-relaxed">
            Team members with the <strong className="text-ink">Approver</strong> role hold hardware WebCrypto P-256 keys to countersign treasury withdrawals and policy pushes.
          </p>
        </div>

        {/* Members List */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase font-bold text-ink">
              Team Members ({members.length})
            </span>
            <span className="text-[11px] text-ink-mut">
              Logged in as: <strong className="text-ink">{currentUser.email}</strong> ({currentUser.role})
            </span>
          </div>

          <div className="border border-ink bg-paper flex flex-col max-h-56 overflow-y-auto">
            <div className="grid grid-cols-12 gap-2 p-2.5 border-b border-ink bg-paper2 text-[11px] font-bold text-ink-mut uppercase">
              <div className="col-span-5">EMAIL</div>
              <div className="col-span-3">ROLE</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-2 text-right">KEY ENCLAVE</div>
            </div>

            {members.map((m, idx) => (
              <div
                key={m.email + idx}
                className={`grid grid-cols-12 gap-2 p-2.5 items-center text-xs font-mono ${
                  idx < members.length - 1 ? 'border-b border-ink border-dashed' : ''
                }`}
              >
                <div className="col-span-5 font-bold truncate text-ink">
                  {m.email}
                  {m.email === currentUser.email && (
                    <span className="ml-1 text-[10px] text-forge font-normal">(you)</span>
                  )}
                </div>
                <div className="col-span-3 uppercase text-[11px] font-bold text-ink/80">
                  [{m.role}]
                </div>
                <div className="col-span-2">
                  <StatusPill status={m.status || 'active'} />
                </div>
                <div className="col-span-2 text-right text-[10px] text-ok font-bold">
                  {m.role === 'viewer' ? 'READ-ONLY' : '✓ P-256'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleSubmit} className="border-t border-ink pt-4 flex flex-col gap-3">
          <span className="text-xs uppercase font-bold text-ink">
            Invite Teammate to Organization
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="sm:col-span-6 border border-ink bg-paper2 p-2 text-xs outline-none focus:border-forge font-mono"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'approver' | 'viewer')}
              className="sm:col-span-3 border border-ink bg-paper2 p-2 text-xs outline-none cursor-pointer"
            >
              <option value="approver">Approver (Quorum)</option>
              <option value="viewer">Viewer (Read-Only)</option>
            </select>
            <BlockButton
              disabled={isSending}
              className="sm:col-span-3 justify-center text-xs py-2 font-bold"
            >
              {isSending ? 'SENDING...' : '+ INVITE'}
            </BlockButton>
          </div>
          {msg && (
            <div className="text-[11px] text-forge font-bold">
              {msg}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-ink pt-3 flex justify-between items-center text-[11px] text-ink-mut">
          <span>Org ID: <code className="text-ink font-bold">{currentOrg.id || '00000000-0000...'}</code></span>
          <PillButton onClick={onClose}>DONE</PillButton>
        </div>
      </div>
    </div>
  );
}
