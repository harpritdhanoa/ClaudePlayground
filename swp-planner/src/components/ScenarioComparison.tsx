import { useState } from 'react';
import type { SWPInputs } from '../utils/swpCalculator';
import { calculateSWP, formatCurrency } from '../utils/swpCalculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Scenario {
  id: string;
  label: string;
  inputs: SWPInputs;
  color: string;
}

interface Props {
  baseInputs: SWPInputs;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export default function ScenarioComparison({ baseInputs }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: '1',
      label: 'Conservative (8%)',
      inputs: { ...baseInputs, annualReturn: 8 },
      color: COLORS[0],
    },
    {
      id: '2',
      label: 'Moderate (12%)',
      inputs: { ...baseInputs, annualReturn: 12 },
      color: COLORS[1],
    },
    {
      id: '3',
      label: 'Aggressive (15%)',
      inputs: { ...baseInputs, annualReturn: 15 },
      color: COLORS[2],
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const results = scenarios.map((s) => ({
    ...s,
    result: calculateSWP(s.inputs),
  }));

  const comparisonData = results[0]?.result.yearlyData.map((_, yi) => {
    const row: Record<string, number | string> = { year: yi + 1 };
    results.forEach((r) => {
      row[r.label] = r.result.yearlyData[yi]?.closingBalance ?? 0;
    });
    return row;
  }) ?? [];

  function addScenario() {
    if (scenarios.length >= 4) return;
    setScenarios([
      ...scenarios,
      {
        id: String(Date.now()),
        label: `Scenario ${scenarios.length + 1}`,
        inputs: { ...baseInputs },
        color: COLORS[scenarios.length],
      },
    ]);
  }

  function removeScenario(id: string) {
    setScenarios(scenarios.filter((s) => s.id !== id));
  }

  function updateScenario(id: string, patch: Partial<SWPInputs>) {
    setScenarios(scenarios.map((s) => s.id === id ? { ...s, inputs: { ...s.inputs, ...patch } } : s));
  }

  function axisFormatter(v: number) {
    if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
    return `${(v / 1000).toFixed(0)}K`;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: r.color }} />
            <div className="p-4">
              {editingId === r.id ? (
                <div className="flex gap-2 mb-3">
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setScenarios(scenarios.map((s) => s.id === r.id ? { ...s, label: editLabel } : s));
                      setEditingId(null);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 text-sm">{r.label}</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditLabel(r.label); setEditingId(r.id); }}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    {scenarios.length > 1 && (
                      <button onClick={() => removeScenario(r.id)} className="text-gray-400 hover:text-red-500 p-0.5" title="Remove">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Annual Return</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={30} step={0.5}
                      value={r.inputs.annualReturn}
                      onChange={(e) => updateScenario(r.id, { annualReturn: Number(e.target.value) })}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-semibold w-10 text-right">{r.inputs.annualReturn}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Withdrawal Amount</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1000} max={500000} step={1000}
                      value={r.inputs.withdrawalAmount}
                      onChange={(e) => updateScenario(r.id, { withdrawalAmount: Number(e.target.value) })}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-semibold w-16 text-right">{formatCurrency(r.inputs.withdrawalAmount, true)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Final Corpus</p>
                  <p className="font-bold text-gray-900">{formatCurrency(r.result.summary.finalCorpus, true)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Withdrawn</p>
                  <p className="font-bold text-gray-900">{formatCurrency(r.result.summary.totalWithdrawals, true)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Sustainability</p>
                  <p className={`font-bold ${r.result.summary.sustainabilityScore >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.result.summary.sustainabilityScore}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Depletes</p>
                  <p className="font-bold text-gray-900">
                    {r.result.summary.corpusDepletionYear ? `Yr ${r.result.summary.corpusDepletionYear}` : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {scenarios.length < 4 && (
          <button
            onClick={addScenario}
            className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors min-h-[180px]"
          >
            <span className="text-3xl mb-2">+</span>
            <span className="text-sm font-medium">Add Scenario</span>
          </button>
        )}
      </div>

      {comparisonData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-800 mb-4">Corpus Comparison Over Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 12 }} />
              <YAxis tickFormatter={axisFormatter} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), true)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {results.map((r) => (
                <Bar key={r.id} dataKey={r.label} fill={r.color} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
