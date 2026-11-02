import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApproverInfo, RunDetail } from '../types';
import { DecisionCard } from '../components/DecisionCard';
import { Timeline } from '../components/Timeline';
import { CheckRow } from '../components/CheckRow';
import { ArrowLeft, Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface RunDetailPageProps {
  runId: string;
  onBack: () => void;
  currentApprover: ApproverInfo | null;
}

export const RunDetailPage: React.FC<RunDetailPageProps> = ({ runId, onBack, currentApprover }) => {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'decision' | 'signals' | 'checks' | 'audit'>('decision');

  const fetchRun = async () => {
    if (!runId) return;
    try {
      const data = await api.getRun(runId);
      setRun(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRun();
    const interval = setInterval(() => {
      if (run?.status === 'running' || run?.status === 'awaiting_approval') {
        fetchRun();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [runId, run?.status]);

  const handleApprove = async (approvalId: string) => {
    if (!currentApprover) return;
    setActionLoading(true);
    try {
      await api.approveAction(approvalId, currentApprover.approver_id);
      await fetchRun();
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId: string, reason: string) => {
    if (!currentApprover) return;
    setActionLoading(true);
    try {
      await api.rejectAction(approvalId, currentApprover.approver_id, reason);
      await fetchRun();
    } catch (e: any) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
        <span>Loading workflow execution details...</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="text-rose-400 mb-4">Run not found ({runId})</div>
        <button onClick={onBack} className="text-indigo-400 hover:underline">
          ← Back to Runs
        </button>
      </div>
    );
  }

  // Build timeline steps
  const isAwaiting = run.status === 'awaiting_approval';
  const isCompleted = run.status === 'completed';
  const isRejected = run.status === 'rejected';

  const timelineSteps = [
    { id: '1', label: 'Replenishment Triggered', status: 'completed' as const, timestamp: new Date(run.started_at).toLocaleTimeString() },
    { id: '2', label: 'Inventory Signals Detected', status: run.signals.length > 0 ? ('completed' as const) : ('in_progress' as const) },
    { id: '3', label: 'Deterministic Checks Evaluated', status: run.drafts.length > 0 ? ('completed' as const) : ('pending' as const) },
    { id: '4', label: 'Draft PO & Explanation Assembled', status: run.drafts.length > 0 ? ('completed' as const) : ('pending' as const) },
    {
      id: '5',
      label: 'Human Approval Gate (Temporal Durable Pause)',
      status: isCompleted || isRejected
        ? ('completed' as const)
        : isAwaiting
        ? ('in_progress' as const)
        : ('pending' as const),
    },
    {
      id: '6',
      label: 'Dual Gated Execution (ERP PO + Supplier Email)',
      status: isCompleted
        ? ('completed' as const)
        : isRejected
        ? ('rejected' as const)
        : ('pending' as const),
    },
    {
      id: '7',
      label: 'Audit Trail Finalised',
      status: isCompleted || isRejected ? ('completed' as const) : ('pending' as const),
    },
  ];

  const primaryApproval = run.approval_requests?.[0];
  const primaryDraft = run.drafts?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-100">Run {run.run_id.slice(0, 8)}</h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  run.status === 'completed'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : run.status === 'awaiting_approval'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                    : run.status === 'rejected'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {run.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Store: <strong className="text-slate-200">{run.store_id}</strong> • Temporal Workflow:{' '}
              <span className="font-mono text-indigo-300">{run.temporal_wf_id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          {run.agent_prep_ms && (
            <div>
              Agent Prep: <strong className="text-slate-200">{(run.agent_prep_ms / 1000).toFixed(1)}s</strong>
            </div>
          )}
          {run.approval_wait_ms && (
            <div>
              Approval Wait: <strong className="text-slate-200">{(run.approval_wait_ms / 1000).toFixed(1)}s</strong>
            </div>
          )}
        </div>
      </div>

      {/* Live Timeline Component */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
          Execution Lifecycle
        </h3>
        <Timeline steps={timelineSteps} />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex space-x-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('decision')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'decision'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Decision Card & Draft
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'signals'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Signals ({run.signals.length})
        </button>
        <button
          onClick={() => setActiveTab('checks')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'checks'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Checks ({primaryDraft?.check_results?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Events ({run.audit_events.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'decision' && (
        <div>
          {primaryDraft && primaryApproval && isAwaiting && (
            <DecisionCard
              approvalId={primaryApproval.approval_id}
              assignedRole={primaryApproval.assigned_role}
              draft={primaryDraft}
              currentApprover={currentApprover}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={actionLoading}
            />
          )}

          {(!isAwaiting || !primaryApproval) && primaryDraft && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100">Purchase Order Summary</h3>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  ₹{Number(primaryDraft.total_value).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-sm text-slate-300 italic bg-slate-950 p-4 rounded-lg border border-slate-800">
                "{primaryDraft.rationale}"
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Item Name</th>
                <th className="p-3 text-right">Current Stock</th>
                <th className="p-3 text-right">7d Velocity</th>
                <th className="p-3 text-right">Days Cover</th>
                <th className="p-3 text-right">Reorder Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {run.signals.map((s) => (
                <tr key={s.signal_id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-indigo-300 font-semibold">{s.sku}</td>
                  <td className="p-3 font-sans text-slate-200">{s.sku_name}</td>
                  <td className="p-3 text-right text-slate-300">{s.current_stock}</td>
                  <td className="p-3 text-right text-slate-300">{s.sales_velocity_7d}</td>
                  <td className="p-3 text-right text-amber-400 font-bold">{s.days_of_cover}d</td>
                  <td className="p-3 text-right text-slate-400">{s.reorder_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'checks' && (
        <div className="space-y-3">
          {primaryDraft?.check_results?.map((c, i) => (
            <CheckRow key={i} check={c} />
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Event Type</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Payload Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {run.audit_events.map((e) => (
                <tr key={e.event_id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-semibold text-indigo-300">{e.event_type}</td>
                  <td className="p-3 text-slate-300">
                    {e.actor_id} ({e.actor_type})
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {new Date(e.created_at).toLocaleTimeString()}
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                    {JSON.stringify(e.payload)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
