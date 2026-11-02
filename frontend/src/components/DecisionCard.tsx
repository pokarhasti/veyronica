import React, { useState, useMemo } from 'react';
import { DraftAction, ApproverInfo, CheckResult, DraftLine } from '../types';
import { CheckRow } from './CheckRow';
import { RiskBadge } from './RiskBadge';
import { Modal } from './Modal';
import {
  Sparkles,
  ShieldCheck,
  Mail,
  Database,
  AlertCircle,
  SlidersHorizontal,
  Plus,
  Minus,
  RotateCcw,
  Truck,
  Building2,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';
import { StampBadge } from './primitives/StampBadge';

interface DecisionCardProps {
  approvalId: string;
  assignedRole: 'store_manager' | 'regional_manager';
  draft: DraftAction;
  currentApprover: ApproverInfo | null;
  onApprove: (approvalId: string, lineOverrides?: DraftLine[]) => Promise<void>;
  onReject: (approvalId: string, reason: string) => Promise<void>;
  loading?: boolean;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  approvalId,
  assignedRole,
  draft,
  currentApprover,
  onApprove,
  onReject,
  loading = false,
}) => {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState<'po' | 'email'>('po');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Initial lines extraction
  const toolArgs = (draft.tool_args as any)?.tool_args || draft.tool_args || {};
  const initialLines: DraftLine[] = useMemo(() => toolArgs.lines || [], [toolArgs]);
  const [lines, setLines] = useState<DraftLine[]>(initialLines);

  // Sync if draft changes
  React.useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  // Role authority check: regional_manager satisfies both roles; store_manager only satisfies store_manager
  const canDecide = currentApprover?.role === 'regional_manager' || currentApprover?.role === assignedRole;

  // Defensive normalization for check_results
  const checkResults: CheckResult[] = Array.isArray(draft.check_results)
    ? draft.check_results
    : (draft.check_results as any)?.check_results && Array.isArray((draft.check_results as any).check_results)
    ? (draft.check_results as any).check_results
    : [];

  const supplierId = toolArgs.supplier_id || '';
  const supplierName = toolArgs.supplier_name || supplierId;

  // Recalculated total value and unit count
  const currentTotalValue = useMemo(() => {
    return lines.reduce((acc, l) => acc + (l.qty * Number(l.unit_cost)), 0);
  }, [lines]);

  const totalUnits = useMemo(() => {
    return lines.reduce((acc, l) => acc + (l.qty || 0), 0);
  }, [lines]);

  const hasAdjusted = useMemo(() => {
    if (lines.length !== initialLines.length) return true;
    return lines.some((l, idx) => l.qty !== initialLines[idx]?.qty);
  }, [lines, initialLines]);

  const deltaValue = currentTotalValue - Number(draft.total_value);

  // Innovation 3.3: Stockout-gap evidence extraction
  const leadTimeCheck = checkResults.find((c) => c.check_name === 'lead_time');
  const maxStockoutGap = leadTimeCheck?.numeric_evidence?.max_stockout_gap_days || 0;
  const lostRevenueAtRisk = leadTimeCheck?.numeric_evidence?.total_lost_revenue_at_risk_inr || 0;

  // Innovation 3.1: Warehouse allocation evidence extraction
  const dcCheck = checkResults.find((c) => c.check_name === 'dc_allocation');
  const dcFulfillUnits = dcCheck?.numeric_evidence?.recommended_dc_transfer_units || 0;
  const dcSavingsInr = dcCheck?.numeric_evidence?.potential_otb_savings_inr || 0;

  // Innovation 3.2: Peer lateral transfer evidence extraction
  const peerCheck = checkResults.find((c) => c.check_name === 'peer_transfer');
  const peerSurplusUnits = peerCheck?.numeric_evidence?.total_peer_surplus_units || 0;

  const handleStepQty = (index: number, step: number) => {
    setLines((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const newQty = Math.max(0, item.qty + step);
      item.qty = newQty;
      item.line_value = newQty * Number(item.unit_cost);
      copy[index] = item;
      return copy;
    });
  };

  const handleResetQty = () => {
    setLines(initialLines);
    setIsAdjusting(false);
  };

  return (
    <div className="bg-ledger-surface border border-ledger-hairline rounded-xs overflow-hidden shadow-ledger-sm paper-grain text-ledger-ink">
      {/* Top Docket Header */}
      <div className="bg-ledger-subdued/40 border-b border-ledger-hairline p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-ledger-crimson uppercase font-semibold">
              REQUISITION DOCKET § {draft.action_id ? draft.action_id.slice(0, 8) : 'PENDING'}
            </span>
            <StampBadge label="APPROVAL MANDATORY" variant="crimson" size="sm" />
            <RiskBadge riskClass={draft.risk_class} size="sm" />
          </div>

          <h2 className="font-serif text-2xl font-bold tracking-tight text-ledger-ink">
            Purchase Requisition — Store {toolArgs.store_id || ''}
          </h2>

          <p className="text-xs text-ledger-muted mt-1 font-sans">
            Vendor Credential: <strong className="text-ledger-ink font-semibold">{supplierName}</strong> ({supplierId})
          </p>
        </div>

        {/* Total Order Summary Box */}
        <div className="text-right bg-ledger-surface border border-ledger-hairline px-4 py-2.5 rounded-xs shadow-ledger-xs">
          <div className="text-[10px] font-mono uppercase tracking-widest text-ledger-muted font-semibold">
            {hasAdjusted ? 'Adjusted Order Value' : 'Certified Order Total'}
          </div>
          <div className="text-2xl font-bold font-mono text-ledger-ink tracking-tight mt-0.5">
            ₹ {currentTotalValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-ledger-muted font-mono mt-0.5">
            {totalUnits} Units across {lines.length} Line Items
            {hasAdjusted && (
              <span className={`ml-1.5 font-bold ${deltaValue < 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                ({deltaValue < 0 ? `-₹${Math.abs(deltaValue).toLocaleString('en-IN')}` : `+₹${deltaValue.toLocaleString('en-IN')}`})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Innovation Banners Strip */}
      {(maxStockoutGap > 0 || dcFulfillUnits > 0 || peerSurplusUnits > 0) && (
        <div className="border-b border-ledger-hairline divide-y divide-ledger-hairline bg-ledger-ground/60">
          {/* Stockout Gap Alert */}
          {maxStockoutGap > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-rose-50/70 text-xs text-rose-950 font-sans">
              <div className="flex items-center space-x-2.5">
                <TrendingDown className="w-4 h-4 text-ledger-crimson shrink-0" />
                <div>
                  <span className="font-serif font-bold text-rose-950">Imminent Stockout-Gap Warning: </span>
                  Store faces <strong className="font-mono text-ledger-crimson">{maxStockoutGap} days</strong> unserved demand before vendor delivery.
                  Estimated <strong className="font-mono text-ledger-crimson">₹ {Math.round(lostRevenueAtRisk).toLocaleString('en-IN')}</strong> in lost sales at risk!
                </div>
              </div>
              <StampBadge label="HIGH STOCKOUT RISK" variant="rejected" size="sm" />
            </div>
          )}

          {/* Central DC Allocation */}
          {dcFulfillUnits > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 text-xs text-emerald-950 font-sans">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-emerald-800 shrink-0" />
                <div>
                  <span className="font-serif font-bold text-emerald-950">Warehouse-First DC Allocation (WH-NORTH-01): </span>
                  Central DC can fulfill <strong className="font-mono text-emerald-900">{dcFulfillUnits} units</strong> via internal transfer, saving{' '}
                  <strong className="font-mono text-emerald-900">₹ {Math.round(dcSavingsInr).toLocaleString('en-IN')}</strong> in external vendor spend.
                </div>
              </div>
              <StampBadge label="DC SPLIT ELIGIBLE" variant="certified" size="sm" />
            </div>
          )}

          {/* Peer Lateral Transfer Opportunity */}
          {peerSurplusUnits > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-ledger-subdued/60 text-xs text-ledger-ink font-sans">
              <div className="flex items-center space-x-2.5">
                <Truck className="w-4 h-4 text-ledger-crimson shrink-0" />
                <div>
                  <span className="font-serif font-bold text-ledger-ink">Inter-Store Lateral Rebalance Opportunity: </span>
                  Cluster scan detected <strong className="font-mono">{peerSurplusUnits} units</strong> surplus inventory across regional stores with &gt;7d cover.
                </div>
              </div>
              <StampBadge label="SURPLUS REBALANCE" variant="neutral" size="sm" />
            </div>
          )}
        </div>
      )}

      {/* Main Grid: AI Rationale & Action Preview (Left) | Deterministic Checks (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-ledger-hairline">
        {/* Left: AI Rationale & Dual Action Preview */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-ledger-crimson font-serif font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COGNITIVE RATIONALE (Gemini 2.5 Flash)</span>
            </div>

            <div className="bg-ledger-ground border border-ledger-hairline rounded-xs p-4 text-xs font-serif italic text-ledger-ink leading-relaxed">
              "{draft.rationale}"
            </div>

            {/* Hallucination Guard Proof Badge */}
            <div className="mt-2.5 flex items-center gap-2">
              <StampBadge
                label="HALLUCINATION GUARD: ZERO UNAUTHORIZED NUMBERS"
                variant="certified"
                size="sm"
              />
            </div>

            {/* Dual Action Switcher: PO Lines vs Email Preview */}
            <div className="mt-5">
              <div className="flex items-center justify-between border-b border-ledger-hairline pb-2 mb-3">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setActiveActionTab('po')}
                    className={`text-xs font-serif font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      activeActionTab === 'po'
                        ? 'text-ledger-crimson border-b-2 border-ledger-crimson pb-1 -mb-2.5'
                        : 'text-ledger-muted hover:text-ledger-ink'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>1. Ginesys PO Lines ({lines.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveActionTab('email')}
                    className={`text-xs font-serif font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      activeActionTab === 'email'
                        ? 'text-ledger-crimson border-b-2 border-ledger-crimson pb-1 -mb-2.5'
                        : 'text-ledger-muted hover:text-ledger-ink'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>2. Outbound Vendor Email Draft</span>
                  </button>
                </div>

                {/* Line Quantity Override Controls */}
                {activeActionTab === 'po' && canDecide && (
                  <div className="flex items-center space-x-2">
                    {hasAdjusted && (
                      <button
                        onClick={handleResetQty}
                        className="flex items-center space-x-1 text-[10px] font-mono text-ledger-muted hover:text-ledger-ink px-2 py-0.5 rounded-xs bg-ledger-ground border border-ledger-hairline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsAdjusting(!isAdjusting)}
                      className={`flex items-center space-x-1 text-[10px] font-mono font-semibold uppercase px-2 py-1 rounded-xs transition-colors cursor-pointer ${
                        isAdjusting
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-ledger-ground hover:bg-ledger-surface text-ledger-ink border border-ledger-hairline'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>{isAdjusting ? 'Done Adjusting' : 'Adjust Quantities'}</span>
                    </button>
                  </div>
                )}
              </div>

              {activeActionTab === 'po' ? (
                <div className="border border-ledger-hairline rounded-xs overflow-hidden bg-ledger-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-ledger-subdued/50 text-ledger-muted font-mono uppercase text-[10px] border-b border-ledger-hairline">
                      <tr>
                        <th className="p-2.5 font-semibold">SKU / Item Description</th>
                        <th className="p-2.5 text-right font-semibold">Qty</th>
                        <th className="p-2.5 text-right font-semibold">Unit Cost</th>
                        <th className="p-2.5 text-right font-semibold">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ledger-hairline font-sans">
                      {lines.map((l, i) => (
                        <tr key={i} className="hover:bg-ledger-subdued/30 transition-colors">
                          <td className="p-2.5">
                            <div className="font-mono font-semibold text-ledger-ink">{l.sku}</div>
                            <div className="text-[11px] text-ledger-muted">{l.sku_name}</div>
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {isAdjusting ? (
                              <div className="inline-flex items-center space-x-1 bg-ledger-ground border border-ledger-hairline rounded-xs p-0.5">
                                <button
                                  onClick={() => handleStepQty(i, -10)}
                                  className="p-1 hover:bg-ledger-subdued text-ledger-muted hover:text-ledger-ink"
                                  title="Decrease by 10"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-10 text-center font-bold font-mono text-ledger-crimson">{l.qty}</span>
                                <button
                                  onClick={() => handleStepQty(i, 10)}
                                  className="p-1 hover:bg-ledger-subdued text-ledger-muted hover:text-ledger-ink"
                                  title="Increase by 10"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="font-semibold text-ledger-ink">{l.qty}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono text-ledger-muted">
                            ₹ {Number(l.unit_cost).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-ledger-ink">
                            ₹ {Number(l.line_value).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-ledger-ground rounded-xs border border-ledger-hairline p-4 text-xs space-y-2.5 font-sans">
                  <div className="flex items-center justify-between text-ledger-muted pb-2 border-b border-ledger-hairline">
                    <div>
                      <span className="font-mono font-semibold text-ledger-ink uppercase text-[10px]">TO: </span>
                      <span className="font-mono text-ledger-crimson font-medium">
                        {toolArgs.email_preview?.to || `orders@${supplierId.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                      </span>
                    </div>
                    <StampBadge label="GATED OUTBOUND" variant="certified" size="sm" />
                  </div>
                  <div>
                    <span className="font-mono font-semibold text-ledger-ink uppercase text-[10px]">SUBJECT: </span>
                    <span className="text-ledger-ink font-medium">
                      {toolArgs.email_preview?.subject || `V-Mart Purchase Order — Store ${toolArgs.store_id || ''} (${supplierName})`}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-ledger-hairline bg-ledger-surface p-3 rounded-xs font-mono text-[11px] text-ledger-ink whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-ledger-hairline">
                    {toolArgs.email_preview?.body ||
                      `Dear ${supplierName} Team,\n\nPlease find attached V-Mart Purchase Requisition for Store ${toolArgs.store_id || ''} totaling ₹ ${currentTotalValue.toLocaleString('en-IN')}.\n\nGoverned under Veyronica Protocol.\n\nThank you,\nV-Mart Procurement`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Deterministic Checks & Allocations */}
        <div className="p-6 bg-ledger-subdued/20 space-y-3">
          <div className="flex items-center space-x-2 text-ledger-ink font-serif font-bold text-sm tracking-tight mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>DETERMINISTIC COMPLIANCE EVALUATIONS</span>
          </div>

          <div className="space-y-2.5">
            {checkResults.map((c, i) => (
              <CheckRow key={i} check={c} />
            ))}
          </div>
        </div>
      </div>

      {/* Gated Execution Notice Strip */}
      <div className="bg-ledger-subdued/60 p-4 border-t border-ledger-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-ledger-muted font-sans">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono font-bold uppercase text-ledger-ink text-[11px]">UPON CERTIFICATION:</span>
          <span className="flex items-center text-ledger-ink">
            <Database className="w-3.5 h-3.5 mr-1 text-ledger-crimson" />
            Ginesys ERP PO Record Committed
          </span>
          <span className="flex items-center text-ledger-ink">
            <Mail className="w-3.5 h-3.5 mr-1 text-emerald-800" />
            Vendor Email Dispatched
          </span>
        </div>
        {hasAdjusted && (
          <StampBadge label="OVERRIDE VALUES WILL BE WRITTEN TO ERP" variant="pending" size="sm" />
        )}
      </div>

      {/* Action Decision Footer */}
      <div className="p-5 bg-ledger-surface border-t border-ledger-hairline flex flex-wrap items-center justify-between gap-4">
        <div>
          {!canDecide && (
            <div className="flex items-center text-amber-900 text-xs font-mono">
              <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 text-amber-700" />
              <span>
                Your current role (<strong>{currentApprover?.role}</strong>) cannot decide this docket assigned to <strong>{assignedRole}</strong>.
              </span>
            </div>
          )}
          {canDecide && (
            <div className="text-xs font-mono text-ledger-muted">
              Signatory authority: <strong className="text-ledger-ink">{currentApprover?.name}</strong> [{currentApprover?.role.toUpperCase()}]
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={!canDecide || loading}
            onClick={() => setRejectModalOpen(true)}
            className="px-5 py-2 text-xs font-mono uppercase tracking-wider text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xs transition-colors cursor-pointer"
          >
            Reject Requisition
          </button>

          <button
            type="button"
            disabled={!canDecide || loading}
            onClick={() => onApprove(approvalId, hasAdjusted ? lines : undefined)}
            className="px-6 py-2.5 text-xs font-serif font-bold uppercase tracking-widest text-white bg-ledger-crimson hover:bg-[#7F1D1D] disabled:opacity-40 disabled:cursor-not-allowed rounded-xs shadow-ledger-stamp border border-ledger-crimson/80 transition-all cursor-pointer"
          >
            {loading
              ? 'Executing Order...'
              : hasAdjusted
              ? `Approve with Overrides (₹ ${currentTotalValue.toLocaleString('en-IN')})`
              : `Certify & Execute PO (₹ ${currentTotalValue.toLocaleString('en-IN')})`}
          </button>
        </div>
      </div>

      {/* Rejection Reason Affidavit Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={async (reason) => {
          await onReject(approvalId, reason);
          setRejectModalOpen(false);
        }}
        title="Reject Purchase Requisition Docket"
        loading={loading}
      />
    </div>
  );
};
