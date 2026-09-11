import { PillButton } from '../Buttons';
import { SpendMeter } from '../SpendMeter';
import { ThemeToggle } from '../ThemeToggle';
import type { ProjectSummary, UserSession } from '../../types';
import type { UserOrgMembership } from '../../api';

export interface HeaderProps {
  activeProjectId: string;
  projects: ProjectSummary[];
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onNavigate: (view: 'landing' | 'docs' | 'projects') => void;
  spend24h: number;
  spendLimit: number;
  user: UserSession | null;
  orgMembersCount: number;
  onOpenOrgModal: () => void;
  onSignOut: () => void;
  currentOrg?: { id: string; name: string };
  orgMemberships?: UserOrgMembership[];
  onSwitchOrg?: (orgId: string) => Promise<void>;
  onOpenRenameOrg?: () => void;
  onOpenRenameProject?: () => void;
}

export function Header({
  activeProjectId,
  projects,
  onSelectProject,
  onOpenNewProject,
  onNavigate,
  spend24h,
  spendLimit,
  user,
  orgMembersCount,
  onOpenOrgModal,
  onSignOut,
  currentOrg,
  orgMemberships = [],
  onSwitchOrg,
  onOpenRenameOrg,
  onOpenRenameProject,
}: HeaderProps) {
  return (
    <header className="border-b border-ink bg-paper flex items-center justify-between px-4 h-14 shrink-0 font-mono">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Foundereum"
          className="w-6 h-6 cursor-pointer"
          onClick={() => onNavigate('landing')}
        />
        <span 
          className="font-bold tracking-tight hidden sm:block cursor-pointer" 
          onClick={() => onNavigate('landing')}
        >
          Foundereum
        </span>
        <div className="h-4 w-px bg-ink mx-1 hidden sm:block" />
        
        {/* Organization / Workspace Switcher */}
        <div className="flex items-center gap-1 bg-paper2 border border-ink px-2 py-1">
          <span className="text-[10px] text-forge uppercase font-bold hidden md:inline" title="Organization Workspace (Company/Team)">
            ORG:
          </span>
          <select
            value={currentOrg?.id || ''}
            onChange={(e) => {
              if (e.target.value && e.target.value !== currentOrg?.id && onSwitchOrg) {
                onSwitchOrg(e.target.value);
              }
            }}
            className="text-xs bg-transparent border-none outline-none cursor-pointer font-bold max-w-[110px] md:max-w-[150px] truncate text-ink"
            title="Switch Workspace Organization (Company/Team)"
          >
            {orgMemberships && orgMemberships.length > 0 ? (
              orgMemberships.map((org) => (
                <option key={org.org_id} value={org.org_id} className="bg-paper text-ink">
                  {org.org_name} {org.status === 'invited' ? '⚡ (Invite)' : ''}
                </option>
              ))
            ) : (
              <option value={currentOrg?.id || ''} className="bg-paper text-ink">
                {currentOrg?.name || 'Workspace'}
              </option>
            )}
          </select>
          {onOpenRenameOrg && (
            <button
              type="button"
              onClick={onOpenRenameOrg}
              className="text-[11px] text-ink-mut hover:text-forge transition-colors px-1 cursor-pointer font-bold"
              title="Rename this Organization"
            >
              ✎
            </button>
          )}
        </div>

        {/* Project Switcher */}
        <div className="flex items-center gap-1 bg-paper2 border border-ink px-2 py-1">
          <span className="text-[10px] text-ink-mut uppercase font-bold hidden md:inline" title="AI Agent Project">
            PROJ:
          </span>
          <select 
            value={activeProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="text-xs bg-transparent border-none outline-none cursor-pointer font-bold max-w-[100px] md:max-w-[140px] truncate text-ink"
            title="Switch Agent Project (AI Agent)"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id} className="bg-paper text-ink">{p.name}</option>
            ))}
          </select>
          {onOpenRenameProject && (
            <button
              type="button"
              onClick={onOpenRenameProject}
              className="text-[11px] text-ink-mut hover:text-forge transition-colors px-1 cursor-pointer font-bold"
              title="Rename this Agent Project"
            >
              ✎
            </button>
          )}
          <button 
            type="button" 
            onClick={onOpenNewProject}
            className="text-xs border-l border-ink pl-1.5 hover:text-forge transition-colors font-bold cursor-pointer"
            title="Create new AI agent project"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="text-xs text-ink-mut underline hover:text-forge hidden lg:inline ml-1 cursor-pointer"
          >
            all ({projects.length})
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate('docs')}
          className="hidden sm:block text-xs uppercase hover:text-forge transition-colors underline cursor-pointer"
        >
          DOCS ↗
        </button>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="text-ink-mut">24h</span>
          <SpendMeter spent={spend24h} limit={spendLimit} />
        </div>
        <div className="h-4 w-px bg-ink hidden md:block mx-2" />
        
        {user && (
          <div className="flex items-center gap-2">
            <span className="border border-ink px-2 py-0.5 text-[10px] font-bold uppercase bg-paper2 hidden sm:inline">
              [{user.role}]
            </span>
            <span className="text-xs text-ink font-bold hidden xl:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={onOpenOrgModal}
              className="border border-ink px-2 py-1 text-xs uppercase hover:bg-ink hover:text-paper font-bold cursor-pointer transition-colors"
              title="Manage Team & Organizations"
            >
              TEAM ({orgMembersCount}){orgMemberships.length > 1 ? ` · ORGS (${orgMemberships.length})` : ''}
            </button>
          </div>
        )}

        <ThemeToggle />

        <PillButton onClick={onSignOut} className="hover:border-err hover:text-err">
          SIGN OUT
        </PillButton>
      </div>
    </header>
  );
}
