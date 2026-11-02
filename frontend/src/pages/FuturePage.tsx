import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StampBadge, LedgerEmptyState, LedgerSkeleton } from '../components/primitives';
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
  BookOpen,
  Scale,
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
      icon: <Database className="w-5 h-5 text-ledger-ink" />,
      desc: 'Swap simulated adapter protocols with production REST/SOAP Ginesys ERP integration, supporting live POS sales pull and real-time inventory commitments.',
    },
    {
      title: 'Autonomous Supplier Quotation & Negotiation Agent',
      icon: <Cpu className="w-5 h-5 text-ledger-ink" />,
      desc: 'Multi-agent bidding loop requesting real-time quotes from Tier-1 and Tier-2 suppliers when MOQ or credit limits are dynamically constrained.',
    },
    {
      title: 'Multi-Store Cross-Docking & Lateral Stock Transfer',
      icon: <Layers className="w-5 h-5 text-ledger-ink" />,
      desc: 'Rebalance stock between neighboring V-Mart stores within 50km radius before committing external supplier purchase orders.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Folio Masthead Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-xs bg-ledger-crimson inline-block" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
              Cognitive Policy Evolution &amp; Continuous Learning
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ledger-ink tracking-tight">
            Policy Governance &amp; Adaptive Learning
          </h1>
          <p className="text-xs text-ledger-muted mt-1 font-sans max-w-2xl">
            Autonomous policy codex that dynamically adjusts replenishment thresholds and authorization rules based on manager rejection feedback.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ledger-surface hover:bg-ledger-vellum border border-ledger-hairline rounded-xs text-xs font-mono font-medium text-ledger-ink transition-colors shadow-xs active:scale-[0.98]"
          title="Refresh active codex"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ledger-ink' : 'text-ledger-muted'}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Active Rules Codex */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-ledger-hairline pb-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-bold">
            <Scale className="w-3.5 h-3.5 text-ledger-ink" />
            <span>§ 01. ACTIVE GOVERNANCE POLICY CODEX &amp; STATUTORY THRESHOLDS</span>
          </div>
          <StampBadge label="ACTIVE IN RUNTIME" variant="certified" size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
            <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-800 font-semibold">
              Tier 1: Auto-Approve Limit
            </div>
            <div className="font-serif text-2xl font-bold text-emerald-900 mt-1">
              ₹{Number(activeRules.auto_approve_limit_inr || 10000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-ledger-muted mt-1.5 leading-normal">
              All checks pass, approved supplier. Direct write to Ginesys ERP.
            </div>
          </div>

          <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber-800 font-semibold">
              Tier 2: Store Manager Limit
            </div>
            <div className="font-serif text-2xl font-bold text-amber-900 mt-1">
              ₹{Number(activeRules.store_manager_limit_inr || 50000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-ledger-muted mt-1.5 leading-normal">
              Store Manager sign-off required (e.g. Priya Sharma, Store 214).
            </div>
          </div>

          <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-crimson font-semibold">
              Tier 3: Regional Manager
            </div>
            <div className="font-serif text-2xl font-bold text-ledger-crimson mt-1">
              &gt; ₹{Number(activeRules.store_manager_limit_inr || 50000).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-mono text-ledger-muted mt-1.5 leading-normal">
              Regional Director (Anita Deshmukh) or CFO fiduciary authorization.
            </div>
          </div>

          <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-semibold">
              Max Lead Time Limit
            </div>
            <div className="font-serif text-2xl font-bold text-ledger-ink mt-1">
              {activeRules.max_lead_time_days || 7} Days
            </div>
            <div className="text-[11px] font-mono text-ledger-muted mt-1.5 leading-normal">
              Triggers DC allocation or lateral store transfer if breached.
            </div>
          </div>
        </div>
      </div>

      {/* Rejection-to-Policy Suggestions */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ledger-hairline pb-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-ledger-ink" />
            <span>§ 02. SUGGESTED AMENDMENT DOCKETS (COGNITIVE REJECTION LEARNING)</span>
          </div>
          <span className="text-xs font-mono text-ledger-muted">
            {suggestions.length} amendment proposal(s) on file
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-8 shadow-xs">
            <LedgerEmptyState
              title="No Pending Policy Amendments"
              description="When a store or regional manager rejects a draft order and enters statutory justification, the cognitive learning engine automatically derives structured threshold adjustments here."
              folio="ZERO AMENDMENTS"
              icon={<ShieldCheck className="w-5 h-5 opacity-80" />}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((sug) => {
              const isApplied = sug.status === 'applied';
              const isDismissed = sug.status === 'dismissed';

              let badgeVariant: 'certified' | 'pending' | 'rejected' | 'neutral' | 'crimson' = 'pending';
              if (isApplied) badgeVariant = 'certified';
              else if (isDismissed) badgeVariant = 'neutral';

              return (
                <div
                  key={sug.suggestion_id}
                  className={`bg-ledger-surface border rounded-xs p-5 transition-all shadow-xs space-y-3.5 ${
                    isApplied
                      ? 'border-emerald-800/40 bg-emerald-50/30'
                      : isDismissed
                      ? 'border-ledger-hairline opacity-60'
                      : 'border-ledger-hairline hover:border-ledger-hairline-dark'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ledger-hairline pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <StampBadge label={sug.status.toUpperCase()} variant={badgeVariant} size="sm" />
                      <span className="text-xs text-ledger-muted font-mono">
                        Rejected by: <strong className="text-ledger-ink">{sug.rejected_by}</strong>
                      </span>
                    </div>

                    <div className="text-xs font-mono text-ledger-ink bg-ledger-vellum px-2.5 py-0.5 rounded-xs border border-ledger-hairline">
                      Confidence: {Math.round((sug.confidence || 0.85) * 100)}%
                    </div>
                  </div>

                  <div className="bg-ledger-vellum p-3.5 rounded-xs border border-ledger-hairline text-xs font-serif italic text-ledger-ink leading-relaxed">
                    "{sug.rejection_reason}"
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-ledger-vellum rounded-xs border border-ledger-hairline">
                      <span className="text-ledger-muted block text-[10px] uppercase font-bold">
                        Current Policy Rule
                      </span>
                      <span className="font-semibold text-ledger-ink mt-0.5 block">{sug.current_rule}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-xs border border-emerald-800/30">
                      <span className="text-emerald-900 block text-[10px] uppercase font-bold">
                        Suggested Adaptation
                      </span>
                      <span className="font-bold text-emerald-950 mt-0.5 block">{sug.suggested_rule}</span>
                    </div>
                  </div>

                  <p className="text-xs text-ledger-muted font-sans leading-relaxed">{sug.rationale}</p>

                  {!isApplied && !isDismissed && (
                    <div className="flex items-center space-x-3 pt-3 border-t border-ledger-hairline">
                      <button
                        onClick={() => handleApply(sug.suggestion_id)}
                        disabled={applyingId === sug.suggestion_id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xs text-xs font-mono font-semibold uppercase tracking-wider bg-ledger-ink hover:bg-black text-white shadow-xs transition-colors active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{applyingId === sug.suggestion_id ? 'Adopting...' : 'Adopt Suggested Threshold'}</span>
                      </button>
                      <button
                        onClick={() => handleDismiss(sug.suggestion_id)}
                        className="px-3 py-1.5 rounded-xs text-xs font-mono text-ledger-muted hover:text-ledger-ink transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {isApplied && (
                    <div className="text-xs font-mono text-emerald-900 flex items-center space-x-1.5 pt-2 border-t border-emerald-800/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>This adaptation has been adopted into the active runtime policy codex.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Conceptual Extensibility Roadmap Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-ledger-hairline pb-2 font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-bold">
          <Compass className="w-3.5 h-3.5 text-ledger-ink" />
          <span>§ 03. ENTERPRISE SCALING &amp; SYSTEM INTEGRATION CHRONICLE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roadmapItems.map((item, i) => (
            <div key={i} className="bg-ledger-surface border border-ledger-hairline rounded-xs p-5 space-y-2.5 shadow-xs paper-grain">
              <div className="p-2 bg-ledger-vellum rounded-xs w-fit border border-ledger-hairline">
                {item.icon}
              </div>
              <h3 className="font-serif text-sm font-bold text-ledger-ink">{item.title}</h3>
              <p className="text-xs text-ledger-muted leading-relaxed font-sans">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
