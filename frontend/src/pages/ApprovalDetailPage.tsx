import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApproverInfo, DraftAction } from '../types';
import { DecisionCard } from '../components/DecisionCard';
import { ArrowLeft, RefreshCw } from 'lucide-react';

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

  const handleApprove = async (id: string) => {
    if (!currentApprover) return;
    setActionLoading(true);
    try {
      await api.approveAction(id, currentApprover.approver_id);
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
      <div className="max-w-7xl mx-auto p-12 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
        <span>Loading decision details...</span>
      </div>
    );
  }

  if (!approvalData) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="text-rose-400 mb-4">Approval record not found</div>
        <button onClick={onBack} className="text-indigo-400 hover:underline">
          ← Back to Queue
        </button>
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
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Decision Review</h1>
          <p className="text-xs text-slate-400">
            Approval ID: <span className="font-mono text-indigo-300">{approvalId.slice(0, 8)}...</span>
          </p>
        </div>
      </div>

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
