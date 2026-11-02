import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RunSummary } from '../types';
import {
  Play,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sliders,
  RotateCcw,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface HomePageProps {
  onNavigateToRun: (runId: string) => void;
  onNavigateToQueue: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRun, onNavigateToQueue }) => {
  const [selectedStore, setSelectedStore] = useState('STORE-214');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);

  // Enhancement 4.1: Live "What-If" Store & Budget Sandbox State
  const [sandboxOpen, setSandboxOpen] = useState(false);
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
      setSandboxFeedback(`Store budget updated to ₹${newSpent.toLocaleString('en-IN')} (Remaining Headroom: ₹${headroom.toLocaleString('en-IN')} / ${pct}%)`);
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
      setSandboxFeedback('Database reset to original seed state.');
      setTimeout(() => setSandboxFeedback(null), 3000);
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setUpdatingSandbox(false);
    }
  };

  const storeScenarios: Record<string, { title: string; desc: string; expected: string; tag: string }> = {
    'STORE-214': {
      title: 'Hero Scenario — V-Mart Lucknow Gomtinagar (Store Manager Approval)',
      desc: 'Stock cover drops to 4 days across 3 core denim/apparel SKUs. Generates a ₹42,000 order to SUP-1042 utilizing 70% of remaining budget headroom.',
      expected: 'Routes to Store Manager (Rule 4) with Budget Headroom FLAG.',
      tag: 'Hero Demo',
    },
    'STORE-087': {
      title: 'Small Replenishment — V-Mart Jaipur Vaishali (Auto-Approve Path)',
      desc: 'Small restock under ₹10,000 from fully approved supplier with all checks passing.',
      expected: 'Auto-approves without manual intervention (Rule 6).',
      tag: 'Auto-Approve',
    },
    'STORE-312': {
      title: 'High-Value Escalation — V-Mart Patna Boring Road (Regional Manager)',
      desc: 'Store budget spent is near monthly cap (₹70,000 / ₹80,000). Reorder causes budget headroom failure or exceeds store limit.',
      expected: 'Escalates to Regional Procurement Manager (Rule 1 / Rule 3).',
      tag: 'Escalation',
    },
  };

  const currentScenario = storeScenarios[selectedStore] || storeScenarios['STORE-214'];
  const remainingHeadroom = Math.max(0, storeState.monthly_budget - storeState.budget_spent);
  const budgetSpentPct = Math.min(100, Math.round((storeState.budget_spent / storeState.monthly_budget) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deterministic Separation • Durable Approval Gate</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            V-Mart Autonomous Replenishment Desk
          </h1>

          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Multi-agent replenishment intelligence powered by <strong>LangGraph</strong> cognitive graphs and{' '}
            <strong>Temporal</strong> durable workflow primitives. Rigorously enforces store OTB budgets, supplier MOQs,
            lead time constraints, and human authorization before ERP write.
          </p>

          {/* Trigger Selector */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl p-1.5 flex items-center shadow-inner">
              <span className="text-xs text-slate-400 font-semibold px-3 uppercase tracking-wider">
                Store:
              </span>
              <select
                aria-label="Select store to replenish"
                className="bg-transparent text-slate-100 text-sm font-semibold pr-8 py-1.5 focus:outline-none cursor-pointer"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="STORE-214" className="bg-slate-900 text-slate-100">
                  STORE-214 (Lucknow Gomtinagar)
                </option>
                <option value="STORE-087" className="bg-slate-900 text-slate-100">
                  STORE-087 (Jaipur Vaishali)
                </option>
                <option value="STORE-312" className="bg-slate-900 text-slate-100">
                  STORE-312 (Patna Boring Road)
                </option>
              </select>
            </div>

            <button
              onClick={handleTrigger}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-indigo-950/60 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{loading ? 'Evaluating Agents...' : 'Run Replenishment Check'}</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhancement 4.1: Interactive "What-If" Store & Budget Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div
          className="p-4 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setSandboxOpen(!sandboxOpen)}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-md bg-amber-950/60 border border-amber-800 text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-200">
                  Interactive "What-If" ERP & Budget Sandbox
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Live DB Tuning
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate store budget spikes or inventory deficits in real-time to test policy tier escalations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right text-xs font-mono hidden sm:block">
              <span className="text-slate-400">Remaining OTB: </span>
              <strong className="text-emerald-400">₹{remainingHeadroom.toLocaleString('en-IN')}</strong>
            </div>
            <button className="text-slate-400 hover:text-white p-1">
              {sandboxOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {sandboxOpen && (
          <div className="p-6 space-y-6 bg-slate-900/60">
            {sandboxFeedback && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{sandboxFeedback}</span>
              </div>
            )}

            {/* Live Slider for Monthly Budget Spent */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  Store Monthly Budget Spent ({selectedStore}):
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  ₹{storeState.budget_spent.toLocaleString('en-IN')} / ₹{storeState.monthly_budget.toLocaleString('en-IN')} ({budgetSpentPct}%)
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={storeState.monthly_budget}
                step="5000"
                value={storeState.budget_spent}
                onChange={(e) => handleSimulateBudget(Number(e.target.value))}
                disabled={updatingSandbox}
                className="w-full accent-indigo-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>₹0 (100% Headroom)</span>
                <span>₹{(storeState.monthly_budget / 2).toLocaleString('en-IN')} (50%)</span>
                <span>₹{storeState.monthly_budget.toLocaleString('en-IN')} (Cap Exceeded)</span>
              </div>
            </div>

            {/* Quick Test Preset Buttons */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold mr-1">Quick Presets:</span>
                <button
                  onClick={() => handleSimulateBudget(Math.round(storeState.monthly_budget * 0.92))}
                  disabled={updatingSandbox}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-950 border border-rose-800/80 text-rose-300 text-xs font-semibold transition-colors"
                >
                  ⚡ Force Budget Headroom Violation (92% Spent)
                </button>
                <button
                  onClick={() => handleSimulateBudget(Math.round(storeState.monthly_budget * 0.3))}
                  disabled={updatingSandbox}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-950 border border-emerald-800/80 text-emerald-300 text-xs font-semibold transition-colors"
                >
                  ✨ Healthy Headroom (30% Spent)
                </button>
              </div>

              <button
                onClick={handleResetSandbox}
                disabled={updatingSandbox}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Seed</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Scenario Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
            Scenario Preview
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
            {currentScenario.tag}
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-100">{currentScenario.title}</h3>
        <p className="text-sm text-slate-300 mt-1">{currentScenario.desc}</p>
        <div className="mt-3 inline-flex items-center text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-3 py-1 rounded">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          <span>Expected Outcome: {currentScenario.expected}</span>
        </div>
      </div>

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-200">Recent Replenishment Runs</h3>
          <button
            onClick={() => onNavigateToRun('')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center"
          >
            <span>View All Runs</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No workflow runs recorded yet. Click "Run Replenishment Check" above to trigger a live run.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Run ID</th>
                  <th className="p-3">Store</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Started</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentRuns.slice(0, 5).map((r) => (
                  <tr key={r.run_id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-indigo-300">{r.run_id.slice(0, 8)}...</td>
                    <td className="p-3 font-medium text-slate-200">{r.store_id}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : r.status === 'awaiting_approval'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                            : r.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(r.started_at).toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onNavigateToRun(r.run_id)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
