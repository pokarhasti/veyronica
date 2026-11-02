import React, { useEffect, useState } from 'react';
import { api } from './api/client';
import { ApproverInfo } from './types';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { RunDetailPage } from './pages/RunDetailPage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { ApprovalDetailPage } from './pages/ApprovalDetailPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { DashboardPage } from './pages/DashboardPage';
import { FuturePage } from './pages/FuturePage';

export const App: React.FC = () => {
  const [currentApprover, setCurrentApprover] = useState<ApproverInfo | null>(null);
  const [activeTab, setActiveTab] = useState<string>('trigger');
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>('');
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Load initial approver
  useEffect(() => {
    api.getApprovers()
      .then((list) => {
        if (list.length > 0) {
          // Default to Priya Sharma (Store Manager for Store 214)
          const sm = list.find((a) => a.approver_id === 'APR-SM-214') || list[0];
          setCurrentApprover(sm);
        }
      })
      .catch(console.error);

    const updatePending = () => {
      api.getPendingApprovals()
        .then((items) => setPendingCount(items.length))
        .catch(() => {});
    };

    updatePending();
    const interval = setInterval(updatePending, 4000);
    return () => clearInterval(interval);
  }, []);

  const navigateToRun = (runId: string) => {
    setSelectedRunId(runId);
    setActiveTab('run_detail');
  };

  const navigateToApproval = (approvalId: string, runId: string) => {
    setSelectedApprovalId(approvalId);
    setSelectedRunId(runId);
    setActiveTab('approval_detail');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        currentApprover={currentApprover}
        onSelectApprover={setCurrentApprover}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingCount}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'trigger' && (
          <HomePage
            onNavigateToRun={navigateToRun}
            onNavigateToQueue={() => setActiveTab('queue')}
          />
        )}

        {activeTab === 'queue' && (
          <ApprovalQueuePage
            currentApprover={currentApprover}
            onSelectApproval={navigateToApproval}
          />
        )}

        {activeTab === 'runs' && (
          <HomePage
            onNavigateToRun={navigateToRun}
            onNavigateToQueue={() => setActiveTab('queue')}
          />
        )}

        {activeTab === 'run_detail' && (
          <RunDetailPage
            runId={selectedRunId}
            onBack={() => setActiveTab('runs')}
            currentApprover={currentApprover}
          />
        )}

        {activeTab === 'approval_detail' && (
          <ApprovalDetailPage
            approvalId={selectedApprovalId}
            runId={selectedRunId}
            onBack={() => setActiveTab('queue')}
            currentApprover={currentApprover}
          />
        )}

        {activeTab === 'audit' && <AuditTrailPage />}

        {activeTab === 'dashboard' && <DashboardPage />}

        {activeTab === 'future' && <FuturePage />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        Veyronica — Governed Agentic Replenishment Platform • SIH 2026 Production Build
      </footer>
    </div>
  );
};

export default App;
