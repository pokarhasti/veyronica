import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-xs text-slate-400 mb-4">
          Under V-Mart governance policy, rejecting a replenishment order requires an explicit, auditable reason of at least 20 characters.
        </p>

        <div className="space-y-3">
          <textarea
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-28 resize-none"
            placeholder="e.g., Order quantity is too high for current shelf capacity; supplier stock lead time conflicts with weekend sale..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex items-center justify-between text-xs">
            <span className={isValid ? 'text-emerald-400' : 'text-amber-400'}>
              {reason.trim().length} / {minLength} minimum characters
            </span>
            {!isValid && (
              <span className="flex items-center text-amber-400/90">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Reason too short
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || loading}
            onClick={() => onSubmit(reason)}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-rose-950/50 transition-colors"
          >
            {loading ? 'Submitting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
};
