import { BlockButton, PillButton } from '../components/Buttons';
import { PricePill } from '../components/Pills';
import type { ServiceTool, UserSession } from '../types';

export interface ServicesPageProps {
  services: ServiceTool[];
  user: UserSession | null;
  onBackToHome: () => void;
  onLaunchApp: () => void;
  onSignOut: () => void;
}

export function ServicesPage({
  services,
  user,
  onBackToHome,
  onLaunchApp,
  onSignOut,
}: ServicesPageProps) {
  return (
    <div className="min-h-screen bg-paper flex flex-col font-mono">
      <div className="border-b border-ink p-4 flex justify-between items-center bg-paper2">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBackToHome} 
            className="font-mono text-sm hover:text-forge transition-colors cursor-pointer font-bold"
          >
            ← BACK TO HOME
          </button>
          <h1 className="font-mono text-xl uppercase font-bold">THE DIRECTORY ({services.length})</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-ink-mut hidden sm:block">Machine-readable: GET /services</span>
          <BlockButton onClick={onLaunchApp}>LAUNCH APP</BlockButton>
          {user && <PillButton onClick={onSignOut}>SIGN OUT</PillButton>}
        </div>
      </div>
      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <div className="border border-ink flex flex-col bg-paper">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-ink bg-paper2 font-mono text-xs text-ink-mut uppercase font-bold">
            <div className="col-span-3">TOOL NAME</div>
            <div className="col-span-6">DESCRIPTION & SCHEMA</div>
            <div className="col-span-3 text-right">PRICING RULE</div>
          </div>
          {services.map((service, i) => (
            <div 
              key={service.name} 
              className={`grid grid-cols-12 gap-4 p-4 ${
                i < services.length - 1 ? 'border-b border-ink border-dashed' : ''
              } font-mono text-xs items-center`}
            >
              <div className="col-span-3 font-bold text-ink">{service.name}</div>
              <div className="col-span-6 flex flex-col gap-1 text-ink-mut">
                <span>{service.description}</span>
                {service.input_schema && (
                  <code className="text-[10px] text-ink/70 truncate">
                    {JSON.stringify(service.input_schema.properties ? Object.keys(service.input_schema.properties) : {})}
                  </code>
                )}
              </div>
              <div className="col-span-3 text-right">
                <PricePill price={`$${service.pricing.BaseUSD}${service.pricing.NotionalBps ? ` + ${service.pricing.NotionalBps}bps` : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
