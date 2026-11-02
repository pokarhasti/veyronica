import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApproverInfo, DraftAction } from '../types';
import { DecisionCard } from '../components/DecisionCard';
import { PipelineStepper } from '../components/PipelineStepper';
import { StampBadge, HashBlock, LedgerSkeleton, LedgerEmptyState } from '../components/primitives';
import { ArrowLeft, RefreshCw, ShieldAlert, FileText } from 'lucide-react';

interface ApprovalDetailPageProps {
  approvalId: string;
  runId: string;
  onBack: () => void;
  currentApprover: ApproverInfo | null;
}

export const ApprovalDetailPage: React.FC<ApprovalDetailPageProps> = ({
  approvalId,
  runId,
  onBack,
  currentApprover,
}) => {
  const [approvalData, setApprovalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApproval = async () => {
    try {
      const data = await api.getApproval(approvalId);
      setApprovalData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproval();
  }, [approvalId]);

  const handleApprove = async (id: string, lineOverrides?: any[]) => {
    if (!currentApprover) return;
    setActionLoading(true);
    try {
      await api.approveAction(id, currentApprover.approver_id, lineOverrides);
      alert('Approval confirmed! Purchase order created in ERP and supplier email dispatched.');
      onBack();
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!currentApprover) return;
    setActionLoading(true);
    try {
      await api.rejectAction(id, currentApprover.approver_id, reason);
      alert('Rejection recorded with required audit justification.');
      onBack();
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
          <span>Opening fiduciary docket from archival storage...</span>
        </div>
        <LedgerSkeleton lines={6} />
      </div>
    );
  }

  if (!approvalData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <LedgerEmptyState
          title="Docket Not Located"
          description="The requested approval folio could not be found in active memory or cryptographic archives."
          folio="ERR-404"
          action={
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ledger-ink hover:bg-black text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Approval Queue</span>
            </button>
          }
        />
      </div>
    );
  }

  const draft: DraftAction = {
    action_id: approvalData.action_id,
    run_id: approvalData.run_id,
    action_type: approvalData.action_type || 'create_purchase_order',
    tool_name: approvalData.tool_name || 'create_purchase_order',
    tool_args: approvalData.tool_args || {},
    risk_class: approvalData.risk_class || 'medium',
    total_value: approvalData.total_value || 0,
    rationale: approvalData.rationale || '',
    rationale_source: approvalData.rationale_source || 'template',
    evidence_refs: approvalData.evidence_refs || [],
    check_results: approvalData.check_results || [],
    draft_status: approvalData.draft_status || 'pending_approval',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation & Archival Folio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-ledger-hairline bg-ledger-surface hover:bg-ledger-vellum text-ledger-ink text-xs font-mono tracking-wider transition-colors shadow-xs active:scale-[0.98]"
            title="Return to approval registry"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO QUEUE</span>
          </button>
          <div className="h-4 w-px bg-ledger-hairline hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
                Statutory Docket Review
              </span>
              <StampBadge
                label={approvalData.assigned_role?.replace('_', ' ') || 'STORE MANAGER'}
                variant={approvalData.assigned_role === 'regional_manager' ? 'crimson' : 'neutral'}
                size="sm"
              />
            </div>
            <h1 className="text-2xl font-serif font-bold text-ledger-ink tracking-tight">
              Fiduciary Authorization Docket
            </h1>
          </div>
        </div>

        {/* Monospace Reference Seals */}
        <div className="flex items-center gap-3 bg-ledger-vellum border border-ledger-hairline px-3 py-2 rounded-xs text-xs font-mono">
          <div>
            <span className="text-ledger-muted text-[10px] uppercase block">DOCKET</span>
            <HashBlock hash={approvalId} length="short" />
          </div>
          <div className="h-6 w-px bg-ledger-hairline" />
          <div>
            <span className="text-ledger-muted text-[10px] uppercase block">RUN ID</span>
            <HashBlock hash={runId || approvalData.run_id || ''} length="short" />
          </div>
        </div>
      </div>

      {/* Concept C Process Strip with Concept A Palette */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-ledger-hairline">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-ledger-muted uppercase tracking-widest">
              § 02. PIPELINE EXECUTION STAGES
            </span>
            <span className="text-ledger-hairline">•</span>
            <span className="font-sans text-xs text-ledger-ink font-medium">
              Stage 4: Fiduciary Governance &amp; Routing
            </span>
          </div>
          <StampBadge label="AWAITING AUTHORIZATION" variant="pending" size="sm" />
        </div>
        <PipelineStepper status="awaiting_approval" />
      </div>

      {/* Decision Card Folio Docket */}
      <DecisionCard
        approvalId={approvalId}
        assignedRole={approvalData.assigned_role}
        draft={draft}
        currentApprover={currentApprover}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={actionLoading}
      />
    </div>
  );
};
