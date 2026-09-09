import { useState, useEffect, useCallback } from 'react';
import { Landing } from './components/Landing';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ServicesPage } from './pages/ServicesPage';
import { DocsPage } from './pages/DocsPage';
import { DashboardPage } from './pages/DashboardPage';
import { Toast } from './components/layout/Toast';
import { PrivyAuthModal } from './components/PrivyAuthModal';
import { 
  api, 
  type ProjectSummary, 
  type Wallet, 
  type APIKey, 
  type CallRecord, 
  type AuditMessage, 
  type Approval, 
  type ServiceTool, 
  type PolicyResponse,
  type OrgMember,
  type AuthSession,
  type View,
  type Tab,
  type UserSession
} from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [currentTab, setCurrentTab] = useState<Tab>('overview');
  
  // Real Backend Data State
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('fnd_user_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [auditLog, setAuditLog] = useState<{ topic_id: string; hashscan_url: string; messages: AuditMessage[] }>({
    topic_id: '',
    hashscan_url: '',
    messages: []
  });
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [services, setServices] = useState<ServiceTool[]>([]);
  const [policyData, setPolicyData] = useState<PolicyResponse | null>(null);
  const [mcpConfigText, setMcpConfigText] = useState<string>('');
  const [spend24h, setSpend24h] = useState<number>(0.0);
  const [spendLimit, setSpendLimit] = useState<number>(25.00);

  // Auth & Org State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [currentOrg] = useState<{ id: string; name: string }>({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Acme Ventures',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Initial Authentication & Services Discovery
  const initAuthAndServices = useCallback(async () => {
    try {
      const servicesRes = await api.getServices().catch(() => null);
      if (servicesRes && servicesRes.tools) {
        setServices(servicesRes.tools);
      }

      if (api.getToken()) {
        const [projs, mems] = await Promise.all([
          api.getProjects().catch(() => []),
          api.getOrgMembers().catch(() => []),
        ]);
        setProjects(projs);
        if (mems && mems.length > 0) setOrgMembers(mems);
        if (projs.length > 0 && !activeProjectId) {
          setActiveProjectId(projs[0].id);
        }
      }
    } catch (err) {
      console.warn('API connection initialized with local fallback:', err);
    }
  }, [activeProjectId]);

  useEffect(() => {
    initAuthAndServices();
  }, [initAuthAndServices]);

  const handleAuthSuccess = async (session: AuthSession) => {
    const sess: UserSession = {
      email: session.user.email,
      role: session.role,
      orgName: session.org.name,
    };
    setUser(sess);
    localStorage.setItem('fnd_user_session', JSON.stringify(sess));
    showToast(`Authenticated via Privy: ${session.user.email} (${session.role})`);
    setIsAuthModalOpen(false);

    try {
      const [projs, mems] = await Promise.all([
        api.getProjects().catch(() => []),
        api.getOrgMembers().catch(() => []),
      ]);
      setProjects(projs);
      if (mems && mems.length > 0) setOrgMembers(mems);
      if (projs.length > 0) {
        setActiveProjectId(projs[0].id);
      }
    } catch (err) {
      console.warn('Post-login sync error:', err);
    }
    navigateTo('app', 'overview');
  };

  const handleInviteMember = async (inviteEmail: string, inviteRole: string) => {
    const newMember = await api.inviteOrgMember(currentOrg.id, inviteEmail, inviteRole);
    setOrgMembers((prev) => [...prev, newMember]);
    showToast(`Invited ${inviteEmail} as ${inviteRole}`);
  };

  const handleSignOut = () => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem('fnd_user_session');
    localStorage.removeItem('fnd_jwt');
    showToast('Signed out. Privy session keys wiped.');
    navigateTo('landing');
  };

  // 2. Load Project-Specific Data from Backend
  const loadProjectData = useCallback(async (projId: string) => {
    if (!projId) return;
    setIsLoading(true);
    try {
      const [projDetail, walletList, keyList, callList, auditRes, appList, polRes, mcpRes] = await Promise.all([
        api.getProject(projId).catch(() => null),
        api.getWallets(projId).catch(() => []),
        api.getKeys(projId).catch(() => []),
        api.getCalls(projId).catch(() => []),
        api.getAudit(projId).catch(() => null),
        api.getApprovals(projId).catch(() => []),
        api.getPolicy(projId).catch(() => null),
        api.getMcpConfig(projId).catch(() => null),
      ]);

      if (projDetail) {
        if (projDetail.spend_24h_usd !== undefined && projDetail.spend_24h_usd !== null) {
          setSpend24h(parseFloat(projDetail.spend_24h_usd) || 0);
        }
        if (projDetail.cap_usd) {
          setSpendLimit(parseFloat(projDetail.cap_usd) || 25.00);
        }
      }
      if (walletList) setWallets(walletList);
      if (keyList) setKeys(keyList);
      if (callList) setCalls(callList);
      if (auditRes) setAuditLog(auditRes);
      if (appList) setApprovals(appList);
      if (polRes) setPolicyData(polRes);
      if (mcpRes) {
        setMcpConfigText(JSON.stringify(mcpRes.claude_desktop, null, 2));
      }
    } catch (err) {
      console.error('Error loading project data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectData(activeProjectId);
      const unsubscribe = api.subscribeEvents(activeProjectId, (event: { type: string; payload: unknown }) => {
        showToast(`Real-time Event: ${event.type}`);
        loadProjectData(activeProjectId);
      });
      return () => unsubscribe();
    }
  }, [activeProjectId, loadProjectData]);

  // Handle Hash Routing with Route Protection
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setCurrentView('landing');
        return;
      }
      const [view, tab] = hash.split('/');
      if (['landing', 'services', 'login', 'app', 'docs', 'projects'].includes(view)) {
        if ((view === 'app' || view === 'projects') && !api.getToken()) {
          showToast('Security: Please sign in via Privy to access the dashboard');
          setCurrentView('login');
          window.location.hash = '#login';
          return;
        }
        setCurrentView(view as View);
      }
      if (view === 'app' && tab && ['overview', 'wallets', 'policy', 'keys', 'calls', 'audit', 'approvals'].includes(tab)) {
        setCurrentTab(tab as Tab);
      } else if (view === 'app' && !tab) {
        setCurrentTab('overview');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: View, tab?: Tab) => {
    if ((view === 'app' || view === 'projects') && !api.getToken()) {
      showToast('Security: Sign in with Privy required');
      window.location.hash = '#login';
      return;
    }
    let hash = `#${view}`;
    if (tab) hash += `/${tab}`;
    window.location.hash = hash;
  };

  // Actions
  const handleCreateProject = async (name: string, preset: string) => {
    try {
      const res = await api.createProject({
        name,
        policy_template: preset,
        quorum: { threshold: 2, withdraw_min_usd: '100' }
      });
      showToast(`Created project "${res.project.name}" (ID: ${res.project.id.slice(0, 8)}...)`);
      const projs = await api.getProjects();
      setProjects(projs);
      setActiveProjectId(res.project.id);
      navigateTo('app', 'overview');
    } catch (err: unknown) {
      showToast(`Project creation error: ${(err as Error).message}`);
    }
  };

  const handleCreateKey = async (name: string): Promise<string | null> => {
    if (!activeProjectId) return null;
    try {
      const res = await api.createKey(activeProjectId, name);
      showToast('API Key generated successfully');
      const keyList = await api.getKeys(activeProjectId);
      setKeys(keyList);
      return res.key || null;
    } catch (err: unknown) {
      showToast(`Key error: ${(err as Error).message}`);
      return null;
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!activeProjectId) return;
    try {
      await api.rotateKey(activeProjectId, keyId);
      showToast('API Key rotated: 1-hour grace window active for old key');
      const keyList = await api.getKeys(activeProjectId);
      setKeys(keyList);
    } catch (err: unknown) {
      showToast(`Rotate error: ${(err as Error).message}`);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!activeProjectId) return;
    try {
      await api.revokeKey(activeProjectId, keyId);
      showToast('Key revoked');
      const keyList = await api.getKeys(activeProjectId);
      setKeys(keyList);
    } catch (err: unknown) {
      showToast(`Revoke error: ${(err as Error).message}`);
    }
  };

  const handleFaucet = async () => {
    if (!activeProjectId) return;
    try {
      await api.requestFaucet(activeProjectId);
      showToast('Testnet Faucet: +50.00 USDC & +10.00 HBAR minted');
      const walletList = await api.getWallets(activeProjectId);
      setWallets(walletList);
    } catch (err: unknown) {
      showToast(`Faucet error: ${(err as Error).message}`);
    }
  };

  const handleTopUp = async (amount: string) => {
    if (!activeProjectId) return;
    try {
      await api.topUpAgent(activeProjectId, amount);
      showToast(`Transferred ${amount} USDC from Treasury to Agent`);
      const walletList = await api.getWallets(activeProjectId);
      setWallets(walletList);
    } catch (err: unknown) {
      showToast(`Top up error: ${(err as Error).message}`);
    }
  };

  const handleWithdraw = async (account: string, amount: string) => {
    if (!activeProjectId) return;
    try {
      const res = await api.withdraw(activeProjectId, account, amount);
      if (res.approval_id) {
        showToast('Withdrawal requires quorum: queued in Approvals inbox');
        const appList = await api.getApprovals(activeProjectId);
        setApprovals(appList);
      } else {
        showToast(`Withdrawal of ${amount} USDC executed`);
        const walletList = await api.getWallets(activeProjectId);
        setWallets(walletList);
      }
    } catch (err: unknown) {
      showToast(`Withdraw error: ${(err as Error).message}`);
    }
  };

  const handlePushPolicy = async (policyJson?: string) => {
    if (!activeProjectId) return;
    try {
      if (policyJson) {
        try {
          const spec = JSON.parse(policyJson);
          await api.updatePolicy(activeProjectId, spec);
        } catch {}
      }
      const res = await api.pushPolicy(activeProjectId);
      showToast(`Policy pushed to Privy TEE Enclave (Policy ID: ${res.privy_policy_id})`);
      const pol = await api.getPolicy(activeProjectId);
      setPolicyData(pol);
      const limit = (pol?.spec as any)?.max_daily_usd || pol?.spec?.velocity?.max_usd_per_24h;
      if (limit) setSpendLimit(parseFloat(String(limit)));
    } catch (err: unknown) {
      showToast(`Push error: ${(err as Error).message}`);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      let sig = 'p256_webcrypto_sig';
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        try {
          const keyPair = await window.crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['sign', 'verify']
          );
          const rawSig = await window.crypto.subtle.sign(
            { name: 'ECDSA', hash: { name: 'SHA-256' } },
            keyPair.privateKey,
            new TextEncoder().encode(approvalId)
          );
          sig = Array.from(new Uint8Array(rawSig)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {}
      }
      const res = await api.approve(approvalId, sig);
      showToast(`Approval signature registered: ${res.status === 'executed' ? 'Executed: ' + res.result_tx_id : res.signatures_count + ' signature(s) recorded'}`);
      if (activeProjectId) {
        const [appList, walletList] = await Promise.all([
          api.getApprovals(activeProjectId),
          api.getWallets(activeProjectId),
        ]);
        setApprovals(appList);
        setWallets(walletList);
      }
    } catch (err: unknown) {
      showToast(`Approve error: ${(err as Error).message}`);
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      await api.reject(approvalId);
      showToast('Approval rejected');
      if (activeProjectId) {
        const appList = await api.getApprovals(activeProjectId);
        setApprovals(appList);
      }
    } catch (err: unknown) {
      showToast(`Reject error: ${(err as Error).message}`);
    }
  };

  // View Routing
  if (currentView === 'landing') {
    return (
      <>
        <Landing
          onLaunch={() => navigateTo('app')}
          onCreateProject={() => {
            if (!user) {
              showToast('Security: Sign in with Privy required to create project');
              navigateTo('login');
            } else {
              navigateTo('app');
            }
          }}
          onServices={() => navigateTo('services')}
          onDocs={() => navigateTo('docs')}
          onSignIn={() => navigateTo('login')}
          onSignOut={handleSignOut}
          isAuthenticated={!!user}
          services={services}
        />
        <PrivyAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  if (currentView === 'login') {
    return (
      <>
        <LoginPage
          onClose={() => navigateTo('landing')}
          onSuccess={handleAuthSuccess}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  if (currentView === 'projects') {
    return (
      <>
        <ProjectsPage
          projects={projects}
          onBackToDashboard={() => navigateTo('app')}
          onOpenNewProject={() => {
            navigateTo('app');
          }}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            navigateTo('app', 'overview');
          }}
          onSignOut={handleSignOut}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  if (currentView === 'services') {
    return (
      <>
        <ServicesPage
          services={services}
          user={user}
          onBackToHome={() => navigateTo('landing')}
          onLaunchApp={() => navigateTo('app')}
          onSignOut={handleSignOut}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  if (currentView === 'docs') {
    return (
      <>
        <DocsPage
          user={user}
          mcpConfigText={mcpConfigText}
          onBackToHome={() => navigateTo('landing')}
          onLaunchApp={() => navigateTo('app')}
          onSignOut={handleSignOut}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  // Dashboard View (app)
  return (
    <>
      <DashboardPage
        currentTab={currentTab}
        onNavigateTab={(tab) => navigateTo('app', tab)}
        onNavigateView={(v) => navigateTo(v)}
        user={user}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          const p = projects.find(pr => pr.id === id);
          if (p) showToast(`Switched to ${p.name}`);
        }}
        wallets={wallets}
        keys={keys}
        calls={calls}
        auditLog={auditLog}
        approvals={approvals}
        policyData={policyData}
        mcpConfigText={mcpConfigText}
        spend24h={spend24h}
        spendLimit={spendLimit}
        isLoading={isLoading}
        orgMembers={orgMembers}
        currentOrg={currentOrg}
        onSignOut={handleSignOut}
        onCreateProject={handleCreateProject}
        onCreateKey={handleCreateKey}
        onRotateKey={handleRotateKey}
        onRevokeKey={handleRevokeKey}
        onTopUp={handleTopUp}
        onWithdraw={handleWithdraw}
        onApprove={handleApprove}
        onReject={handleReject}
        onPushPolicy={handlePushPolicy}
        onFaucet={handleFaucet}
        onInviteMember={handleInviteMember}
      />
      <Toast message={toastMessage} />
    </>
  );
}
