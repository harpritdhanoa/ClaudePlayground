import { useState } from 'react';
import { formatCurrency } from '../utils/swpCalculator';

interface Goal {
  id: string;
  name: string;
  target: number;
  years: number;
  priority: 'high' | 'medium' | 'low';
}

interface Props {
  initialCorpus: number;
  annualReturn: number;
  withdrawalAmount: number;
  frequency: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export default function GoalPlanner({ initialCorpus, annualReturn, withdrawalAmount, frequency }: Props) {
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', name: 'Emergency Fund', target: 500000, years: 1, priority: 'high' },
    { id: '2', name: 'Child Education', target: 3000000, years: 10, priority: 'medium' },
    { id: '3', name: 'Retirement Income', target: 0, years: 20, priority: 'high' },
  ]);
  const [newGoal, setNewGoal] = useState<{ name: string; target: number; years: number; priority: Goal['priority'] }>({ name: '', target: 0, years: 5, priority: 'medium' });
  const [showAdd, setShowAdd] = useState(false);

  const freqMap: Record<string, number> = {
    monthly: 12, quarterly: 4, 'half-yearly': 2, annually: 1,
  };

  const annualWithdrawal = withdrawalAmount * (freqMap[frequency] ?? 12);
  const periodsPerYear = freqMap[frequency] ?? 12;
  const periodRate = annualReturn / 100 / periodsPerYear;

  function projectedCorpus(years: number) {
    let corpus = initialCorpus;
    for (let i = 0; i < years * periodsPerYear; i++) {
      corpus = corpus * (1 + periodRate) - withdrawalAmount;
      if (corpus < 0) return 0;
    }
    return corpus;
  }

  function addGoal() {
    if (!newGoal.name) return;
    setGoals([...goals, { ...newGoal, id: String(Date.now()) }]);
    setNewGoal({ name: '', target: 0, years: 5, priority: 'medium' });
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Annual withdrawal:</strong> {formatCurrency(annualWithdrawal, true)} at {annualReturn}% return.
          Based on your SWP settings, projected corpus over time is shown below.
        </p>
      </div>

      {/* Corpus projection timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-800 mb-4">Corpus Projection</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[5, 10, 15, 20, 25, 30].map((yr) => {
            const projected = projectedCorpus(yr);
            return (
              <div key={yr} className={`rounded-lg p-3 text-center ${projected > 0 ? 'bg-gray-50' : 'bg-red-50'}`}>
                <p className="text-xs text-gray-500">After {yr} yrs</p>
                <p className={`text-base font-bold ${projected > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {projected > 0 ? formatCurrency(projected, true) : 'Depleted'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-800">Financial Goals</h4>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Goal
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {goals.map((goal) => {
            const availableAtTarget = projectedCorpus(goal.years);
            const canMeet = goal.target === 0 || availableAtTarget >= goal.target;

            return (
              <div key={goal.id} className="flex items-start gap-4 px-5 py-4">
                <div className={`mt-0.5 text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITY_COLORS[goal.priority]}`}>
                  {goal.priority}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">{goal.name}</p>
                    <button
                      onClick={() => setGoals(goals.filter((g) => g.id !== goal.id))}
                      className="text-gray-300 hover:text-red-400 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Target: {goal.target > 0 ? formatCurrency(goal.target, true) : 'Ongoing income'}</span>
                    <span>Timeline: {goal.years} years</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      {goal.target > 0 && (
                        <div
                          className={`h-full rounded-full transition-all ${canMeet ? 'bg-green-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, (availableAtTarget / goal.target) * 100)}%` }}
                        />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${canMeet ? 'text-green-600' : 'text-red-500'}`}>
                      {canMeet ? '✓ Achievable' : '✗ Shortfall'}
                    </span>
                  </div>
                  {!canMeet && goal.target > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Corpus at yr {goal.years}: {formatCurrency(availableAtTarget, true)} (need {formatCurrency(goal.target, true)})
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showAdd && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Goal Name</label>
                <input
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g. Child's wedding"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Target Amount (0 = ongoing income)</label>
                <input
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Timeline (years)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newGoal.years}
                  onChange={(e) => setNewGoal({ ...newGoal, years: Number(e.target.value) })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Priority</label>
                <select
                  value={newGoal.priority}
                  onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as Goal['priority'] })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addGoal} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                Add Goal
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
