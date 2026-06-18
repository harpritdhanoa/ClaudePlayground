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
  { id: 'table', label: 'Table', icon: '📋' },
  { id: 'scenarios', label: 'Scenarios', icon: '⚖️' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

export default function App() {
  const [inputs, setInputs] = useState<SWPInputs>(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  // Start open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  const results = useMemo(() => calculateSWP(inputs), [inputs]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // Close drawer on mobile after tab selection
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">S</div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">SWP Planner Pro</h1>
                <p className="hidden sm:block text-xs text-gray-500 leading-none">Systematic Withdrawal Plan · v1.3</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setInputs(DEFAULT_INPUTS)}
              className="px-2 sm:px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
              className="px-2 sm:px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="hidden sm:inline">Export Plan</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto flex">
        {/* Sidebar — fixed overlay on mobile, inline panel on desktop */}
        <aside
          className={[
            'fixed top-14 bottom-0 left-0 z-40 w-[85vw] max-w-xs overflow-y-auto',
            'bg-white border-r border-gray-200',
            'transform transition-transform duration-300',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            // Desktop: static in-flow, width-animated instead of transform
            'md:static md:top-auto md:bottom-auto md:z-auto md:translate-x-0',
            'md:transition-all md:duration-300 md:flex-shrink-0 md:transform-none',
            sidebarOpen ? 'md:w-80' : 'md:w-0 md:overflow-hidden',
          ].join(' ')}
          style={{ minHeight: 'calc(100vh - 56px)' }}
        >
          <div className="p-4">
            <InputPanel inputs={inputs} onChange={setInputs} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5">
          {/* Tabs — horizontally scrollable on mobile */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-5">
              <SummaryCards summary={results.summary} inputs={inputs} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
                <CorpusChart yearlyData={results.yearlyData} inputs={inputs} />
                <WithdrawalReturnsChart yearlyData={results.yearlyData} inputs={inputs} />
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-4 sm:space-y-5">
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
