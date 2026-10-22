export type TimePeriodType = 'days' | 'weekly' | 'interval-weeks' | 'monthly';

export interface TimePeriodTypeConfig {
  id: TimePeriodType;
  label: string; // "Days", "Weekly", "Interval Weeks", "Monthly"
  summary: string; // e.g. "Just 2 Months", "Just 3 Months", "Just 6 Months", "Within 1 Year"
  status: string; // "Recommended" or "Not Recommended"
  options: string[]; // the 12 chronological options
}

export interface PotentialityRowConfig {
  id: string;
  level: number; // 1 to 12
  timeLabel: string; // e.g. "1st Week", "1st 5 Days", ...
  referralPercentage: number; // e.g. 25, 5, 2
  dcbPercentage: number; // e.g. 30 for Level 1, 0 for other levels
  durationLabel: string; // e.g. "1st Week"
}

export interface PotentialityComputedRow {
  id: string;
  level: number;
  timeLabel: string;
  rankName: string;
  levelLabel: string; // "L-1", "L-2", etc.
  justRefer: number; // e.g. 2
  referralPercentage: number;
  earnEachReferralUSD: number;
  teamSizeAtLevel: number; // 2^level (e.g. 2, 4, 8, 16...)
  refAmountUSD: number; // teamSizeAtLevel * earnEachReferralUSD
  dcbAmountUSD: number; // rankPrice * (dcbPercentage / 100)
  totalUSD: number; // refAmountUSD + dcbAmountUSD
  profitUSD: number; // totalUSD * (1 - transactionFeePercent / 100)
  durationLabel: string;
}

export interface PotentialityMessages {
  topNote: string;
  recommendedBadge: string;
  monthsBadge: string;
  bannerHeader: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerTarget: string;
  nonWorkingIncomeLabel: string;
  successRatioTitle: string;
  successRatioValue: string;
  bottomTranFeeNote: string;
  bottomAprxNote: string;
  bottomReinvestNote: string;
}

export interface PotentialityState {
  activePeriodType: TimePeriodType; // default 'weekly'
  periodConfigs: Record<TimePeriodType, TimePeriodTypeConfig>;
  justReferGlobal: number; // default 2
  transactionFeePercent: number; // default 10
  rowsConfig: PotentialityRowConfig[];
  messages: PotentialityMessages;
  customJustReferOptions: number[]; // [2, 4, 6, 8, 10]
  availableTimePeriods: string[];
}

export interface PotentialityCalculationSummary {
  selectedRankId: string;
  selectedRankName: string;
  rankPriceUSD: number;
  networkFeeUSD: number;
  totalWithFeeUSD: number;
  rankPriceINR: number; // excludes network fee
  exchangeRate: number;
  totalProfitUSD: number;
  totalProfitINR: number;
  computedRows: PotentialityComputedRow[];
}
