import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RunSummary } from '../types';
import {
  Play,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sliders,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldCheck,
  Layers,
  Store,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  StampBadge,
  HairlineRule,
  LedgerRow,
  SectionHeading,
  LedgerEmptyState,
} from '../components/primitives';
import { PrimitivesShowcase } from '../components/primitives/PrimitivesShowcase';

interface HomePageProps {
  onNavigateToRun: (runId: string) => void;
  onNavigateToQueue: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRun, onNavigateToQueue }) => {
  const [selectedStore, setSelectedStore] = useState('STORE-214');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);

  // Interactive Balance Sheet Simulator State
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [showPrimitivesShowcase, setShowPrimitivesShowcase] = useState(false);
  const [storeState, setStoreState] = useState<{
    monthly_budget: number;
    budget_spent: number;
  }>({ monthly_budget: 150000, budget_spent: 90000 });
  const [updatingSandbox, setUpdatingSandbox] = useState(false);
  const [sandboxFeedback, setSandboxFeedback] = useState<string | null>(null);

  const fetchRecentRuns = () => {
    api.getRuns().then(setRecentRuns).catch(console.error);
  };

  const fetchStoreData = async (storeId: string) => {
    try {
      const data = await api.getStoreState(storeId);
      if (data?.store) {
        setStoreState({
          monthly_budget: Number(data.store.monthly_budget),
          budget_spent: Number(data.store.budget_spent),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecentRuns();
    fetchStoreData(selectedStore);
  }, [selectedStore]);

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.triggerReplenishment(selectedStore);
      onNavigateToRun(res.run_id);
    } catch (e: any) {
      setError(e.message || 'Trigger failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateBudget = async (newSpent: number) => {
    setUpdatingSandbox(true);
    try {
      await api.simulateStoreState({
        store_id: selectedStore,
        budget_spent: newSpent,
      });
      setStoreState((prev) => ({ ...prev, budget_spent: newSpent }));
      const headroom = storeState.monthly_budget - newSpent;
      const pct = Math.round((headroom / storeState.monthly_budget) * 100);
      setSandboxFeedback(
        `Balance sheet updated: ₹${newSpent.toLocaleString('en-IN')} allocated (Remaining OTB: ₹${headroom.toLocaleString('en-IN')} • ${pct}%)`
      );
      setTimeout(() => setSandboxFeedback(null), 4000);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setUpdatingSandbox(false);
    }
  };

  const handleResetSandbox = async () => {
    setUpdatingSandbox(true);
    try {
      await api.resetDemo();
      await fetchStoreData(selectedStore);
      fetchRecentRuns();
      setSandboxFeedback('Ledger restored to certified seed state.');
      setTimeout(() => setSandboxFeedback(null), 3000);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setUpdatingSandbox(false);
    }
  };

  const storeScenarios: Record<string, { title: string; desc: string; expected: string; tag: string; variant: 'crimson' | 'certified' | 'pending' }> = {
    'STORE-214': {
      title: 'Hero Scenario — V-Mart Lucknow Gomtinagar (Store Manager Approval Gate)',
      desc: 'Stock cover drops below 5 days across 3 core apparel SKUs. Generates a ₹42,000 replenishment order to SUP-1042 utilizing 70% of available budget headroom.',
      expected: 'Routes to Store Manager under Rule 4 with Budget Headroom FLAG.',
      tag: 'HERO SCENARIO',
      variant: 'crimson',
    },
    'STORE-087': {
      title: 'Small Replenishment — V-Mart Jaipur Vaishali (Auto-Approve Threshold)',
      desc: 'Low-value restock below ₹10,000 with pre-approved supplier credentialing and zero flag exceptions.',
      expected: 'Auto-approves instantaneously without human signature (Rule 6).',
      tag: 'AUTO-APPROVE',
      variant: 'certified',
    },
    'STORE-312': {
      title: 'High-Value Escalation — V-Mart Patna Boring Road (Regional Manager Escalation)',
      desc: 'Store budget spent is near monthly threshold cap (₹70,000 / ₹80,000). Reorder causes budget headroom breach.',
      expected: 'Escalates to Regional Procurement Manager under Fiduciary Rule 1 & Rule 3.',
      tag: 'ESCALATION',
      variant: 'pending',
    },
  };

  const currentScenario = storeScenarios[selectedStore] || storeScenarios['STORE-214'];
  const remainingHeadroom = Math.max(0, storeState.monthly_budget - storeState.budget_spent);
  const budgetSpentPct = Math.min(100, Math.round((storeState.budget_spent / storeState.monthly_budget) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-ledger-ground text-ledger-ink paper-grain">
      {/* Editorial Masthead Hero Banner */}
      <div className="border border-ledger-hairline border-t-2 border-t-ledger-crimson bg-ledger-surface p-6 sm:p-10 rounded-xs shadow-ledger-sm relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ledger-hairline pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-xs bg-ledger-crimson inline-block shadow-xs" />
            <span className="text-[11px] font-mono tracking-widest text-ledger-crimson uppercase font-semibold">
              OFFICIAL DISPATCH FOLIO § 214
            </span>
            <span className="text-ledger-hairline-dark">•</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ledger-muted hidden sm:inline">
              AUTONOMOUS PROCUREMENT DESK
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-ledger-muted">
            <span className="flex items-center gap-1.5 text-emerald-800 font-semibold bg-emerald-50/70 border border-emerald-200/60 px-2 py-0.5 rounded-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>CRYPTOGRAPHIC PROTOCOL ACTIVE</span>
            </span>
            <span className="text-ledger-hairline-dark hidden sm:inline">•</span>
            <span className="hidden sm:inline">EDITION: NOV 2026</span>
          </div>
        </div>

        <div className="max-w-3xl">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ledger-ink leading-tight">
            V-Mart Autonomous Replenishment Desk
          </h1>

          <p className="mt-3 text-ledger-muted text-sm sm:text-base leading-relaxed font-sans">
            Governed autonomous replenishment intelligence orchestrating inventory velocity, supplier MOQ
            constraints, and open-to-buy financial thresholds through <strong>LangGraph</strong> cognitive graphs and{' '}
            <strong>Temporal</strong> durable state machines. Every decision produces an immutable SHA-256 cryptographic audit record.
          </p>

          {/* Trigger Dispatch Console */}
          <div className="mt-8 pt-6 border-t border-ledger-hairline flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Store Select Input */}
            <div className="relative flex items-center border border-ledger-hairline hover:border-ledger-hairline-dark bg-ledger-surface rounded-xs px-3 py-2 shadow-ledger-xs focus-within:ring-2 focus-within:ring-ledger-crimson/20 focus-within:border-ledger-crimson transition-all min-w-[260px]">
              <Store className="w-3.5 h-3.5 text-ledger-muted mr-2 shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-ledger-muted mr-2 font-semibold select-none">
                STORE:
              </span>
              <select
                aria-label="Select store to replenish"
                className="bg-transparent text-ledger-ink text-xs font-mono font-semibold focus:outline-none cursor-pointer pr-6 appearance-none w-full"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="STORE-214">STORE-214 (Lucknow Gomtinagar)</option>
                <option value="STORE-087">STORE-087 (Jaipur Vaishali)</option>
                <option value="STORE-312">STORE-312 (Patna Boring Road)</option>
              </select>
              <div className="pointer-events-none absolute right-3 text-ledger-muted text-xs">
                ▾
              </div>
            </div>

            {/* Primary Dispatch CTA */}
            <button
              onClick={handleTrigger}
              disabled={loading}
              className="btn-primary text-xs uppercase tracking-widest px-6 py-2.5 min-h-[40px] font-mono"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'Evaluating Cognitive Loop...' : 'Dispatch Replenishment Run'}</span>
            </button>

            {/* Primitives spec drawer toggle */}
            <button
              onClick={() => setShowPrimitivesShowcase(!showPrimitivesShowcase)}
              className="btn-secondary text-xs font-mono px-3.5 py-2 min-h-[40px]"
            >
              <Layers className="w-3.5 h-3.5 text-ledger-crimson" />
              <span>{showPrimitivesShowcase ? 'Hide Design Primitives' : 'Inspect Primitives Spec (DS-02)'}</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3.5 rounded-xs bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center shadow-ledger-xs">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-700" />
              <span className="font-mono font-medium">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Primitives Showcase Drawer (When toggled) */}
      {showPrimitivesShowcase && (
        <div className="border border-ledger-crimson/30 bg-ledger-surface p-6 rounded-xs shadow-ledger-md animate-fade-in-up">
          <PrimitivesShowcase />
        </div>
      )}

      {/* Balance Sheet Simulator (What-If Sandbox) */}
      <div className="border border-ledger-hairline bg-ledger-surface rounded-xs shadow-ledger-xs overflow-hidden transition-all">
        <div
          className="p-4 sm:p-5 bg-ledger-subdued/40 border-b border-ledger-hairline flex items-center justify-between cursor-pointer select-none hover:bg-ledger-subdued/70 transition-colors"
          onClick={() => setSandboxOpen(!sandboxOpen)}
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 rounded-xs bg-ledger-surface border border-ledger-hairline flex items-center justify-center text-ledger-crimson shadow-ledger-xs shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base text-ledger-ink">
                  Balance Sheet &amp; Open-To-Buy (OTB) Simulator
                </span>
                <StampBadge label="LIVE DB TUNING" variant="neutral" size="sm" />
              </div>
              <p className="text-xs text-ledger-muted mt-0.5 font-sans">
                Simulate store budget spikes or inventory deficits in real time to test deterministic policy tier routing.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 shrink-0">
            <div className="text-right text-xs font-mono hidden sm:block">
              <span className="text-ledger-muted">Remaining OTB Headroom: </span>
              <strong className="text-emerald-900 font-bold font-mono">
                ₹ {remainingHeadroom.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="text-ledger-muted hover:text-ledger-ink p-1">
              {sandboxOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {sandboxOpen && (
          <div className="p-6 space-y-6 bg-ledger-surface animate-fade-in-up">
            {sandboxFeedback && (
              <div className="p-3.5 rounded-xs bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-2 font-mono shadow-ledger-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <span className="font-medium">{sandboxFeedback}</span>
              </div>
            )}

            {/* Tactile Ledger Sliders */}
            <div className="space-y-4 bg-ledger-ground/80 p-5 border border-ledger-hairline rounded-xs shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ledger-ink font-semibold font-serif text-sm">
                  Store Monthly Budget Allocation ({selectedStore}):
                </span>
                <span className="font-mono text-ledger-crimson font-bold text-sm bg-ledger-surface px-2.5 py-1 border border-ledger-hairline rounded-xs">
                  ₹ {storeState.budget_spent.toLocaleString('en-IN')} / ₹ {storeState.monthly_budget.toLocaleString('en-IN')} ({budgetSpentPct}% Spent)
                </span>
              </div>

              {/* Slider Track */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max={storeState.monthly_budget}
                  step="5000"
                  value={storeState.budget_spent}
                  onChange={(e) => handleSimulateBudget(Number(e.target.value))}
                  disabled={updatingSandbox}
                  className="w-full accent-[#991B1B] bg-stone-300 h-2 rounded-none cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-ledger-faint font-mono font-medium">
                  <span>₹0 (100% Headroom)</span>
                  <span>₹ {(storeState.monthly_budget / 2).toLocaleString('en-IN')} (50% Midway)</span>
                  <span>₹ {storeState.monthly_budget.toLocaleString('en-IN')} (Cap Exceeded)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ledger-hairline space-y-1.5">
                <LedgerRow
                  label="Total Store Monthly Cap"
                  value={`₹ ${storeState.monthly_budget.toLocaleString('en-IN')}`}
                />
                <LedgerRow
                  label="Simulated Budget Utilized"
                  value={`₹ ${storeState.budget_spent.toLocaleString('en-IN')}`}
                  highlight
                />
                <LedgerRow
                  label="Available Fiduciary Headroom"
                  value={`₹ ${remainingHeadroom.toLocaleString('en-IN')}`}
                  subvalue={`${100 - budgetSpentPct}% Remainder`}
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="pt-3 border-t border-ledger-hairline flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-ledger-muted mr-1 font-semibold">
                  Presets:
                </span>
                <button
                  onClick={() => handleSimulateBudget(Math.round(storeState.monthly_budget * 0.92))}
                  disabled={updatingSandbox}
                  className="px-3 py-1.5 rounded-xs bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs font-mono font-semibold transition-colors active:scale-95"
                >
                  ⚡ Force Headroom Violation (92% Spent)
                </button>
                <button
                  onClick={() => handleSimulateBudget(Math.round(storeState.monthly_budget * 0.3))}
                  disabled={updatingSandbox}
                  className="px-3 py-1.5 rounded-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-mono font-semibold transition-colors active:scale-95"
                >
                  ✨ Healthy Headroom (30% Spent)
                </button>
              </div>

              <button
                onClick={handleResetSandbox}
                disabled={updatingSandbox}
                className="btn-secondary text-xs font-mono px-3 py-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Seed</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Scenario Preview Docket */}
      <div className={`border border-ledger-hairline bg-ledger-surface p-6 rounded-xs shadow-ledger-xs border-l-4 ${
        currentScenario.variant === 'crimson'
          ? 'border-l-ledger-crimson'
          : currentScenario.variant === 'certified'
          ? 'border-l-ledger-emerald'
          : 'border-l-ledger-amber'
      }`}>
        <div className="flex items-center justify-between mb-2.5 border-b border-ledger-hairline pb-2.5">
          <span className="text-[11px] font-mono uppercase tracking-widest text-ledger-crimson font-semibold">
            FOLIO § SCENARIO AUDIT SPECIFICATION
          </span>
          <StampBadge label={currentScenario.tag} variant={currentScenario.variant} size="sm" />
        </div>

        <h3 className="font-serif text-xl font-bold text-ledger-ink mt-2">
          {currentScenario.title}
        </h3>
        <p className="text-xs sm:text-sm text-ledger-muted mt-1 leading-relaxed font-sans">
          {currentScenario.desc}
        </p>

        <div className="mt-4 inline-flex items-center text-xs font-mono text-emerald-900 bg-emerald-50/80 border border-emerald-200 px-3.5 py-1.5 rounded-xs shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-800 shrink-0" />
          <span>Fiduciary Policy Path: <strong>{currentScenario.expected}</strong></span>
        </div>
      </div>

      {/* Recent Dispatches Ledger Table */}
      <div className="border border-ledger-hairline bg-ledger-surface p-6 rounded-xs shadow-ledger-xs">
        <SectionHeading
          folio="FOLIO § 03"
          title="Recent Replenishment Dispatches"
          subtitle="Chronological audit records of autonomous agentic workflow executions."
          action={
            <button
              onClick={() => onNavigateToRun('')}
              className="text-xs font-mono font-semibold text-ledger-crimson hover:underline flex items-center gap-1 group"
            >
              <span>View Full Ledger Archive</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          }
        />

        {recentRuns.length === 0 ? (
          <LedgerEmptyState
            folio="LEDGER-DISPATCH"
            title="No Recent Dispatches Recorded"
            description="The transaction ledger is pristine. Click 'Dispatch Replenishment Run' above to launch an autonomous replenishment evaluation."
          />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ledger-hairline text-ledger-muted font-mono uppercase text-[10px] tracking-wider bg-ledger-subdued/50">
                    <th className="py-3 px-3.5 font-semibold">Block Run ID</th>
                    <th className="py-3 px-3.5 font-semibold">Store Target</th>
                    <th className="py-3 px-3.5 font-semibold">Workflow Status</th>
                    <th className="py-3 px-3.5 font-semibold">Timestamp</th>
                    <th className="py-3 px-3.5 font-semibold text-right">Filing Docket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ledger-hairline font-sans">
                  {recentRuns.slice(0, 5).map((r) => (
                    <tr key={r.run_id} className="hover:bg-ledger-subdued/30 transition-colors group">
                      <td className="py-3 px-3.5 font-mono font-medium text-ledger-ink">
                        {r.run_id.slice(0, 8)}…
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-ledger-ink">{r.store_id}</td>
                      <td className="py-3 px-3.5">
                        <StampBadge
                          label={r.status.replace('_', ' ')}
                          variant={
                            r.status === 'completed'
                              ? 'certified'
                              : r.status === 'awaiting_approval'
                              ? 'pending'
                              : r.status === 'rejected'
                              ? 'rejected'
                              : 'neutral'
                          }
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-3.5 text-ledger-muted font-mono text-[11px]">
                        {new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => onNavigateToRun(r.run_id)}
                          className="inline-flex items-center gap-1 text-ledger-crimson group-hover:underline font-mono text-xs font-semibold"
                        >
                          <span>Inspect Docket</span>
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (390px responsive fix) */}
            <div className="sm:hidden space-y-3 pt-2">
              {recentRuns.slice(0, 5).map((r) => (
                <div
                  key={r.run_id}
                  onClick={() => onNavigateToRun(r.run_id)}
                  className="p-3.5 bg-ledger-ground/60 border border-ledger-hairline rounded-xs flex flex-col gap-2 hover:bg-ledger-subdued/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-ledger-ink">{r.store_id}</span>
                    <StampBadge
                      label={r.status.replace('_', ' ')}
                      variant={
                        r.status === 'completed'
                          ? 'certified'
                          : r.status === 'awaiting_approval'
                          ? 'pending'
                          : r.status === 'rejected'
                          ? 'rejected'
                          : 'neutral'
                      }
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-ledger-muted">
                    <span>Block: {r.run_id.slice(0, 8)}…</span>
                    <span>{new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="pt-1.5 border-t border-ledger-hairline flex items-center justify-end text-xs font-mono font-semibold text-ledger-crimson">
                    <span>Inspect Docket →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
