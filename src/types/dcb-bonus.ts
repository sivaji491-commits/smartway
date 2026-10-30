import { ComputedRankItem } from '@/types/rank-calculator';

export interface DcbMilestone {
  referralCount: number;
  label: string;
  totalUSD: number;
  totalINR: number;
}

export interface DcbCalculationResult {
  rankId: string;
  rankName: string;
  rankValueUSD: number; // Multi-ranks cumulative base value (e.g. $5,000 for PBA 7)
  rankValueINR: number;
  ref1Percentage: number; // 25%
  ref1AmountUSD: number; // e.g. $1,250 for PBA 7
  ref2Percentage: number; // 25%
  ref2AmountUSD: number; // e.g. $1,250 for PBA 7
  dcbPercentage: number; // 30%
  dcbAmountUSD: number; // e.g. $1,500 for PBA 7
  grossAmountUSD: number; // e.g. $4,000 for PBA 7 (80% of rank value)
  withdrawalFeePercent: number; // 10%
  withdrawalFeeUSD: number; // e.g. $400 for PBA 7
  netTotalUSD: number; // e.g. $3,600 for PBA 7
  netTotalINR: number; // e.g. ₹3,60,000 for PBA 7 at ₹100/USD
  milestones: DcbMilestone[]; // 2, 4, 6 qualifying referrals
}

export interface DcbRankRow extends ComputedRankItem {
  // Inherits serialNumber, name, basePrice, networkFeePercent, totalWithGasUSD, multiRanksUSD, inINR
}

export interface DcbConfig {
  ref1Percentage: number; // e.g. 25
  ref2Percentage: number; // e.g. 25
  dcbReleasePercentage: number; // e.g. 30
  withdrawalFeePercentage: number; // e.g. 10
  eligibilityPeriodDays: number; // e.g. 90
  subtitle?: string;
  importantPoints?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface DcbValidationResult {
  valid: boolean;
  error?: string;
}

export interface DcbServerResult {
  success: boolean;
  error?: string;
  data?: DcbConfig;
}

