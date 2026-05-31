import type { SWPInputs, WithdrawalFrequency, StepUpType, TaxRegime } from '../utils/swpCalculator';
import { formatCurrency, getBreakEvenWithdrawal } from '../utils/swpCalculator';

interface Props {
  inputs: SWPInputs;
  onChange: (inputs: SWPInputs) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
      {prefix && <span className="px-3 py-2 bg-gray-50 text-gray-600 text-sm border-r border-gray-300">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 text-sm outline-none bg-white"
      />
      {suffix && <span className="px-3 py-2 bg-gray-50 text-gray-600 text-sm border-l border-gray-300">{suffix}</span>}
    </div>
  );
}

function RangeInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  );
}

function SelectInput<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const FREQUENCY_OPTIONS: { value: WithdrawalFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'annually', label: 'Annually' },
];

const STEPUP_OPTIONS: { value: StepUpType; label: string }[] = [
  { value: 'none', label: 'No Step-Up' },
  { value: 'percentage', label: 'Percentage Step-Up' },
  { value: 'fixed', label: 'Fixed Amount Step-Up' },
];

const TAX_OPTIONS: { value: TaxRegime; label: string }[] = [
  { value: 'equity', label: 'Equity Funds (>65% equity)' },
  { value: 'hybrid', label: 'Hybrid Funds (35-65% equity)' },
  { value: 'debt', label: 'Debt Funds (<35% equity)' },
];

export default function InputPanel({ inputs, onChange }: Props) {
  const set = <K extends keyof SWPInputs>(key: K, value: SWPInputs[K]) =>
    onChange({ ...inputs, [key]: value });

  const periodsMap: Record<WithdrawalFrequency, number> = {
    monthly: 12, quarterly: 4, 'half-yearly': 2, annually: 1,
  };

  const breakEven = getBreakEvenWithdrawal(
    inputs.initialCorpus,
    inputs.annualReturn,
    periodsMap[inputs.frequency]
  );

  const isSustainable = inputs.withdrawalAmount <= breakEven;

  return (
    <div className="space-y-6">
      {/* Corpus Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
          Investment Corpus
        </h3>

        <Field label="Initial Corpus" hint={formatCurrency(inputs.initialCorpus, true)}>
          <NumberInput value={inputs.initialCorpus} onChange={(v) => set('initialCorpus', v)} min={100000} max={100000000} step={100000} prefix="₹" />
          <RangeInput value={inputs.initialCorpus} onChange={(v) => set('initialCorpus', v)} min={100000} max={100000000} step={100000} />
        </Field>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
          Withdrawal Settings
        </h3>

        <Field label="Withdrawal Frequency">
          <SelectInput<WithdrawalFrequency>
            value={inputs.frequency}
            onChange={(v) => set('frequency', v)}
            options={FREQUENCY_OPTIONS}
          />
        </Field>

        <Field
          label={`${inputs.frequency.charAt(0).toUpperCase() + inputs.frequency.slice(1)} Withdrawal Amount`}
          hint={formatCurrency(inputs.withdrawalAmount, true)}
        >
          <NumberInput value={inputs.withdrawalAmount} onChange={(v) => set('withdrawalAmount', v)} min={1000} max={5000000} step={1000} prefix="₹" />
          <RangeInput value={inputs.withdrawalAmount} onChange={(v) => set('withdrawalAmount', v)} min={1000} max={500000} step={1000} />
          <div className={`mt-1 text-xs px-2 py-1 rounded ${isSustainable ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
            Break-even: {formatCurrency(breakEven, true)} / {inputs.frequency} — corpus is {isSustainable ? 'self-sustaining' : 'depleting'}
          </div>
        </Field>

        <Field label="Investment Duration" hint={`${inputs.timePeriod} years`}>
          <NumberInput value={inputs.timePeriod} onChange={(v) => set('timePeriod', v)} min={1} max={50} suffix="yrs" />
          <RangeInput value={inputs.timePeriod} onChange={(v) => set('timePeriod', v)} min={1} max={50} step={1} />
        </Field>
      </div>

      {/* Return & Inflation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">3</span>
          Returns & Inflation
        </h3>

        <Field label="Expected Annual Return" hint={`${inputs.annualReturn}% per annum`}>
          <NumberInput value={inputs.annualReturn} onChange={(v) => set('annualReturn', v)} min={1} max={30} step={0.5} suffix="%" />
          <RangeInput value={inputs.annualReturn} onChange={(v) => set('annualReturn', v)} min={1} max={30} step={0.5} />
        </Field>

        <Field label="Expected Inflation Rate" hint={`${inputs.inflationRate}% per annum`}>
          <NumberInput value={inputs.inflationRate} onChange={(v) => set('inflationRate', v)} min={0} max={15} step={0.5} suffix="%" />
          <RangeInput value={inputs.inflationRate} onChange={(v) => set('inflationRate', v)} min={0} max={15} step={0.5} />
        </Field>
      </div>

      {/* Step-Up Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">4</span>
          Step-Up Withdrawals
          <span className="text-xs text-gray-500 font-normal">(optional)</span>
        </h3>

        <Field label="Step-Up Type">
          <SelectInput<StepUpType>
            value={inputs.stepUpType}
            onChange={(v) => set('stepUpType', v)}
            options={STEPUP_OPTIONS}
          />
        </Field>

        {inputs.stepUpType !== 'none' && (
          <>
            <Field label={inputs.stepUpType === 'percentage' ? 'Step-Up Percentage' : 'Step-Up Amount'}>
              <NumberInput
                value={inputs.stepUpValue}
                onChange={(v) => set('stepUpValue', v)}
                min={0}
                max={inputs.stepUpType === 'percentage' ? 50 : 100000}
                step={inputs.stepUpType === 'percentage' ? 0.5 : 1000}
                suffix={inputs.stepUpType === 'percentage' ? '%' : '₹'}
              />
            </Field>
            <Field label="Step-Up Every (years)">
              <SelectInput
                value={String(inputs.stepUpFrequency)}
                onChange={(v) => set('stepUpFrequency', Number(v))}
                options={[
                  { value: '1', label: 'Every Year' },
                  { value: '2', label: 'Every 2 Years' },
                  { value: '3', label: 'Every 3 Years' },
                  { value: '5', label: 'Every 5 Years' },
                ]}
              />
            </Field>
          </>
        )}
      </div>

      {/* Tax Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">5</span>
          Tax Calculation
          <span className="text-xs text-gray-500 font-normal">(optional)</span>
        </h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={inputs.taxEnabled}
            onChange={(e) => set('taxEnabled', e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 accent-blue-600"
          />
          <span className="text-sm text-gray-700">Enable tax calculation</span>
        </label>

        {inputs.taxEnabled && (
          <>
            <Field label="Fund Category">
              <SelectInput<TaxRegime>
                value={inputs.taxRegime}
                onChange={(v) => set('taxRegime', v)}
                options={TAX_OPTIONS}
              />
            </Field>
            {inputs.taxRegime === 'debt' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.indexationBenefit}
                  onChange={(e) => set('indexationBenefit', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Apply indexation benefit (pre-2023 debt investments)</span>
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}
