import { useState } from "react";
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
  Users
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

export function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "wallets" | "policy" | "keys" | "calls" | "approvals" | "services" | "audit">("overview");
  const [copied, setCopied] = useState<string | null>(null);

  const [project] = useState<Project>({
    id: "11111111-1111-1111-1111-111111111111",
    name: "market-scout",
    status: "active",
    hcs_topic_id: "0.0.987654",
    quorum_threshold: 2,
  });

  const [wallets] = useState<WalletInfo[]>([
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

  const [calls] = useState([
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
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
        <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
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
              onClick={() => alert("Faucet request sent: +50 USDC and +10 HBAR deposited to treasury")}
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
                <div className="text-2xl font-bold font-mono text-white mt-2">$150.00 USDC</div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">50.00 HBAR</div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                <div className="text-xs text-zinc-400 font-medium">Agent Wallet Float</div>
                <div className="text-2xl font-bold font-mono text-indigo-400 mt-2">$25.00 USDC</div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">10.00 HBAR</div>
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
                              env: { FOUNDEREUM_API_KEY: "fnd_sk_live_sample_token" },
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
        "FOUNDEREUM_API_KEY": "fnd_sk_live_sample_token"
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
                <span className="text-xs text-zinc-500 font-mono">Live SSE streaming</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-medium border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tool</th>
                    <th className="p-3">Metered Price</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">Transaction</th>
                    <th className="p-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {calls.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-800/30 transition">
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px]">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-white font-medium">{c.tool}</td>
                      <td className="p-3 text-indigo-300">${c.actual_usd}</td>
                      <td className="p-3 text-zinc-400">{c.latency_ms}ms</td>
                      <td className="p-3 text-zinc-400">
                        <a
                          href={`https://hashscan.io/testnet/transaction/${c.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-indigo-400 flex items-center gap-1"
                        >
                          {c.tx_hash.slice(0, 16)}... <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
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
