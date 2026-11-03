import React, { useEffect, useState } from 'react';
import { ApproverInfo, HealthStatus } from '../types';
import { api } from '../api/client';
import { Shield, UserCheck, RotateCcw, ShieldCheck, Scale, AlertTriangle } from 'lucide-react';
import { StampBadge } from './primitives';

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
    if (!window.confirm('Reset ledger state to certified initial seed data?')) return;
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
    <header className="bg-ledger-surface border-b border-ledger-hairline sticky top-0 z-40 shadow-ledger-xs select-none">
      {/* Top Meta Strip (CMP-08): Archival Edition & Cryptographic Health */}
      <div className="border-b border-ledger-hairline bg-ledger-subdued/50 px-4 sm:px-6 lg:px-8 py-1.5 text-[10px] font-mono text-ledger-muted flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-ledger-crimson">ARCHIVAL FOLIO § 2026-DISPATCH</span>
          <span className="text-ledger-hairline-dark">•</span>
          <span className="hidden sm:inline">GINESYS RETAIL ERP SCHEMA PROTOCOL</span>
          <span className="text-ledger-hairline-dark hidden sm:inline">•</span>
          <span className="text-ledger-faint">CHAIN HEAD: SHA-256 PROVEN</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 cursor-help"
            title={`Postgres: ${health?.postgres || '...'} | Temporal: ${health?.temporal || '...'} | Worker: ${health?.worker || '...'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            <span className="font-semibold text-ledger-ink uppercase">
              {isHealthy ? 'ENGINES CERTIFIED' : 'SERVICES RECONCILING'}
            </span>
          </div>
          <span className="text-ledger-hairline-dark">•</span>
          <span className="text-ledger-faint font-sans">Veyronica v0.1.0</span>
        </div>
      </div>

      {/* Main Archival Masthead (CMP-01) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Masthead */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xs overflow-hidden border border-ledger-hairline flex items-center justify-center shadow-ledger-xs bg-ledger-ground">
            <img src="/logo.png" alt="Veyronica Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-ledger-ink leading-none">
                Veyronica
              </span>
              <span className="text-[10px] font-mono tracking-widest text-ledger-crimson uppercase font-semibold">
                LEDGER DESK
              </span>
            </div>
            <div className="text-[11px] text-ledger-muted font-sans mt-0.5">
              Governed Agentic Procurement & Fiduciary Order Requisitions
            </div>
          </div>
        </div>

        {/* Controls: Signatory Switcher + Reset */}
        <div className="flex items-center space-x-2.5">
          {/* Signatory Selector ("Acting as") */}
          <div className="relative flex items-center bg-ledger-surface border border-ledger-hairline hover:border-ledger-hairline-dark px-2.5 py-1.5 rounded-xs shadow-ledger-xs transition-all focus-within:ring-2 focus-within:ring-ledger-crimson/20 focus-within:border-ledger-crimson">
            <UserCheck className="w-3.5 h-3.5 text-ledger-crimson shrink-0 mr-1.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-ledger-muted select-none mr-2">
              SIGNATORY:
            </span>
            <select
              aria-label="Acting as signatory persona"
              className="bg-transparent text-xs font-semibold font-mono text-ledger-ink focus:outline-none cursor-pointer pr-4 appearance-none"
              value={currentApprover?.approver_id || ''}
              onChange={(e) => {
                const found = approvers.find((a) => a.approver_id === e.target.value);
                if (found) onSelectApprover(found);
              }}
            >
              {approvers.map((a) => (
                <option key={a.approver_id} value={a.approver_id} className="bg-white text-stone-900 font-mono">
                  {a.name} [{a.role.replace('_', ' ').toUpperCase()}]
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-ledger-muted text-[10px]">
              ▾
            </div>
          </div>

          {/* Demo Reset Button */}
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset ledger to initial seed state"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-ledger-muted hover:text-ledger-crimson bg-ledger-surface hover:bg-ledger-subdued/60 border border-ledger-hairline hover:border-ledger-hairline-dark rounded-xs transition-all shadow-ledger-xs cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-ledger-crimson' : ''}`} />
            <span className="hidden sm:inline text-[11px]">RESET</span>
          </button>
        </div>
      </div>

      {/* Gazette Section Navigation Strip */}
      <div className="border-t border-ledger-hairline bg-ledger-ground/90 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto text-xs py-0.5">
          {[
            { id: 'trigger', folio: '§ 01', label: 'Replenishment Check' },
            { id: 'queue', folio: '§ 02', label: 'Approval Queue', badge: pendingCount > 0 ? pendingCount : undefined },
            { id: 'runs', folio: '§ 03', label: 'Workflow Runs' },
            { id: 'audit', folio: '§ 04', label: 'Audit Trail' },
            { id: 'dashboard', folio: '§ 05', label: 'Metrics Desk' },
            { id: 'future', folio: '§ 06', label: 'Policy Learning' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3.5 py-2.5 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap min-h-[42px] cursor-pointer rounded-t-xs ${
                activeTab === tab.id
                  ? 'border-ledger-crimson text-ledger-crimson font-serif font-bold bg-ledger-surface shadow-ledger-xs'
                  : 'border-transparent text-ledger-muted hover:text-ledger-ink hover:border-ledger-hairline-dark font-sans hover:bg-ledger-surface/50'
              }`}
            >
              <span className="text-[10px] font-mono tracking-wider opacity-60">{tab.folio}</span>
              <span className="tracking-tight">{tab.label}</span>
              {tab.badge !== undefined && (
                <StampBadge label={`${tab.badge} PENDING`} variant="pending" size="sm" />
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
