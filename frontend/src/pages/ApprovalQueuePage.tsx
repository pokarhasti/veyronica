import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApprovalRequest, ApproverInfo } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { Inbox, ArrowRight, RefreshCw, UserCheck } from 'lucide-react';

interface ApprovalQueuePageProps {
  currentApprover: ApproverInfo | null;
  onSelectApproval: (approvalId: string, runId: string) => void;
}

export const ApprovalQueuePage: React.FC<ApprovalQueuePageProps> = ({
  currentApprover,
  onSelectApproval,
}) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'store_manager' | 'regional_manager'>('all');

  const fetchQueue = async () => {
    try {
      const data = await api.getPendingApprovals(roleFilter === 'all' ? undefined : roleFilter);
      setApprovals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [roleFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Pending Approval Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gated purchase orders requiring human authorization prior to ERP write.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              roleFilter === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Pending ({approvals.length})
          </button>
          <button
            onClick={() => setRoleFilter('store_manager')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              roleFilter === 'store_manager'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Store Manager
          </button>
          <button
            onClick={() => setRoleFilter('regional_manager')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              roleFilter === 'regional_manager'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Regional Manager
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading && approvals.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-400" />
            <span>Loading pending approvals...</span>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h3 className="text-base font-bold text-slate-300">Approval Queue Empty</h3>
            <p className="text-xs text-slate-500 mt-1">
              All replenishment orders have been approved, rejected, or auto-approved.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Action</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Risk Class</th>
                <th className="p-4 text-right">Order Value</th>
                <th className="p-4">Requested</th>
                <th className="p-4 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {approvals.map((a) => {
                const canDecide =
                  currentApprover?.role === 'regional_manager' ||
                  currentApprover?.role === a.assigned_role;

                return (
                  <tr key={a.approval_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200 text-sm">
                        Create Purchase Order
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        Run: {a.run_id.slice(0, 8)}... • Supplier: {a.tool_args?.supplier_name || a.tool_args?.supplier_id || 'SUP'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="capitalize px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800 font-medium">
                        {a.assigned_role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <RiskBadge riskClass={a.risk_class || 'low'} />
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ₹{Number(a.total_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(a.requested_at).toLocaleTimeString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onSelectApproval(a.approval_id, a.run_id)}
                        className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-950/50 transition-colors"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
