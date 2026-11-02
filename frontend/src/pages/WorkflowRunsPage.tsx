import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { RunSummary } from '../types';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface WorkflowRunsPageProps {
  onNavigateToRun: (runId: string) => void;
  onNavigateToQueue: () => void;
}

const STORE_LABELS: Record<string, string> = {
  'STORE-087': 'STORE-087 (Lucknow Gomtinagar)',
  'STORE-214': 'STORE-214 (Jaipur Vaishali)',
  'STORE-312': 'STORE-312 (Patna Boring Road)',
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-950/70 border border-indigo-800 rounded-lg text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Workflow Execution Runs</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Full historical audit and real-time state of all autonomous replenishment cycles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchRuns()}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
          {stats.awaiting > 0 && (
            <button
              onClick={onNavigateToQueue}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold transition-colors"
            >
              <span>{stats.awaiting} Awaiting Approval</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400">Total Runs</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all V-Mart stores</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-amber-400">Awaiting Approval</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{stats.awaiting}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">HITL Gated Execution</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-emerald-400">Completed</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.completed}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Dispatched to ERP</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-indigo-400">Avg Agent Prep Latency</div>
          <div className="text-2xl font-bold text-indigo-300 mt-1">
            {stats.avgPrep > 0 ? `${stats.avgPrep}ms` : '—'}
          </div>
          <div className="text-[11px] text-indigo-400/80 mt-0.5">Signal → Constraint → Draft</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Run ID, Correlation ID, or store..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Store Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Store:</span>
            <select
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Stores</option>
              <option value="STORE-087" className="bg-slate-900 text-slate-200">STORE-087 (Lucknow)</option>
              <option value="STORE-214" className="bg-slate-900 text-slate-200">STORE-214 (Jaipur)</option>
              <option value="STORE-312" className="bg-slate-900 text-slate-200">STORE-312 (Patna)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Statuses</option>
              <option value="running" className="bg-slate-900 text-slate-200">Running</option>
              <option value="awaiting_approval" className="bg-slate-900 text-slate-200">Awaiting Approval</option>
              <option value="completed" className="bg-slate-900 text-slate-200">Completed</option>
              <option value="rejected" className="bg-slate-900 text-slate-200">Rejected</option>
              <option value="failed" className="bg-slate-900 text-slate-200">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {paginatedRuns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No workflow runs found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedStore !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search query or filters to find what you are looking for.'
                : 'No workflow runs exist yet. Trigger replenishment from the Home screen.'}
            </p>
            {(searchQuery || selectedStore !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStore('all');
                  setSelectedStatus('all');
                  setCurrentPage(1);
                }}
                className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 select-none">
                <tr>
                  <th className="p-3.5 font-semibold">Run ID / Correlation</th>
                  <th className="p-3.5 font-semibold">Store Location</th>
                  <th className="p-3.5 font-semibold">Workflow Status</th>
                  <th className="p-3.5 font-semibold">Agent Prep</th>
                  <th className="p-3.5 font-semibold">Approval Wait</th>
                  <th className="p-3.5 font-semibold">Started At</th>
                  <th className="p-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedRuns.map((r) => (
                  <tr
                    key={r.run_id}
                    onClick={() => onNavigateToRun(r.run_id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="font-mono text-indigo-300 font-medium">
                        {r.run_id.slice(0, 8)}...{r.run_id.slice(-4)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        corr: {r.correlation_id ? r.correlation_id.slice(0, 16) : '—'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-200">
                        {STORE_LABELS[r.store_id] || r.store_id}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">ID: {r.store_id}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          r.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : r.status === 'awaiting_approval'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse'
                            : r.status === 'rejected'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                            : r.status === 'failed'
                            ? 'bg-red-950/60 text-red-300 border-red-800'
                            : 'bg-indigo-950/60 text-indigo-300 border-indigo-800'
                        }`}
                      >
                        {r.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {r.status === 'awaiting_approval' && <Clock className="w-3 h-3 text-amber-400" />}
                        {r.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
                        {r.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                        {r.status === 'running' && <Activity className="w-3 h-3 text-indigo-400 animate-spin" />}
                        <span>{r.status.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {r.agent_prep_ms !== undefined && r.agent_prep_ms !== null ? (
                        <span className="text-slate-200 font-semibold">{r.agent_prep_ms} ms</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {r.approval_wait_ms !== undefined && r.approval_wait_ms !== null ? (
                        <span className="text-slate-200">
                          {r.approval_wait_ms > 1000
                            ? `${(r.approval_wait_ms / 1000).toFixed(1)}s`
                            : `${r.approval_wait_ms} ms`}
                        </span>
                      ) : r.status === 'awaiting_approval' ? (
                        <span className="text-amber-400 font-semibold flex items-center space-x-1">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>In Queue</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      <div>{new Date(r.started_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(r.started_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToRun(r.run_id);
                        }}
                        className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredRuns.length > pageSize && (
          <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-slate-200 font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="text-slate-200 font-semibold">
                {Math.min(currentPage * pageSize, filteredRuns.length)}
              </span>{' '}
              of <span className="text-slate-200 font-semibold">{filteredRuns.length}</span> runs
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
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
