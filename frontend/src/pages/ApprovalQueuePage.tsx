import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ApprovalRequest, ApproverInfo } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { StampBadge, LedgerEmptyState, LedgerSkeleton, HashBlock } from '../components/primitives';
import { ArrowRight, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

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
      {/* Header Folio */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-xs bg-ledger-crimson inline-block" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
              Fiduciary Authorization Registry
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ledger-ink tracking-tight">
            Pending Approval Queue
          </h1>
          <p className="text-xs text-ledger-muted mt-1 font-sans">
            Gated purchase orders requiring statutory authorization prior to autonomous ERP commit.
          </p>
        </div>

        {/* Role-scoped docket filter */}
        <div className="flex items-center space-x-1.5 bg-ledger-vellum p-1 rounded-xs border border-ledger-hairline text-xs font-mono">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xs transition-colors tracking-wide ${
              roleFilter === 'all'
                ? 'bg-ledger-ink text-white shadow-xs font-bold'
                : 'text-ledger-muted hover:text-ledger-ink'
            }`}
          >
            All Pending ({approvals.length})
          </button>
          <button
            onClick={() => setRoleFilter('store_manager')}
            className={`px-3 py-1.5 rounded-xs transition-colors tracking-wide ${
              roleFilter === 'store_manager'
                ? 'bg-ledger-ink text-white shadow-xs font-bold'
                : 'text-ledger-muted hover:text-ledger-ink'
            }`}
          >
            Store Manager
          </button>
          <button
            onClick={() => setRoleFilter('regional_manager')}
            className={`px-3 py-1.5 rounded-xs transition-colors tracking-wide ${
              roleFilter === 'regional_manager'
                ? 'bg-ledger-ink text-white shadow-xs font-bold'
                : 'text-ledger-muted hover:text-ledger-ink'
            }`}
          >
            Regional Manager
          </button>
        </div>
      </div>

      {/* Queue Docket Table */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs overflow-hidden shadow-xs">
        {loading && approvals.length === 0 ? (
          <div className="p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-ledger-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-ledger-ink" />
              <span>Fetching pending dockets from immutable ledger...</span>
            </div>
            <LedgerSkeleton lines={4} />
          </div>
        ) : approvals.length === 0 ? (
          <div className="py-16 px-4">
            <LedgerEmptyState
              title="Fiduciary Queue Clear"
              description="All replenishment orders have been authorized, rejected, or auto-committed under deterministic governance rules."
              folio="QUEUE CLEARED"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ledger-vellum border-b border-ledger-hairline text-ledger-muted font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Fiduciary Action &amp; Origin</th>
                  <th className="py-3 px-4 font-semibold">Assigned Role</th>
                  <th className="py-3 px-4 font-semibold">Risk Classification</th>
                  <th className="py-3 px-4 font-semibold text-right">Commitment Value</th>
                  <th className="py-3 px-4 font-semibold">Docket Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-hairline">
                {approvals.map((a) => {
                  const canDecide =
                    currentApprover?.role === 'regional_manager' ||
                    currentApprover?.role === a.assigned_role;

                  return (
                    <tr
                      key={a.approval_id}
                      className="hover:bg-ledger-vellum/50 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-ledger-muted mt-0.5 shrink-0" />
                          <div>
                            <div className="font-serif font-bold text-ledger-ink text-sm">
                              Create Purchase Order
                            </div>
                            <div className="text-ledger-muted font-mono text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>Docket:</span>
                              <HashBlock hash={a.approval_id} length="short" />
                              <span className="text-ledger-hairline">•</span>
                              <span>Run:</span>
                              <HashBlock hash={a.run_id} length="short" />
                              <span className="text-ledger-hairline">•</span>
                              <span className="font-sans text-ledger-ink">
                                {a.tool_args?.supplier_name || a.tool_args?.supplier_id || 'Primary Supplier'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StampBadge
                          label={a.assigned_role.replace('_', ' ')}
                          variant={a.assigned_role === 'regional_manager' ? 'crimson' : 'neutral'}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <RiskBadge riskClass={a.risk_class || 'low'} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-ledger-ink">
                          ₹{Number(a.total_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-ledger-muted whitespace-nowrap">
                        {new Date(a.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectApproval(a.approval_id, a.run_id)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold uppercase tracking-wider text-white bg-ledger-ink hover:bg-black shadow-xs transition-all active:scale-[0.98]"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
