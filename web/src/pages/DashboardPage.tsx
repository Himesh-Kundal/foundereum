import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { NavSide } from '../components/NavSide';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { WalletsTab } from '../components/tabs/WalletsTab';
import { PolicyTab } from '../components/tabs/PolicyTab';
import { KeysTab } from '../components/tabs/KeysTab';
import { CallsTab } from '../components/tabs/CallsTab';
import { AuditTab } from '../components/tabs/AuditTab';
import { ApprovalsTab } from '../components/tabs/ApprovalsTab';
import { NewProjectModal } from '../components/modals/NewProjectModal';
import { NewKeyModal } from '../components/modals/NewKeyModal';
import { TopUpModal } from '../components/modals/TopUpModal';
import { WithdrawModal } from '../components/modals/WithdrawModal';
import { OrgMembersModal } from '../components/OrgMembersModal';
import { RotatedKeyModal } from '../components/modals/RotatedKeyModal';
import { RenameModal } from '../components/modals/RenameModal';
import type { 
  Tab, 
  UserSession, 
  ProjectSummary, 
  Wallet, 
  APIKey, 
  CallRecord, 
  AuditMessage, 
  Approval, 
  PolicyResponse, 
  OrgMember,
  UserOrgMembership 
} from '../types';

export interface DashboardPageProps {
  currentTab: Tab;
  onNavigateTab: (tab: Tab) => void;
  onNavigateView: (view: 'landing' | 'docs' | 'projects') => void;
  user: UserSession | null;
  projects: ProjectSummary[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  wallets: Wallet[];
  keys: APIKey[];
  calls: CallRecord[];
  auditLog: { topic_id: string; hashscan_url: string; messages: AuditMessage[] };
  approvals: Approval[];
  policyData: PolicyResponse | null;
  mcpConfigText: string;
  spend24h: number;
  spendLimit: number;
  isLoading: boolean;
  orgMembers: OrgMember[];
  currentOrg: { id: string; name: string };
  orgMemberships?: UserOrgMembership[];
  onAcceptInvite?: (orgId: string) => Promise<void>;
  onSwitchOrg?: (orgId: string) => Promise<void>;
  onSignOut: () => void;
  onCreateProject: (name: string, preset: string) => Promise<void>;
  onCreateKey: (name: string) => Promise<string | null>;
  onRotateKey: (keyId: string) => Promise<void>;
  onRevokeKey: (keyId: string) => Promise<void>;
  onTopUp: (amount: string) => Promise<void>;
  onWithdraw: (account: string, amount: string) => Promise<void>;
  onApprove: (approvalId: string, signerEmail?: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
  onPushPolicy: (policyJson: string) => Promise<void>;
  onFaucet: () => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<void>;
  onRenameProject?: (projectId: string, newName: string) => Promise<void>;
  onRenameOrg?: (orgId: string, newName: string) => Promise<void>;
  rotatedKey: string | null;
  onCloseRotatedKeyModal: () => void;
}

export function DashboardPage({
  currentTab,
  onNavigateTab,
  onNavigateView,
  user,
  projects,
  activeProjectId,
  onSelectProject,
  wallets,
  keys,
  calls,
  auditLog,
  approvals,
  policyData,
  mcpConfigText,
  spend24h,
  spendLimit,
  isLoading,
  orgMembers,
  currentOrg,
  onSignOut,
  onCreateProject,
  onCreateKey,
  onRotateKey,
  onRevokeKey,
  onTopUp,
  onWithdraw,
  onApprove,
  onReject,
  onPushPolicy,
  onFaucet,
  onInviteMember,
  onRenameProject,
  onRenameOrg,
  orgMemberships = [],
  onAcceptInvite,
  onSwitchOrg,
  rotatedKey,
  onCloseRotatedKeyModal,
}: DashboardPageProps) {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [renameModalConfig, setRenameModalConfig] = useState<{
    isOpen: boolean;
    type: 'org' | 'project';
    id: string;
    currentName: string;
  } | null>(null);

  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;

  const treasuryWallet: Wallet = wallets.find(w => w.kind === 'treasury') || {
    id: '',
    kind: 'treasury',
    hedera_account_id: '—',
    evm_address: '—',
    usdc: '0.000000',
    hbar: '0.000000',
    status: 'ready',
    hashscan_url: ''
  };

  const agentWallet: Wallet = wallets.find(w => w.kind === 'agent') || {
    id: '',
    kind: 'agent',
    hedera_account_id: '—',
    evm_address: '—',
    usdc: '0.000000',
    hbar: '0.000000',
    status: 'ready',
    hashscan_url: ''
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <OverviewTab
            treasuryWallet={treasuryWallet}
            agentWallet={agentWallet}
            spend24h={spend24h}
            calls={calls}
            currentProject={currentProject}
            auditTopicId={auditLog.topic_id}
            mcpConfigText={mcpConfigText}
            onNavigateToCalls={() => onNavigateTab('calls')}
          />
        );

      case 'wallets':
        return (
          <WalletsTab
            treasuryWallet={treasuryWallet}
            agentWallet={agentWallet}
            currentProject={currentProject}
            spendLimit={spendLimit}
            onOpenTopUp={() => setIsTopUpModalOpen(true)}
            onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
            onFaucet={onFaucet}
          />
        );

      case 'policy':
        return (
          <PolicyTab
            policyData={policyData}
            treasuryHederaId={treasuryWallet.hedera_account_id}
            onPushPolicy={onPushPolicy}
          />
        );

      case 'keys':
        return (
          <KeysTab
            keys={keys}
            onOpenNewKeyModal={() => setIsNewKeyModalOpen(true)}
            onRotateKey={onRotateKey}
            onRevokeKey={onRevokeKey}
          />
        );

      case 'calls':
        return <CallsTab calls={calls} />;

      case 'audit':
        return (
          <AuditTab
            auditLog={auditLog}
            currentProject={currentProject}
          />
        );

      case 'approvals':
        return (
          <ApprovalsTab
            approvals={approvals}
            orgMembers={orgMembers}
            onApprove={onApprove}
            onReject={onReject}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-mono">
      <Header
        activeProjectId={activeProjectId}
        projects={projects}
        onSelectProject={onSelectProject}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onNavigate={onNavigateView}
        spend24h={spend24h}
        spendLimit={spendLimit}
        user={user}
        orgMembersCount={orgMembers.length}
        onOpenOrgModal={() => setIsOrgModalOpen(true)}
        onSignOut={onSignOut}
        currentOrg={currentOrg}
        orgMemberships={orgMemberships}
        onSwitchOrg={onSwitchOrg}
        onOpenRenameOrg={() => setRenameModalConfig({
          isOpen: true,
          type: 'org',
          id: currentOrg.id,
          currentName: currentOrg.name,
        })}
        onOpenRenameProject={() => currentProject && setRenameModalConfig({
          isOpen: true,
          type: 'project',
          id: currentProject.id,
          currentName: currentProject.name,
        })}
      />

      {/* Pending Invitations Banner */}
      {orgMemberships.filter(m => m.status === 'invited').map(inv => (
        <div key={inv.org_id} className="bg-paper2 border-b-2 border-forge px-4 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2 text-ink">
            <span className="w-2.5 h-2.5 bg-forge inline-block animate-ping" />
            <span>
              You have a pending invitation to join <strong>{inv.org_name}</strong> as an <strong>[{inv.role.toUpperCase()}]</strong>!
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onAcceptInvite && (
              <button
                type="button"
                onClick={() => onAcceptInvite(inv.org_id)}
                className="bg-forge text-ink font-bold px-3 py-1 border border-ink hover:opacity-90 cursor-pointer uppercase text-xs"
              >
                ACCEPT INVITATION &amp; SWITCH
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-1 overflow-hidden">
        <NavSide
          active={currentTab}
          onNavigate={(t) => onNavigateTab(t as Tab)}
          onSignOut={onSignOut}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {isLoading && !currentProject ? (
              <div className="p-8 text-center text-ink-mut font-mono">
                Syncing with Hedera testnet & database...
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </main>
      </div>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreate={onCreateProject}
      />

      <NewKeyModal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
        onCreate={onCreateKey}
      />

      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        onTopUp={onTopUp}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        currentProject={currentProject}
        onWithdraw={onWithdraw}
      />

      <OrgMembersModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        members={orgMembers}
        currentOrg={currentOrg}
        currentUser={user || { email: 'operator@foundereum.org', role: 'owner' }}
        orgMemberships={orgMemberships}
        onInviteMember={onInviteMember}
        onAcceptInvite={onAcceptInvite}
        onSwitchOrg={onSwitchOrg}
        onRenameOrg={onRenameOrg}
      />

      <RotatedKeyModal
        isOpen={!!rotatedKey}
        onClose={onCloseRotatedKeyModal}
        rotatedKey={rotatedKey}
      />

      {renameModalConfig && (
        <RenameModal
          isOpen={renameModalConfig.isOpen}
          type={renameModalConfig.type}
          currentName={renameModalConfig.currentName}
          onClose={() => setRenameModalConfig(null)}
          onSave={async (newName) => {
            if (renameModalConfig.type === 'org' && onRenameOrg) {
              await onRenameOrg(renameModalConfig.id, newName);
            } else if (renameModalConfig.type === 'project' && onRenameProject) {
              await onRenameProject(renameModalConfig.id, newName);
            }
          }}
        />
      )}
    </div>
  );
}
