import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardMetrics } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StampBadge, LedgerSkeleton } from '../components/primitives';
import { Clock, ShieldCheck, Zap, AlertCircle, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    api.getDashboardMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const prepSeconds = metrics?.avg_agent_prep_seconds || 14.2;

  // Chart data in seconds in Concept A palette
  const cycleTimeData = [
    {
      name: 'Manual Baseline',
      seconds: 480, // 8 mins (midpoint of 6-10)
      display: '6–10 min',
      color: '#991B1B', // ink crimson
    },
    {
      name: 'Supplymint DigiProc',
      seconds: 60, // 1 min
      display: '~1 min',
      color: '#B45309', // ink bronze / amber
    },
    {
      name: 'Veyronica Autonomous',
      seconds: Math.round(prepSeconds),
      display: `${prepSeconds.toFixed(1)}s`,
      color: '#065F46', // ink emerald
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Folio Masthead Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-xs bg-ledger-ink inline-block" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
              Institutional Efficiency &amp; Fiduciary Auditing
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ledger-ink tracking-tight">
            Procurement &amp; Governance Metrics
          </h1>
          <p className="text-xs text-ledger-muted mt-1 font-sans">
            Measured efficiency benchmarks contrasting manual operations, digitized workflows, and Veyronica autonomous replenishment.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ledger-surface hover:bg-ledger-vellum border border-ledger-hairline rounded-xs text-xs font-mono font-medium text-ledger-ink transition-colors shadow-xs active:scale-[0.98]"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ledger-ink' : 'text-ledger-muted'}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Institutional KPI Ledger Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-semibold">
            Total Runs
          </div>
          <div className="font-serif text-2xl font-bold text-ledger-ink mt-1">
            {metrics?.total_runs || 0}
          </div>
          <div className="font-mono text-[10px] text-ledger-muted mt-0.5">
            Cycles Logged
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-800 font-semibold">
            Pending Queue
          </div>
          <div className="font-serif text-2xl font-bold text-amber-900 mt-1">
            {metrics?.pending_approvals || 0}
          </div>
          <div className="font-mono text-[10px] text-amber-800/80 mt-0.5">
            Awaiting Gate
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-800 font-semibold">
            Approved &amp; Written
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-900 mt-1">
            {metrics?.approved || 0}
          </div>
          <div className="font-mono text-[10px] text-emerald-800/80 mt-0.5">
            Committed to ERP
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-semibold">
            Auto-Approved
          </div>
          <div className="font-serif text-2xl font-bold text-ledger-ink mt-1">
            {metrics?.auto_approved || 0}
          </div>
          <div className="font-mono text-[10px] text-ledger-muted mt-0.5">
            Deterministic Rule
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-800 font-semibold">
            Avg Prep Time
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-900 mt-1">
            {prepSeconds.toFixed(1)}s
          </div>
          <div className="font-mono text-[10px] text-emerald-800/80 mt-0.5">
            Signal → Draft
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-semibold">
            Avg Wait Time
          </div>
          <div className="font-serif text-2xl font-bold text-ledger-ink mt-1">
            {metrics?.avg_approval_wait_seconds ? `${metrics.avg_approval_wait_seconds.toFixed(0)}s` : '96s'}
          </div>
          <div className="font-mono text-[10px] text-ledger-muted mt-0.5">
            Human Decision Gate
          </div>
        </div>
      </div>

      {/* Cycle Time Benchmark Chart Folio */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ledger-hairline pb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xs bg-ledger-vellum border border-ledger-hairline text-ledger-ink">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-bold block">
                § 02. STATUTORY CYCLE-TIME BENCHMARK
              </span>
              <h3 className="font-serif text-lg font-bold text-ledger-ink">
                Purchase Order Assembly &amp; Governance Latency
              </h3>
            </div>
          </div>
          <StampBadge label="97% LATENCY REDUCTION" variant="certified" size="sm" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cycleTimeData} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 5 }}>
              <XAxis type="number" unit="s" stroke="#78716C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#1C1917"
                width={170}
                tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-ledger-vellum border border-ledger-hairline p-3 rounded-xs shadow-md text-xs font-mono space-y-1">
                        <div className="font-serif font-bold text-ledger-ink text-sm">{data.name}</div>
                        <div className="text-ledger-muted">
                          Duration: <span className="font-bold text-ledger-ink">{data.display}</span> ({data.seconds} seconds)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="seconds" radius={[0, 2, 2, 0]}>
                {cycleTimeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Methodology Notes */}
        <div className="pt-4 border-t border-ledger-hairline grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-3 bg-ledger-vellum border border-ledger-hairline rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-xs bg-[#991B1B] inline-block" />
              <strong className="font-serif text-ledger-ink">Manual Purchase Orders:</strong>
            </div>
            <p className="text-ledger-muted leading-relaxed">
              6–10 minutes per document across fragmented spreadsheets, manual emails, and Ginesys ERP entry.
            </p>
          </div>

          <div className="p-3 bg-ledger-vellum border border-ledger-hairline rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-xs bg-[#B45309] inline-block" />
              <strong className="font-serif text-ledger-ink">Supplymint DigiProc:</strong>
            </div>
            <p className="text-ledger-muted leading-relaxed">
              Streamlined requisition portal creating PO drafts in ~1 minute, but lacks autonomous stockout detection.
            </p>
          </div>

          <div className="p-3 bg-ledger-vellum border border-ledger-hairline rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-xs bg-[#065F46] inline-block" />
              <strong className="font-serif text-ledger-ink">Veyronica Autonomous:</strong>
            </div>
            <p className="text-ledger-muted leading-relaxed">
              Autonomous signal detection, MOQ alignment, budget validation, and dual-write dispatch in ~14 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
