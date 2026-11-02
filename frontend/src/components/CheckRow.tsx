import React, { useState } from 'react';
import { CheckResult } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface CheckRowProps {
  check: CheckResult;
}

export const CheckRow: React.FC<CheckRowProps> = ({ check }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = (status: 'PASS' | 'FLAG' | 'FAIL') => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'FLAG':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status: 'PASS' | 'FLAG' | 'FAIL') => {
    switch (status) {
      case 'PASS':
        return <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">PASS</span>;
      case 'FLAG':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">FLAG</span>;
      case 'FAIL':
        return <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">FAIL</span>;
    }
  };

  const formatName = (name: string) => {
    switch (name) {
      case 'moq':
        return 'MOQ Check';
      case 'lead_time':
        return 'Lead Time Check';
      case 'budget_headroom':
        return 'Store Budget Headroom';
      case 'credit_limit':
        return 'Supplier Credit Limit';
      default:
        return name;
    }
  };

  return (
    <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-900/40 hover:bg-slate-900/70 transition-colors">
      <div
        className="p-3.5 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          {getStatusIcon(check.status)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm text-slate-200">{formatName(check.check_name)}</span>
              {getStatusBadge(check.status)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{check.reason}</p>
          </div>
        </div>
        <button
          type="button"
          className="text-slate-500 hover:text-slate-300 p-1 rounded"
          aria-label="Toggle evidence"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-slate-950/70 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Numeric Evidence (Computed by code)
            </span>
          </div>
          <pre className="text-xs text-indigo-300 font-mono bg-slate-900/90 p-2.5 rounded border border-slate-800 overflow-x-auto">
            {JSON.stringify(check.numeric_evidence, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
