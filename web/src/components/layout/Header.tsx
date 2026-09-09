import { PillButton } from '../Buttons';
import { SpendMeter } from '../SpendMeter';
import { ThemeToggle } from '../ThemeToggle';
import type { ProjectSummary, UserSession } from '../../types';

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
}: HeaderProps) {
  return (
    <header className="border-b border-ink bg-paper flex items-center justify-between px-4 h-14 shrink-0 font-mono">
      <div className="flex items-center gap-4">
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
        <div className="h-4 w-px bg-ink mx-2" />
        
        {/* Project Switcher */}
        <div className="flex items-center gap-2">
          <select 
            value={activeProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="text-sm bg-paper2 border border-ink px-2 py-1 outline-none cursor-pointer"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            type="button" 
            onClick={onOpenNewProject}
            className="text-xs border border-ink px-2 py-1 hover:bg-ink hover:text-paper transition-colors font-bold cursor-pointer"
            title="Create new project"
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
              title="Manage Team & Organization"
            >
              TEAM ({orgMembersCount})
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
