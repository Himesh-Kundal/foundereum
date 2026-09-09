export interface NavSideProps {
  active: string;
  onNavigate: (tab: string) => void;
  onSignOut?: () => void;
}

export const NavSide = ({ active, onNavigate, onSignOut }: NavSideProps) => {
  const tabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'wallets', label: 'WALLETS' },
    { id: 'policy', label: 'POLICY' },
    { id: 'keys', label: 'KEYS' },
    { id: 'calls', label: 'CALLS' },
    { id: 'audit', label: 'AUDIT' },
    { id: 'approvals', label: 'APPROVALS' },
  ];

  return (
    <div className="flex flex-col justify-between border-r border-ink bg-paper w-56 shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col">
        {tabs.map((tab) => {
          const isActive = active.toLowerCase() === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`w-full text-left px-5 py-4 border-b border-ink font-mono text-sm uppercase transition-colors flex items-center cursor-pointer select-none
                ${isActive 
                  ? 'bg-paper2 border-l-4 border-l-forge text-ink font-bold pl-4' 
                  : 'text-ink-mut hover:bg-paper2 hover:text-ink border-l-4 border-l-transparent'
                }`}
            >
              {isActive ? `[ ${tab.label} ]` : tab.label}
            </button>
          );
        })}
      </div>

      {onSignOut && (
        <div className="border-t border-ink p-3 bg-paper2">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2 px-3 border border-ink text-xs font-mono uppercase font-bold text-err hover:bg-err hover:text-paper transition-colors cursor-pointer text-center"
          >
            ← LOGOUT / SIGN OUT
          </button>
        </div>
      )}
    </div>
  );
};
