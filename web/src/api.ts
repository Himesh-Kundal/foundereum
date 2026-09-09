// Foundereum API Client
// Connects the frontend to the real backend control plane on port 8080

export const API_BASE = 
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://api.foundereum.org');

export interface ServiceTool {
  name: string;
  description: string;
  pricing: {
    BaseUSD: string;
    PerKBUSD: string;
    NotionalBps?: number;
    NotionalCapUSD?: string;
    PerKBBytecode?: string;
  };
  input_schema?: {
    type?: string;
    properties?: Record<string, { description?: string; type?: string; enum?: string[] }>;
    required?: string[];
  };
  tags?: string[];
}

export interface ServicesResponse {
  name: string;
  x402: {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
  };
  tools: ServiceTool[];
}

export interface OrgMember {
  email: string;
  role: 'owner' | 'approver' | 'viewer' | string;
  status: 'active' | 'invited' | string;
}

export interface AuthSession {
  jwt: string;
  user: {
    id: string;
    email: string;
  };
  org: {
    id: string;
    name: string;
  };
  role: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  hcs_topic_id: string;
  quorum_threshold: number;
  withdraw_quorum_min_usd: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  kind: 'treasury' | 'agent';
  evm_address: string;
  hedera_account_id: string;
  usdc: string;
  hbar: string;
  status: string;
  hashscan_url: string;
}

export interface ProjectDetail {
  project: ProjectSummary;
  wallets: Wallet[];
  balances_usd: string;
  spend_24h_usd: string;
  cap_usd: string;
  hcs_topic: string;
  identity?: {
    agent_id: number;
    scheme: string;
  };
}

export interface APIKey {
  id: string;
  name: string;
  prefix: string;
  status: 'active' | 'revoked' | 'retiring';
  carry_usd: string;
  last_used_at: string | null;
  created_at: string;
  key?: string; // only returned once on creation
}

export interface CallRecord {
  id: string;
  tool: string;
  status: 'succeeded' | 'failed' | 'rejected' | 'pending';
  estimate_usd: string;
  actual_usd: string;
  tx_hash?: string;
  latency_ms: number;
  started_at: string;
  reason?: string;
  args?: Record<string, unknown>;
  metered_bytes?: number;
}

export interface AuditMessage {
  seq: number;
  ts: string;
  tool: string;
  usd: string;
  amount: string;
  payer: string;
  tx_id: string;
  matched_payment_id?: string;
}

export interface AuditLogResponse {
  topic_id: string;
  hashscan_url: string;
  messages: AuditMessage[];
}

export interface Approval {
  id: string;
  project_id: string;
  type: string;
  payload: {
    to_account?: string;
    amount_usdc?: string;
  };
  threshold: number;
  signatures: Array<{ email: string; at: string }>;
  status: 'pending' | 'executed' | 'rejected';
  created_by: string;
  expires_at: string;
}

export interface PolicyResponse {
  privy_policy_id: string;
  pushed_at: string;
  version: number;
  spec: {
    velocity?: {
      max_usd_per_24h?: string;
      max_usd_per_call?: string;
    };
    contract_allowlist?: string[];
    selector_allowlist?: string[];
    payment?: {
      pay_to?: string[];
      max_usd_per_call?: string;
    };
    raw_sign?: {
      allowed_purposes?: string[];
    };
  };
}

export interface McpConfigResponse {
  http_url: string;
  claude_desktop: {
    mcpServers: {
      foundereum: {
        command: string;
        args: string[];
        env: {
          FOUNDEREUM_API_KEY: string;
        };
      };
    };
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('fnd_jwt');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('fnd_jwt', token);
      else localStorage.removeItem('fnd_jwt');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message || errBody?.message || `HTTP ${res.status} on ${endpoint}`;
      throw new Error(msg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // 1. Public Directory
  async getServices(): Promise<ServicesResponse> {
    const res = await fetch(`${API_BASE}/services`);
    if (!res.ok) throw new Error('Failed to fetch services directory');
    return res.json();
  }

  // 2. Auth
  async devLogin(name: string = 'Operator'): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/v1/auth/dev', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    this.setToken(session.jwt);
    return session;
  }

  async sessionLogin(params: { email?: string; role?: string; org?: string; privyToken?: string } = {}): Promise<AuthSession> {
    const headers: Record<string, string> = {};
    if (params.privyToken) {
      headers['Authorization'] = `Bearer ${params.privyToken}`;
    }
    const session = await this.request<AuthSession>('/v1/auth/session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: params.email,
        role: params.role,
        org: params.org,
      }),
    });
    this.setToken(session.jwt);
    return session;
  }

  async getMe(): Promise<{ user: { id: string; email: string }; org: { id: string; name: string }; role: string }> {
    return this.request('/v1/me');
  }

  async getOrgMembers(orgId: string = '00000000-0000-0000-0000-000000000001'): Promise<OrgMember[]> {
    return this.request<OrgMember[]>(`/v1/orgs/${orgId}/members`);
  }

  async inviteOrgMember(orgId: string = '00000000-0000-0000-0000-000000000001', email: string, role: string = 'approver'): Promise<OrgMember> {
    return this.request<OrgMember>(`/v1/orgs/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  // 3. Projects
  async getProjects(): Promise<ProjectSummary[]> {
    return this.request<ProjectSummary[]>('/v1/projects');
  }

  async createProject(data: {
    name: string;
    slug?: string;
    policy_template?: string;
    quorum?: { threshold: number; withdraw_min_usd: string };
  }): Promise<{ project: ProjectSummary; wallets: Wallet[] }> {
    return this.request('/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(id: string): Promise<ProjectDetail> {
    return this.request<ProjectDetail>(`/v1/projects/${id}`);
  }

  async getMcpConfig(id: string): Promise<McpConfigResponse> {
    return this.request<McpConfigResponse>(`/v1/projects/${id}/mcp-config`);
  }

  // 4. Wallets
  async getWallets(projectId: string): Promise<Wallet[]> {
    return this.request<Wallet[]>(`/v1/projects/${projectId}/wallets`);
  }

  async requestFaucet(projectId: string): Promise<{ txs: string[] }> {
    return this.request(`/v1/projects/${projectId}/faucet`, {
      method: 'POST',
    });
  }

  async topUpAgent(projectId: string, amountUsdc: string): Promise<{ tx_id?: string; approval_id?: string }> {
    return this.request(`/v1/projects/${projectId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount_usdc: amountUsdc }),
    });
  }

  async withdraw(projectId: string, toAccount: string, amountUsdc: string): Promise<{ approval_id?: string; tx_id?: string }> {
    return this.request(`/v1/projects/${projectId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ to_account: toAccount, amount_usdc: amountUsdc }),
    });
  }

  // 5. Policy
  async getPolicy(projectId: string): Promise<PolicyResponse> {
    return this.request<PolicyResponse>(`/v1/projects/${projectId}/policy`);
  }

  async updatePolicy(projectId: string, spec: Record<string, unknown>): Promise<{ spec: unknown; version: number }> {
    return this.request(`/v1/projects/${projectId}/policy`, {
      method: 'PUT',
      body: JSON.stringify({ spec }),
    });
  }

  async pushPolicy(projectId: string): Promise<{ privy_policy_id: string }> {
    return this.request(`/v1/projects/${projectId}/policy/push`, {
      method: 'POST',
    });
  }

  // 6. Keys
  async getKeys(projectId: string): Promise<APIKey[]> {
    return this.request<APIKey[]>(`/v1/projects/${projectId}/keys`);
  }

  async createKey(projectId: string, name: string): Promise<APIKey> {
    return this.request<APIKey>(`/v1/projects/${projectId}/keys`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async revokeKey(projectId: string, keyId: string): Promise<{ status: string; id: string }> {
    return this.request(`/v1/projects/${projectId}/keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  async rotateKey(projectId: string, keyId: string): Promise<{ new_key: APIKey; retired_key: unknown }> {
    return this.request(`/v1/projects/${projectId}/keys/${keyId}/rotate`, {
      method: 'POST',
    });
  }

  // 7. Activity & Calls
  async getCalls(projectId: string): Promise<CallRecord[]> {
    return this.request<CallRecord[]>(`/v1/projects/${projectId}/calls`);
  }

  async getAudit(projectId: string): Promise<AuditLogResponse> {
    return this.request<AuditLogResponse>(`/v1/projects/${projectId}/audit`);
  }

  // 8. Approvals
  async getApprovals(projectId: string): Promise<Approval[]> {
    return this.request<Approval[]>(`/v1/projects/${projectId}/approvals`);
  }

  async approve(approvalId: string, signature: string = 'p256_mock_sig'): Promise<{ status: string; signatures_count: number; result_tx_id?: string }> {
    return this.request(`/v1/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  }

  async reject(approvalId: string): Promise<{ status: string }> {
    return this.request(`/v1/approvals/${approvalId}/reject`, {
      method: 'POST',
    });
  }

  // 9. Real-time SSE
  subscribeEvents(projectId: string, onEvent: (event: { type: string; payload: unknown }) => void): () => void {
    if (typeof window === 'undefined' || !window.EventSource) {
      return () => {};
    }

    const sseUrl = `${API_BASE}/v1/projects/${projectId}/events`;
    const es = new EventSource(sseUrl);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent({ type: 'message', payload: data });
      } catch {
        // raw data
      }
    };

    es.addEventListener('call.settled', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        onEvent({ type: 'call.settled', payload: data });
      } catch {
        // ignore
      }
    });

    es.addEventListener('project.ready', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        onEvent({ type: 'project.ready', payload: data });
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
    };
  }
}

export const api = new ApiClient();
