import React, { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { StampBadge } from './primitives/StampBadge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  title: string;
  loading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit, title, loading }) => {
  const [reason, setReason] = useState('');
  const minLength = 20;
  const isValid = reason.trim().length >= minLength;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs max-w-lg w-full p-6 shadow-ledger-md paper-grain relative text-ledger-ink animate-stamp-press">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close rejection affidavit"
          className="absolute top-4 right-4 text-ledger-faint hover:text-ledger-crimson p-1 rounded-xs transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Folio Header */}
        <div className="border-b border-ledger-hairline pb-3 mb-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-ledger-crimson font-semibold mb-0.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>AFFIDAVIT § REJECTION FILING DOCKET</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-ledger-ink tracking-tight">{title}</h3>
          <p className="text-xs text-ledger-muted mt-1 leading-relaxed font-sans">
            Under V-Mart governance policy, rejecting a replenishment requisition requires an explicit, immutable justification of at least {minLength} characters entered into the cryptographic audit log.
          </p>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <label htmlFor="rejection-reason" className="block text-[11px] font-mono uppercase tracking-wider text-ledger-muted font-semibold">
            Fiduciary Justification Statement:
          </label>
          <textarea
            id="rejection-reason"
            className="w-full bg-ledger-ground border border-ledger-hairline rounded-xs p-3 text-xs font-mono text-ledger-ink placeholder:text-ledger-faint focus:outline-none focus:border-ledger-crimson focus:ring-1 focus:ring-ledger-crimson/30 h-28 resize-none leading-relaxed"
            placeholder="e.g., Order quantity is too high for current shelf capacity; supplier stock lead time conflicts with promotional schedule..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />

          <div className="flex items-center justify-between text-xs font-mono">
            <span className={isValid ? 'text-emerald-800 font-semibold' : 'text-amber-800'}>
              [ {reason.trim().length} / {minLength} MINIMUM CHARACTERS ]
            </span>
            {!isValid ? (
              <span className="flex items-center text-amber-800 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Reason requires {minLength - reason.trim().length} more characters
              </span>
            ) : (
              <span className="flex items-center text-emerald-800 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Justification Validated
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-ledger-hairline flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-ledger-muted hover:text-ledger-ink bg-ledger-ground hover:bg-ledger-surface border border-ledger-hairline rounded-xs transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            disabled={!isValid || loading}
            onClick={() => onSubmit(reason)}
            className="px-5 py-2 text-xs font-serif font-bold uppercase tracking-widest text-white bg-ledger-crimson hover:bg-[#7F1D1D] disabled:opacity-40 disabled:cursor-not-allowed rounded-xs shadow-ledger-stamp border border-ledger-crimson/80 transition-all cursor-pointer"
          >
            {loading ? 'Filing Rejection...' : 'Stamp Rejection Docket'}
          </button>
        </div>
      </div>
    </div>
  );
};
