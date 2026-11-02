import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RunSummary } from '../types';
import { Play, Sparkles, AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface HomePageProps {
  onNavigateToRun: (runId: string) => void;
  onNavigateToQueue: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRun, onNavigateToQueue }) => {
  const [selectedStore, setSelectedStore] = useState('STORE-214');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);

  useEffect(() => {
    api.getRuns().then(setRecentRuns).catch(console.error);
  }, []);

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

  const storeScenarios: Record<string, { title: string; desc: string; expected: string; tag: string }> = {
    'STORE-214': {
      title: 'Hero Scenario (Store Manager Approval)',
      desc: 'Stock cover drops to 4 days across 3 core denim/apparel SKUs. Generates a ₹42,000 order to SUP-1042 utilizing 70% of remaining budget headroom.',
      expected: 'Routes to Store Manager (Rule 4) with Budget Headroom FLAG.',
      tag: 'Hero Demo',
    },
    'STORE-087': {
      title: 'Small Replenishment (Auto-Approve Path)',
      desc: 'Small restock under ₹10,000 from fully approved supplier with all checks passing.',
      expected: 'Auto-approves without manual intervention (Rule 6).',
      tag: 'Auto-Approve',
    },
    'STORE-312': {
      title: 'High-Value Escalation (Regional Manager)',
      desc: 'Store budget spent is near monthly cap (₹70,000 / ₹80,000). Reorder causes budget headroom failure or exceeds store limit.',
      expected: 'Escalates to Regional Procurement Manager (Rule 1 / Rule 3).',
      tag: 'Escalation',
    },
  };

  const currentScenario = storeScenarios[selectedStore];

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
            Autonomous signal detection meets strict deterministic governance. AI agents draft explanations, deterministic code evaluates constraints, and Temporal ensures durable human approval before any ERP write.
          </p>

          {/* Trigger Form */}
          <div className="mt-8 flex flex-wrap items-center gap-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-slate-400">Select Store:</span>
              <select
                aria-label="Select store"
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="STORE-214">STORE-214 (New Delhi Flagship)</option>
                <option value="STORE-087">STORE-087 (Patna Tier-II Store)</option>
                <option value="STORE-312">STORE-312 (Varanasi Tier-III Store)</option>
              </select>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleTrigger}
              className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 shadow-lg shadow-indigo-950/60 transition-colors"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              {loading ? 'Evaluating Inventory...' : 'Run Replenishment Check'}
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

      {/* Selected Scenario Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
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

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
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
