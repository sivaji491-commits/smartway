import { RankItem } from '@/types/rank-calculator';
import { round2 } from '@/lib/rank-calculator-engine';
import { 
  DcbCalculationResult, 
  DcbMilestone, 
  DcbRankRow 
} from '@/types/dcb-bonus';

export const DEFAULT_DCB_SETTINGS = {
  ref1Percentage: 25,
  ref2Percentage: 25,
  dcbReleasePercentage: 30,
  withdrawalFeePercentage: 10,
  eligibilityPeriodDays: 90,
};

/**
 * Computes all table rows for the DCB (90 days) page table.
 * Accurately derives:
 * - basePrice
 * - totalWithGasUSD = basePrice * (1 + feePercent / 100)
 * - multiRanksUSD = cumulative sum of base prices
 * - inINR = totalWithGasUSD * exchangeRate
 */
export function computeDcbRanks(ranks: RankItem[], exchangeRate: number): DcbRankRow[] {
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
 * Calculates DCB earnings for a given rank value and currency rate.
 * - Ref 1: 25% of rank value
 * - Ref 2: 25% of rank value
 * - DCB 30% Release: 30% of rank value
 * - Gross Total: Ref 1 + Ref 2 + DCB (80% of rank value)
 * - Withdrawal Fee: 10% of Gross Total
 * - Net Total: Gross Total - Withdrawal Fee
 * - Milestones: 2, 4, 6 direct qualifying referrals
 */
export function calculateDcbBonus(
  rankName: string,
  rankId: string,
  rankValueUSD: number,
  exchangeRate: number,
  settings = DEFAULT_DCB_SETTINGS
): DcbCalculationResult {
  const safeValueUSD = Math.max(0, Number(rankValueUSD) || 0);
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;

  const rankValueINR = round2(safeValueUSD * safeRate);

  const ref1AmountUSD = round2(safeValueUSD * (settings.ref1Percentage / 100));
  const ref2AmountUSD = round2(safeValueUSD * (settings.ref2Percentage / 100));
  const dcbAmountUSD = round2(safeValueUSD * (settings.dcbReleasePercentage / 100));

  const grossAmountUSD = round2(ref1AmountUSD + ref2AmountUSD + dcbAmountUSD);
  const withdrawalFeeUSD = round2(grossAmountUSD * (settings.withdrawalFeePercentage / 100));
  const netTotalUSD = round2(grossAmountUSD - withdrawalFeeUSD);
  const netTotalINR = round2(netTotalUSD * safeRate);

  const milestones: DcbMilestone[] = [
    {
      referralCount: 2,
      label: '2 ↑',
      totalUSD: netTotalUSD,
      totalINR: netTotalINR,
    },
    {
      referralCount: 4,
      label: '4 ↑',
      totalUSD: round2(netTotalUSD * 2),
      totalINR: round2(netTotalINR * 2),
    },
    {
      referralCount: 6,
      label: '6 ↑',
      totalUSD: round2(netTotalUSD * 3),
      totalINR: round2(netTotalINR * 3),
    },
  ];

  return {
    rankId,
    rankName,
    rankValueUSD: safeValueUSD,
    rankValueINR,
    ref1Percentage: settings.ref1Percentage,
    ref1AmountUSD,
    ref2Percentage: settings.ref2Percentage,
    ref2AmountUSD,
    dcbPercentage: settings.dcbReleasePercentage,
    dcbAmountUSD,
    grossAmountUSD,
    withdrawalFeePercent: settings.withdrawalFeePercentage,
    withdrawalFeeUSD,
    netTotalUSD,
    netTotalINR,
    milestones,
  };
}
