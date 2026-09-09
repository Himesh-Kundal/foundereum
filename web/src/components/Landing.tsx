import React from "react";
import { PillButton, BlockButton } from "./Buttons";
import { PricePill } from "./Pills";
import { TerminalBlock } from "./TerminalBlock";

interface LandingProps {
  onLaunchApp: () => void;
  onNavigateServices: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onLaunchApp, onNavigateServices }) => {
  return (
    <div className="min-h-screen bg-[#F4F1E9] text-[#16181D] font-mono select-none">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#16181D] px-4 sm:px-8 py-3 flex items-center justify-between bg-[#F4F1E9] sticky top-0 z-50">
        <div className="flex items-center gap-6 text-xs tracking-wider">
          <a
            href="https://github.com/Himesh-Kundal/foundereum/tree/main/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#F05423] transition"
          >
            DOCS
          </a>
          <button
            onClick={onNavigateServices}
            className="hover:text-[#F05423] transition cursor-pointer"
          >
            SERVICES
          </button>
        </div>

        {/* Center Logo & Wordmark */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onLaunchApp}>
          <img src="/logo.png" alt="Foundereum" className="h-7 w-7 object-contain" />
          <span className="font-bold text-base tracking-tight font-mono">Foundereum</span>
        </div>

        <div className="flex items-center gap-5 text-xs">
          <a
            href="https://github.com/Himesh-Kundal/foundereum"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#F05423] transition hidden sm:inline"
          >
            GITHUB
          </a>
          <BlockButton variant="forge" onClick={onLaunchApp} className="py-1.5 px-4 text-xs">
            LAUNCH APP
          </BlockButton>
        </div>
      </header>

      {/* Hero Section */}
      <section className="dotted border-b border-[#16181D] py-20 sm:py-28 px-4 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-[#16181D] leading-[0.95] font-['Archivo_Black']">
            PAY-PER-CALL<br />
            TOOLS FOR<br />
            <span className="bg-[#D9D4C7] px-3 py-1 inline-block mt-2">AI AGENTS</span>
          </h1>

          <div className="max-w-2xl mx-auto">
            <p className="bg-[#EDE9DE] p-2 inline-block text-xs sm:text-sm text-[#16181D] font-mono leading-relaxed border border-[#D9D4C7]">
              Give your agent a wallet, a policy, and a metered toolbelt. Every call settled on Hedera for fractions of a cent.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <PillButton onClick={onLaunchApp}>
              CREATE A PROJECT
            </PillButton>
            <a
              href="https://github.com/Himesh-Kundal/foundereum/tree/main/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs uppercase tracking-wider font-semibold text-[#16181D] hover:text-[#F05423] flex items-center gap-1 transition px-4 py-2"
            >
              <span>READ THE DOCS</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* Marquee Ticker Strip */}
      <div className="border-b border-[#16181D] bg-[#F4F1E9] py-2.5 overflow-hidden whitespace-nowrap text-xs font-mono">
        <div className="animate-marquee flex items-center gap-6 text-[#16181D]">
          <span>swap_tokens <strong className="text-[#F05423]">$0.0075</strong> · settled 0.0.1234@1757300212 ↗</span>
          <span>·</span>
          <span>execute_subgraph_query <strong className="text-[#F05423]">$0.00003</strong> · 9.1KB settled</span>
          <span>·</span>
          <span>analyze_pool_health <strong className="text-[#F05423]">$0.0006</strong> · score 94</span>
          <span>·</span>
          <span>deploy_substreams_pipeline <strong className="text-[#F05423]">$0.25</strong> · sync 14.2k blk/s</span>
          <span>·</span>
          <span>transfer_token <strong className="text-[#F05423]">$0.002</strong> · 0.0.987654 ↗</span>
          <span>·</span>
          <span>get_swap_quote <strong className="text-[#F05423]">$0.0001</strong> · SaucerSwap V2</span>
          <span>·</span>
          <span>verify_agent <strong className="text-[#F05423]">$0.00001</strong> · ERC-8004</span>
          <span>·</span>
          <span>swap_tokens <strong className="text-[#F05423]">$0.0075</strong> · settled 0.0.1234@1757300212 ↗</span>
          <span>·</span>
          <span>execute_subgraph_query <strong className="text-[#F05423]">$0.00003</strong> · 9.1KB settled</span>
        </div>
      </div>

      {/* 01 — HOW IT WORKS (4 Bracketed Cells) */}
      <section className="border-b border-[#16181D]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#16181D]">
          <div className="p-6 bg-[#F4F1E9] hover:bg-[#EDE9DE] transition bracket-cell">
            <span className="text-xs text-[#6B6E76] font-bold block mb-2">01</span>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2">CREATE</h3>
            <p className="text-xs text-[#16181D] leading-relaxed">
              Wallets provisioned in Privy's TEE. Sign in and get dual treasury + agent accounts.
            </p>
          </div>
          <div className="p-6 bg-[#F4F1E9] hover:bg-[#EDE9DE] transition bracket-cell">
            <span className="text-xs text-[#6B6E76] font-bold block mb-2">02</span>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2">FUND</h3>
            <p className="text-xs text-[#16181D] leading-relaxed">
              Test USDC in, balances sync live via Hedera mirror node webhooks.
            </p>
          </div>
          <div className="p-6 bg-[#F4F1E9] hover:bg-[#EDE9DE] transition bracket-cell">
            <span className="text-xs text-[#6B6E76] font-bold block mb-2">03</span>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2">RESTRICT</h3>
            <p className="text-xs text-[#16181D] leading-relaxed">
              Daily caps, per-call caps, and contract allowlists. Default is deny.
            </p>
          </div>
          <div className="p-6 bg-[#F4F1E9] hover:bg-[#EDE9DE] transition bracket-cell">
            <span className="text-xs text-[#6B6E76] font-bold block mb-2">04</span>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2">CONNECT</h3>
            <p className="text-xs text-[#16181D] leading-relaxed">
              One MCP config line into Claude Desktop or Cursor. Start prompting.
            </p>
          </div>
        </div>
      </section>

      {/* 02 — THE TOOLBELT */}
      <section className="border-b border-[#16181D] p-6 sm:p-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs text-[#6B6E76] font-bold block mb-1">02</span>
            <h2 className="text-xl font-bold uppercase tracking-wider">THE TOOLBELT</h2>
          </div>
          <button
            onClick={onNavigateServices}
            className="text-xs font-semibold hover:text-[#F05423] transition flex items-center gap-1 cursor-pointer"
          >
            <span>FULL DIRECTORY</span>
            <span>↗</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">swap_tokens</div>
              <div className="text-xs text-[#6B6E76] mt-0.5">DEX swap via SaucerSwap router on Hedera</div>
            </div>
            <PricePill price="$0.005 + 5bps" />
          </div>

          <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">transfer_token</div>
              <div className="text-xs text-[#6B6E76] mt-0.5">Direct HTS token transfer on Hedera testnet</div>
            </div>
            <PricePill price="$0.002 flat" />
          </div>

          <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">execute_subgraph_query</div>
              <div className="text-xs text-[#6B6E76] mt-0.5">GraphQL query against The Graph deployments</div>
            </div>
            <PricePill price="$0.00001 + data" />
          </div>

          <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">analyze_pool_health</div>
              <div className="text-xs text-[#6B6E76] mt-0.5">Messari DEX pool liquidity score & risk assessment</div>
            </div>
            <PricePill price="~$0.0006" />
          </div>

          <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">deploy_substreams_pipeline</div>
              <div className="text-xs text-[#6B6E76] mt-0.5">Single-prompt Substreams pipeline to Postgres sink</div>
            </div>
            <PricePill price="$0.25 flat" />
          </div>

          <div className="p-4 border border-[#16181D] bg-[#EDE9DE] flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">deploy_contract</div>
              <div className="text-xs text-[#6B6E76] mt-0.5">Deploy EVM smart contract on Hedera (chainId 296)</div>
            </div>
            <PricePill price="$0.02 + bytecode" />
          </div>
        </div>
      </section>

      {/* 03 — EVERY CALL IS A PAYMENT */}
      <section className="border-b border-[#16181D]">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#16181D]">
          <div className="p-8 sm:p-12 flex flex-col justify-center bg-[#F4F1E9]">
            <span className="text-xs text-[#6B6E76] font-bold block mb-1">03</span>
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-4">EVERY CALL IS A PAYMENT</h2>
            <p className="text-xs sm:text-sm text-[#16181D] leading-relaxed mb-4">
              No API keys to meter. No subscriptions to manage. The standard HTTP 402 Payment Required status code, an HTS token transfer, and the Blocky402 facilitator paying the gas.
            </p>
            <p className="text-xs text-[#6B6E76] leading-relaxed">
              Your AI agent never touches a private key. Authorization happens in Privy's TEE under strict spending guardrails.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-[#16181D] text-[#EDE9DE]">
            <div className="text-xs text-[#F05423] font-bold mb-3 uppercase tracking-wider">
              x402 Protocol Flow Excerpt
            </div>
            <TerminalBlock
              compact
              content={`POST /v1/tools/swap_tokens        → 402 payment required
  amount: 7500 (0.0.429274 USDC)
  payTo:  0.0.10413602
  nonce:  9f4a8b22...120s-ttl

POST /v1/payments/build           → X-PAYMENT (signed in Privy TEE)
  pre-check: velocity ok, allowlist ok

POST /v1/tools/swap_tokens        → 200 ok
  settled: 0.0.10413602@1788897039.753 ↗ hashscan
  audit:   HCS topic 0.0.987654 #104`}
            />
          </div>
        </div>
      </section>

      {/* 04 — GUARDRAILS, NOT VIBES */}
      <section className="border-b border-[#16181D]">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#16181D]">
          <div className="p-8 sm:p-12 bg-[#F4F1E9]">
            <span className="text-xs text-[#6B6E76] font-bold block mb-1">04</span>
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-6">GUARDRAILS, NOT VIBES</h2>
            <ul className="space-y-3 text-xs sm:text-sm font-mono">
              <li className="flex items-center gap-2">
                <span className="text-[#F05423] font-bold text-base">✓</span>
                <span>Daily spend caps & per-call limits</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#F05423] font-bold text-base">✓</span>
                <span>Contract & function selector allowlists</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#F05423] font-bold text-base">✓</span>
                <span>default_action: DENY inside Privy TEE</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#F05423] font-bold text-base">✓</span>
                <span>m-of-n quorum threshold on treasury withdrawals</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#F05423] font-bold text-base">✓</span>
                <span>Public tamper-proof audit trail on Hedera Consensus (HCS)</span>
              </li>
            </ul>
          </div>

          <div className="p-6 sm:p-8 bg-[#16181D] text-[#EDE9DE]">
            <div className="text-xs text-[#F05423] font-bold mb-3 uppercase tracking-wider">
              Enforced Policy JSON Spec
            </div>
            <TerminalBlock
              compact
              content={`{
  "per_tx_usd_max": "50.00",
  "daily_usd_max": "500.00",
  "destination_allowlist": [
    "0.0.10413602"
  ],
  "contract_allowlist": [
    "0x0000000000000000000000000000000000104136"
  ],
  "selector_allowlist": [
    "0x38ed1739",
    "0xa9059cbb"
  ],
  "default_action": "DENY"
}`}
            />
          </div>
        </div>
      </section>

      {/* 05 — BUILT ON */}
      <section className="border-b border-[#16181D] py-6 px-4 bg-[#EDE9DE] text-center text-xs tracking-wider">
        <span className="font-bold text-[#16181D]">HEDERA</span> — settlement ·{" "}
        <span className="font-bold text-[#16181D]">PRIVY</span> — custody + policy ·{" "}
        <span className="font-bold text-[#16181D]">THE GRAPH</span> — live data
      </section>

      {/* Giant Cropped Footer */}
      <footer className="pt-16 pb-10 px-4 bg-[#F4F1E9] text-center overflow-hidden">
        <div className="text-5xl sm:text-7xl md:text-9xl font-black font-['Archivo_Black'] text-[#16181D] opacity-90 tracking-tighter leading-none select-none">
          FOUNDEREUM
        </div>
        <div className="mt-8 text-xs text-[#6B6E76] font-mono flex flex-wrap items-center justify-center gap-4">
          <span>BUSL-1.1</span>
          <span>·</span>
          <span>© 2026 Himesh Kundal</span>
          <span>·</span>
          <a
            href="https://github.com/Himesh-Kundal/foundereum/tree/main/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#16181D]"
          >
            docs
          </a>
          <span>·</span>
          <a
            href="https://github.com/Himesh-Kundal/foundereum"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#16181D]"
          >
            github
          </a>
          <span>·</span>
          <button onClick={onNavigateServices} className="hover:text-[#16181D] cursor-pointer">
            /services
          </button>
        </div>
      </footer>
    </div>
  );
};
