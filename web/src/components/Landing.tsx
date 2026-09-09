import type { ServiceTool } from '../api';
import { ThemeToggle } from './ThemeToggle';

export interface LandingProps {
  onLaunch?: () => void;
  onCreateProject?: () => void;
  onServices?: () => void;
  onDocs?: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
  isAuthenticated?: boolean;
  services?: ServiceTool[];
}

export function Landing({ 
  onLaunch, 
  onCreateProject, 
  onServices, 
  onDocs, 
  onSignIn,
  onSignOut,
  isAuthenticated = false,
  services = []
}: LandingProps = {}) {
  const handleLaunch = () => {
    if (onLaunch) onLaunch();
    else window.location.hash = '#app';
  };

  const handleCreateProject = () => {
    if (onCreateProject) onCreateProject();
    else if (onLaunch) onLaunch();
    else window.location.hash = '#app';
  };

  const handleServices = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onServices) onServices();
    else window.location.hash = '#services';
  };

  const handleDocs = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onDocs) onDocs();
    else window.location.hash = '#docs';
  };

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSignIn) onSignIn();
    else window.location.hash = '#login';
  };

  return (
    <div className="bg-paper text-ink min-h-screen font-mono selection:bg-forge selection:text-paper">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
          }
        }
        .bg-dotted {
          background-image: radial-gradient(circle, #16181D 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .corner-brackets {
          position: relative;
        }
        .corner-brackets::before,
        .corner-brackets::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 8px;
          border-color: #16181D;
          border-style: solid;
        }
        .corner-brackets::before {
          top: -1px;
          left: -1px;
          border-width: 1px 0 0 1px;
        }
        .corner-brackets::after {
          bottom: -1px;
          right: -1px;
          border-width: 0 1px 1px 0;
        }
      `}</style>
      
      {/* Nav (Doc 11 §4.1: 3 zones like Turnable) */}
      <nav className="border-b border-ink flex items-center justify-between px-4 py-3 text-sm border-t border-t-ink">
        <div className="flex gap-6 w-1/3">
          <a href="#docs" onClick={handleDocs} className="uppercase hover:text-forge transition-colors cursor-pointer">Docs</a>
          <a href="#services" onClick={handleServices} className="uppercase hover:text-forge transition-colors cursor-pointer">Services</a>
        </div>
        <div className="flex items-center justify-center gap-3 w-1/3 font-medium">
          <img src="/logo.png" alt="Foundereum" className="w-8 h-8" />
          <span className="font-bold">Foundereum</span>
        </div>
        <div className="flex gap-4 sm:gap-6 items-center justify-end w-1/3">
          <a href="https://github.com/Himesh-Kundal/foundereum" target="_blank" rel="noreferrer" className="uppercase hover:text-forge transition-colors hidden sm:inline">Github</a>
          
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignIn}
              className="border border-ink rounded-full uppercase px-3 py-1.5 text-xs hover:bg-ink hover:text-paper transition-colors font-medium cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="border border-ink rounded-full uppercase px-3 py-1.5 text-xs hover:bg-err hover:text-paper hover:border-err transition-colors font-medium cursor-pointer text-ink"
            >
              Sign Out
            </button>
          )}

          <ThemeToggle compact className="hidden sm:flex" />

          <button 
            type="button"
            onClick={handleLaunch} 
            className="bg-forge text-ink uppercase px-4 py-2 hover:opacity-90 transition-opacity font-bold cursor-pointer text-xs sm:text-sm"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-dotted border-b border-ink py-24 px-4 flex flex-col items-center text-center relative">
        <h1 className="font-display uppercase text-ink leading-[0.85] tracking-tight mb-8" style={{ fontSize: 'clamp(64px, 10vw, 140px)' }}>
          <div>PAY-PER-CALL</div>
          <div>TOOLS FOR</div>
          <div>AI AGENTS</div>
        </h1>
        <p className="max-w-2xl text-lg mb-12 bg-paper px-2 py-1">
          Give your agent a wallet, a policy, and a metered toolbelt. Every call settled on Hedera for fractions of a cent.
        </p>
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={handleCreateProject} 
            className="border border-ink rounded-full uppercase px-6 py-3 hover:bg-ink hover:text-paper transition-colors cursor-pointer font-medium"
          >
            Create a Project
          </button>
          <a href="#docs" onClick={handleDocs} className="uppercase hover:text-forge transition-colors cursor-pointer">
            Read the Docs ↗
          </a>
        </div>
      </section>

      {/* Ticker strip */}
      <div className="border-b border-ink overflow-hidden whitespace-nowrap py-2 text-sm flex bg-paper">
        <div className="animate-marquee flex gap-4 min-w-full">
          {/* Double content for seamless loop */}
          {[1, 2].map((i) => (
            <span key={i} className="flex gap-4 items-center pl-4 shrink-0">
              <span>swap_tokens <span className="text-forge">$0.0075</span> · settled 0.0.1234@1757300212 ↗</span>
              <span>·</span>
              <span>execute_subgraph_query <span className="text-forge">$0.00003</span></span>
              <span>·</span>
              <span>analyze_pool_health <span className="text-forge">$0.0006</span></span>
              <span>·</span>
              <span>transfer_token <span className="text-forge">$0.002</span></span>
              <span>·</span>
              <span>compare_protocol_tvl <span className="text-forge">$0.0006</span></span>
              <span>·</span>
            </span>
          ))}
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-16 flex flex-col gap-16">
        {/* 01 - HOW IT WORKS */}
        <section>
          <div className="mb-6 flex gap-4 items-baseline">
            <span className="text-ink-mut text-xs">01</span>
            <h2 className="uppercase font-bold text-xl">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0">
            {[
              { title: 'CREATE', text: "Sign in, name a project. Treasury + agent wallets are provisioned in Privy's TEE." },
              { title: 'FUND', text: 'Send test USDC, or hit the faucet. Balances sync from the mirror node.' },
              { title: 'RESTRICT', text: 'Set a daily cap, allowlist contracts. Default is deny.' },
              { title: 'CONNECT', text: 'Paste one MCP config line into Claude. Done.' }
            ].map((step, idx) => (
              <div key={idx} className={`border border-ink p-6 corner-brackets flex flex-col gap-4 bg-paper min-h-[200px] ${idx !== 0 ? 'md:-ml-[1px]' : ''}`}>
                <h3 className="uppercase font-bold">{step.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 02 - THE TOOLBELT */}
        <section>
          <div className="mb-6 flex gap-4 items-baseline">
            <span className="text-ink-mut text-xs">02</span>
            <h2 className="uppercase font-bold text-xl">The Toolbelt</h2>
          </div>
          <div className="border border-ink flex flex-col">
            {(services.length > 0
              ? services.slice(0, 6).map(s => ({
                  tool: s.name,
                  desc: s.description,
                  price: s.pricing.BaseUSD 
                    ? `$${s.pricing.BaseUSD}${s.pricing.NotionalBps ? ' + ' + s.pricing.NotionalBps + 'bps' : s.pricing.PerKBUSD && s.pricing.PerKBUSD !== '0' ? ' + /KB' : ''}` 
                    : '$0.002'
                }))
              : [
                  { tool: 'swap_tokens', desc: 'Swap HTS tokens on SaucerSwap DEX', price: '$0.005 + 5bps' },
                  { tool: 'transfer_token', desc: 'Transfer HTS tokens between accounts', price: '$0.002' },
                  { tool: 'execute_subgraph_query', desc: 'Query The Graph decentralized subgraphs', price: '$0.00001 + /KB' },
                  { tool: 'analyze_pool_health', desc: 'Analyze DEX pool liquidity & depth via Messari', price: '~$0.0006' },
                  { tool: 'compare_protocol_tvl', desc: 'Compare protocol TVL and metrics across chains', price: '~$0.0006' },
                  { tool: 'deploy_contract', desc: 'Deploy smart contracts to Hedera EVM (chainId 296)', price: '$0.02+' }
                ]
            ).map((item, idx, arr) => (
              <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 ${idx !== arr.length - 1 ? 'border-b border-ink' : ''} gap-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 w-full">
                  <span className="font-bold min-w-[240px]">{item.tool}</span>
                  <span className="text-ink-mut text-sm">{item.desc}</span>
                </div>
                <div className="shrink-0">
                  <span className="border border-ink rounded-full px-3 py-1 text-xs">{item.price}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <a href="#services" onClick={handleServices} className="uppercase text-sm hover:text-forge transition-colors cursor-pointer">
              Full Directory ↗ /services
            </a>
          </div>
        </section>

        {/* 03 - EVERY CALL IS A PAYMENT */}
        <section>
          <div className="mb-6 flex gap-4 items-baseline">
            <span className="text-ink-mut text-xs">03</span>
            <h2 className="uppercase font-bold text-xl">Every Call is a Payment</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 border border-ink">
            <div className="p-8 md:border-r border-ink flex flex-col justify-center">
              <p className="leading-relaxed">
                No API keys to meter. No subscriptions to manage. The HTTP 402 status code, an HTS transfer, and the Blocky402 facilitator paying the gas. Your agent never touches a private key.
              </p>
            </div>
            <div className="bg-[#14161D] text-[#E8E4DA] p-8 overflow-x-auto text-[13px] leading-relaxed border-t md:border-t-0 md:border-l border-line">
<pre><code>{`POST /v1/tools/swap_tokens        → 402 payment required
  amount: 7500 (0.0.429274 USDC)
  payTo:  0.0.5551234
POST /v1/payments/build           → X-PAYMENT (signed in Privy TEE)
POST /v1/tools/swap_tokens        → 200 ok
  settled: 0.0.1234@1757300212.4  ↗ hashscan`}</code></pre>
            </div>
          </div>
        </section>

        {/* 04 - GUARDRAILS, NOT VIBES */}
        <section>
          <div className="mb-6 flex gap-4 items-baseline">
            <span className="text-ink-mut text-xs">04</span>
            <h2 className="uppercase font-bold text-xl">Guardrails, not vibes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 border border-ink">
            <div className="p-8 md:border-r border-ink flex flex-col justify-center gap-4">
              {[
                'Daily spend caps',
                'Contract + selector allowlists',
                "default_action: DENY in Privy's TEE",
                'm-of-n quorum on withdrawals',
                'Public audit trail on HCS'
              ].map((tick, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <span className="text-forge font-bold">✓</span>
                  <span>{tick}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#14161D] text-[#E8E4DA] p-8 overflow-x-auto text-[13px] leading-relaxed border-t md:border-t-0 md:border-l border-line">
<pre><code>{`{
  "max_daily_usd": "25.00",
  "max_per_call_usd": "1.00",
  "contract_allowlist": ["0.0.429274"],
  "selector_allowlist": ["0xa9059cbb"],
  "default_action": "DENY"
}`}</code></pre>
            </div>
          </div>
        </section>

        {/* 05 - BUILT ON */}
        <section>
          <div className="mb-6 flex gap-4 items-baseline">
            <span className="text-ink-mut text-xs">05</span>
            <h2 className="uppercase font-bold text-xl">Built On</h2>
          </div>
          <div className="border border-ink p-4 text-center uppercase tracking-wider text-sm flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
            <span>Hedera — settlement</span>
            <span className="hidden md:inline">·</span>
            <span>Privy — custody + policy</span>
            <span className="hidden md:inline">·</span>
            <span>The Graph — live data</span>
          </div>
        </section>
      </main>

      {/* Footer (Doc 11 §4.1) */}
      <footer className="mt-24 border-t border-ink relative overflow-hidden flex flex-col items-center">
        <div className="w-full flex justify-center py-8 z-10 relative bg-paper">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs uppercase px-8 text-ink">
            <span>BUSL-1.1</span>
            <span>·</span>
            <span>© 2026 Himesh Kundal</span>
            <span>·</span>
            <a href="#docs" onClick={handleDocs} className="hover:text-forge transition-colors cursor-pointer">docs</a>
            <span>·</span>
            <a href="https://github.com/Himesh-Kundal/foundereum" target="_blank" rel="noreferrer" className="hover:text-forge transition-colors">github</a>
            <span>·</span>
            <a href="#services" onClick={handleServices} className="hover:text-forge transition-colors cursor-pointer">/services</a>
          </div>
        </div>
        <div className="font-display uppercase text-ink leading-[0.8] text-center select-none translate-y-[20%]" style={{ fontSize: 'clamp(80px, 15vw, 240px)' }}>
          FOUNDEREUM
        </div>
      </footer>
    </div>
  );
}
