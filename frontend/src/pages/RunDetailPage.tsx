import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApproverInfo, RunDetail } from '../types';
import { DecisionCard } from '../components/DecisionCard';
import { Timeline } from '../components/Timeline';
import { CheckRow } from '../components/CheckRow';
import { PipelineStepper } from '../components/PipelineStepper';
import { StampBadge, HashBlock, LedgerEmptyState, LedgerSkeleton } from '../components/primitives';
import {
  ArrowLeft,
  Clock,
  RefreshCw,
  AlertCircle,
  Database,
  Mail,
  ShieldCheck,
  FileText,
  Layers,
  Scroll,
} from 'lucide-react';

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
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);

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

  const handleApprove = async (approvalId: string, lineOverrides?: any[]) => {
    if (!currentApprover) return;
    setActionLoading(true);
    try {
      await api.approveAction(approvalId, currentApprover.approver_id, lineOverrides);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono text-ledger-muted">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-ledger-ink" />
          <span>Opening execution folio and cryptographic journal...</span>
        </div>
        <LedgerSkeleton lines={6} />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <LedgerEmptyState
          title="Run Docket Not Located"
          description={`The requested execution run (${runId}) could not be retrieved from active memory.`}
          folio="ERR-404"
          action={
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ledger-ink hover:bg-black text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Runs Ledger</span>
            </button>
          }
        />
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
    { id: '4', label: 'Draft PO & Rationale Assembled', status: run.drafts.length > 0 ? ('completed' as const) : ('pending' as const) },
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
      label: 'Audit Trail Finalised & SHA-256 Chained',
      status: isCompleted || isRejected ? ('completed' as const) : ('pending' as const),
    },
  ];

  const primaryApproval = run.approval_requests?.[0];
  const primaryDraft = run.drafts?.[selectedDraftIndex] || run.drafts?.[0];

  let statusBadgeVariant: 'certified' | 'pending' | 'rejected' | 'neutral' | 'crimson' = 'neutral';
  if (run.status === 'completed') statusBadgeVariant = 'certified';
  else if (run.status === 'awaiting_approval') statusBadgeVariant = 'pending';
  else if (run.status === 'rejected') statusBadgeVariant = 'rejected';
  else if (run.status === 'failed') statusBadgeVariant = 'crimson';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Folio Masthead Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-ledger-hairline bg-ledger-surface hover:bg-ledger-vellum text-ledger-ink text-xs font-mono tracking-wider transition-colors shadow-xs active:scale-[0.98]"
            title="Return to runs ledger"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO RUNS</span>
          </button>
          <div className="h-4 w-px bg-ledger-hairline hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
                Execution Folio
              </span>
              <StampBadge
                label={run.status.replace('_', ' ').toUpperCase()}
                variant={statusBadgeVariant}
                size="sm"
              />
            </div>
            <h1 className="text-2xl font-serif font-bold text-ledger-ink tracking-tight flex items-center gap-2">
              <span>Run Folio</span>
              <HashBlock hash={run.run_id} length="short" />
            </h1>
          </div>
        </div>

        {/* Temporal & Scoping Metadata Strip */}
        <div className="flex flex-wrap items-center gap-3 bg-ledger-vellum border border-ledger-hairline px-3 py-2 rounded-xs text-xs font-mono">
          <div>
            <span className="text-ledger-muted text-[10px] uppercase block">STORE SCOPE</span>
            <span className="font-bold text-ledger-ink">{run.store_id}</span>
          </div>
          <div className="h-6 w-px bg-ledger-hairline" />
          <div>
            <span className="text-ledger-muted text-[10px] uppercase block">TEMPORAL WORKFLOW</span>
            <span className="font-mono text-ledger-ink truncate max-w-[140px] block" title={run.temporal_wf_id || ''}>
              {run.temporal_wf_id ? `${run.temporal_wf_id.slice(0, 16)}...` : 'SIMULATION MODE'}
            </span>
          </div>
          {(run.agent_prep_ms !== undefined && run.agent_prep_ms !== null) && (
            <>
              <div className="h-6 w-px bg-ledger-hairline" />
              <div>
                <span className="text-ledger-muted text-[10px] uppercase block">AGENT PREP</span>
                <span className="font-bold text-ledger-ink">{run.agent_prep_ms} ms</span>
              </div>
            </>
          )}
          {(run.approval_wait_ms !== undefined && run.approval_wait_ms !== null) && (
            <>
              <div className="h-6 w-px bg-ledger-hairline" />
              <div>
                <span className="text-ledger-muted text-[10px] uppercase block">APPROVAL WAIT</span>
                <span className="font-bold text-amber-800">
                  {run.approval_wait_ms > 1000
                    ? `${(run.approval_wait_ms / 1000).toFixed(1)}s`
                    : `${run.approval_wait_ms} ms`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5-Stage Agentic Pipeline Stepper (Concept A + C Ribbon) */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-ledger-hairline">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-ledger-muted uppercase tracking-widest">
              § 02. PIPELINE EXECUTION LIFECYCLE
            </span>
            <span className="text-ledger-hairline">•</span>
            <span className="font-sans text-xs text-ledger-ink font-medium">
              Deterministic Replenishment Graph
            </span>
          </div>
          <StampBadge
            label={run.status === 'completed' ? 'DISPATCH COMPLETE' : run.status === 'awaiting_approval' ? 'GATE PAUSED' : 'ACTIVE'}
            variant={statusBadgeVariant}
            size="sm"
          />
        </div>
        <PipelineStepper
          status={run.status}
          agentPrepMs={run.agent_prep_ms}
          approvalWaitMs={run.approval_wait_ms}
        />
      </div>

      {/* Multi-Supplier Draft Switcher (If Applicable) */}
      {run.drafts && run.drafts.length > 1 && (
        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-3.5 flex flex-wrap items-center gap-3 shadow-xs">
          <span className="text-[10px] font-mono text-ledger-muted uppercase tracking-wider font-bold">
            Split Supplier Dockets ({run.drafts.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {run.drafts.map((d, idx) => {
              const sName = (d.tool_args as any)?.supplier_name || (d.tool_args as any)?.supplier_id || `Supplier ${idx + 1}`;
              const val = Number(d.total_value);
              const isSelected = selectedDraftIndex === idx;
              return (
                <button
                  key={d.action_id || idx}
                  onClick={() => setSelectedDraftIndex(idx)}
                  className={`px-3 py-1.5 rounded-xs text-xs font-mono font-medium flex items-center space-x-2 border transition-all ${
                    isSelected
                      ? 'bg-ledger-ink text-white border-ledger-ink shadow-xs font-bold'
                      : 'bg-ledger-vellum hover:bg-ledger-subdued border-ledger-hairline text-ledger-ink'
                  }`}
                >
                  <span>{sName}</span>
                  <span className="opacity-80">₹{val.toLocaleString('en-IN')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution Lifecycle Timeline */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-ledger-hairline">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-bold">
            § 03. Temporal Orchestration Timeline
          </h3>
          <span className="font-mono text-[10px] text-ledger-muted">
            DURABLE EXECUTION LOG
          </span>
        </div>
        <Timeline steps={timelineSteps} />
      </div>

      {/* Archival Tabs Navigation */}
      <div className="border-b border-ledger-hairline flex gap-6 text-xs font-mono uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('decision')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'decision'
              ? 'border-ledger-ink text-ledger-ink font-bold'
              : 'border-transparent text-ledger-muted hover:text-ledger-ink'
          }`}
        >
          Decision Docket &amp; Draft
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'signals'
              ? 'border-ledger-ink text-ledger-ink font-bold'
              : 'border-transparent text-ledger-muted hover:text-ledger-ink'
          }`}
        >
          Inventory Signals ({run.signals.length})
        </button>
        <button
          onClick={() => setActiveTab('checks')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'checks'
              ? 'border-ledger-ink text-ledger-ink font-bold'
              : 'border-transparent text-ledger-muted hover:text-ledger-ink'
          }`}
        >
          Policy Checks ({primaryDraft?.check_results?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-ledger-ink text-ledger-ink font-bold'
              : 'border-transparent text-ledger-muted hover:text-ledger-ink'
          }`}
        >
          Audit Events ({run.audit_events.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'decision' && (
        <div className="space-y-6">
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
            <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-ledger-hairline pb-3">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted block">
                    CERTIFIED PURCHASE ORDER SUMMARY
                  </span>
                  <h3 className="font-serif text-lg font-bold text-ledger-ink">
                    {(primaryDraft.tool_args as any)?.supplier_name || 'Primary Supplier Order'}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-ledger-muted uppercase block">Total Commitment</span>
                  <span className="font-serif text-xl font-bold text-ledger-ink">
                    ₹{Number(primaryDraft.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="bg-ledger-vellum p-4 rounded-xs border border-ledger-hairline">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ledger-muted mb-1 font-semibold">
                  AUDITED GOVERNANCE RATIONALE
                </div>
                <p className="font-serif text-sm text-ledger-ink italic leading-relaxed">
                  "{primaryDraft.rationale}"
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ledger-vellum border-b border-ledger-hairline text-ledger-muted font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">SKU Identifier</th>
                  <th className="py-3 px-4 font-semibold">Item Specification</th>
                  <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">7d Velocity</th>
                  <th className="py-3 px-4 font-semibold text-right">Days Cover</th>
                  <th className="py-3 px-4 font-semibold text-right">Reorder Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-hairline font-mono">
                {run.signals.map((s) => (
                  <tr key={s.signal_id} className="hover:bg-ledger-vellum/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-ledger-ink">{s.sku}</td>
                    <td className="py-3 px-4 font-sans text-ledger-ink font-medium">{s.sku_name}</td>
                    <td className="py-3 px-4 text-right text-ledger-ink">{s.current_stock}</td>
                    <td className="py-3 px-4 text-right text-ledger-muted">{s.sales_velocity_7d}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-900">{s.days_of_cover}d</td>
                    <td className="py-3 px-4 text-right text-ledger-muted">{s.reorder_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ledger-vellum border-b border-ledger-hairline text-ledger-muted font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Event Classification</th>
                  <th className="py-3 px-4 font-semibold">Actor Scoping</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Payload Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-hairline">
                {run.audit_events.map((e) => (
                  <tr key={e.event_id} className="hover:bg-ledger-vellum/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-ledger-ink">
                      <StampBadge label={e.event_type} variant="neutral" size="sm" />
                    </td>
                    <td className="py-3 px-4 text-ledger-ink font-mono text-xs">
                      {e.actor_id} <span className="text-ledger-muted">({e.actor_type})</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-ledger-muted">
                      {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-ledger-muted font-mono text-[11px] truncate max-w-xs" title={JSON.stringify(e.payload)}>
                      {JSON.stringify(e.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Executed Enterprise Actions (Ginesys ERP & Supplier Dispatch) */}
      {((run.purchase_orders && run.purchase_orders.length > 0) || (run.sent_emails && run.sent_emails.length > 0)) && (
        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-ledger-hairline pb-4">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-xs bg-emerald-50 border border-emerald-800/40 text-emerald-900">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-ledger-ink">
                  Executed Enterprise Actions (Ginesys ERP &amp; Supplier Dispatch)
                </h3>
                <p className="text-xs text-ledger-muted font-sans">
                  Confirmed post-approval dual writes executed durably via Temporal
                </p>
              </div>
            </div>
            <StampBadge label="DUAL EXECUTION CONFIRMED" variant="certified" size="sm" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ginesys ERP PO Confirmation Parchment */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-ledger-ink font-semibold text-xs font-mono uppercase tracking-wider">
                <Database className="w-4 h-4 text-ledger-muted" />
                <span>1. Confirmed Ginesys ERP Purchase Order</span>
              </div>
              {run.purchase_orders && run.purchase_orders.length > 0 ? (
                run.purchase_orders.map((po) => (
                  <div key={po.po_id} className="bg-ledger-vellum border border-ledger-hairline rounded-xs p-4 space-y-3 paper-grain">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-ledger-muted font-mono text-[11px]">ERP PO REF: </span>
                        <span className="font-mono font-bold text-ledger-ink">{po.po_id}</span>
                      </div>
                      <StampBadge label="ERP WRITE CERTIFIED" variant="certified" size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ledger-muted">Vendor: <strong className="text-ledger-ink">{po.supplier_id}</strong></span>
                      <span className="font-serif font-bold text-base text-ledger-ink">
                        ₹{Number(po.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[11px] text-ledger-muted font-mono pt-1 border-t border-ledger-hairline">
                      Committed at {new Date(po.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-ledger-muted bg-ledger-vellum p-4 rounded-xs border border-ledger-hairline">
                  No Ginesys ERP PO records generated yet.
                </div>
              )}
            </div>

            {/* Dispatched Supplier Notification Email Parchment Letterhead */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-ledger-ink font-semibold text-xs font-mono uppercase tracking-wider">
                <Mail className="w-4 h-4 text-ledger-muted" />
                <span>2. Dispatched Supplier Confirmation Email</span>
              </div>
              {run.sent_emails && run.sent_emails.length > 0 ? (
                run.sent_emails.map((em) => (
                  <div key={em.email_id} className="bg-ledger-vellum border border-ledger-hairline rounded-xs p-4 space-y-2.5 text-xs paper-grain">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-ledger-muted font-mono text-[11px]">DISPATCH TO: </span>
                        <span className="font-mono font-bold text-ledger-ink">{em.to_email}</span>
                      </div>
                      <StampBadge label="SMTP DISPATCHED" variant="certified" size="sm" />
                    </div>
                    <div className="text-ledger-ink">
                      <span className="text-ledger-muted font-semibold">Subject: </span>
                      {em.subject}
                    </div>
                    <div className="p-3 rounded-xs bg-ledger-surface border border-ledger-hairline font-mono text-[11px] text-ledger-ink whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed shadow-xs">
                      {em.body}
                    </div>
                    <div className="text-[11px] text-ledger-muted font-mono pt-1 border-t border-ledger-hairline">
                      Delivered at {new Date(em.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-ledger-muted bg-ledger-vellum p-4 rounded-xs border border-ledger-hairline">
                  No supplier emails dispatched yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
