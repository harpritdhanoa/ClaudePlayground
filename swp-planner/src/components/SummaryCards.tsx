import type { SummaryData, SWPInputs } from '../utils/swpCalculator';
import { formatCurrency } from '../utils/swpCalculator';

interface Props {
  summary: SummaryData;
  inputs: SWPInputs;
}

function MetricCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
}) {
  return (
    <div className={`bg-white rounded-xl border ${color} p-4 flex items-start gap-3`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SustainabilityGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'text-green-600 bg-green-50' :
    score >= 40 ? 'text-yellow-600 bg-yellow-50' :
    'text-red-600 bg-red-50';

  const label =
    score >= 70 ? 'Highly Sustainable' :
    score >= 40 ? 'Moderately Sustainable' :
    'Corpus Depleting';

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${color.split(' ')[1]} border-gray-200`}>
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9"
            fill="none"
            stroke={score >= 70 ? '#16a34a' : score >= 40 ? '#ca8a04' : '#dc2626'}
            strokeWidth="3"
            strokeDasharray={`${score} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color.split(' ')[0]}`}>{score}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sustainability Score</p>
        <p className={`text-base font-bold ${color.split(' ')[0]}`}>{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">Corpus remaining at end of period</p>
      </div>
    </div>
  );
}

export default function SummaryCards({ summary, inputs }: Props) {
  const depletionText = summary.corpusDepletionYear
    ? `Depletes in year ${summary.corpusDepletionYear}`
    : `Survives full ${inputs.timePeriod} years`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Initial Corpus"
          value={formatCurrency(inputs.initialCorpus, true)}
          icon="💰"
          color="border-blue-200"
        />
        <MetricCard
          label="Final Corpus"
          value={formatCurrency(summary.finalCorpus, true)}
          sub={depletionText}
          icon="🏦"
          color={summary.finalCorpus > 0 ? 'border-green-200' : 'border-red-200'}
        />
        <MetricCard
          label="Total Withdrawn"
          value={formatCurrency(summary.totalWithdrawals, true)}
          sub={`Net: ${formatCurrency(summary.netWithdrawals, true)}`}
          icon="💸"
          color="border-purple-200"
        />
        <MetricCard
          label="Total Returns Earned"
          value={formatCurrency(summary.totalReturnsEarned, true)}
          sub={`Real return: ${(inputs.annualReturn - inputs.inflationRate).toFixed(1)}% p.a.`}
          icon="📈"
          color="border-teal-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SustainabilityGauge score={summary.sustainabilityScore} />

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Quick Stats</p>
          <div className="space-y-2">
            {[
              { label: 'Annual Return', value: `${inputs.annualReturn}%` },
              { label: 'Inflation Rate', value: `${inputs.inflationRate}%` },
              { label: 'Real Return', value: `${(inputs.annualReturn - inputs.inflationRate).toFixed(1)}%` },
              ...(inputs.taxEnabled ? [{ label: 'Total Tax Paid', value: formatCurrency(summary.totalTaxPaid, true) }] : []),
              { label: 'Total Periods', value: `${inputs.timePeriod * summary.periodsPerYear} (${inputs.frequency})` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
