import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Layers,
  Database,
  Cpu,
  Compass,
} from 'lucide-react';

export const FuturePage: React.FC = () => {
  const [activeRules, setActiveRules] = useState<Record<string, any>>({
    auto_approve_limit_inr: 10000,
    store_manager_limit_inr: 50000,
    regional_manager_limit_inr: 150000,
    max_lead_time_days: 7,
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rules, sugs] = await Promise.all([
        api.getActiveRules().catch(() => activeRules),
        api.getPolicySuggestions().catch(() => []),
      ]);
      if (rules) setActiveRules(rules);
      setSuggestions(sugs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      const res = await api.applyPolicySuggestion(id);
      if (res.active_rules) setActiveRules(res.active_rules);
      await fetchData();
    } catch (err: any) {
      alert(`Error applying policy: ${err.message}`);
    } finally {
      setApplyingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissPolicySuggestion(id);
      await fetchData();
    } catch (err: any) {
      alert(`Error dismissing suggestion: ${err.message}`);
    }
  };

  const roadmapItems = [
    {
      title: 'Direct Ginesys Cloud ERP Connector',
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      desc: 'Swap simulated adapter protocols with production REST/SOAP Ginesys ERP integration, supporting live POS sales pull and warehouse stock balancing.',
    },
    {
      title: 'Autonomous Supplier Quotation & Negotiation Agent',
      icon: <Cpu className="w-5 h-5 text-emerald-400" />,
      desc: 'Multi-agent bidding loop requesting quotes from Tier-1 and Tier-2 suppliers when MOQ or credit limits are constrained.',
    },
    {
      title: 'Multi-Store Cross-Docking & Stock Transfer',
      icon: <Layers className="w-5 h-5 text-violet-400" />,
      desc: 'Rebalance stock between neighboring V-Mart stores within 50km radius before placing external supplier purchase orders.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Continuous Human-in-the-Loop Learning (Feature 2.5)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Policy Governance & Adaptive Learning</h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic policy engine that adjusts replenishment rules and approval thresholds from manager rejection feedback.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Active Rules Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Active Governance Policy Rules & Approval Thresholds</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-semibold">Tier 1: Auto-Approve Limit</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              ₹{Number(activeRules.auto_approve_limit_inr || 10000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              All checks PASS, approved supplier. Direct write to ERP.
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-semibold">Tier 2: Store Manager Limit</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              ₹{Number(activeRules.store_manager_limit_inr || 50000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Local store manager (Priya Sharma / Rakesh Verma).
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-semibold">Tier 3: Regional Manager</div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              &gt; ₹{Number(activeRules.store_manager_limit_inr || 50000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Regional Director (Anita Deshmukh) or CFO sign-off.
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-semibold">Max Lead Time Limit</div>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
              {activeRules.max_lead_time_days || 7} Days
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Triggers DC allocation or emergency expedite if exceeded.
            </div>
          </div>
        </div>
      </div>

      {/* Rejection-to-Policy Suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Policy Tuning Suggestions from Human Rejections</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {suggestions.length} suggestion(s) recorded
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No pending policy suggestions</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              When an approver clicks <strong>Reject</strong> and inputs a mandatory justification (e.g. citing store budget limits, lead time, or order size), the cognitive learning engine automatically generates structured threshold adjustments here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sug) => {
              const isApplied = sug.status === 'applied';
              const isDismissed = sug.status === 'dismissed';

              return (
                <div
                  key={sug.suggestion_id}
                  className={`bg-slate-900 border rounded-xl p-5 transition-all ${
                    isApplied
                      ? 'border-emerald-800/80 bg-emerald-950/20'
                      : isDismissed
                      ? 'border-slate-800 opacity-60'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isApplied
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isDismissed
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {sug.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Rejected by: <strong className="text-slate-200">{sug.rejected_by}</strong>
                      </span>
                    </div>

                    <div className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                      Confidence: {Math.round((sug.confidence || 0.85) * 100)}%
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 italic mb-4">
                    "{sug.rejection_reason}"
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 block text-[11px] uppercase font-mono">Current Policy Rule</span>
                      <span className="font-semibold text-slate-300 mt-0.5 block">{sug.current_rule}</span>
                    </div>
                    <div className="p-3 bg-indigo-950/30 rounded-lg border border-indigo-800/60">
                      <span className="text-indigo-400 block text-[11px] uppercase font-mono">Suggested Adaptation</span>
                      <span className="font-bold text-indigo-200 mt-0.5 block">{sug.suggested_rule}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">{sug.rationale}</p>

                  {!isApplied && !isDismissed && (
                    <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleApply(sug.suggestion_id)}
                        disabled={applyingId === sug.suggestion_id}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{applyingId === sug.suggestion_id ? 'Applying...' : 'Adopt Suggested Threshold'}</span>
                      </button>
                      <button
                        onClick={() => handleDismiss(sug.suggestion_id)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {isApplied && (
                    <div className="text-xs text-emerald-400 flex items-center space-x-1.5 pt-2 border-t border-emerald-900/60">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>This adaptation has been adopted into the live policy engine runtime.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Conceptual Extensibility Roadmap Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span>V-Mart Enterprise Scaling Roadmap</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roadmapItems.map((item, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="p-2.5 bg-slate-950 rounded-lg w-fit border border-slate-800">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
