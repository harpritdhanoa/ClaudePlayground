import { useState, useMemo } from 'react';
import './index.css';
import { calculateSWP } from './utils/swpCalculator';
import type { SWPInputs } from './utils/swpCalculator';
import InputPanel from './components/InputPanel';
import SummaryCards from './components/SummaryCards';
import { CorpusChart, WithdrawalReturnsChart, CumulativeChart } from './components/Charts';
import DataTable from './components/DataTable';
import ScenarioComparison from './components/ScenarioComparison';
import GoalPlanner from './components/GoalPlanner';
import InsightPanel from './components/InsightPanel';

const DEFAULT_INPUTS: SWPInputs = {
  initialCorpus: 5000000,
  withdrawalAmount: 30000,
  frequency: 'monthly',
  annualReturn: 12,
  inflationRate: 6,
  timePeriod: 20,
  stepUpType: 'none',
  stepUpValue: 5,
  stepUpFrequency: 1,
  taxRegime: 'equity',
  taxEnabled: false,
  indexationBenefit: false,
};

type Tab = 'overview' | 'charts' | 'table' | 'scenarios' | 'goals' | 'insights';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'charts', label: 'Charts', icon: '📈' },
  { id: 'table', label: 'Data Table', icon: '📋' },
  { id: 'scenarios', label: 'Scenarios', icon: '⚖️' },
  { id: 'goals', label: 'Goal Planner', icon: '🎯' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

export default function App() {
  const [inputs, setInputs] = useState<SWPInputs>(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const results = useMemo(() => calculateSWP(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">S</div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">SWP Planner Pro</h1>
                <p className="text-xs text-gray-500 leading-none">Systematic Withdrawal Plan Calculator · v1.3</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setInputs(DEFAULT_INPUTS)}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => {
                const json = JSON.stringify(inputs, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'swp-plan.json'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Plan
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'} flex-shrink-0 transition-all duration-300 bg-white border-r border-gray-200`}
          style={{ minHeight: 'calc(100vh - 56px)' }}
        >
          <div className="p-4 overflow-y-auto h-full">
            <InputPanel inputs={inputs} onChange={setInputs} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <SummaryCards summary={results.summary} inputs={inputs} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <CorpusChart yearlyData={results.yearlyData} inputs={inputs} />
                <WithdrawalReturnsChart yearlyData={results.yearlyData} inputs={inputs} />
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-5">
              <CorpusChart yearlyData={results.yearlyData} inputs={inputs} />
              <WithdrawalReturnsChart yearlyData={results.yearlyData} inputs={inputs} />
              <CumulativeChart yearlyData={results.yearlyData} />
            </div>
          )}

          {activeTab === 'table' && (
            <DataTable yearlyData={results.yearlyData} periodData={results.periodData} inputs={inputs} />
          )}

          {activeTab === 'scenarios' && (
            <ScenarioComparison baseInputs={inputs} />
          )}

          {activeTab === 'goals' && (
            <GoalPlanner
              initialCorpus={inputs.initialCorpus}
              annualReturn={inputs.annualReturn}
              withdrawalAmount={inputs.withdrawalAmount}
              frequency={inputs.frequency}
            />
          )}

          {activeTab === 'insights' && (
            <InsightPanel results={results} inputs={inputs} />
          )}
        </main>
      </div>
    </div>
  );
}
