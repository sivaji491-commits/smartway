import { RankItem } from '@/types/rank-calculator';
import { 
  TimePeriodType,
  TimePeriodTypeConfig,
  PotentialityRowConfig, 
  PotentialityComputedRow, 
  PotentialityMessages, 
  PotentialityState,
  PotentialityCalculationSummary
} from '@/types/potentiality';
import { round2 } from '@/lib/rank-calculator-engine';

export const DEFAULT_PERIOD_CONFIGS: Record<TimePeriodType, TimePeriodTypeConfig> = {
  days: {
    id: 'days',
    label: 'Days',
    summary: 'Just 2 Months',
    status: 'Recommended',
    options: [
      '1st 5 Days',
      '10 Days',
      '15 Days',
      '20 Days',
      '25 Days',
      '30 Days',
      '35 Days',
      '40 Days',
      '45 Days',
      '50 Days',
      '55 Days',
      '60 Days',
    ],
  },
  weekly: {
    id: 'weekly',
    label: 'Weekly',
    summary: 'Just 3 Months',
    status: 'Recommended',
    options: [
      '1st Week',
      '2nd Week',
      '3rd Week',
      '4th Week',
      '5th Week',
      '6th Week',
      '7th Week',
      '8th Week',
      '9th Week',
      '10th Week',
      '11th Week',
      '12th Week',
    ],
  },
  'interval-weeks': {
    id: 'interval-weeks',
    label: 'Interval Weeks',
    summary: 'Just 6 Months',
    status: 'Recommended',
    options: [
      '2 Weeks',
      '4 Weeks',
      '6 Weeks',
      '8 Weeks',
      '10 Weeks',
      '12 Weeks',
      '14 Weeks',
      '16 Weeks',
      '18 Weeks',
      '20 Weeks',
      '22 Weeks',
      '24 Weeks',
    ],
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    summary: 'Within 1 Year',
    status: 'Not Recommended',
    options: [
      '1st Month',
      '2nd Month',
      '3rd Month',
      '4th Month',
      '5th Month',
      '6th Month',
      '7th Month',
      '8th Month',
      '9th Month',
      '10th Month',
      '11th Month',
      '12th Month',
    ],
  },
};

export const DEFAULT_JUST_REFER_OPTIONS: number[] = [2, 4, 6, 8, 10];

export const DEFAULT_POTENTIALITY_TIME_PERIODS: string[] = DEFAULT_PERIOD_CONFIGS.weekly.options;

export const DEFAULT_POTENTIALITY_ROWS: PotentialityRowConfig[] = [
  { id: 'pot-row-1', level: 1, timeLabel: '1st Week', referralPercentage: 25, dcbPercentage: 30, durationLabel: '1st Week' },
  { id: 'pot-row-2', level: 2, timeLabel: '2nd Week', referralPercentage: 5, dcbPercentage: 0, durationLabel: '2nd Week' },
  { id: 'pot-row-3', level: 3, timeLabel: '3rd Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '3rd Week' },
  { id: 'pot-row-4', level: 4, timeLabel: '4th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '4th Week' },
  { id: 'pot-row-5', level: 5, timeLabel: '5th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '5th Week' },
  { id: 'pot-row-6', level: 6, timeLabel: '6th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '6th Week' },
  { id: 'pot-row-7', level: 7, timeLabel: '7th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '7th Week' },
  { id: 'pot-row-8', level: 8, timeLabel: '8th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '8th Week' },
  { id: 'pot-row-9', level: 9, timeLabel: '9th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '9th Week' },
  { id: 'pot-row-10', level: 10, timeLabel: '10th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '10th Week' },
  { id: 'pot-row-11', level: 11, timeLabel: '11th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '11th Week' },
  { id: 'pot-row-12', level: 12, timeLabel: '12th Week', referralPercentage: 2, dcbPercentage: 0, durationLabel: '12th Week' },
];

export const DEFAULT_POTENTIALITY_MESSAGES: PotentialityMessages = {
  topNote: 'Note: Including 3% Network fee.',
  recommendedBadge: 'Recommended',
  monthsBadge: 'Just 3 Months',
  bannerHeader: 'ONE SMALL STEP CAN CHANGE YOUR LIFE',
  bannerTitle: 'ONE TIME SMART WORK',
  bannerSubtitle: 'For your real financial growth, Invest your idea, not money',
  bannerTarget: 'Minimum target ONE YEAR ➔ 1 Cr.',
  nonWorkingIncomeLabel: 'NON WORKING INCOME',
  successRatioTitle: 'Success ratio With 2 ref. *',
  successRatioValue: '5 Cr.',
  bottomTranFeeNote: 'Tran.fee applicable.',
  bottomAprxNote: 'Aprx. calculation.',
  bottomReinvestNote: "Note: Go to the NEXT RANK, with the dollars you have earned. Don't take even 1/-rupee also from your pocket.",
};

export const DEFAULT_POTENTIALITY_STATE: PotentialityState = {
  activePeriodType: 'weekly',
  periodConfigs: DEFAULT_PERIOD_CONFIGS,
  justReferGlobal: 2,
  transactionFeePercent: 10,
  rowsConfig: DEFAULT_POTENTIALITY_ROWS,
  messages: DEFAULT_POTENTIALITY_MESSAGES,
  customJustReferOptions: DEFAULT_JUST_REFER_OPTIONS,
  availableTimePeriods: DEFAULT_PERIOD_CONFIGS.weekly.options,
};

/**
 * Generates rows configured for a specific time period type
 */
export function generateRowsForPeriodType(
  periodType: TimePeriodType,
  periodConfigs: Record<TimePeriodType, TimePeriodTypeConfig> = DEFAULT_PERIOD_CONFIGS
): PotentialityRowConfig[] {
  const cfg = periodConfigs[periodType] || periodConfigs.weekly;
  return DEFAULT_POTENTIALITY_ROWS.map((baseRow, idx) => {
    const opt = cfg.options[idx] || `${idx + 1}th Period`;
    return {
      ...baseRow,
      timeLabel: opt,
      durationLabel: opt,
    };
  });
}

export const MAIN_TIME_DROPDOWN_OPTIONS = [
  '1st 5 Days',
  '1st Week',
  '2 Weeks',
  '1st Month',
] as const;

export type MainTimeDropdownOption = typeof MAIN_TIME_DROPDOWN_OPTIONS[number];

export const MAIN_OPTION_TO_PERIOD_TYPE: Record<MainTimeDropdownOption, TimePeriodType> = {
  '1st 5 Days': 'days',
  '1st Week': 'weekly',
  '2 Weeks': 'interval-weeks',
  '1st Month': 'monthly',
};

export const PERIOD_TYPE_TO_MAIN_OPTION: Record<TimePeriodType, MainTimeDropdownOption> = {
  days: '1st 5 Days',
  weekly: '1st Week',
  'interval-weeks': '2 Weeks',
  monthly: '1st Month',
};

/**
 * Excel TRIM() implementation: removes leading and trailing spaces and collapses multiple spaces.
 * Equivalent to TRIM(C8) in Excel.
 */
export function excelTrim(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ');
}

export interface VLookupPeriodResult {
  searchKey: string;
  matchedOption: MainTimeDropdownOption;
  periodType: TimePeriodType;
  label: string;
  summary: string;
  status: string;
  periods: string[];
}

/**
 * Excel-Style VLOOKUP Implementation:
 * Formula: =VLOOKUP(TRIM(C8), A53:B115, 2, FALSE)
 * Exact match lookup on the trimmed key to auto-populate the time column periods and summary.
 */
export function vlookupPotentialityPeriod(
  rawSearchKey: string,
  periodConfigs: Record<TimePeriodType, TimePeriodTypeConfig> = DEFAULT_PERIOD_CONFIGS
): VLookupPeriodResult {
  const trimmed = excelTrim(rawSearchKey);
  const normalized = trimmed.toLowerCase();

  let matchedType: TimePeriodType = 'weekly';

  if (
    normalized === '1st 5 days' || 
    normalized === '5 days' || 
    normalized === 'days'
  ) {
    matchedType = 'days';
  } else if (
    normalized === '1st week' || 
    normalized === 'weekly' || 
    normalized === 'weeks' || 
    normalized === 'week'
  ) {
    matchedType = 'weekly';
  } else if (
    normalized === '2 weeks' || 
    normalized === 'interval weeks' || 
    normalized === 'interval-weeks' || 
    normalized === 'interval'
  ) {
    matchedType = 'interval-weeks';
  } else if (
    normalized === '1st month' || 
    normalized === 'monthly' || 
    normalized === 'month' || 
    normalized === 'months'
  ) {
    matchedType = 'monthly';
  }

  const cfg = periodConfigs[matchedType] || DEFAULT_PERIOD_CONFIGS[matchedType];
  const matchedOption = PERIOD_TYPE_TO_MAIN_OPTION[matchedType];

  return {
    searchKey: trimmed,
    matchedOption,
    periodType: matchedType,
    label: cfg.label,
    summary: cfg.summary,
    status: cfg.status,
    periods: cfg.options,
  };
}

/**
 * Automatically populates the 12 rows of the Time column and Duration column based on VLOOKUP.
 */
export function autoPopulateTimeColumn(
  selectedKey: string,
  periodConfigs: Record<TimePeriodType, TimePeriodTypeConfig> = DEFAULT_PERIOD_CONFIGS
): {
  rows: PotentialityRowConfig[];
  vlookupResult: VLookupPeriodResult;
} {
  const vlookupResult = vlookupPotentialityPeriod(selectedKey, periodConfigs);
  const rows = generateRowsForPeriodType(vlookupResult.periodType, periodConfigs);
  return { rows, vlookupResult };
}

/**
 * Computes all 12 rows and summary figures for the Potentiality page
 */
export function computePotentialityTable(
  selectedRank: RankItem,
  justRefer: number,
  rowsConfig: PotentialityRowConfig[],
  transactionFeePercent: number = 10,
  exchangeRate: number = 100
): PotentialityCalculationSummary {
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;
  const rankPriceUSD = Math.max(0, Number(selectedRank?.basePrice) || 0);
  const feePercent = Math.max(0, Number(selectedRank?.networkFeePercent) >= 0 ? Number(selectedRank.networkFeePercent) : 3);
  
  const networkFeeUSD = round2(rankPriceUSD * (feePercent / 100));
  const totalWithFeeUSD = round2(rankPriceUSD + networkFeeUSD);
  
  // Important Requirement: INR value calculated from the original rank price, excluding network fee
  const rankPriceINR = round2(rankPriceUSD * safeRate);

  const safeJustRefer = Number.isFinite(justRefer) && justRefer > 0 ? justRefer : 2;
  const safeFeePercent = Number.isFinite(transactionFeePercent) && transactionFeePercent >= 0 ? transactionFeePercent : 10;

  const computedRows: PotentialityComputedRow[] = rowsConfig.map((row) => {
    const earnEachReferralUSD = round2(rankPriceUSD * (row.referralPercentage / 100));
    
    // Team size at this tier: (Just Refer)^Level
    const teamSizeAtLevel = Math.pow(safeJustRefer, row.level);
    
    // Ref. Amount = Team Size * Earn Each Referral
    const refAmountUSD = round2(teamSizeAtLevel * earnEachReferralUSD);
    
    // DCB = Rank Price * DCB Percentage
    const dcbAmountUSD = round2(rankPriceUSD * (row.dcbPercentage / 100));
    
    // Total = Ref Amount + DCB
    const totalUSD = round2(refAmountUSD + dcbAmountUSD);
    
    // Profit = Total - Transaction Fee
    const profitUSD = round2(totalUSD * (1 - safeFeePercent / 100));

    return {
      id: row.id,
      level: row.level,
      timeLabel: row.timeLabel,
      rankName: selectedRank?.name || 'PBA 1',
      levelLabel: `L-${row.level}`,
      justRefer: safeJustRefer,
      referralPercentage: row.referralPercentage,
      earnEachReferralUSD,
      teamSizeAtLevel,
      refAmountUSD,
      dcbAmountUSD,
      totalUSD,
      profitUSD,
      durationLabel: row.durationLabel,
    };
  });

  const totalProfitUSD = round2(computedRows.reduce((acc, r) => acc + r.profitUSD, 0));
  const totalProfitINR = round2(totalProfitUSD * safeRate);

  return {
    selectedRankId: selectedRank?.id || 'pba-1',
    selectedRankName: selectedRank?.name || 'PBA 1',
    rankPriceUSD,
    networkFeeUSD,
    totalWithFeeUSD,
    rankPriceINR,
    exchangeRate: safeRate,
    totalProfitUSD,
    totalProfitINR,
    computedRows,
  };
}
