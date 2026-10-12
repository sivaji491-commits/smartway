import { ComputedRankItem, RankItem } from "./rank-calculator";

export interface LevelBonusTier {
  level: number;
  label: string; // e.g. "L-1", "L-2", ..., "L-12"
  percentage: number; // e.g. 25, 5, 2
  isDirectReferral?: boolean; // L-1
}

export interface TwelveLevelBonusRow {
  level: number;
  label: string;
  percentage: number;
  bonusAmountUSD: number;
  bonusAmountINR: number;
  isDirectReferral?: boolean;
}

export interface TwelveLevelRankRow {
  serialNumber: number;
  id: string;
  name: string;
  basePrice: number;
  networkFeePercent: number;
  networkFeeUSD: number;
  totalWithGasUSD: number;
  multiRanksUSD: number; // Cumulative base price
  inINR: number; // totalWithGasUSD * exchangeRate
  cumulativeTotalUSD: number;
  cumulativeTotalINR: number;
}

export interface TwelveLevelCalculationResult {
  selectedRank: TwelveLevelRankRow | null;
  rows: TwelveLevelBonusRow[];
  totalPercentage: number;
  totalBonusUSD: number;
  totalBonusINR: number;
  exchangeRate: number;
}
