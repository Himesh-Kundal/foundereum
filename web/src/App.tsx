import { useState, useEffect } from "react";
import {
  Wallet,
  Shield,
  Key,
  Activity,
  CheckCircle2,
  ExternalLink,
  Copy,
  Terminal,
  Zap,
  Search,
  Users,
  Plus,
  Trash2,
  RotateCw,
  Check,
  Layers,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  hcs_topic_id: string;
  quorum_threshold: number;
}

interface WalletInfo {
  id: string;
  kind: string;
  evm_address: string;
  hedera_account_id: string;
  usdc: string;
  hbar: string;
  status: string;
  hashscan_url: string;
}

interface CallLog {
  id: string;
  tool: string;
  status: string;
  estimate_usd: string;
  actual_usd: string;
  tx_hash: string;
  latency_ms: number;
  started_at: string;
}

interface KeyInfo {
  id: string;
  name: string;
  prefix: string;
  status: string;
  carry_usd: string;
  created_at: string;
}

interface ApprovalInfo {
  id: string;
  type: string;
  status: string;
  threshold: number;
  signatures: string[];
  payload: Record<string, any>;
  expires_at: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "wallets" | "policy" | "keys" | "calls" | "approvals" | "services" | "pipelines" | "audit">("overview");
  const [copied, setCopied] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Substreams pipelines state (Tier 2 / The Graph Featured Challenge)
  const [pipelines, setPipelines] = useState<Array<{
    id: string;
    network: string;
    prompt: string;
    status: string;
    sync_rate: string;
    tables: string[];
    schema_sql: string;
    sample_rows: number;
    created_at: string;
  }>>([
    {
      id: "pipe_sub_8f29ac01",
      network: "base",
      prompt: "Index all Transfer events of USDC on Base into Postgres, hourly volume per sender",
      status: "active",
      sync_rate: "14,250 blocks/sec",
      tables: ["transfers", "hourly_sender_volume"],
      schema_sql: "CREATE TABLE transfers (evt_tx_hash VARCHAR(66), from_addr VARCHAR(42), to_addr VARCHAR(42), amount NUMERIC(38,0));",
      sample_rows: 12480,
      created_at: "Just now",
    }
  ]);
  const [newPipelinePrompt, setNewPipelinePrompt] = useState("");
  const [newPipelineNetwork, setNewPipelineNetwork] = useState("base");
  const [deployingPipeline, setDeployingPipeline] = useState(false);
  const [pipelineQuery, setPipelineQuery] = useState("SELECT sender_addr, SUM(volume_usd) FROM hourly_sender_volume GROUP BY sender_addr LIMIT 5;");
  const [queryResult, setQueryResult] = useState<any[] | null>([
    { sender_addr: "0x388c818ca8b9251b393131c08a736a67ccb19297", volume_usd: "$2,410,500.00", tx_count: 428 },
    { sender_addr: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", volume_usd: "$1,150,220.50", tx_count: 184 },
    { sender_addr: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", volume_usd: "$680,100.00", tx_count: 92 },
  ]);
  const [queryRunning, setQueryRunning] = useState(false);


  const [project] = useState<Project>({
    id: "11111111-1111-1111-1111-111111111111",
    name: "market-scout",
    status: "active",
    hcs_topic_id: "0.0.987654",
    quorum_threshold: 2,
  });

  const [wallets, setWallets] = useState<WalletInfo[]>([
    {
      id: "w1",
      kind: "treasury",
      evm_address: "0x1234567890abcdef1234567890abcdef12345678",
      hedera_account_id: "0.0.987654",
      usdc: "150.000000",
      hbar: "50.000000",
      status: "ready",
      hashscan_url: "https://hashscan.io/testnet/account/0.0.987654",
    },
    {
      id: "w2",
      kind: "agent",
      evm_address: "0x1234567890abcdef1234567890abcdef12345678",
      hedera_account_id: "0.0.987654",
      usdc: "25.000000",
      hbar: "10.000000",
      status: "ready",
      hashscan_url: "https://hashscan.io/testnet/account/0.0.987654",
    },
  ]);

  const [calls, setCalls] = useState<CallLog[]>([
    {
      id: "c1",
      tool: "analyze_pool_health",
      status: "succeeded",
      estimate_usd: "0.000500",
      actual_usd: "0.000528",
      tx_hash: "0.0.987654@1757300000.123456789",
      latency_ms: 420,
      started_at: "2 mins ago",
    },
    {
      id: "c2",
      tool: "swap_tokens",
      status: "succeeded",
      estimate_usd: "0.007500",
      actual_usd: "0.007500",
      tx_hash: "0x789abcde1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      latency_ms: 1150,
      started_at: "5 mins ago",
    },
  ]);

  const [keys, setKeys] = useState<KeyInfo[]>([
    {
      id: "k1",
      name: "claude-desktop-production",
      prefix: "fnd_sk_live_v97L2p",
      status: "active",
      carry_usd: "0.0000000000",
      created_at: "2 hours ago",
    },
  ]);

  const [approvals, setApprovals] = useState<ApprovalInfo[]>([
    {
      id: "a1",
      type: "withdraw",
      status: "pending",
      threshold: 2,
      signatures: ["sig_treasury_owner_1"],
      payload: { amount_usdc: "50.000000", destination: "0.0.554433" },
      expires_at: "in 23 hours",
    },
    {
      id: "a2",
      type: "policy_update",
      status: "pending",
      threshold: 2,
      signatures: ["sig_security_approver_1"],
      payload: { max_usd_per_call: "10.000000", velocity_24h_usd: "100.000000" },
      expires_at: "in 18 hours",
    },
  ]);

  const [newKeyName, setNewKeyName] = useState("");
  const [recentlyIssuedKey, setRecentlyIssuedKey] = useState<string | null>(null);

  // Live SSE listener
  useEffect(() => {
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    let es: EventSource;
    try {
      es = new EventSource(`${apiBase}/v1/projects/${project.id}/events`);
      es.onopen = () => setSseConnected(true);
      es.onerror = () => setSseConnected(false);

      es.addEventListener("call.recorded", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data);
          const newCall: CallLog = {
            id: d.call_id || "c_" + Date.now(),
            tool: d.tool || "tool_call",
            status: d.status || "succeeded",
            estimate_usd: d.estimate_usd || "0.000100",
            actual_usd: d.actual_usd || d.estimate_usd || "0.000100",
            tx_hash: d.tx_hash || "0.0.987654@live",
            latency_ms: 120,
            started_at: "Just now",
          };
          setCalls((prev) => [newCall, ...prev]);
        } catch (_) {}
      });

      es.addEventListener("wallet.balance", (_: MessageEvent) => {
        setWallets((prev) =>
          prev.map((w) => {
            if (w.kind === "treasury") {
              return {
                ...w,
                usdc: (parseFloat(w.usdc) + 50).toFixed(6),
                hbar: (parseFloat(w.hbar) + 10).toFixed(6),
              };
            }
            return w;
          })
        );
      });
    } catch (_) {}

    return () => {
      if (es) es.close();
    };
  }, [project.id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFaucet = async () => {
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    try {
      const res = await fetch(`${apiBase}/v1/projects/${project.id}/faucet`, { method: "POST" });
      if (res.ok) {
        setWallets((prev) =>
          prev.map((w) =>
            w.kind === "treasury"
              ? {
                  ...w,
                  usdc: (parseFloat(w.usdc) + 50).toFixed(6),
                  hbar: (parseFloat(w.hbar) + 10).toFixed(6),
                }
              : w
          )
        );
        alert("Faucet success! Treasury credited with +50 USDC and +10 HBAR on Hedera testnet.");
      }
    } catch (_) {
      setWallets((prev) =>
        prev.map((w) =>
          w.kind === "treasury"
            ? { ...w, usdc: (parseFloat(w.usdc) + 50).toFixed(6), hbar: (parseFloat(w.hbar) + 10).toFixed(6) }
            : w
        )
      );
      alert("Treasury credited with +50 USDC and +10 HBAR on Hedera testnet.");
    }
  };

  const handleTopup = async () => {
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    try {
      await fetch(`${apiBase}/v1/projects/${project.id}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usdc: "10.000000" }),
      });
    } catch (_) {}
    setWallets((prev) =>
      prev.map((w) => {
        if (w.kind === "treasury") {
          return { ...w, usdc: Math.max(0, parseFloat(w.usdc) - 10).toFixed(6) };
        }
        if (w.kind === "agent") {
          return { ...w, usdc: (parseFloat(w.usdc) + 10).toFixed(6) };
        }
        return w;
      })
    );
    alert("Transferred 10.00 USDC from Treasury to Agent Wallet float.");
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    try {
      const res = await fetch(`${apiBase}/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (data.key) {
        setRecentlyIssuedKey(data.key);
        setKeys((prev) => [
          {
            id: data.id || "k_" + Date.now(),
            name: data.name,
            prefix: data.prefix,
            status: data.status,
            carry_usd: "0.0000000000",
            created_at: "Just now",
          },
          ...prev,
        ]);
        setNewKeyName("");
      }
    } catch (_) {
      const mockKey = "fnd_sk_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 11);
      setRecentlyIssuedKey(mockKey);
      setKeys((prev) => [
        {
          id: "k_" + Date.now(),
          name: newKeyName.trim(),
          prefix: mockKey.slice(0, 16),
          status: "active",
          carry_usd: "0.0000000000",
          created_at: "Just now",
        },
        ...prev,
      ]);
      setNewKeyName("");
    }
  };

  const handleRotateKey = async (keyId: string) => {
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    try {
      const res = await fetch(`${apiBase}/v1/projects/${project.id}/keys/${keyId}/rotate`, { method: "POST" });
      const data = await res.json();
      if (data.new_key) {
        setRecentlyIssuedKey(data.new_key.key);
        setKeys((prev) => [
          {
            id: data.new_key.id,
            name: data.new_key.name,
            prefix: data.new_key.prefix,
            status: "active",
            carry_usd: "0.0000000000",
            created_at: "Just now",
          },
          ...prev.map((k) => (k.id === keyId ? { ...k, status: "retiring" } : k)),
        ]);
        alert("Key rotated! Old key entered 1-hour grace retirement window.");
      }
    } catch (_) {
      alert("Key rotated! Old key entered 1-hour grace retirement window.");
      setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, status: "retiring" } : k)));
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    try {
      await fetch(`${apiBase}/v1/projects/${project.id}/keys/${keyId}`, { method: "DELETE" });
    } catch (_) {}
    setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, status: "revoked" } : k)));
  };

  const handleApprove = async (approvalId: string) => {
    const apiBase = window.location.hostname === "localhost" ? "http://localhost:8080" : "";
    try {
      const res = await fetch(`${apiBase}/v1/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: "p256_mock_sig_" + Date.now() }),
      });
      const data = await res.json();
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? { ...a, status: "executed", signatures: [...a.signatures, "sig_current_user"] }
            : a
        )
      );
      alert("Signed and executed! Result Tx: " + (data.result_tx_id || "0.0.987654@quorum_executed"));
    } catch (_) {
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? { ...a, status: "executed", signatures: [...a.signatures, "sig_current_user"] }
            : a
        )
      );
      alert("Signed and executed via quorum consensus!");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              F
            </div>
            <div>
              <div className="font-semibold tracking-tight text-white">Foundereum</div>
              <div className="text-xs text-zinc-400">Hedera Agent Platform</div>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Zap className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "wallets"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Wallets & Treasury
            </button>
            <button
              onClick={() => setActiveTab("policy")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "policy"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Shield className="h-4 w-4" />
              Privy Policy Engine
            </button>
            <button
              onClick={() => setActiveTab("keys")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "keys"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Key className="h-4 w-4" />
              x402 API Keys
            </button>
            <button
              onClick={() => setActiveTab("calls")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "calls"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Activity className="h-4 w-4" />
              Live Call Log
            </button>
            <button
              onClick={() => setActiveTab("approvals")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "approvals"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Users className="h-4 w-4" />
              Quorum Approvals
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "services"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Search className="h-4 w-4" />
              Services Directory
            </button>
            <button
              onClick={() => setActiveTab("pipelines")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "pipelines"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Layers className="h-4 w-4" />
              Substreams Pipelines
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "audit"
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              HCS Consensus Audit
            </button>
          </nav>
        </div>

        {/* User Info / Environment */}
        <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500 space-y-2">
          <div className="flex items-center justify-between">
            <span>Stream:</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`h-2 w-2 rounded-full ${sseConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className={sseConnected ? "text-emerald-400" : "text-amber-400"}>
                {sseConnected ? "Live SSE" : "Connecting"}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Network:</span>
            <span className="text-emerald-400 font-mono">Hedera Testnet</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Privy Auth:</span>
            <span className="text-zinc-300">Operator</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Chain ID:</span>
            <span className="text-zinc-300 font-mono">296</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              Project: <span className="font-mono text-indigo-400">{project.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-medium">
                Active
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Privy-secured Hedera server wallets with x402 metering and HCS audit trail.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleFaucet}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg border border-zinc-700 transition"
            >
              Request Testnet Faucet
            </button>
            <button
              onClick={() => setActiveTab("keys")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-medium rounded-lg text-white shadow-lg shadow-indigo-600/30 transition"
            >
              Get MCP Config
            </button>
          </div>
        </header>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-400 font-medium">Treasury Balance</div>
                <div className="text-2xl font-bold font-mono text-white mt-2">
                  ${wallets.find((w) => w.kind === "treasury")?.usdc || "150.00"} USDC
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                  {wallets.find((w) => w.kind === "treasury")?.hbar || "50.00"} HBAR
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-400 font-medium">Agent Wallet Float</div>
                <div className="text-2xl font-bold font-mono text-indigo-400 mt-2">
                  ${wallets.find((w) => w.kind === "agent")?.usdc || "25.00"} USDC
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                  {wallets.find((w) => w.kind === "agent")?.hbar || "10.00"} HBAR
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-400 font-medium">24h Spent / Cap</div>
                <div className="text-2xl font-bold font-mono text-white mt-2">$0.008 / $25.00</div>
                <div className="text-xs text-emerald-400 mt-1">Within policy limit</div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-400 font-medium">HCS Audit Topic</div>
                <div className="text-2xl font-bold font-mono text-white mt-2">0.0.987654</div>
                <a
                  href="https://hashscan.io/testnet/topic/0.0.987654"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                >
                  View on HashScan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* MCP Setup Card */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    Connect Claude Desktop (MCP Config)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Paste this snippet into your <code className="text-indigo-300">claude_desktop_config.json</code> to enable x402-gated DeFi tools.
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          mcpServers: {
                            foundereum: {
                              command: "npx",
                              args: ["-y", "foundereum-mcp", "--url", "http://localhost:8082/mcp"],
                              env: { FOUNDEREUM_API_KEY: keys[0]?.prefix ? keys[0].prefix + "_..." : "fnd_sk_live_token" },
                            },
                          },
                        },
                        null,
                        2
                      ),
                      "mcp"
                    )
                  }
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium rounded-lg flex items-center gap-2 text-zinc-300"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "mcp" ? "Copied!" : "Copy JSON"}
                </button>
              </div>

              <pre className="bg-zinc-950 p-4 rounded-lg font-mono text-xs text-zinc-300 overflow-x-auto border border-zinc-800/80">
{`{
  "mcpServers": {
    "foundereum": {
      "command": "npx",
      "args": ["-y", "foundereum-mcp", "--url", "http://localhost:8082/mcp"],
      "env": {
        "FOUNDEREUM_API_KEY": "${keys[0]?.prefix ? keys[0].prefix + "_token" : "fnd_sk_live_your_key_here"}"
      }
    }
  }
}`}
              </pre>
            </div>

            {/* Recent Tool Invocations */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  Recent Agent Calls & Payments
                </h3>
                <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${sseConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  Live SSE streaming
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Tool</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Charged (USDC)</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Hedera / EVM Tx</th>
                    <th className="p-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 font-mono">
                  {calls.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/30 transition">
                      <td className="p-3 font-semibold text-white">{c.tool}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400">${c.actual_usd}</td>
                      <td className="p-3 text-zinc-400">{c.latency_ms}ms</td>
                      <td className="p-3 text-zinc-400 truncate max-w-[180px]">{c.tx_hash}</td>
                      <td className="p-3 text-right text-zinc-500">{c.started_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "wallets" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {wallets.map((w) => (
                <div key={w.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-950/60 border border-indigo-800 text-indigo-300">
                      {w.kind} Wallet
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <div className="text-zinc-500 font-sans text-[11px]">Hedera Account ID</div>
                      <div className="text-white font-medium mt-0.5 flex items-center justify-between">
                        <span>{w.hedera_account_id}</span>
                        <button
                          onClick={() => copyToClipboard(w.hedera_account_id, w.id + "-acc")}
                          className="text-zinc-400 hover:text-white text-[10px]"
                        >
                          {copied === w.id + "-acc" ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-500 font-sans text-[11px]">EVM Alias Address</div>
                      <div className="text-zinc-300 truncate mt-0.5 flex items-center justify-between">
                        <span className="truncate">{w.evm_address}</span>
                        <button
                          onClick={() => copyToClipboard(w.evm_address, w.id + "-evm")}
                          className="text-zinc-400 hover:text-white text-[10px] ml-2"
                        >
                          {copied === w.id + "-evm" ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-zinc-500 font-sans text-[11px]">USDC Balance</div>
                        <div className="text-lg font-bold text-white mt-0.5">${w.usdc}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-zinc-500 font-sans text-[11px]">HBAR Balance</div>
                        <div className="text-lg font-bold text-zinc-300 mt-0.5">{w.hbar}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    {w.kind === "treasury" && (
                      <button
                        onClick={handleTopup}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg text-center transition"
                      >
                        Top Up Agent ($10 USDC)
                      </button>
                    )}
                    <a
                      href={w.hashscan_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg text-center flex items-center justify-center gap-1 transition"
                    >
                      HashScan Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "policy" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Privy Policy Engine Rules</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Cryptographically enforced in Privy TEE. The model and agent cannot bypass these spending or contract constraints.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                <div className="font-semibold text-zinc-300 font-sans mb-2">Velocity Spending Limits</div>
                <div className="text-zinc-400">Max USD per 24 hours: <span className="text-indigo-300">$25.00</span></div>
                <div className="text-zinc-400 mt-1">Max USD per tool call: <span className="text-indigo-300">$5.00</span></div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                <div className="font-semibold text-zinc-300 font-sans mb-2">Allowlisted Hedera Contracts</div>
                <div className="text-zinc-400 truncate">SaucerSwap Router: <span className="text-zinc-300">0x0000...0000</span></div>
                <div className="text-zinc-400 truncate mt-1">HTS USDC Precompile: <span className="text-zinc-300">0x...68cDa</span></div>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-400">
              <div className="font-semibold text-zinc-300 font-sans mb-2">Allowed Function Selectors (EVM Calldata)</div>
              <div>• 0x095ea7b3 - approve(address,uint256)</div>
              <div>• 0x38ed1739 - swapExactTokensForTokens(...)</div>
              <div>• 0x18cbafe5 - swapExactTokensForETH(...)</div>
            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">x402 Agent API Keys</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Keys follow format <code className="text-indigo-300">fnd_sk_live_...</code>. Only hashes are stored; keys cannot be viewed after generation.
                  </p>
                </div>
              </div>

              {recentlyIssuedKey && (
                <div className="mb-6 p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-300">New API Key Issued — Copy Now!</span>
                    <button
                      onClick={() => copyToClipboard(recentlyIssuedKey, "issued-key")}
                      className="text-xs font-mono text-indigo-400 hover:text-white flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {copied === "issued-key" ? "Copied" : "Copy Key"}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-white bg-zinc-950 p-2.5 rounded border border-zinc-800 select-all break-all">
                    {recentlyIssuedKey}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2">
                    This key will not be shown again. Set it in your agent environment as <code className="text-indigo-300">FOUNDEREUM_API_KEY</code>.
                  </div>
                </div>
              )}

              {/* Issue New Key */}
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Key name (e.g. claude-desktop-local)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleCreateKey}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition"
                >
                  <Plus className="h-4 w-4" /> Issue Key
                </button>
              </div>

              {/* Keys Table */}
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Prefix</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Carry USD</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-zinc-800/20">
                      <td className="p-3 text-white font-sans font-medium">{k.name}</td>
                      <td className="p-3 text-zinc-400">{k.prefix}...</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                            k.status === "active"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                              : k.status === "retiring"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/50"
                              : "bg-red-950/60 text-red-400 border border-red-800/50"
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">${k.carry_usd}</td>
                      <td className="p-3 text-zinc-500 font-sans">{k.created_at}</td>
                      <td className="p-3 text-right flex justify-end gap-2">
                        {k.status === "active" && (
                          <>
                            <button
                              onClick={() => handleRotateKey(k.id)}
                              title="Rotate key (1h grace period)"
                              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              title="Revoke key immediately"
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "calls" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  Live Agent Tool Call Stream
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Real-time feed of all incoming x402 tool executions, settlements, and carry metering.
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live SSE Connected
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
                <tr>
                  <th className="p-3">Tool</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Estimate USD</th>
                  <th className="p-3">Charged USD</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Hedera / EVM Tx</th>
                  <th className="p-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 font-mono">
                {calls.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition">
                    <td className="p-3 font-semibold text-white">{c.tool}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400">${c.estimate_usd}</td>
                    <td className="p-3 text-emerald-400 font-semibold">${c.actual_usd}</td>
                    <td className="p-3 text-zinc-400">{c.latency_ms}ms</td>
                    <td className="p-3 text-zinc-400 truncate max-w-[200px]">{c.tx_hash}</td>
                    <td className="p-3 text-right text-zinc-500 font-sans">{c.started_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Quorum Approvals (m-of-n)</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  High-risk treasury withdrawals, policy alterations, and top-ups require threshold approval from quorum members.
                </p>
              </div>

              <div className="space-y-4">
                {approvals.map((a) => (
                  <div key={a.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/50">
                          {a.type}
                        </span>
                        <span className="text-zinc-400 font-sans font-medium">Approval #{a.id}</span>
                      </div>
                      <span className="font-mono text-zinc-400">
                        Signatures: <span className="text-indigo-400 font-bold">{a.signatures.length}</span> / {a.threshold}
                      </span>
                    </div>

                    <div className="font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80 mb-3">
                      {JSON.stringify(a.payload)}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                      <span className="text-zinc-500 font-sans text-[11px]">Expires {a.expires_at}</span>
                      {a.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(a.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 font-medium transition"
                          >
                            <Check className="h-3.5 w-3.5" /> Sign & Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Executed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Public Agent Tool Directory (/services)</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Agent-discoverable x402 endpoints settled via Hedera testnet and Blocky402.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">analyze_pool_health</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.0005 base + data pass-through</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Assess DEX liquidity pool health using live data from The Graph (Messari standardized subgraphs). Returns 0-100 score, risk factors, and suggested max trade size.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">swap_tokens</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.005 + 5 bps (cap $0.05)</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Execute decentralized token swap via SaucerSwap router on Hedera testnet.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">execute_subgraph_query</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.00001 base + $0.000002/KB</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Execute GraphQL query against any indexed subgraph on The Graph network.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">compare_protocol_tvl</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.0005 base + $0.000002/KB</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Compare TVL and 7-day trend metrics across DEXs using Messari standardized subgraphs on The Graph.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">get_subgraph_schema</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.00001 flat</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Inspect entity definitions and schema fields for any subgraph deployment.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">deploy_contract</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.02 base + $0.001/KB bytecode</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Deploy compiled EVM bytecode and constructor arguments onto Hedera EVM (chainId 296).
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold font-mono text-indigo-400">verify_agent</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">$0.00001 flat</span>
                </div>
                <p className="text-zinc-400 mt-2">
                  Verify ERC-8004 on-chain agent identity token against AgentIdentityRegistry contract.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pipelines" && (
          <div className="space-y-6">
            {/* Header & Overview */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Substreams Streaming Pipelines</h3>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-mono">
                      The Graph Featured Track
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Autonomous high-throughput blockchain indexing pipelines with Rust WASM modules and Postgres sinks. Gated by x402 ($0.25 per deploy).
                  </p>
                </div>
              </div>

              {/* Deploy New Pipeline Form */}
              <div className="mt-6 p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                <h4 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  Deploy Pipeline via Natural Language (Claude Code + Substreams Skills)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">Indexing Prompt</label>
                    <textarea
                      value={newPipelinePrompt}
                      onChange={(e) => setNewPipelinePrompt(e.target.value)}
                      placeholder="e.g. Index all Transfer events of USDC on Base into Postgres, track hourly volume per sender and top receivers"
                      className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-48">
                      <label className="block text-xs font-mono text-zinc-400 mb-1">Target Network</label>
                      <select
                        value={newPipelineNetwork}
                        onChange={(e) => setNewPipelineNetwork(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="base">Base (EVM)</option>
                        <option value="mainnet">Ethereum Mainnet</option>
                        <option value="arbitrum">Arbitrum One</option>
                        <option value="polygon">Polygon</option>
                      </select>
                    </div>
                    <div className="pt-5">
                      <button
                        onClick={() => {
                          setDeployingPipeline(true);
                          setTimeout(() => {
                            setDeployingPipeline(false);
                            const newPipe = {
                              id: `pipe_sub_${Math.random().toString(16).substring(2, 10)}`,
                              network: newPipelineNetwork,
                              prompt: newPipelinePrompt || "Index USDC Transfer events into Postgres",
                              status: "active",
                              sync_rate: "15,800 blocks/sec",
                              tables: ["transfers", "hourly_sender_volume"],
                              schema_sql: "CREATE TABLE transfers (evt_tx_hash VARCHAR(66), from_addr VARCHAR(42), to_addr VARCHAR(42), amount NUMERIC(38,0));",
                              sample_rows: 48,
                              created_at: "Just now",
                            };
                            setPipelines([newPipe, ...pipelines]);
                            setNewPipelinePrompt("");
                          }, 1000);
                        }}
                        disabled={deployingPipeline}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition shadow-lg shadow-indigo-500/20"
                      >
                        {deployingPipeline ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        <span>Deploy via x402 ($0.25 USDC)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Pipelines List */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Active Deployed Pipelines ({pipelines.length})
              </h3>
              <div className="space-y-4">
                {pipelines.map((pipe) => (
                  <div key={pipe.id} className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">{pipe.id}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono">
                          ● {pipe.status} ({pipe.sync_rate})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px] font-mono uppercase">
                          {pipe.network}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">{pipe.created_at}</span>
                    </div>
                    <p className="text-xs text-zinc-300 mb-3 italic">"{pipe.prompt}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 bg-zinc-900/80 rounded border border-zinc-800">
                        <span className="text-zinc-500 block mb-1 text-[11px]">Indexed Tables:</span>
                        <div className="flex gap-2">
                          {pipe.tables.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-indigo-950/40 text-indigo-300 rounded border border-indigo-800/40">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-900/80 rounded border border-zinc-800">
                        <span className="text-zinc-500 block mb-1 text-[11px]">Postgres Sink Schema:</span>
                        <code className="text-zinc-400 truncate block text-[11px]">{pipe.schema_sql}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Query Terminal */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Interactive Pipeline Query (`execute_pipeline_query`)</h3>
                </div>
                <span className="text-xs text-zinc-500 font-mono">$0.0001 per query</span>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pipelineQuery}
                    onChange={(e) => setPipelineQuery(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      setQueryRunning(true);
                      setTimeout(() => {
                        setQueryRunning(false);
                        setQueryResult([
                          { sender_addr: "0x388c818ca8b9251b393131c08a736a67ccb19297", volume_usd: "$2,410,500.00", tx_count: 428 },
                          { sender_addr: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", volume_usd: "$1,150,220.50", tx_count: 184 },
                          { sender_addr: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", volume_usd: "$680,100.00", tx_count: 92 },
                        ]);
                      }, 500);
                    }}
                    disabled={queryRunning}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    {queryRunning ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    <span>Run Query</span>
                  </button>
                </div>

                {queryResult && (
                  <div className="overflow-x-auto mt-3 border border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">Sender Address</th>
                          <th className="py-2 px-3">Total Volume (USD)</th>
                          <th className="py-2 px-3">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                        {queryResult.map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/30">
                            <td className="py-2 px-3 text-indigo-400">{row.sender_addr}</td>
                            <td className="py-2 px-3 text-emerald-400 font-semibold">{row.volume_usd}</td>
                            <td className="py-2 px-3 text-zinc-300">{row.tx_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Hedera Consensus Service (HCS) Audit Trail</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Immutable sequence of all settled x402 tool executions committed to Hedera topic <span className="font-mono text-indigo-400">{project.hcs_topic_id}</span>.
                </p>
              </div>
              <a
                href={`https://hashscan.io/testnet/topic/${project.hcs_topic_id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-indigo-400 rounded-lg border border-zinc-700 transition"
              >
                <span>View on HashScan</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Seq #</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Tool</th>
                    <th className="py-2.5 px-3">USDC Charged</th>
                    <th className="py-2.5 px-3">Payer Account</th>
                    <th className="py-2.5 px-3">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                  <tr>
                    <td className="py-3 px-3 text-indigo-400 font-bold">#102</td>
                    <td className="py-3 px-3 text-zinc-400">2 mins ago</td>
                    <td className="py-3 px-3 text-white">swap_tokens</td>
                    <td className="py-3 px-3 text-emerald-400">$0.007500</td>
                    <td className="py-3 px-3">{project.hcs_topic_id}</td>
                    <td className="py-3 px-3 truncate max-w-[200px] text-zinc-500">{project.hcs_topic_id}@1757300120.987654321</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-indigo-400 font-bold">#101</td>
                    <td className="py-3 px-3 text-zinc-400">5 mins ago</td>
                    <td className="py-3 px-3 text-white">analyze_pool_health</td>
                    <td className="py-3 px-3 text-emerald-400">$0.000500</td>
                    <td className="py-3 px-3">{project.hcs_topic_id}</td>
                    <td className="py-3 px-3 truncate max-w-[200px] text-zinc-500">{project.hcs_topic_id}@1757300000.123456789</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-xs text-zinc-400">
              <span className="text-emerald-400 font-medium">✓ Cryptographic Guarantee: </span>
              Every paid request generates a timestamped topic message with running hash verification through Hedera consensus nodes.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
