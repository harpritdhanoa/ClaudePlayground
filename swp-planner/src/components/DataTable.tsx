import { useState } from 'react';
import type { YearlyData, PeriodData, SWPInputs, WithdrawalFrequency } from '../utils/swpCalculator';
import { formatCurrency } from '../utils/swpCalculator';

interface Props {
  yearlyData: YearlyData[];
  periodData: PeriodData[];
  inputs: SWPInputs;
}

const FREQ_LABEL: Record<WithdrawalFrequency, string> = {
  monthly: 'Month',
  quarterly: 'Quarter',
  'half-yearly': 'Half',
  annually: 'Year',
};

export default function DataTable({ yearlyData, periodData, inputs }: Props) {
  const [view, setView] = useState<'yearly' | 'detailed'>('yearly');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const periodLabel = FREQ_LABEL[inputs.frequency];

  const displayData = view === 'yearly' ? yearlyData : periodData;
  const totalPages = Math.ceil(displayData.length / pageSize);
  const paged = displayData.slice(page * pageSize, (page + 1) * pageSize);

  function exportCSV() {
    const headers = view === 'yearly'
      ? ['Year', 'Opening Balance', 'Gross Withdrawal', 'Tax Paid', 'Net Withdrawal', 'Returns Earned', 'Closing Balance']
      : [periodLabel, 'Year', 'Opening Balance', 'Gross Withdrawal', 'Tax', 'Net Withdrawal', 'Returns', 'Closing Balance', 'Cumulative Withdrawal'];

    const rows = view === 'yearly'
      ? (yearlyData as YearlyData[]).map((d) => [
          d.year, d.openingBalance, d.totalWithdrawal, d.totalTax, d.totalNetWithdrawal, d.totalReturns, d.closingBalance,
        ])
      : (periodData as PeriodData[]).map((d) => [
          d.period, d.year, d.openingBalance, d.withdrawal, d.tax, d.netWithdrawal, d.returns, d.closingBalance, d.cumulativeWithdrawal,
        ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swp-${view}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => { setView('yearly'); setPage(0); }}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${view === 'yearly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Yearly
          </button>
          <button
            onClick={() => { setView('detailed'); setPage(0); }}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${view === 'detailed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {periodLabel}ly Detail
          </button>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {view === 'yearly' ? (
                <>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Year</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Opening Balance</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Gross Withdrawal</th>
                  {inputs.taxEnabled && <th className="text-right px-4 py-3 font-semibold text-gray-600">Tax Paid</th>}
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Net Withdrawal</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Returns</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Closing Balance</th>
                </>
              ) : (
                <>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{periodLabel}</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Year</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Opening Balance</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Withdrawal</th>
                  {inputs.taxEnabled && <th className="text-right px-4 py-3 font-semibold text-gray-600">Tax</th>}
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Returns</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Closing Balance</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {(view === 'yearly' ? paged as YearlyData[] : paged as PeriodData[]).map((row, i) => {
              const isYearly = view === 'yearly';
              const yr = isYearly ? (row as YearlyData) : null;
              const pd = !isYearly ? (row as PeriodData) : null;
              const closing = isYearly ? yr!.closingBalance : pd!.closingBalance;
              const depleted = closing <= 0;

              return (
                <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${depleted ? 'bg-red-50' : ''}`}>
                  {isYearly ? (
                    <>
                      <td className="px-4 py-2.5 font-medium text-gray-700">{yr!.year}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(yr!.openingBalance, true)}</td>
                      <td className="px-4 py-2.5 text-right text-purple-700 font-medium">{formatCurrency(yr!.totalWithdrawal, true)}</td>
                      {inputs.taxEnabled && <td className="px-4 py-2.5 text-right text-orange-600">{formatCurrency(yr!.totalTax, true)}</td>}
                      <td className="px-4 py-2.5 text-right text-blue-700 font-medium">{formatCurrency(yr!.totalNetWithdrawal, true)}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(yr!.totalReturns, true)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${depleted ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(closing, true)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-gray-700">{pd!.period}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{pd!.year}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(pd!.openingBalance, true)}</td>
                      <td className="px-4 py-2.5 text-right text-purple-700">{formatCurrency(pd!.withdrawal, true)}</td>
                      {inputs.taxEnabled && <td className="px-4 py-2.5 text-right text-orange-600">{formatCurrency(pd!.tax, true)}</td>}
                      <td className="px-4 py-2.5 text-right text-green-700">{formatCurrency(pd!.returns, true)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${depleted ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(closing, true)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, displayData.length)} of {displayData.length} rows
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 text-sm rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
