import { RankItem } from '@/types/rank-calculator';
import { round2 } from '@/lib/rank-calculator-engine';
import { 
  LevelBonusTier, 
  TwelveLevelBonusRow, 
  TwelveLevelRankRow, 
  TwelveLevelCalculationResult 
} from '@/types/twelve-level-bonus';

/**
 * Standard 12-level compression tiers as shown in the business plan model:
 * L-1: 25% (Direct referral / "You")
 * L-2: 5%
 * L-3 to L-12: 2% each (10 tiers * 2% = 20%)
 * Total Payout: 50% of the rank base price
 */
export const DEFAULT_TWELVE_LEVEL_TIERS: LevelBonusTier[] = [
  { level: 12, label: 'L-12', percentage: 2 },
  { level: 11, label: 'L-11', percentage: 2 },
  { level: 10, label: 'L-10', percentage: 2 },
  { level: 9, label: 'L-9', percentage: 2 },
  { level: 8, label: 'L-8', percentage: 2 },
  { level: 7, label: 'L-7', percentage: 2 },
  { level: 6, label: 'L-6', percentage: 2 },
  { level: 5, label: 'L-5', percentage: 2 },
  { level: 4, label: 'L-4', percentage: 2 },
  { level: 3, label: 'L-3', percentage: 2 },
  { level: 2, label: 'L-2', percentage: 5 },
  { level: 1, label: 'L-1', percentage: 25, isDirectReferral: true },
];

/**
 * Computes all table rows for the 12 Level Bonus page table.
 * Accurately calculates:
 * - With gas fee = basePrice * (1 + feePercent / 100)
 * - Multi ranks = Cumulative sum of rank base prices (e.g. 100, 400, 1000, 2000, 3000, 4000, 5000)
 * - In INR = With gas fee * exchangeRate (e.g. ₹10,300, ₹30,900, ₹61,800, ₹1,03,000)
 */
export function computeTwelveLevelRanks(ranks: RankItem[], exchangeRate: number): TwelveLevelRankRow[] {
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;
  const sorted = [...ranks].sort((a, b) => a.order - b.order);

  let runningCumulativeBasePrice = 0;
  let runningCumulativeCostUSD = 0;

  return sorted.map((rank, index) => {
    const serialNumber = index + 1;
    const basePrice = Math.max(0, Number(rank.basePrice) || 0);
    const feePercent = Math.max(0, Number(rank.networkFeePercent) || 0);

    const networkFeeUSD = round2(basePrice * (feePercent / 100));
    const totalWithGasUSD = round2(basePrice + networkFeeUSD);

    runningCumulativeBasePrice = round2(runningCumulativeBasePrice + basePrice);
    runningCumulativeCostUSD = round2(runningCumulativeCostUSD + totalWithGasUSD);

    const multiRanksUSD = runningCumulativeBasePrice;
    const inINR = round2(totalWithGasUSD * safeRate);
    const cumulativeTotalUSD = runningCumulativeCostUSD;
    const cumulativeTotalINR = round2(cumulativeTotalUSD * safeRate);

    return {
      serialNumber,
      id: rank.id,
      name: rank.name,
      basePrice,
      networkFeePercent: feePercent,
      networkFeeUSD,
      totalWithGasUSD,
      multiRanksUSD,
      inINR,
      cumulativeTotalUSD,
      cumulativeTotalINR,
    };
  });
}

/**
 * Calculates bonus amounts for all 12 levels given a rank base price and exchange rate.
 * Order: default descending (L-12 down to L-1 as shown in reference design).
 */
export function calculateTwelveLevelBonus(
  basePrice: number, 
  exchangeRate: number,
  descending = true
): TwelveLevelBonusRow[] {
  const safePrice = Math.max(0, Number(basePrice) || 0);
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;

  const tiers = descending ? DEFAULT_TWELVE_LEVEL_TIERS : [...DEFAULT_TWELVE_LEVEL_TIERS].reverse();

  return tiers.map((tier) => {
    const bonusAmountUSD = round2(safePrice * (tier.percentage / 100));
    const bonusAmountINR = round2(bonusAmountUSD * safeRate);

    return {
      level: tier.level,
      label: tier.label,
      percentage: tier.percentage,
      bonusAmountUSD,
      bonusAmountINR,
      isDirectReferral: tier.isDirectReferral,
    };
  });
}

/**
 * Computes full calculation result for the active selected rank.
 */
export function computeTwelveLevelCalculationResult(
  ranks: RankItem[],
  selectedRankId: string | undefined,
  exchangeRate: number,
  descending = true
): TwelveLevelCalculationResult {
  const computedRanks = computeTwelveLevelRanks(ranks, exchangeRate);
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;

  let selectedRank: TwelveLevelRankRow | null = null;
  if (computedRanks.length > 0) {
    selectedRank = computedRanks.find((r) => r.id === selectedRankId) || computedRanks[computedRanks.length - 1] || computedRanks[0];
  }

  const basePrice = selectedRank ? selectedRank.basePrice : 0;
  const rows = calculateTwelveLevelBonus(basePrice, safeRate, descending);

  const totalPercentage = rows.reduce((acc, r) => acc + r.percentage, 0);
  const totalBonusUSD = round2(rows.reduce((acc, r) => acc + r.bonusAmountUSD, 0));
  const totalBonusINR = round2(totalBonusUSD * safeRate);

  return {
    selectedRank,
    rows,
    totalPercentage,
    totalBonusUSD,
    totalBonusINR,
    exchangeRate: safeRate,
  };
}
