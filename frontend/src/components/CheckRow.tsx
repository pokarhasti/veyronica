import React, { useState } from 'react';
import { CheckResult } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import { StampBadge } from './primitives/StampBadge';
import { LedgerRow } from './primitives/LedgerRow';

interface CheckRowProps {
  check: CheckResult;
}

export const CheckRow: React.FC<CheckRowProps> = ({ check }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (status: 'PASS' | 'FLAG' | 'FAIL') => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />;
      case 'FLAG':
        return <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />;
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-ledger-crimson shrink-0" />;
    }
  };

  const getStatusBadge = (status: 'PASS' | 'FLAG' | 'FAIL') => {
    switch (status) {
      case 'PASS':
        return <StampBadge label="CERTIFIED PASS" variant="certified" size="sm" />;
      case 'FLAG':
        return <StampBadge label="AUDIT FLAG" variant="pending" size="sm" />;
      case 'FAIL':
        return <StampBadge label="BREACH FAIL" variant="rejected" size="sm" />;
    }
  };

  const formatName = (name: string) => {
    switch (name) {
      case 'moq':
        return 'Minimum Order Quantity (MOQ) Constraint';
      case 'lead_time':
        return 'Lead Time & Stockout Gap Loss Evaluation';
      case 'budget_headroom':
        return 'Open-To-Buy (OTB) Store Budget Headroom';
      case 'credit_limit':
        return 'Supplier Fiduciary Credit Limit Threshold';
      case 'dc_allocation':
        return 'Central Warehouse-First DC Allocation (WH-NORTH-01)';
      case 'peer_transfer':
        return 'Inter-Store Lateral Transfer Verification';
      default:
        return name.replace(/_/g, ' ').toUpperCase();
    }
  };

  const evidenceEntries = check.numeric_evidence && typeof check.numeric_evidence === 'object'
    ? Object.entries(check.numeric_evidence)
    : [];

  return (
    <div className="border border-ledger-hairline rounded-xs overflow-hidden bg-ledger-surface hover:bg-ledger-subdued/20 transition-colors shadow-ledger-xs">
      <div
        className="p-3.5 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-7 h-7 rounded-xs bg-ledger-ground border border-ledger-hairline flex items-center justify-center shrink-0">
            {getStatusIcon(check.status)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif font-bold text-sm text-ledger-ink tracking-tight">
                {formatName(check.check_name)}
              </span>
              {getStatusBadge(check.status)}
            </div>
            <p className="text-xs text-ledger-muted mt-0.5 font-sans leading-normal">
              {check.reason}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-ledger-muted hover:text-ledger-ink p-1 rounded transition-colors shrink-0 ml-3"
          aria-label="Toggle evidence details"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-ledger-subdued/40 border-t border-ledger-hairline">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-semibold text-ledger-crimson uppercase tracking-widest flex items-center gap-1.5">
              <FileCode className="w-3 h-3" />
              <span>DETERMINISTIC NUMERIC EVIDENCE (PYTHON CODE-EVALUATED)</span>
            </span>
          </div>

          {evidenceEntries.length > 0 ? (
            <div className="border border-ledger-hairline bg-ledger-surface p-3 rounded-xs space-y-0.5">
              {evidenceEntries.map(([k, v]) => (
                <LedgerRow
                  key={k}
                  label={k.replace(/_/g, ' ')}
                  value={
                    typeof v === 'number'
                      ? v > 1000
                        ? `₹ ${v.toLocaleString('en-IN')}`
                        : v
                      : typeof v === 'boolean'
                      ? v ? 'TRUE [PASS]' : 'FALSE [FAIL]'
                      : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v)
                  }
                />
              ))}
            </div>
          ) : (
            <pre className="text-[11px] text-ledger-ink font-mono bg-ledger-surface p-3 rounded-xs border border-ledger-hairline overflow-x-auto">
              {JSON.stringify(check.numeric_evidence, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
