export type WithdrawalFrequency = 'monthly' | 'quarterly' | 'half-yearly' | 'annually';
export type StepUpType = 'none' | 'percentage' | 'fixed';
export type TaxRegime = 'equity' | 'debt' | 'hybrid';

export interface SWPInputs {
  initialCorpus: number;
  withdrawalAmount: number;
  frequency: WithdrawalFrequency;
  annualReturn: number;
  inflationRate: number;
  timePeriod: number;
  stepUpType: StepUpType;
  stepUpValue: number;
  stepUpFrequency: number;
  taxRegime: TaxRegime;
  taxEnabled: boolean;
  indexationBenefit: boolean;
}

export interface PeriodData {
  period: number;
  year: number;
  openingBalance: number;
  withdrawal: number;
  tax: number;
  netWithdrawal: number;
  returns: number;
  closingBalance: number;
  inflationAdjustedWithdrawal: number;
  cumulativeWithdrawal: number;
}

export interface SWPResults {
  periodData: PeriodData[];
  yearlyData: YearlyData[];
  summary: SummaryData;
}

export interface YearlyData {
  year: number;
  openingBalance: number;
  totalWithdrawal: number;
  totalTax: number;
  totalNetWithdrawal: number;
  totalReturns: number;
  closingBalance: number;
}

export interface SummaryData {
  totalWithdrawals: number;
  totalTaxPaid: number;
  netWithdrawals: number;
  totalReturnsEarned: number;
  finalCorpus: number;
  corpusDepletionPeriod: number | null;
  corpusDepletionYear: number | null;
  effectiveReturnRate: number;
  xirr: number;
  sustainabilityScore: number;
  periodsPerYear: number;
}

const PERIODS_MAP: Record<WithdrawalFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  'half-yearly': 2,
  annually: 1,
};

/**
 * Compute annual capital gains tax for an SWP withdrawal.
 *
 * We model each year's tax on the gains embedded in withdrawals:
 *   gains = withdrawal × (returns / (opening_balance + returns))
 * i.e. the proportion of the withdrawal that represents profit.
 */
function computeYearlyTax(
  totalWithdrawal: number,
  totalReturns: number,
  openingBalance: number,
  yearNumber: number,
  regime: TaxRegime,
  indexation: boolean,
): number {
  if (totalWithdrawal <= 0 || totalReturns <= 0) return 0;

  // Fraction of withdrawal that represents gains
  const gainsFraction = totalReturns / (openingBalance + totalReturns);
  const gainsInWithdrawal = totalWithdrawal * gainsFraction;

  if (gainsInWithdrawal <= 0) return 0;

  switch (regime) {
    case 'equity':
    case 'hybrid': {
      // LTCG applies from year 2 onwards (held > 12 months); STCG in year 1
      if (yearNumber === 1) {
        // STCG @ 20%
        return gainsInWithdrawal * 0.20;
      }
      // LTCG @ 12.5% with ₹1.25 lakh annual exemption
      const taxable = Math.max(0, gainsInWithdrawal - 125000);
      return taxable * 0.125;
    }
    case 'debt': {
      // Post-2023 debt funds: gains taxed at 30% (slab rate approximation), no indexation
      if (indexation && yearNumber > 3) {
        // Pre-2023 investments with indexation: effective ~20% after indexed cost
        return gainsInWithdrawal * 0.20;
      }
      return gainsInWithdrawal * 0.30;
    }
    default:
      return 0;
  }
}

export function calculateSWP(inputs: SWPInputs): SWPResults {
  const {
    initialCorpus,
    withdrawalAmount,
    frequency,
    annualReturn,
    inflationRate,
    timePeriod,
    stepUpType,
    stepUpValue,
    stepUpFrequency,
    taxRegime,
    taxEnabled,
    indexationBenefit,
  } = inputs;

  const periodsPerYear = PERIODS_MAP[frequency];
  const totalPeriods = timePeriod * periodsPerYear;
  const periodRate = annualReturn / 100 / periodsPerYear;
  const periodInflation = inflationRate / 100 / periodsPerYear;

  const periodData: PeriodData[] = [];
  const yearlyData: YearlyData[] = [];

  let balance = initialCorpus;
  let currentWithdrawal = withdrawalAmount;
  let cumulativeWithdrawal = 0;
  let corpusDepletionPeriod: number | null = null;
  let corpusDepletionYear: number | null = null;

  // Yearly accumulators
  let yearlyOpen = initialCorpus;
  let yearlyTotalWithdrawal = 0;
  let yearlyTotalTax = 0;
  let yearlyTotalNetWithdrawal = 0;
  let yearlyTotalReturns = 0;
  let currentYear = 1;

  for (let period = 1; period <= totalPeriods; period++) {
    // Track first depletion
    if (balance <= 0 && corpusDepletionPeriod === null) {
      corpusDepletionPeriod = period - 1;
      corpusDepletionYear = Math.ceil((period - 1) / periodsPerYear);
    }

    // Apply step-up at the start of each step-up interval (from period 2 onward)
    if (stepUpType !== 'none' && period > 1) {
      const stepUpPeriodInterval = stepUpFrequency * periodsPerYear;
      if ((period - 1) % stepUpPeriodInterval === 0) {
        if (stepUpType === 'percentage') {
          currentWithdrawal = currentWithdrawal * (1 + stepUpValue / 100);
        } else {
          currentWithdrawal = currentWithdrawal + stepUpValue;
        }
      }
    }

    const openingBalance = balance;
    const returns = Math.max(0, balance) * periodRate;
    const balanceAfterReturns = balance + returns;

    // Can only withdraw what's available
    const grossWithdrawal = Math.min(currentWithdrawal, Math.max(0, balanceAfterReturns));
    const inflationAdjusted = currentWithdrawal / Math.pow(1 + periodInflation, period);

    balance = balanceAfterReturns - grossWithdrawal;
    if (balance < 0) balance = 0;

    cumulativeWithdrawal += grossWithdrawal;

    // Period-level tax is zero; tax is computed at year-end (see yearlyData loop below)
    periodData.push({
      period,
      year: currentYear,
      openingBalance,
      withdrawal: grossWithdrawal,
      tax: 0,
      netWithdrawal: grossWithdrawal,
      returns,
      closingBalance: balance,
      inflationAdjustedWithdrawal: inflationAdjusted,
      cumulativeWithdrawal,
    });

    // Accumulate into yearly buckets
    yearlyTotalWithdrawal += grossWithdrawal;
    yearlyTotalReturns += returns;

    // End of year: flush yearly bucket (every periodsPerYear periods, or last period)
    const isEndOfYear = period % periodsPerYear === 0;
    const isLastPeriod = period === totalPeriods;

    if (isEndOfYear || isLastPeriod) {
      // Compute annual tax on this year's withdrawals
      const annualTax = taxEnabled
        ? computeYearlyTax(
            yearlyTotalWithdrawal,
            yearlyTotalReturns,
            yearlyOpen,
            currentYear,
            taxRegime,
            indexationBenefit,
          )
        : 0;

      yearlyTotalTax = annualTax;
      yearlyTotalNetWithdrawal = yearlyTotalWithdrawal - annualTax;

      yearlyData.push({
        year: currentYear,
        openingBalance: yearlyOpen,
        totalWithdrawal: yearlyTotalWithdrawal,
        totalTax: yearlyTotalTax,
        totalNetWithdrawal: yearlyTotalNetWithdrawal,
        totalReturns: yearlyTotalReturns,
        closingBalance: balance,
      });

      // Reset for next year
      yearlyOpen = balance;
      yearlyTotalWithdrawal = 0;
      yearlyTotalTax = 0;
      yearlyTotalNetWithdrawal = 0;
      yearlyTotalReturns = 0;
      currentYear++;
    }
  }

  const lastPeriod = periodData[periodData.length - 1];
  const totalReturns = periodData.reduce((s, p) => s + p.returns, 0);
  const totalTaxPaid = yearlyData.reduce((s, y) => s + y.totalTax, 0);
  const totalWithdrawals = periodData.reduce((s, p) => s + p.withdrawal, 0);

  const sustainabilityRatio = lastPeriod ? lastPeriod.closingBalance / initialCorpus : 0;
  const sustainabilityScore = Math.min(100, Math.max(0, Math.round(sustainabilityRatio * 100)));

  const summary: SummaryData = {
    totalWithdrawals,
    totalTaxPaid,
    netWithdrawals: totalWithdrawals - totalTaxPaid,
    totalReturnsEarned: totalReturns,
    finalCorpus: lastPeriod?.closingBalance ?? 0,
    corpusDepletionPeriod,
    corpusDepletionYear,
    effectiveReturnRate: annualReturn,
    xirr: annualReturn - inflationRate,
    sustainabilityScore,
    periodsPerYear,
  };

  return { periodData, yearlyData, summary };
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getBreakEvenWithdrawal(corpus: number, annualReturn: number, periodsPerYear: number): number {
  const periodRate = annualReturn / 100 / periodsPerYear;
  return corpus * periodRate;
}
