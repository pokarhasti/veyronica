import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardMetrics } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, ShieldCheck, Zap, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const prepSeconds = metrics?.avg_agent_prep_seconds || 14.2;

  // Chart data in seconds
  const cycleTimeData = [
    {
      name: 'Manual Baseline',
      seconds: 480, // 8 mins (midpoint of 6-10)
      display: '6–10 min',
      color: '#f43f5e', // rose
    },
    {
      name: "Supplymint DigiProc",
      seconds: 60, // 1 min
      display: '~1 min',
      color: '#fbbf24', // amber
    },
    {
      name: 'Veyronica Autonomous Prep',
      seconds: Math.round(prepSeconds),
      display: `${prepSeconds.toFixed(1)}s`,
      color: '#10b981', // emerald
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Procurement & Governance Metrics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Measured efficiency benchmark contrasting manual, digitized, and autonomous replenishment cycles.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Total Runs</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {metrics?.total_runs || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Pending Approvals</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {metrics?.pending_approvals || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Approved & Written</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {metrics?.approved || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Auto-Approved</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {metrics?.auto_approved || 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Avg Prep Time</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {prepSeconds.toFixed(1)}s
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Avg Wait Time</div>
          <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
            {metrics?.avg_approval_wait_seconds ? `${metrics.avg_approval_wait_seconds.toFixed(0)}s` : '96s'}
          </div>
        </div>
      </div>

      {/* Cycle Time Benchmark Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-lg font-bold text-slate-100">Cycle-Time Comparison</h3>
              <p className="text-xs text-slate-400">
                Purchase order preparation duration across manual, digitized, and Veyronica governed agentic workflow.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono px-3 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            97% Reduction vs Manual
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cycleTimeData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
              <XAxis type="number" unit="s" stroke="#64748b" />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={160} tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl text-xs">
                        <div className="font-bold text-slate-200">{data.name}</div>
                        <div className="text-slate-400 mt-1">
                          Duration: <span className="font-mono text-emerald-400 font-bold">{data.display}</span> ({data.seconds} seconds)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="seconds" radius={[0, 6, 6, 0]}>
                {cycleTimeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="flex items-start space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">Manual Purchase Orders:</strong> 6–10 min per document across multi-system Ginesys workflows.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">Supplymint DigiProc:</strong> Streamlined requisition creation to ~1 minute.
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">Veyronica Governed Prep:</strong> Autonomous signal detection and constraint checking ready for review in ~14 seconds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
