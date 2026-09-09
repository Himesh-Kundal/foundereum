import { Cell } from '../../components/Cell';
import { TerminalBlock } from '../../components/TerminalBlock';
import { PricePill } from '../../components/Pills';

export function DocsOverview() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="border border-ink bg-paper2 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-forge inline-block"></span>
          <span className="text-xs uppercase tracking-wider text-ink-mut font-bold">Platform Overview</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-display uppercase tracking-tight text-ink">
          Autonomous Agent Economics on Hedera
        </h2>
        <p className="text-sm md:text-base text-ink leading-relaxed">
          <strong>Foundereum</strong> provides an enterprise-grade control plane, a confidential spending policy, 
          and an x402-metered toolbelt for autonomous AI agents. Every action — from multi-chain data ingestion via 
          The Graph to SaucerSwap token swaps — is paid per call via sub-cent HTS transfers settled through Blocky402, 
          strictly bounded inside Privy TEE enclaves.
        </p>
      </div>

      {/* Problem vs Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Cell title="THE PROBLEM TODAY" number="01">
          <div className="flex flex-col gap-3 text-xs leading-relaxed">
            <p className="text-err font-bold">❌ Rigid Subscriptions & Seed Phrase Exposure</p>
            <p className="text-ink-mut">
              Autonomous agents can reason about on-chain opportunities, but cannot act safely. Giving an LLM access to 
              private keys risks total catastrophic loss via prompt injection. Furthermore, traditional SaaS APIs force 
              human credit cards and flat monthly seats, making autonomous machine-to-machine commerce impossible.
            </p>
            <ul className="list-disc list-inside text-ink-mut flex flex-col gap-1.5 pl-1">
              <li><strong>Zero Key Isolation:</strong> LLMs given direct keys can be tricked into signing malicious txs.</li>
              <li><strong>No Native Micropayments:</strong> Credit cards cannot meter sub-cent queries or fractional API calls.</li>
              <li><strong>No Verifiable Audit:</strong> Centralized logs can be quietly modified or wiped without consensus.</li>
            </ul>
          </div>
        </Cell>

        <Cell title="FOUNDEREUM SOLUTION" number="02">
          <div className="flex flex-col gap-3 text-xs leading-relaxed">
            <p className="text-ok font-bold">✓ Native x402 Micropayments & TEE Enclaves</p>
            <p className="text-ink-mut">
              Foundereum bridges Claude Desktop and any MCP client to autonomous Web3 operations without seed phrases or 
              subscriptions. Every tool execution returns an HTTP 402 challenge settled in real-time on Hedera testnet with 
              HTS USDC.
            </p>
            <ul className="list-disc list-inside text-ink-mut flex flex-col gap-1.5 pl-1">
              <li><strong>Confidential Custody:</strong> Keys stay inside AWS Nitro TEE enclaves via Privy Server Wallets.</li>
              <li><strong>Strict Policy Engine:</strong> Hardware-enforced daily USD caps and function selector allowlists.</li>
              <li><strong>Immutable HCS Audit:</strong> Every payment receipt is mirrored to a public Hedera Consensus topic.</li>
            </ul>
          </div>
        </Cell>
      </div>

      {/* Core Value Pillars */}
      <Cell title="WHAT VALUE WE PROVIDE" number="03">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 text-xs">
          <div className="border border-ink p-3 bg-paper">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-ink uppercase">Pay-Per-Call</span>
              <PricePill price="$0.00001+" />
            </div>
            <p className="text-ink-mut leading-relaxed">
              No subscriptions or deposits. Claude calls tools dynamically, pays micro-cents via x402 on Hedera, and 
              pays only for the exact result bytes consumed.
            </p>
          </div>

          <div className="border border-ink p-3 bg-paper">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-ink uppercase">TEE Guardrails</span>
              <span className="text-[10px] px-2 py-0.5 border border-ink bg-paper2 font-bold text-forge">PRIVY TEE</span>
            </div>
            <p className="text-ink-mut leading-relaxed">
              Agents never touch raw private keys. Spending velocity, contract targets, and calldata selectors are enforced 
              with a mandatory <code>default_action: DENY</code>.
            </p>
          </div>

          <div className="border border-ink p-3 bg-paper">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-ink uppercase">Live Multi-Chain Data</span>
              <span className="text-[10px] px-2 py-0.5 border border-ink bg-paper2 font-bold text-ink">THE GRAPH</span>
            </div>
            <p className="text-ink-mut leading-relaxed">
              Query subgraphs across Ethereum, Base, Arbitrum, and Optimism. Access standardized Messari health checks 
              and cross-protocol TVL comparisons.
            </p>
          </div>

          <div className="border border-ink p-3 bg-paper">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-ink uppercase">Verifiable Audit</span>
              <span className="text-[10px] px-2 py-0.5 border border-ink bg-paper2 font-bold text-ok">HCS TOPIC</span>
            </div>
            <p className="text-ink-mut leading-relaxed">
              Every settled payment and execution timestamp is committed to Hedera Consensus Service. Inspectable on HashScan 
              by operators and auditors alike.
            </p>
          </div>
        </div>
      </Cell>

      {/* Complete System Architecture */}
      <Cell title="SYSTEM ARCHITECTURE & RUNTIME TOPOLOGY" number="04">
        <div className="flex flex-col gap-4 text-xs">
          <p className="text-ink leading-relaxed">
            The platform is organized into four purpose-built Go binaries, paired with PostgreSQL 16, Redis 7, and 
            isolated MPC/TEE execution environments:
          </p>

          <TerminalBlock>{`                               ┌──────────────────────────────────────────────┐
                               │       AI Client (Claude Desktop / MCP)       │
                               └──────────────────────┬───────────────────────┘
                                                      │ JSON-RPC / HTTP
                                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ FOUNDEREUM CORE CLUSTER                                                                          │
 │                                                                                                  │
 │  ┌─────────────────────────┐         ┌──────────────────────────┐        ┌────────────────────┐  │
 │  │      mcp (:8082)        │◄───────►│      gateway (:8081)     │◄──────►│     api (:8080)    │  │
 │  │ Streamable HTTP Server  │         │   x402 Data Plane Proxy  │        │   Control Plane    │  │
 │  └────────────┬────────────┘         └─────────────┬────────────┘        └──────────┬─────────┘  │
 │               │                                    │                                │            │
 │               │                      ┌─────────────┴────────────┐                   │            │
 │               │                      │   worker (Asynq / Jobs)  │◄──────────────────┘            │
 │               │                      │ HCS Audit & Balance Sync │                                │
 │               │                      └─────────────┬────────────┘                                │
 └───────────────┼────────────────────────────────────┼─────────────────────────────────────────────┘
                 │                                    │
                 ▼                                    ▼
 ┌───────────────────────────────┐     ┌────────────────────────────────────────────────────────────┐
 │       THE GRAPH NETWORK       │     │                      HEDERA TESTNET                        │
 │  ┌─────────────────────────┐  │     │  ┌────────────────────┐        ┌─────────────────────────┐ │
 │  │ Subgraph MCP (:7000)    │  │     │  │ HTS USDC Transfers │        │ Blocky402 Facilitator   │ │
 │  │ Messari Standardized    │  │     │  │ (Sub-Cent Settle)  │        │ (Gas Abstraction)       │ │
 │  │ Arbitrum / Base / Eth   │  │     │  └─────────┬──────────┘        └────────────┬────────────┘ │
 │  └─────────────────────────┘  │     │            │                                │              │
 └───────────────────────────────┘     │            ▼                                ▼              │
                                       │  ┌────────────────────┐        ┌─────────────────────────┐ │
                                       │  │ HCS Audit Topic    │        │ Hedera EVM (SaucerSwap) │ │
                                       │  │ (HashScan Verified)│        │ ERC-8004 Identity       │ │
                                       │  └────────────────────┘        └─────────────────────────┘ │
                                       └────────────────────────────────────────────────────────────┘`}</TerminalBlock>
        </div>
      </Cell>

      {/* The Foundereum Triad */}
      <Cell title="THE FOUNDEREUM TRIAD" number="05">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="border border-ink p-4 flex flex-col gap-2 bg-paper">
            <span className="font-bold uppercase text-forge text-sm">1. Hedera</span>
            <p className="text-ink-mut leading-relaxed">
              <strong>Settlement & Consensus Layer.</strong> Hedera provides deterministic 2-3s finality and fixed 
              $0.0001 USD network fees. Payments use HTS USDC with native token associations. HCS creates non-repudiable 
              audit trails, while Hedera EVM (Chain ID 296) hosts SaucerSwap DEX liquidity and ERC-8004 identity.
            </p>
          </div>

          <div className="border border-ink p-4 flex flex-col gap-2 bg-paper">
            <span className="font-bold uppercase text-forge text-sm">2. The Graph</span>
            <p className="text-ink-mut leading-relaxed">
              <strong>Intelligence & Decentralized Indexing.</strong> Bridges cross-chain blockchain history to 
              agents. Raw subgraphs provide granular query access metered by result bytes, while Messari standardized 
              subgraphs drive deterministic risk scoring and TVL rankings.
            </p>
          </div>

          <div className="border border-ink p-4 flex flex-col gap-2 bg-paper">
            <span className="font-bold uppercase text-forge text-sm">3. Privy</span>
            <p className="text-ink-mut leading-relaxed">
              <strong>Custody, Quorums & Policy Engine.</strong> Hardware-isolated server wallets inside AWS Nitro 
              TEEs. Implements fine-grained velocity caps, contract allowlists, selector whitelists, and m-of-n 
              threshold quorum approvals for multi-member team operations.
            </p>
          </div>
        </div>
      </Cell>
    </div>
  );
}
