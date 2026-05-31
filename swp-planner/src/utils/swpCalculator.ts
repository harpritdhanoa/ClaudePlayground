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

function computeTax(
  gains: number,
  regime: TaxRegime,
  holdingPeriods: number,
  indexation: boolean
): number {
  if (gains <= 0) return 0;

  switch (regime) {
    case 'equity': {
      const isLTCG = holdingPeriods >= 12;
      if (isLTCG) {
        const exemption = 125000;
        const taxableGains = Math.max(0, gains - exemption);
        return taxableGains * 0.125;
      }
      return gains * 0.20;
    }
    case 'debt': {
      const isLTCG = holdingPeriods >= 36;
      if (isLTCG && indexation) {
        const indexedCost = gains * 0.72;
        return Math.max(0, indexedCost) * 0.20;
      }
      return gains * 0.30;
    }
    case 'hybrid': {
      const isLTCG = holdingPeriods >= 12;
      if (isLTCG) {
        const taxableGains = Math.max(0, gains - 125000);
        return taxableGains * 0.125;
      }
      return gains * 0.20;
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

  let yearlyOpen = initialCorpus;
  let yearlyTotalWithdrawal = 0;
  let yearlyTotalTax = 0;
  let yearlyTotalNetWithdrawal = 0;
  let yearlyTotalReturns = 0;
  let currentYear = 1;

  for (let period = 1; period <= totalPeriods; period++) {
    if (balance <= 0 && corpusDepletionPeriod === null) {
      corpusDepletionPeriod = period - 1;
      corpusDepletionYear = Math.ceil((period - 1) / periodsPerYear);
    }

    const year = Math.ceil(period / periodsPerYear);

    if (stepUpType !== 'none' && period > 1) {
      const stepUpPeriod = stepUpFrequency * periodsPerYear;
      if ((period - 1) % stepUpPeriod === 0) {
        if (stepUpType === 'percentage') {
          currentWithdrawal *= 1 + stepUpValue / 100;
        } else {
          currentWithdrawal += stepUpValue;
        }
      }
    }

    const openingBalance = balance;
    const returns = Math.max(0, balance) * periodRate;
    const balanceWithReturns = balance + returns;

    const grossWithdrawal = Math.min(currentWithdrawal, Math.max(0, balanceWithReturns));
    const holdingMonths = (period / periodsPerYear) * 12;
    const gains = grossWithdrawal * (periodRate / (1 + periodRate)) * 0.3;

    let tax = 0;
    if (taxEnabled && gains > 0) {
      tax = computeTax(gains, taxRegime, holdingMonths, indexationBenefit);
    }

    const netWithdrawal = grossWithdrawal - tax;
    const inflationAdjusted = currentWithdrawal / Math.pow(1 + periodInflation, period);

    balance = balanceWithReturns - grossWithdrawal;
    if (balance < 0) balance = 0;

    cumulativeWithdrawal += netWithdrawal;

    periodData.push({
      period,
      year,
      openingBalance,
      withdrawal: grossWithdrawal,
      tax,
      netWithdrawal,
      returns,
      closingBalance: balance,
      inflationAdjustedWithdrawal: inflationAdjusted,
      cumulativeWithdrawal,
    });

    yearlyTotalWithdrawal += grossWithdrawal;
    yearlyTotalTax += tax;
    yearlyTotalNetWithdrawal += netWithdrawal;
    yearlyTotalReturns += returns;

    if (year !== currentYear || period === totalPeriods) {
      yearlyData.push({
        year: currentYear,
        openingBalance: yearlyOpen,
        totalWithdrawal: yearlyTotalWithdrawal,
        totalTax: yearlyTotalTax,
        totalNetWithdrawal: yearlyTotalNetWithdrawal,
        totalReturns: yearlyTotalReturns,
        closingBalance: balance,
      });
      yearlyOpen = balance;
      yearlyTotalWithdrawal = 0;
      yearlyTotalTax = 0;
      yearlyTotalNetWithdrawal = 0;
      yearlyTotalReturns = 0;
      currentYear = year;
    }
  }

  const lastPeriod = periodData[periodData.length - 1];
  const totalReturns = periodData.reduce((s, p) => s + p.returns, 0);
  const totalTaxPaid = periodData.reduce((s, p) => s + p.tax, 0);

  const sustainabilityRatio = lastPeriod ? lastPeriod.closingBalance / initialCorpus : 0;
  const sustainabilityScore = Math.min(100, Math.max(0, Math.round(sustainabilityRatio * 100)));

  const summary: SummaryData = {
    totalWithdrawals: periodData.reduce((s, p) => s + p.withdrawal, 0),
    totalTaxPaid,
    netWithdrawals: cumulativeWithdrawal,
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
