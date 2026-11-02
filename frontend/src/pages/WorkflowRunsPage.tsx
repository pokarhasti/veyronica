import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { RunSummary } from '../types';
import { StampBadge, HashBlock, LedgerEmptyState, LedgerSkeleton } from '../components/primitives';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

interface WorkflowRunsPageProps {
  onNavigateToRun: (runId: string) => void;
  onNavigateToQueue: () => void;
}

const STORE_LABELS: Record<string, string> = {
  'STORE-087': 'Lucknow Gomtinagar',
  'STORE-214': 'Jaipur Vaishali Nagar',
  'STORE-312': 'Patna Boring Road',
};

export const WorkflowRunsPage: React.FC<WorkflowRunsPageProps> = ({
  onNavigateToRun,
  onNavigateToQueue,
}) => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const storeParam = selectedStore === 'all' ? undefined : selectedStore;
      const statusParam = selectedStatus === 'all' ? undefined : selectedStatus;
      const data = await api.getRuns(storeParam, statusParam, 100);
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [selectedStore, selectedStatus]);

  // Client-side search filtering
  const filteredRuns = useMemo(() => {
    let result = runs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.run_id.toLowerCase().includes(q) ||
          r.correlation_id.toLowerCase().includes(q) ||
          r.store_id.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    return result;
  }, [runs, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, currentPage, pageSize]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = runs.length;
    const awaiting = runs.filter((r) => r.status === 'awaiting_approval').length;
    const completed = runs.filter((r) => r.status === 'completed').length;
    const running = runs.filter((r) => r.status === 'running').length;
    const prepTimes = runs.filter((r) => r.agent_prep_ms && r.agent_prep_ms > 0).map((r) => r.agent_prep_ms!);
    const avgPrep = prepTimes.length ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0;
    return { total, awaiting, completed, running, avgPrep };
  }, [runs]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Folio Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-ledger-hairline">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-xs bg-ledger-ink inline-block" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted">
              Transaction Chronology &amp; Execution Audit
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ledger-ink tracking-tight">
            Workflow Execution Runs
          </h1>
          <p className="text-xs text-ledger-muted mt-1 font-sans">
            Cryptographic audit ledger and real-time state of all autonomous replenishment cycles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchRuns()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ledger-surface hover:bg-ledger-vellum border border-ledger-hairline rounded-xs text-xs font-mono font-medium text-ledger-ink transition-colors shadow-xs active:scale-[0.98]"
            title="Refresh execution register"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-ledger-ink' : 'text-ledger-muted'}`} />
            <span>REFRESH</span>
          </button>
          {stats.awaiting > 0 && (
            <button
              onClick={onNavigateToQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-800/40 text-amber-900 rounded-xs text-xs font-mono font-semibold transition-colors shadow-xs active:scale-[0.98]"
            >
              <Clock className="w-3.5 h-3.5 text-amber-800" />
              <span>{stats.awaiting} AWAITING AUTHORIZATION</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Ledger Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-semibold">
            Total Pipeline Runs
          </div>
          <div className="font-serif text-2xl font-bold text-ledger-ink mt-1">
            {stats.total}
          </div>
          <div className="text-[11px] font-mono text-ledger-muted mt-0.5">
            Across 3 active stores
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-800 font-semibold">
            Awaiting Authorization
          </div>
          <div className="font-serif text-2xl font-bold text-amber-900 mt-1">
            {stats.awaiting}
          </div>
          <div className="text-[11px] font-mono text-amber-800/80 mt-0.5">
            HITL gated execution
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-800 font-semibold">
            Fully Dispatched
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-900 mt-1">
            {stats.completed}
          </div>
          <div className="text-[11px] font-mono text-emerald-800/80 mt-0.5">
            Committed to ERP &amp; email
          </div>
        </div>

        <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-4 shadow-xs">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ledger-muted font-semibold">
            Agent Prep Latency
          </div>
          <div className="font-serif text-2xl font-bold text-ledger-ink mt-1">
            {stats.avgPrep > 0 ? `${stats.avgPrep} ms` : '—'}
          </div>
          <div className="text-[11px] font-mono text-ledger-muted mt-0.5">
            Signal → Constraint → Draft
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs p-3 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ledger-muted" />
          <input
            type="text"
            placeholder="Search by Run ID, Correlation, store ID, or status..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-ledger-vellum border border-ledger-hairline rounded-xs pl-8 pr-3 py-1.5 text-xs font-mono text-ledger-ink placeholder:text-ledger-muted focus:outline-none focus:border-ledger-ink transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <div className="flex items-center space-x-1.5 bg-ledger-vellum border border-ledger-hairline rounded-xs px-2.5 py-1.5 text-xs font-mono">
            <span className="text-ledger-muted text-[10px] uppercase font-bold">STORE:</span>
            <select
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-ledger-ink font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Stores</option>
              <option value="STORE-087">STORE-087 (Lucknow)</option>
              <option value="STORE-214">STORE-214 (Jaipur)</option>
              <option value="STORE-312">STORE-312 (Patna)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-ledger-vellum border border-ledger-hairline rounded-xs px-2.5 py-1.5 text-xs font-mono">
            <span className="text-ledger-muted text-[10px] uppercase font-bold">STATUS:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-ledger-ink font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Runs Table Ledger */}
      <div className="bg-ledger-surface border border-ledger-hairline rounded-xs overflow-hidden shadow-xs">
        {paginatedRuns.length === 0 ? (
          <div className="py-12 px-4">
            <LedgerEmptyState
              title="No Execution Records Found"
              description={
                searchQuery || selectedStore !== 'all' || selectedStatus !== 'all'
                  ? 'No matching journal entries found. Try clearing your filters or search term.'
                  : 'No replenishment cycles have been executed yet. Trigger a run from the daily dispatch broadsheet.'
              }
              folio="EMPTY JOURNAL"
              action={
                (searchQuery || selectedStore !== 'all' || selectedStatus !== 'all') ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedStore('all');
                      setSelectedStatus('all');
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-ledger-ink text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors"
                  >
                    Clear All Filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ledger-vellum border-b border-ledger-hairline text-ledger-muted font-mono text-[10px] uppercase tracking-wider select-none">
                  <th className="py-3 px-4 font-semibold">Run ID / Correlation</th>
                  <th className="py-3 px-4 font-semibold">Store Location</th>
                  <th className="py-3 px-4 font-semibold">Workflow Status</th>
                  <th className="py-3 px-4 font-semibold">Agent Prep</th>
                  <th className="py-3 px-4 font-semibold">Approval Wait</th>
                  <th className="py-3 px-4 font-semibold">Started At</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-hairline">
                {paginatedRuns.map((r) => {
                  let badgeVariant: 'certified' | 'pending' | 'rejected' | 'neutral' | 'crimson' = 'neutral';
                  if (r.status === 'completed') badgeVariant = 'certified';
                  else if (r.status === 'awaiting_approval') badgeVariant = 'pending';
                  else if (r.status === 'rejected') badgeVariant = 'rejected';
                  else if (r.status === 'failed') badgeVariant = 'crimson';

                  return (
                    <tr
                      key={r.run_id}
                      onClick={() => onNavigateToRun(r.run_id)}
                      className="hover:bg-ledger-vellum/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <HashBlock hash={r.run_id} length="short" />
                        </div>
                        <div className="text-[10px] font-mono text-ledger-muted mt-0.5">
                          corr: {r.correlation_id ? r.correlation_id.slice(0, 16) : '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-serif font-bold text-ledger-ink text-sm">
                          {STORE_LABELS[r.store_id] || r.store_id}
                        </div>
                        <div className="text-[10px] font-mono text-ledger-muted mt-0.5">
                          STORE REF: {r.store_id}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StampBadge
                          label={r.status.replace('_', ' ').toUpperCase()}
                          variant={badgeVariant}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-ledger-ink">
                        {r.agent_prep_ms !== undefined && r.agent_prep_ms !== null ? (
                          <span className="font-semibold">{r.agent_prep_ms} ms</span>
                        ) : (
                          <span className="text-ledger-muted">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        {r.approval_wait_ms !== undefined && r.approval_wait_ms !== null ? (
                          <span className="text-ledger-ink">
                            {r.approval_wait_ms > 1000
                              ? `${(r.approval_wait_ms / 1000).toFixed(1)}s`
                              : `${r.approval_wait_ms} ms`}
                          </span>
                        ) : r.status === 'awaiting_approval' ? (
                          <span className="text-amber-800 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>IN QUEUE</span>
                          </span>
                        ) : (
                          <span className="text-ledger-muted">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-ledger-muted text-[11px]">
                        <div>{new Date(r.started_at).toLocaleDateString()}</div>
                        <div className="text-[10px]">
                          {new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToRun(r.run_id);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xs text-xs font-mono font-semibold uppercase tracking-wider text-white bg-ledger-ink hover:bg-black transition-all shadow-xs active:scale-[0.98]"
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

        {/* Pagination Footer */}
        {filteredRuns.length > pageSize && (
          <div className="py-3 px-4 bg-ledger-vellum border-t border-ledger-hairline flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-ledger-muted">
            <div>
              Showing <span className="text-ledger-ink font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="text-ledger-ink font-bold">
                {Math.min(currentPage * pageSize, filteredRuns.length)}
              </span>{' '}
              of <span className="text-ledger-ink font-bold">{filteredRuns.length}</span> folio records
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-xs border border-ledger-hairline bg-ledger-surface hover:bg-ledger-vellum disabled:opacity-30 disabled:cursor-not-allowed text-ledger-ink transition-colors shadow-xs"
                title="Previous folio page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-medium text-ledger-ink">
                FOLIO {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-xs border border-ledger-hairline bg-ledger-surface hover:bg-ledger-vellum disabled:opacity-30 disabled:cursor-not-allowed text-ledger-ink transition-colors shadow-xs"
                title="Next folio page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
