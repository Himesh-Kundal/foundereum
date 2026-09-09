import { useState } from 'react';
import { BlockButton, PillButton } from '../components/Buttons';
import { ThemeToggle } from '../components/ThemeToggle';
import type { UserSession } from '../types';
import { DocsOverview } from './docs/DocsOverview';
import { DocsX402 } from './docs/DocsX402';
import { DocsTheGraph } from './docs/DocsTheGraph';
import { DocsMcpCatalog } from './docs/DocsMcpCatalog';
import { DocsHedera } from './docs/DocsHedera';
import { DocsPrivy } from './docs/DocsPrivy';
import { DocsQuickstart } from './docs/DocsQuickstart';

export type DocsSubSection = 
  | 'overview'
  | 'x402'
  | 'the-graph'
  | 'mcp-catalog'
  | 'hedera'
  | 'privy'
  | 'quickstart';

export interface DocsPageProps {
  user: UserSession | null;
  mcpConfigText: string;
  onBackToHome: () => void;
  onLaunchApp: () => void;
  onSignOut: () => void;
}

interface NavItem {
  id: DocsSubSection;
  number: string;
  label: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', number: '01', label: 'PLATFORM OVERVIEW' },
  { id: 'x402', number: '02', label: 'X402 PROTOCOL' },
  { id: 'the-graph', number: '03', label: 'THE GRAPH & DATA', badge: 'MESSARI' },
  { id: 'mcp-catalog', number: '04', label: 'MCP TOOL CATALOG', badge: '13 TOOLS' },
  { id: 'hedera', number: '05', label: 'HEDERA & BLOCKY402', badge: 'HTS+HCS' },
  { id: 'privy', number: '06', label: 'PRIVY TEE & POLICIES' },
  { id: 'quickstart', number: '07', label: 'AGENT QUICKSTART' },
];

export function DocsPage({
  user,
  mcpConfigText,
  onBackToHome,
  onLaunchApp,
  onSignOut,
}: DocsPageProps) {
  const [activeSection, setActiveSection] = useState<DocsSubSection>('overview');

  return (
    <div className="min-h-screen bg-paper flex flex-col font-mono text-ink">
      {/* Top Header */}
      <header className="border-b border-ink p-4 flex flex-wrap justify-between items-center bg-paper2 gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToHome} 
            className="font-mono text-sm hover:text-forge transition-colors cursor-pointer font-bold flex items-center gap-1"
          >
            ← BACK TO HOME
          </button>
          <div className="h-4 w-[1px] bg-ink hidden sm:block"></div>
          <h1 className="font-mono text-lg sm:text-xl uppercase font-bold tracking-tight">
            FOUNDEREUM DOCUMENTATION
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href="https://github.com/Himesh-Kundal/foundereum/tree/main/docs" 
            target="_blank" 
            rel="noreferrer" 
            className="font-mono text-xs uppercase hover:text-forge underline transition-colors hidden sm:inline"
          >
            GitHub Docs ↗
          </a>
          <ThemeToggle />
          <BlockButton onClick={onLaunchApp}>LAUNCH APP</BlockButton>
          {user && <PillButton onClick={onSignOut}>SIGN OUT</PillButton>}
        </div>
      </header>

      {/* Main Documentation Shell: Sidebar + Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full border-x border-ink">
        {/* Left Sub-Navigation Sidebar */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-ink bg-paper2 p-4 flex flex-col gap-2 shrink-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-ink-mut mb-2 px-2">
            Documentation Index
          </div>

          <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pb-2 lg:pb-0">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`text-left px-3 py-2.5 border transition-all cursor-pointer flex items-center justify-between whitespace-nowrap lg:whitespace-normal font-mono text-xs ${
                    isActive 
                      ? 'bg-paper text-ink font-bold border-ink border-l-4 border-l-forge' 
                      : 'border-transparent text-ink-mut hover:text-ink hover:bg-paper/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ink-mut">{item.number}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 border border-ink bg-paper2 font-bold ml-2">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-ink hidden lg:flex flex-col gap-2 text-[11px] text-ink-mut">
            <span className="font-bold text-ink uppercase">Sponsors & Network</span>
            <div className="flex flex-col gap-1">
              <span>• Hedera Testnet (Chain 296)</span>
              <span>• The Graph Network</span>
              <span>• Privy Nitro Enclaves</span>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-4xl">
          {activeSection === 'overview' && <DocsOverview />}
          {activeSection === 'x402' && <DocsX402 />}
          {activeSection === 'the-graph' && <DocsTheGraph />}
          {activeSection === 'mcp-catalog' && <DocsMcpCatalog />}
          {activeSection === 'hedera' && <DocsHedera />}
          {activeSection === 'privy' && <DocsPrivy />}
          {activeSection === 'quickstart' && <DocsQuickstart mcpConfigText={mcpConfigText} />}
        </main>
      </div>
    </div>
  );
}
