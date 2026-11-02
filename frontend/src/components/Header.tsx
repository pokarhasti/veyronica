import React, { useEffect, useState } from 'react';
import { ApproverInfo, HealthStatus } from '../types';
import { api } from '../api/client';
import { Shield, UserCheck, Activity, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  currentApprover: ApproverInfo | null;
  onSelectApprover: (approver: ApproverInfo) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentApprover,
  onSelectApprover,
  activeTab,
  onSelectTab,
  pendingCount = 0,
}) => {
  const [approvers, setApprovers] = useState<ApproverInfo[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    api.getApprovers().then(setApprovers).catch(console.error);
    api.getHealth().then(setHealth).catch(console.error);

    const interval = setInterval(() => {
      api.getHealth().then(setHealth).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset demo state to initial seed data?')) return;
    setResetting(true);
    try {
      await api.resetDemo();
      window.location.reload();
    } catch (e) {
      alert(`Reset failed: ${e}`);
    } finally {
      setResetting(false);
    }
  };

  const isHealthy = health?.postgres === 'ok' && health?.temporal === 'ok';

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-950/80">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-white">Veyronica</span>
              <span className="text-[10px] tracking-wide font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                v0.1.0
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Governed Agentic Replenishment</span>
              <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-900/60">
                Simulated against Ginesys/retail ERP schema
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Persona Switcher + Health + Reset */}
        <div className="flex items-center space-x-4">
          {/* Adapter Health Indicator */}
          <div
            className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800"
            title={`Postgres: ${health?.postgres || '...'} | Temporal: ${health?.temporal || '...'} | Worker: ${health?.worker || '...'}`}
          >
            {isHealthy ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
            <span className="text-slate-400 text-[11px] font-mono">
              {isHealthy ? 'Services Online' : 'Services Check'}
            </span>
          </div>

          {/* Persona Switcher: "Acting as" */}
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Acting as:</span>
            <select
              aria-label="Acting as persona"
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              value={currentApprover?.approver_id || ''}
              onChange={(e) => {
                const found = approvers.find((a) => a.approver_id === e.target.value);
                if (found) onSelectApprover(found);
              }}
            >
              {approvers.map((a) => (
                <option key={a.approver_id} value={a.approver_id} className="bg-slate-900 text-slate-100">
                  {a.name} ({a.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Demo Reset */}
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset demo data"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-t border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto text-xs font-medium">
          {[
            { id: 'trigger', label: 'Replenishment Check' },
            { id: 'queue', label: 'Approval Queue', badge: pendingCount > 0 ? pendingCount : undefined },
            { id: 'runs', label: 'Workflow Runs' },
            { id: 'audit', label: 'Audit Trail' },
            { id: 'dashboard', label: 'Metrics Dashboard' },
            { id: 'future', label: 'Future Extensibility' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-4 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400 font-semibold bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
