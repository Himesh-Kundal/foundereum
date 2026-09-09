import { useState, useEffect } from "react";
import { Landing } from "./components/Landing";
import { Cell } from "./components/Cell";
import { BlockButton } from "./components/Buttons";
import { StatCell } from "./components/StatCell";
import { SpendMeter } from "./components/SpendMeter";
import { TerminalBlock } from "./components/TerminalBlock";
import { CallRow, type CallItem } from "./components/CallRow";
import { PricePill, StatusPill } from "./components/Pills";
import { CopyField } from "./components/CopyField";
import { ApprovalCard, type ApprovalItem } from "./components/ApprovalCard";
import { AuditRow, type AuditItem } from "./components/AuditRow";
import {
  ExternalLink,
  ChevronDown,
  Plus,
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
  kind: "treasury" | "agent";
  evm_address: string;
  hedera_account_id: string;
  usdc: string;
  hbar: string;
  status: string;
  hashscan_url: string;
}

export function App() {
  const [viewMode, setViewMode] = useState<"landing" | "app">("app");
  const [activeTab, setActiveTab] = useState<
    "overview" | "wallets" | "policy" | "keys" | "calls" | "audit" | "approvals" | "services" | "pipelines"
  >("calls");

  const [projectDropdown, setProjectDropdown] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // Current selected project
  const [project, setProject] = useState<Project>({
    id: "035b5236-e85c-4fcc-a9f1-0a7fd0292767",
    name: "market-scout",
    status: "active",
    hcs_topic_id: "0.0.987654",
    quorum_threshold: 2,
  });

  // Wallets state
  const [wallets, setWallets] = useState<WalletInfo[]>([
    {
      id: "w1",
      kind: "treasury",
      evm_address: "0x1234567890abcdef1234567890abcdef12345678",
      hedera_account_id: "0.0.987654",
      usdc: "150.00",
      hbar: "50.00",
      status: "ready",
      hashscan_url: "https://hashscan.io/testnet/account/0.0.987654",
    },
    {
      id: "w2",
      kind: "agent",
      evm_address: "0x1234567890abcdef1234567890abcdef12345678",
      hedera_account_id: "0.0.987654",
      usdc: "9.24",
      hbar: "10.00",
      status: "ready",
      hashscan_url: "https://hashscan.io/testnet/account/0.0.987654",
    },
  ]);

  // Live Calls state matching example1.png
  const [calls, setCalls] = useState<CallItem[]>([
    {
      id: "c-104",
      tool: "swap_tokens",
      priceUSD: "$0.0075",
      status: "settling",
      meta: "SaucerSwap V2",
      timeAgo: "just now",
    },
    {
      id: "c-103",
      tool: "analyze_pool_health",
      priceUSD: "$0.0006",
      status: "settled",
      meta: "USDC/WETH 0.05%",
      txHash: "0.0.1234@...4",
      hashscanUrl: "https://hashscan.io/testnet/transaction/0.0.10413602@1788897031.601805052",
      latency: "1.4s",
      timeAgo: "2m ago",
      payload: {
        pool: "USDC/WETH 0.05%",
        protocol: "uniswap-v3",
        score: 94,
        tvl_usd: "45,250,000",
      },
    },
    {
      id: "c-102",
      tool: "transfer_token",
      priceUSD: "$0.002",
      status: "rejected",
      meta: "contract_allowlist",
      latency: "0.2s",
      timeAgo: "4m ago",
      payload: {
        error: "POLICY_REJECTED",
        reason: "destination address not in destination_allowlist",
      },
    },
    {
      id: "c-101",
      tool: "execute_subgraph_query",
      priceUSD: "$0.000028",
      status: "settled",
      meta: "9.1KB",
      txHash: "0.0.1234@...9",
      hashscanUrl: "https://hashscan.io/testnet/transaction/0.0.10413602@1788897035.778081039",
      latency: "1.1s",
      timeAgo: "8m ago",
      payload: {
        deployment_id: "QmZb8x9y7zMessariUniswapV3Base",
        bytes: 9318,
        actual_usd: "0.000028",
      },
    },
  ]);

  // Keys state
  const [keys, setKeys] = useState([
    {
      id: "k-1",
      name: "claude-desktop-key",
      prefix: "fnd_sk_live_T7s9...",
      status: "active",
      carryUSD: "0.000000",
      lastUsed: "2m ago",
    },
  ]);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);

  // Policy state
  const [policySpec, setPolicySpec] = useState({
    per_tx_usd_max: 50,
    daily_usd_max: 500,
    destination_allowlist: ["0.0.10413602"],
    contract_allowlist: ["0x0000000000000000000000000000000000104136"],
    selector_allowlist: ["0x38ed1739", "0xa9059cbb"],
    default_action: "DENY",
  });
  const [policyVersion, setPolicyVersion] = useState(2);

  // Approvals state
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: "appr-1",
      type: "WITHDRAW",
      description: "Withdraw 500.00 USDC from Treasury to external vault (0.0.999999)",
      signatures_collected: 1,
      threshold: 2,
      requester: "operator@foundereum.org",
      expires_at: "23h 45m",
      status: "pending",
    },
  ]);

  // HCS Audit records
  const [auditRecords] = useState<AuditItem[]>([
    {
      seq: 104,
      tool: "swap_tokens",
      amountUSD: "$0.0075",
      timestamp: "2 mins ago",
      topicId: "0.0.987654",
      txId: "0.0.10413602@1788897039.753",
      matched: true,
    },
    {
      seq: 103,
      tool: "analyze_pool_health",
      amountUSD: "$0.0006",
      timestamp: "5 mins ago",
      topicId: "0.0.987654",
      txId: "0.0.10413602@1788897031.601",
      matched: true,
    },
    {
      seq: 101,
      tool: "execute_subgraph_query",
      amountUSD: "$0.000028",
      timestamp: "12 mins ago",
      topicId: "0.0.987654",
      txId: "0.0.10413602@1788896604.779",
      matched: true,
    },
  ]);

  // Substreams pipelines state
  const [pipelines, setPipelines] = useState([
    {
      id: "pipe_sub_8f29ac01",
      network: "base",
      prompt: "Index all Transfer events of USDC on Base into Postgres, hourly volume per sender",
      status: "active",
      sync_rate: "14,250 blocks/sec",
      tables: ["transfers", "hourly_sender_volume"],
      schema_sql: "CREATE TABLE transfers (evt_tx_hash VARCHAR(66), from_addr VARCHAR(42), to_addr VARCHAR(42), amount NUMERIC(38,0));",
      created_at: "Just now",
    },
  ]);
  const [newPipelinePrompt, setNewPipelinePrompt] = useState("");
  const [newPipelineNetwork, setNewPipelineNetwork] = useState("base");
  const [deployingPipeline, setDeployingPipeline] = useState(false);
  const [pipelineQuery, setPipelineQuery] = useState(
    "SELECT sender_addr, SUM(volume_usd) FROM hourly_sender_volume GROUP BY sender_addr LIMIT 5;"
  );
  const [queryResult, setQueryResult] = useState<any[] | null>([
    { sender_addr: "0x388c818ca8b9251b393131c08a736a67ccb19297", volume_usd: "$2,410,500.00", tx_count: 428 },
    { sender_addr: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", volume_usd: "$1,150,220.50", tx_count: 184 },
    { sender_addr: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", volume_usd: "$680,100.00", tx_count: 92 },
  ]);
  const [queryRunning, setQueryRunning] = useState(false);

  // Live SSE listener
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/v1/projects/${project.id}/events`);
      es.onopen = () => setSseConnected(true);
      es.onerror = () => setSseConnected(false);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "wallet.balance") {
            setWallets((prev) =>
              prev.map((w) =>
                w.kind === "agent" ? { ...w, usdc: data.agent_usdc || w.usdc } : w
              )
            );
          } else if (data.type === "call") {
            setCalls((prev) => [
              {
                id: data.id || `c-${Date.now()}`,
                tool: data.tool || "call",
                priceUSD: data.price_usd || "$0.0001",
                status: data.status || "settled",
                meta: data.meta,
                timeAgo: "just now",
              },
              ...prev,
            ]);
          }
        } catch {
          // ignore parse error
        }
      };
    } catch {
      setSseConnected(false);
    }
    return () => {
      if (es) es.close();
    };
  }, [project.id]);

  // Actions
  const handleFaucet = () => {
    setWallets((prev) =>
      prev.map((w) =>
        w.kind === "treasury"
          ? { ...w, usdc: (parseFloat(w.usdc) + 50).toFixed(2), hbar: (parseFloat(w.hbar) + 10).toFixed(2) }
          : w
      )
    );
  };

  const handleTopup = () => {
    setWallets((prev) => {
      const treasury = prev.find((w) => w.kind === "treasury");
      if (!treasury || parseFloat(treasury.usdc) < 10) return prev;
      return prev.map((w) => {
        if (w.kind === "treasury") return { ...w, usdc: (parseFloat(w.usdc) - 10).toFixed(2) };
        if (w.kind === "agent") return { ...w, usdc: (parseFloat(w.usdc) + 10).toFixed(2) };
        return w;
      });
    });
  };

  const handleCreateKey = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const fullKey = `fnd_sk_live_${randomSuffix}7h9q2m`;
    setNewKeySecret(fullKey);
    setKeys((prev) => [
      ...prev,
      {
        id: `k-${prev.length + 1}`,
        name: `agent-key-${prev.length + 1}`,
        prefix: fullKey.substring(0, 16) + "...",
        status: "active",
        carryUSD: "0.000000",
        lastUsed: "just now",
      },
    ]);
  };

  const handleRotateKey = (keyId: string) => {
    setKeys((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, status: "retiring (1h grace)" } : k
      )
    );
  };

  const handleRevokeKey = (keyId: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
  };

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, signatures_collected: a.threshold, status: "approved" } : a
      )
    );
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a))
    );
  };

  // If in landing page mode, render Landing
  if (viewMode === "landing") {
    return (
      <Landing
        onLaunchApp={() => setViewMode("app")}
        onNavigateServices={() => {
          setViewMode("app");
          setActiveTab("services");
        }}
      />
    );
  }

  // Full Console / Dashboard View
  return (
    <div className="min-h-screen bg-[#F4F1E9] text-[#16181D] font-mono flex flex-col select-none">
      {/* Top Console Bar matching example1.png */}
      <header className="border-b border-[#16181D] px-4 py-2.5 flex items-center justify-between bg-[#F4F1E9] shrink-0">
        {/* Left: Logo Mark + Project Dropdown */}
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setViewMode("landing")}
            title="Go to landing page"
            className="cursor-pointer"
          >
            <img src="/logo.png" alt="Foundereum" className="h-6 w-6 object-contain" />
          </button>

          <div className="relative">
            <button
              onClick={() => setProjectDropdown(!projectDropdown)}
              className="flex items-center gap-1.5 font-bold text-sm text-[#16181D] hover:text-[#F05423] transition cursor-pointer"
            >
              <span>{project.name}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {projectDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-48 border border-[#16181D] bg-[#F4F1E9] shadow-none z-50">
                <div className="p-2 text-[11px] text-[#6B6E76] uppercase border-b border-[#16181D]">
                  Switch Project
                </div>
                <button
                  onClick={() => {
                    setProject({ ...project, name: "market-scout" });
                    setProjectDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#EDE9DE] transition block font-bold"
                >
                  market-scout
                </button>
                <button
                  onClick={() => {
                    setProject({ ...project, name: "autonomous-quant" });
                    setProjectDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#EDE9DE] transition block"
                >
                  autonomous-quant
                </button>
                <button
                  onClick={() => {
                    setProject({ ...project, name: "arbitrage-sentinel" });
                    setProjectDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#EDE9DE] transition block"
                >
                  arbitrage-sentinel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: SpendMeter & Live Indicator */}
        <div className="flex items-center gap-4 text-xs">
          <SpendMeter currentUSD={4.31} maxUSD={25.0} />

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#6B6E76]">
            <span
              className={`w-2 h-2 rounded-none ${
                sseConnected ? "bg-[#1E7F4F] animate-pulse" : "bg-[#F05423]"
              }`}
            />
            <span>{sseConnected ? "HEDERA TESTNET" : "DEV TESTNET"}</span>
          </div>

          <button
            onClick={() => setViewMode("landing")}
            className="text-[11px] font-semibold text-[#6B6E76] hover:text-[#16181D] transition hidden md:inline cursor-pointer"
          >
            [ PUBLIC SITE ↗ ]
          </button>
        </div>
      </header>

      {/* Main Console Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Navigation Rail (NavSide) matching example1.png */}
        <nav className="w-full md:w-44 lg:w-48 border-b md:border-b-0 md:border-r border-[#16181D] bg-[#F4F1E9] shrink-0 flex md:flex-col overflow-x-auto md:overflow-x-visible">
          {[
            { id: "overview", label: "OVERVIEW" },
            { id: "wallets", label: "WALLETS" },
            { id: "policy", label: "POLICY" },
            { id: "keys", label: "KEYS" },
            { id: "calls", label: "CALLS" },
            { id: "audit", label: "AUDIT" },
            { id: "approvals", label: "APPROVALS" },
            { id: "services", label: "SERVICES" },
            { id: "pipelines", label: "PIPELINES" },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`relative px-4 py-3.5 text-left text-xs font-mono font-bold tracking-wider transition cursor-pointer border-b border-[#16181D] last:border-b-0 shrink-0 md:shrink ${
                  isActive
                    ? "bg-[#EDE9DE] text-[#16181D]"
                    : "text-[#6B6E76] hover:text-[#16181D] hover:bg-[#EDE9DE]/50"
                }`}
              >
                {/* Vibrant orange left marker bar when active */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#F05423]" />
                )}
                <span>{isActive ? `[ ${item.label} ]` : item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* CALLS TAB (Centerpiece matching example1.png) */}
          {activeTab === "calls" && (
            <div className="space-y-6">
              {/* 3 Top StatCells */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#16181D] border border-[#16181D]">
                <StatCell label="AGENT USDC" value={wallets[1]?.usdc || "9.24"} />
                <StatCell label="CALLS TODAY" value="147" />
                <StatCell label="AVG PRICE" value="$0.0029" />
              </div>

              {/* 05 — LIVE CALLS Table matching example1.png */}
              <Cell num="05" title="LIVE CALLS" brackets>
                <div className="divide-y divide-[#16181D]">
                  {calls.map((call) => (
                    <CallRow key={call.id} call={call} />
                  ))}
                </div>
              </Cell>

              {/* Bottom MCP CONFIG Banner matching example1.png */}
              <div className="border border-[#16181D] bg-[#F4F1E9] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#16181D]">
                  MCP CONFIG
                </span>
                <div className="w-full sm:w-auto">
                  <TerminalBlock
                    compact
                    content={`"foundereum": { "command": "npx", "args": ["-y", "foundereum-mcp", "--url", "http://localhost:8082/mcp"] }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCell label="TREASURY USDC" value={`$${wallets[0]?.usdc}`} />
                <StatCell label="AGENT USDC" value={`$${wallets[1]?.usdc}`} />
                <StatCell label="SPEND 24H" value="$4.31" delta="17% of cap" />
                <StatCell label="CALLS TODAY" value="147" delta="+12/hr" />
              </div>

              <Cell num="01" title="CLAUDE DESKTOP CONFIG" brackets>
                <div className="p-4 space-y-2">
                  <p className="text-xs text-[#6B6E76]">
                    Paste into <code className="text-[#16181D] font-bold">claude_desktop_config.json</code> to connect your AI agent:
                  </p>
                  <TerminalBlock
                    content={`{
  "mcpServers": {
    "foundereum": {
      "command": "npx",
      "args": ["-y", "foundereum-mcp", "--url", "http://localhost:8082/mcp"],
      "env": {
        "FOUNDEREUM_API_KEY": "${keys[0]?.prefix || "fnd_sk_live_..."}"
      }
    }
  }
}`}
                  />
                </div>
              </Cell>

              <Cell num="02" title="RECENT SETTLED CALLS">
                <div className="divide-y divide-[#16181D]">
                  {calls.slice(0, 3).map((call) => (
                    <CallRow key={call.id} call={call} />
                  ))}
                </div>
              </Cell>
            </div>
          )}

          {/* WALLETS TAB */}
          {activeTab === "wallets" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Treasury Wallet Cell */}
                <Cell num="01" title="TREASURY WALLET (MULTI-SIG)" brackets>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6B6E76]">CUSTODY: PRIVY TEE</span>
                      <StatusPill status="ready" />
                    </div>
                    <CopyField label="Hedera Account ID" value={wallets[0]?.hedera_account_id} />
                    <CopyField label="EVM Alias" value={wallets[0]?.evm_address} />
                    <div className="p-3 bg-[#EDE9DE] border border-[#16181D] flex justify-between">
                      <div>
                        <div className="text-[11px] text-[#6B6E76]">USDC BALANCE</div>
                        <div className="text-xl font-bold">{wallets[0]?.usdc} USDC</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#6B6E76]">HBAR BALANCE</div>
                        <div className="text-xl font-bold">{wallets[0]?.hbar} ℏ</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <BlockButton variant="forge" onClick={handleFaucet} className="flex-1">
                        HIT FAUCET (+50 USDC)
                      </BlockButton>
                      <BlockButton variant="ghost" onClick={handleTopup} className="flex-1">
                        TOP UP AGENT ($10)
                      </BlockButton>
                    </div>
                  </div>
                </Cell>

                {/* Agent Wallet Cell */}
                <Cell num="02" title="AGENT WALLET (POLICY-BOUND)" brackets>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6B6E76]">AUTONOMOUS x402 SPENDER</span>
                      <StatusPill status="active" />
                    </div>
                    <CopyField label="Hedera Account ID" value={wallets[1]?.hedera_account_id} />
                    <CopyField label="EVM Alias" value={wallets[1]?.evm_address} />
                    <div className="p-3 bg-[#EDE9DE] border border-[#16181D] flex justify-between">
                      <div>
                        <div className="text-[11px] text-[#6B6E76]">USDC BALANCE</div>
                        <div className="text-xl font-bold">{wallets[1]?.usdc} USDC</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#6B6E76]">HBAR BALANCE</div>
                        <div className="text-xl font-bold">{wallets[1]?.hbar} ℏ</div>
                      </div>
                    </div>
                    <div className="p-2 bg-[#F4F1E9] border border-[#16181D] text-xs text-[#6B6E76]">
                      <span>Spends under </span>
                      <strong className="text-[#16181D]">Policy v{policyVersion}</strong>
                      <span> · Max ${policySpec.per_tx_usd_max}/call</span>
                    </div>
                  </div>
                </Cell>
              </div>
            </div>
          )}

          {/* POLICY TAB */}
          {activeTab === "policy" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Cell num="01" title="SPENDING POLICY EDITOR" brackets>
                  <div className="p-5 space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
                        Per-Call USD Cap (${policySpec.per_tx_usd_max})
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={policySpec.per_tx_usd_max}
                        onChange={(e) =>
                          setPolicySpec({ ...policySpec, per_tx_usd_max: parseInt(e.target.value) })
                        }
                        className="w-full accent-[#F05423]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
                        Daily Velocity Cap (${policySpec.daily_usd_max})
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="2000"
                        step="50"
                        value={policySpec.daily_usd_max}
                        onChange={(e) =>
                          setPolicySpec({ ...policySpec, daily_usd_max: parseInt(e.target.value) })
                        }
                        className="w-full accent-[#F05423]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
                        Contract Allowlists
                      </label>
                      <div className="p-2 border border-[#16181D] bg-[#EDE9DE] font-mono text-[11px] space-y-1">
                        <div>✓ SaucerSwap V2 Router (0x00000000...00104136)</div>
                        <div>✓ ERC-8004 Identity (0x51286cfb...455f8)</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
                        Default Action
                      </label>
                      <div className="p-2 border border-[#16181D] bg-[#16181D] text-[#F05423] font-bold">
                        DENY (All unlisted contracts & selectors blocked)
                      </div>
                    </div>
                    <BlockButton
                      variant="forge"
                      onClick={() => setPolicyVersion((v) => v + 1)}
                      className="w-full mt-2"
                    >
                      PUSH POLICY TO PRIVY TEE (v{policyVersion + 1})
                    </BlockButton>
                  </div>
                </Cell>

                <Cell num="02" title="POLICY JSON SPEC">
                  <TerminalBlock
                    title={`POLICY SPECIFICATION — VERSION ${policyVersion}`}
                    content={JSON.stringify(policySpec, null, 2)}
                  />
                </Cell>
              </div>
            </div>
          )}

          {/* KEYS TAB */}
          {activeTab === "keys" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6B6E76] uppercase tracking-wider font-bold">
                  API Key Credentials
                </span>
                <BlockButton variant="forge" onClick={handleCreateKey} className="flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  <span>GENERATE KEY</span>
                </BlockButton>
              </div>

              {newKeySecret && (
                <div className="p-4 border border-[#C6402E] bg-[#F4F1E9] space-y-2">
                  <div className="text-xs font-bold text-[#C6402E] uppercase tracking-wider">
                    ⚠ COPY THIS KEY NOW — IT WILL NEVER BE SHOWN AGAIN:
                  </div>
                  <CopyField value={newKeySecret} />
                  <BlockButton
                    variant="ghost"
                    onClick={() => setNewKeySecret(null)}
                    className="text-[11px] py-1"
                  >
                    I Have Saved This Key
                  </BlockButton>
                </div>
              )}

              <Cell num="01" title="ACTIVE KEYS" brackets>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#EDE9DE] text-[#6B6E76] border-b border-[#16181D]">
                      <tr>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Prefix</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Last Used</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16181D]">
                      {keys.map((k) => (
                        <tr key={k.id} className="hover:bg-[#EDE9DE] transition">
                          <td className="py-3 px-3 font-bold">{k.name}</td>
                          <td className="py-3 px-3 text-[#6B6E76]">{k.prefix}</td>
                          <td className="py-3 px-3">
                            <StatusPill status={k.status} />
                          </td>
                          <td className="py-3 px-3 text-[#6B6E76]">{k.lastUsed}</td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              onClick={() => handleRotateKey(k.id)}
                              className="text-[11px] font-semibold text-[#16181D] hover:text-[#F05423] underline cursor-pointer"
                            >
                              Rotate (1h)
                            </button>
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="text-[11px] font-semibold text-[#C6402E] hover:underline cursor-pointer"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Cell>
            </div>
          )}

          {/* AUDIT TAB */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold">HCS Audit Topic: </span>
                  <span className="font-mono text-[#F05423]">{project.hcs_topic_id}</span>
                </div>
                <a
                  href={`https://hashscan.io/testnet/topic/${project.hcs_topic_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-semibold text-[#16181D] hover:text-[#F05423]"
                >
                  <span>View Raw Topic on HashScan</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <Cell num="01" title="CONSENSUS MESSAGES" brackets>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#EDE9DE] text-[#6B6E76] border-b border-[#16181D]">
                      <tr>
                        <th className="py-2.5 px-3">Seq #</th>
                        <th className="py-2.5 px-3">Tool</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Consensus Time</th>
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3 text-right">DB Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16181D]">
                      {auditRecords.map((item) => (
                        <AuditRow key={item.seq} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Cell>
            </div>
          )}

          {/* APPROVALS TAB */}
          {activeTab === "approvals" && (
            <div className="space-y-6">
              <Cell num="01" title="PENDING QUORUM TASKS" brackets>
                <div className="p-4 space-y-4">
                  {approvals.map((appr) => (
                    <ApprovalCard
                      key={appr.id}
                      approval={appr}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              </Cell>
            </div>
          )}

          {/* SERVICES TAB */}
          {activeTab === "services" && (
            <div className="space-y-6">
              <Cell num="01" title="THE DIRECTORY — ALL 14 REGISTERED TOOLS" brackets>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#EDE9DE] text-[#6B6E76] border-b border-[#16181D]">
                      <tr>
                        <th className="py-2.5 px-3">Tool Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Pricing Rule</th>
                        <th className="py-2.5 px-3">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#16181D]">
                      {[
                        { name: "get_balances", desc: "Get USDC & HBAR account balances", price: "FREE", tags: "wallet" },
                        { name: "get_project_info", desc: "Project metadata & HCS topic", price: "FREE", tags: "project" },
                        { name: "transfer_token", desc: "Direct HTS transfer on Hedera", price: "$0.002 flat", tags: "hts" },
                        { name: "get_swap_quote", desc: "SaucerSwap route & price impact", price: "$0.0001 flat", tags: "dex" },
                        { name: "swap_tokens", desc: "DEX token swap execution", price: "$0.005 + 5bps", tags: "dex" },
                        { name: "search_subgraphs", desc: "Search subgraphs by keyword", price: "$0.00001 flat", tags: "graph" },
                        { name: "get_subgraph_schema", desc: "Inspect GraphQL schema", price: "$0.00001 flat", tags: "graph" },
                        { name: "execute_subgraph_query", desc: "GraphQL query with meter", price: "$0.00001 + data", tags: "graph" },
                        { name: "analyze_pool_health", desc: "DEX liquidity risk rating", price: "~$0.0006", tags: "analytics" },
                        { name: "compare_protocol_tvl", desc: "Multi-DEX TVL comparison", price: "~$0.0006", tags: "analytics" },
                        { name: "deploy_substreams_pipeline", desc: "Natural language Substreams deploy", price: "$0.25 flat", tags: "substreams" },
                        { name: "execute_pipeline_query", desc: "Query indexed Substreams Postgres sink", price: "$0.0001 flat", tags: "sql" },
                        { name: "verify_agent", desc: "ERC-8004 on-chain agent verification", price: "$0.00001 flat", tags: "identity" },
                        { name: "deploy_contract", desc: "Deploy EVM smart contract on Hedera", price: "$0.02 + bytecode", tags: "evm" },
                      ].map((t) => (
                        <tr key={t.name} className="hover:bg-[#EDE9DE] transition">
                          <td className="py-3 px-3 font-bold text-[#16181D]">{t.name}</td>
                          <td className="py-3 px-3 text-[#6B6E76]">{t.desc}</td>
                          <td className="py-3 px-3">
                            <PricePill price={t.price} />
                          </td>
                          <td className="py-3 px-3 text-[#6B6E76] uppercase text-[11px]">{t.tags}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Cell>
            </div>
          )}

          {/* PIPELINES TAB */}
          {activeTab === "pipelines" && (
            <div className="space-y-6">
              <Cell num="01" title="SUBSTREAMS STREAMING PIPELINES (THE GRAPH)" brackets>
                <div className="p-5 space-y-4 text-xs">
                  <p className="text-xs text-[#6B6E76]">
                    Autonomous high-throughput blockchain indexing pipelines with Rust WASM modules and Postgres sinks. Gated by x402 ($0.25 per deploy).
                  </p>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
                      Indexing Prompt
                    </label>
                    <textarea
                      value={newPipelinePrompt}
                      onChange={(e) => setNewPipelinePrompt(e.target.value)}
                      placeholder="e.g. Index all Transfer events of USDC on Base into Postgres, track hourly volume per sender and top receivers"
                      className="w-full h-16 border border-[#16181D] bg-[#EDE9DE] p-2.5 text-xs text-[#16181D] font-mono focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-40">
                      <label className="block text-[11px] uppercase tracking-wider text-[#6B6E76] mb-1">
                        Network
                      </label>
                      <select
                        value={newPipelineNetwork}
                        onChange={(e) => setNewPipelineNetwork(e.target.value)}
                        className="w-full border border-[#16181D] bg-[#EDE9DE] px-2 py-1.5 text-xs font-mono"
                      >
                        <option value="base">Base (EVM)</option>
                        <option value="mainnet">Ethereum Mainnet</option>
                        <option value="arbitrum">Arbitrum One</option>
                      </select>
                    </div>
                    <div className="pt-4">
                      <BlockButton
                        variant="forge"
                        disabled={deployingPipeline}
                        onClick={() => {
                          setDeployingPipeline(true);
                          setTimeout(() => {
                            setDeployingPipeline(false);
                            setPipelines([
                              {
                                id: `pipe_sub_${Math.random().toString(16).substring(2, 10)}`,
                                network: newPipelineNetwork,
                                prompt: newPipelinePrompt || "Index USDC Transfer events into Postgres",
                                status: "active",
                                sync_rate: "15,800 blocks/sec",
                                tables: ["transfers", "hourly_sender_volume"],
                                schema_sql: "CREATE TABLE transfers (evt_tx_hash VARCHAR(66), amount NUMERIC);",
                                created_at: "Just now",
                              },
                              ...pipelines,
                            ]);
                            setNewPipelinePrompt("");
                          }, 800);
                        }}
                      >
                        {deployingPipeline ? "DEPLOYING VIA X402..." : "DEPLOY VIA X402 ($0.25 USDC)"}
                      </BlockButton>
                    </div>
                  </div>
                </div>
              </Cell>

              <Cell num="02" title="ACTIVE DEPLOYED PIPELINES">
                <div className="divide-y divide-[#16181D]">
                  {pipelines.map((pipe) => (
                    <div key={pipe.id} className="p-4 bg-[#F4F1E9] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{pipe.id}</span>
                          <StatusPill status="active" />
                          <span className="text-[#6B6E76] uppercase">[{pipe.network}]</span>
                        </div>
                        <span className="text-[#F05423] font-bold">{pipe.sync_rate}</span>
                      </div>
                      <p className="italic text-[#6B6E76]">"{pipe.prompt}"</p>
                      <div className="p-2 border border-[#16181D] bg-[#EDE9DE] text-[11px]">
                        <strong>Tables: </strong>
                        <span>{pipe.tables.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Cell>

              <Cell num="03" title="INTERACTIVE SQL QUERY RUNNER (`execute_pipeline_query`)">
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pipelineQuery}
                      onChange={(e) => setPipelineQuery(e.target.value)}
                      className="flex-1 border border-[#16181D] bg-[#EDE9DE] px-3 py-1.5 font-mono text-xs text-[#16181D]"
                    />
                    <BlockButton
                      variant="dark"
                      disabled={queryRunning}
                      onClick={() => {
                        setQueryRunning(true);
                        setTimeout(() => {
                          setQueryRunning(false);
                          setQueryResult([
                            { sender_addr: "0x388c818ca8b9251b393131c08a736a67ccb19297", volume_usd: "$2,410,500.00", tx_count: 428 },
                            { sender_addr: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", volume_usd: "$1,150,220.50", tx_count: 184 },
                            { sender_addr: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", volume_usd: "$680,100.00", tx_count: 92 },
                          ]);
                        }, 300);
                      }}
                    >
                      {queryRunning ? "RUNNING..." : "RUN SQL ($0.0001)"}
                    </BlockButton>
                  </div>

                  {queryResult && (
                    <div className="overflow-x-auto border border-[#16181D]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#EDE9DE] text-[#6B6E76] border-b border-[#16181D]">
                          <tr>
                            <th className="py-2 px-3">Sender Address</th>
                            <th className="py-2 px-3">Volume USD</th>
                            <th className="py-2 px-3">TX Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#16181D]">
                          {queryResult.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#EDE9DE]">
                              <td className="py-2 px-3 font-bold">{row.sender_addr}</td>
                              <td className="py-2 px-3 text-[#F05423] font-bold">{row.volume_usd}</td>
                              <td className="py-2 px-3">{row.tx_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Cell>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
