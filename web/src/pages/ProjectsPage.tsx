import { Cell } from '../components/Cell';
import { BlockButton, PillButton } from '../components/Buttons';
import { StatusPill } from '../components/Pills';
import { ThemeToggle } from '../components/ThemeToggle';
import type { ProjectSummary } from '../types';

export interface ProjectsPageProps {
  projects: ProjectSummary[];
  onBackToDashboard: () => void;
  onOpenNewProject: () => void;
  onSelectProject: (id: string) => void;
  onSignOut: () => void;
  onRenameProject?: (id: string, currentName: string) => void;
}

export function ProjectsPage({
  projects,
  onBackToDashboard,
  onOpenNewProject,
  onSelectProject,
  onSignOut,
  onRenameProject,
}: ProjectsPageProps) {
  return (
    <div className="min-h-screen bg-paper flex flex-col font-mono">
      <div className="border-b border-ink p-4 flex justify-between items-center bg-paper2">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToDashboard} 
            className="font-mono text-sm hover:text-forge transition-colors cursor-pointer font-bold"
          >
            ← BACK TO DASHBOARD
          </button>
          <div>
            <h1 className="font-mono text-xl uppercase font-bold">ALL AGENT PROJECTS ({projects.length})</h1>
            <p className="text-[11px] text-ink-mut hidden sm:block">
              Each project is an isolated AI Agent with its own Hedera wallets, Privy spend policies, and API keys.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <BlockButton onClick={onOpenNewProject}>+ NEW AGENT</BlockButton>
          <PillButton onClick={onSignOut}>SIGN OUT</PillButton>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <Cell key={proj.id} brackets title={proj.name} className="flex flex-col justify-between">
              <div className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b border-ink pb-3 border-dashed">
                  <div>
                    <span className="text-ink-mut uppercase">Project ID:</span>
                    <div className="font-bold text-ink truncate">{proj.id}</div>
                  </div>
                  <div>
                    <span className="text-ink-mut uppercase">HCS Topic:</span>
                    <div className="font-bold text-ink">{proj.hcs_topic_id || 'Pending'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-ink-mut uppercase">Threshold:</span>
                    <div className="text-base font-bold text-ink">{proj.quorum_threshold}-of-3</div>
                  </div>
                  <div>
                    <span className="text-ink-mut uppercase">Min Quorum:</span>
                    <div className="text-base font-bold text-forge">${parseFloat(proj.withdraw_quorum_min_usd).toFixed(0)}</div>
                  </div>
                  <div>
                    <span className="text-ink-mut uppercase">Status:</span>
                    <div><StatusPill status={proj.status} /></div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-ink">
                  <div className="flex items-center gap-2">
                    <span className="border border-ok text-ok px-2 py-0.5 text-[10px] font-bold uppercase">
                      identity: ready (ERC-8004)
                    </span>
                    {onRenameProject && (
                      <button
                        type="button"
                        onClick={() => onRenameProject(proj.id, proj.name)}
                        className="text-xs text-ink-mut hover:text-forge font-bold cursor-pointer transition-colors"
                        title="Rename this agent"
                      >
                        [RENAME]
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectProject(proj.id)}
                    className="bg-forge text-ink px-3 py-1 font-bold text-xs uppercase hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    OPEN DASHBOARD ↗
                  </button>
                </div>
              </div>
            </Cell>
          ))}
        </div>
      </div>
    </div>
  );
}
