import type { SWPResults, SWPInputs } from '../utils/swpCalculator';
import { formatCurrency, getBreakEvenWithdrawal } from '../utils/swpCalculator';

interface Props {
  results: SWPResults;
  inputs: SWPInputs;
}

const PERIODS_MAP: Record<string, number> = {
  monthly: 12, quarterly: 4, 'half-yearly': 2, annually: 1,
};

interface Insight {
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  body: string;
  action?: string;
}

function InsightCard({ insight }: { insight: Insight }) {
  const styles = {
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', title: 'text-green-800', body: 'text-green-700' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠️', title: 'text-yellow-800', body: 'text-yellow-700' },
    info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'ℹ️', title: 'text-blue-800',   body: 'text-blue-700' },
    danger:  { bg: 'bg-red-50',    border: 'border-red-200',    icon: '🚨', title: 'text-red-800',    body: 'text-red-700' },
  }[insight.type];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{styles.icon}</span>
        <div>
          <p className={`font-semibold text-sm ${styles.title}`}>{insight.title}</p>
          <p className={`text-sm mt-0.5 ${styles.body}`}>{insight.body}</p>
          {insight.action && (
            <p className={`text-xs mt-1.5 font-medium ${styles.title}`}>💡 {insight.action}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightPanel({ results, inputs }: Props) {
  const { summary } = results;
  const periodsPerYear = PERIODS_MAP[inputs.frequency];
  const breakEven = getBreakEvenWithdrawal(inputs.initialCorpus, inputs.annualReturn, periodsPerYear);
  const realReturn = inputs.annualReturn - inputs.inflationRate;

  const insights: Insight[] = [];

  // Break-even insight
  if (inputs.withdrawalAmount > breakEven * 1.2) {
    insights.push({
      type: 'danger',
      title: 'High Withdrawal Rate',
      body: `Your withdrawal (${formatCurrency(inputs.withdrawalAmount, true)}) is significantly above break-even (${formatCurrency(breakEven, true)} / ${inputs.frequency}). Corpus will deplete rapidly.`,
      action: `Consider reducing withdrawal to ≤ ${formatCurrency(breakEven, true)} or increasing corpus.`,
    });
  } else if (inputs.withdrawalAmount > breakEven) {
    insights.push({
      type: 'warning',
      title: 'Slightly Above Break-Even',
      body: `Withdrawal exceeds break-even by ${formatCurrency(inputs.withdrawalAmount - breakEven, true)}. Corpus will gradually deplete.`,
      action: 'A small reduction in withdrawal or slightly higher return can make this self-sustaining.',
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Self-Sustaining SWP',
      body: `Withdrawals are below break-even. Your corpus should remain intact or even grow over time.`,
    });
  }

  // Inflation insight
  if (realReturn < 2) {
    insights.push({
      type: 'warning',
      title: 'Low Real Return',
      body: `Real return (return minus inflation) is only ${realReturn.toFixed(1)}%. Purchasing power of withdrawals will erode significantly.`,
      action: 'Consider inflation-adjusted step-up withdrawals to maintain lifestyle.',
    });
  }

  if (inputs.inflationRate > 0 && inputs.stepUpType === 'none') {
    insights.push({
      type: 'info',
      title: 'Inflation Protection Missing',
      body: `With ${inputs.inflationRate}% inflation, your real withdrawal in 10 years will be worth ${formatCurrency(inputs.withdrawalAmount / Math.pow(1 + inputs.inflationRate / 100, 10), true)} in today's money.`,
      action: `Enable step-up withdrawals at ~${inputs.inflationRate}% per year to maintain purchasing power.`,
    });
  }

  // Corpus depletion
  if (summary.corpusDepletionYear !== null) {
    insights.push({
      type: 'danger',
      title: `Corpus Depletes in Year ${summary.corpusDepletionYear}`,
      body: `At current withdrawal rate, corpus will run out before the end of the plan (${inputs.timePeriod} years).`,
      action: 'Increase return assumptions, reduce withdrawal, or invest additional lump sum to extend sustainability.',
    });
  }

  // Tax efficiency
  if (inputs.taxEnabled && summary.totalTaxPaid > 0) {
    const taxRatio = summary.totalTaxPaid / summary.totalWithdrawals * 100;
    insights.push({
      type: 'info',
      title: 'Tax Impact',
      body: `Estimated tax of ${formatCurrency(summary.totalTaxPaid, true)} (${taxRatio.toFixed(1)}% of gross withdrawals) over the plan tenure.`,
      action: inputs.taxRegime === 'debt'
        ? 'Debt fund gains are taxed at slab rate for new investments. Equity funds offer lower LTCG tax rates.'
        : 'LTCG up to ₹1.25 lakh per year is tax-free. Plan withdrawals to maximize this exemption.',
    });
  }

  // Long duration insight
  if (inputs.timePeriod > 20 && summary.finalCorpus > 0) {
    insights.push({
      type: 'success',
      title: 'Strong Legacy Planning',
      body: `Your plan maintains a corpus of ${formatCurrency(summary.finalCorpus, true)} even after ${inputs.timePeriod} years, creating potential estate value.`,
    });
  }

  // Step-up impact
  if (inputs.stepUpType !== 'none') {
    insights.push({
      type: 'info',
      title: 'Step-Up Active',
      body: `Step-up of ${inputs.stepUpType === 'percentage' ? `${inputs.stepUpValue}%` : formatCurrency(inputs.stepUpValue, true)} every ${inputs.stepUpFrequency} year(s) is applied. Total withdrawals include the growing amounts.`,
    });
  }

  // Optimal withdrawal suggestion
  const optimalWithdrawal = breakEven * 0.9;
  if (inputs.withdrawalAmount > breakEven) {
    insights.push({
      type: 'info',
      title: 'Optimal Withdrawal Suggestion',
      body: `For a self-sustaining SWP, consider withdrawing ${formatCurrency(optimalWithdrawal, true)} / ${inputs.frequency} (90% of break-even). This provides a safety buffer against market fluctuations.`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-800 mb-1">SWP Intelligence Report</h4>
        <p className="text-sm text-gray-500 mb-4">AI-generated insights based on your plan parameters</p>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </div>

      {/* Rule of thumb */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-800 mb-3">4% Safe Withdrawal Rate Analysis</h4>
        <p className="text-sm text-gray-600 mb-3">
          The 4% rule suggests withdrawing no more than 4% of corpus annually. Here's how your plan compares:
        </p>
        {(() => {
          const PERIODS_MAP_LOCAL: Record<string, number> = {
            monthly: 12, quarterly: 4, 'half-yearly': 2, annually: 1,
          };
          const periodsPerYearLocal = PERIODS_MAP_LOCAL[inputs.frequency];
          const annualWithdrawal = inputs.withdrawalAmount * periodsPerYearLocal;
          const withdrawalRate = (annualWithdrawal / inputs.initialCorpus) * 100;
          const safeAmount = inputs.initialCorpus * 0.04 / periodsPerYearLocal;

          return (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Your Rate</p>
                <p className={`text-xl font-bold ${withdrawalRate <= 4 ? 'text-green-600' : withdrawalRate <= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {withdrawalRate.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Safe Rate</p>
                <p className="text-xl font-bold text-green-600">4%</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Safe {inputs.frequency} amt</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(safeAmount, true)}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
