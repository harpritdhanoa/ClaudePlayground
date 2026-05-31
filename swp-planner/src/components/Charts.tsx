import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { YearlyData, SWPInputs } from '../utils/swpCalculator';
import { formatCurrency } from '../utils/swpCalculator';

interface Props {
  yearlyData: YearlyData[];
  inputs: SWPInputs;
}

const COLORS = {
  corpus: '#3b82f6',
  withdrawal: '#8b5cf6',
  returns: '#10b981',
  tax: '#f59e0b',
  net: '#06b6d4',
};

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">Year {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="text-gray-700">{formatCurrency(p.value, true)}</span>
        </div>
      ))}
    </div>
  );
}

function axisFormatter(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

export function CorpusChart({ yearlyData }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="font-semibold text-gray-800 mb-4">Corpus Over Time</h4>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={yearlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.corpus} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.corpus} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 12 }} />
          <YAxis tickFormatter={axisFormatter} tick={{ fontSize: 11 }} width={70} />
          <Tooltip content={<CurrencyTooltip />} />
          <Area type="monotone" dataKey="closingBalance" name="Corpus" stroke={COLORS.corpus} fill="url(#corpusGrad)" strokeWidth={2} dot={false} />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WithdrawalReturnsChart({ yearlyData, inputs }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="font-semibold text-gray-800 mb-4">Withdrawals vs Returns</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={axisFormatter} tick={{ fontSize: 11 }} width={70} />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="totalWithdrawal" name="Gross Withdrawal" fill={COLORS.withdrawal} radius={[2, 2, 0, 0]} />
          <Bar dataKey="totalReturns" name="Returns Earned" fill={COLORS.returns} radius={[2, 2, 0, 0]} />
          {inputs.taxEnabled && (
            <Bar dataKey="totalTax" name="Tax Paid" fill={COLORS.tax} radius={[2, 2, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeChart({ yearlyData }: { yearlyData: YearlyData[] }) {
  let cumWithdrawal = 0;
  let cumReturns = 0;
  const data = yearlyData.map((d) => {
    cumWithdrawal += d.totalWithdrawal;
    cumReturns += d.totalReturns;
    return {
      year: d.year,
      cumulativeWithdrawal: cumWithdrawal,
      cumulativeReturns: cumReturns,
      corpus: d.closingBalance,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="font-semibold text-gray-800 mb-4">Cumulative View</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={axisFormatter} tick={{ fontSize: 11 }} width={70} />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="cumulativeWithdrawal" name="Cumulative Withdrawal" stroke={COLORS.withdrawal} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cumulativeReturns" name="Cumulative Returns" stroke={COLORS.returns} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="corpus" name="Remaining Corpus" stroke={COLORS.corpus} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
