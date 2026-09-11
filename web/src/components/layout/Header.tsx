import { PillButton } from '../Buttons';
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
    <header className="border-b border-ink bg-paper flex items-center justify-between px-3 md:px-4 h-14 shrink-0 font-mono gap-2 overflow-x-auto select-none">
      {/* Left: Breadcrumbs Brand / Org / Agent */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
          onClick={() => onNavigate('landing')}
          title="Foundereum Home"
        >
          <img src="/logo.png" alt="Foundereum" className="w-5 h-5" />
          <span className="font-bold tracking-tight text-sm hidden sm:inline">Foundereum</span>
        </div>

        <span className="text-ink-mut/40 font-mono text-xs hidden sm:inline">/</span>

        {/* Workspace / Org Switcher */}
        <div className="flex items-center bg-paper2 border border-ink px-2 py-0.5 text-xs shrink-0">
          <span className="text-[10px] text-forge uppercase font-bold mr-1 hidden lg:inline" title="Workspace (Company/Team)">
            ORG:
          </span>
          <select
            value={currentOrg?.id || ''}
            onChange={(e) => {
              if (e.target.value && e.target.value !== currentOrg?.id && onSwitchOrg) {
                onSwitchOrg(e.target.value);
              }
            }}
            className="bg-transparent border-none outline-none cursor-pointer font-bold max-w-[100px] md:max-w-[130px] truncate text-ink"
            title="Switch Workspace Organization"
          >
            {orgMemberships && orgMemberships.length > 0 ? (
              orgMemberships.map((org) => (
                <option key={org.org_id} value={org.org_id} className="bg-paper text-ink">
                  {org.org_name} {org.status === 'invited' ? '⚡' : ''}
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
              className="text-[11px] text-ink-mut hover:text-forge transition-colors pl-1 font-bold cursor-pointer"
              title="Rename Workspace"
            >
              ✎
            </button>
          )}
        </div>

        <span className="text-ink-mut/40 font-mono text-xs hidden sm:inline">/</span>

        {/* Project / Agent Switcher */}
        <div className="flex items-center bg-paper2 border border-ink px-2 py-0.5 text-xs shrink-0">
          <span className="text-[10px] text-ink-mut uppercase font-bold mr-1 hidden lg:inline" title="AI Agent Project">
            AGENT:
          </span>
          <select 
            value={activeProjectId}
            onChange={(e) => {
              if (e.target.value === '__all__') {
                onNavigate('projects');
              } else {
                onSelectProject(e.target.value);
              }
            }}
            className="bg-transparent border-none outline-none cursor-pointer font-bold max-w-[95px] md:max-w-[130px] truncate text-ink"
            title="Switch Agent Project"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-paper text-ink">{p.name}</option>
            ))}
            <option value="__all__" className="bg-paper text-forge font-bold">All Agents ({projects.length}) →</option>
          </select>
          {onOpenRenameProject && (
            <button
              type="button"
              onClick={onOpenRenameProject}
              className="text-[11px] text-ink-mut hover:text-forge transition-colors px-1 font-bold cursor-pointer"
              title="Rename Agent Project"
            >
              ✎
            </button>
          )}
          <button 
            type="button" 
            onClick={onOpenNewProject}
            className="text-xs border-l border-ink pl-1.5 ml-0.5 hover:text-forge transition-colors font-bold cursor-pointer"
            title="Create new AI Agent"
          >
            +
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('docs')}
          className="hidden md:block text-xs uppercase hover:text-forge transition-colors underline cursor-pointer shrink-0"
        >
          DOCS ↗
        </button>

        {/* Compact spend badge */}
        <div className="hidden 2xl:flex items-center gap-1 text-xs text-ink-mut bg-paper2 border border-ink px-2 py-0.5 shrink-0">
          <span className="text-ink font-bold">${spend24h.toFixed(2)}</span>
          <span>/${spendLimit.toFixed(0)}</span>
          <span className="text-[10px]">24h</span>
        </div>

        {user && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="border border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase bg-paper2 hidden xl:inline">
              [{user.role}]
            </span>
            <span className="text-xs text-ink font-bold max-w-[120px] truncate hidden xl:inline" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              onClick={onOpenOrgModal}
              className="border border-ink px-2 py-1 text-xs uppercase hover:bg-ink hover:text-paper font-bold cursor-pointer transition-colors shrink-0"
              title="Manage Team & Workspaces"
            >
              TEAM ({orgMembersCount})
            </button>
          </div>
        )}

        <ThemeToggle />

        <PillButton onClick={onSignOut} className="hover:border-err hover:text-err text-xs py-1 px-3 shrink-0">
          SIGN OUT
        </PillButton>
      </div>
    </header>
  );
}
