import React from 'react';
import { Layers, Lightbulb, Compass, Database, ShieldAlert, Cpu } from 'lucide-react';

export const FuturePage: React.FC = () => {
  const roadmapItems = [
    {
      title: 'Direct Ginesys Cloud ERP Connector',
      icon: <Database className="w-6 h-6 text-indigo-400" />,
      desc: 'Swap simulated adapter protocols with production REST/SOAP Ginesys ERP integration, supporting live POS sales pull and warehouse stock balancing.',
    },
    {
      title: 'Rejection Threshold Adaptive Learning',
      icon: <Lightbulb className="w-6 h-6 text-amber-400" />,
      desc: 'When a manager rejects an order due to high total value or lead time, agent analyzes reason and proposes fine-tuned auto-approve policy thresholds.',
    },
    {
      title: 'Autonomous Supplier Quotation & Negotiation Agent',
      icon: <Cpu className="w-6 h-6 text-emerald-400" />,
      desc: 'Multi-agent bidding loop requesting quotes from Tier-1 and Tier-2 suppliers when MOQ or credit limits are constrained.',
    },
    {
      title: 'Multi-Store Cross-Docking & Stock Transfer',
      icon: <Layers className="w-6 h-6 text-violet-400" />,
      desc: 'Rebalance stock between neighboring V-Mart stores within 50km radius before placing external supplier purchase orders.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 mb-2">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>Section 22 Architecture Roadmap</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Future Extensibility</h1>
        <p className="text-xs text-slate-400 mt-1">
          Conceptual roadmap for scaling Veyronica across V-Mart's 497-store retail network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roadmapItems.map((item, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-3">
            <div className="p-3 bg-slate-950 rounded-lg w-fit border border-slate-800">
              {item.icon}
            </div>
            <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
