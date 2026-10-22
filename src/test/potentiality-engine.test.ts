import { describe, expect, it } from 'vitest';
import { 
  computePotentialityTable, 
  DEFAULT_POTENTIALITY_ROWS, 
  DEFAULT_POTENTIALITY_STATE 
} from '../lib/potentiality-engine';
import { loadPotentialityState, savePotentialityState, resetPotentialityState } from '../lib/potentiality-storage';
import { DEFAULT_RANKS } from '../lib/rank-calculator-engine';

describe('Potentiality Calculation Engine & Business Rules', () => {
  const pba1 = DEFAULT_RANKS[0]; // basePrice: 100, fee: 3%
  const pba2 = DEFAULT_RANKS[1]; // basePrice: 300, fee: 3%

  it('calculates exact figures from reference screenshot for PBA 1 with 2 referrals', () => {
    const summary = computePotentialityTable(pba1, 2, DEFAULT_POTENTIALITY_ROWS, 10, 100);

    // Summary header checks
    expect(summary.selectedRankName).toBe('PBA 1');
    expect(summary.rankPriceUSD).toBe(100);
    expect(summary.networkFeeUSD).toBe(3);
    expect(summary.totalWithFeeUSD).toBe(103);
    // INR excludes 3% network fee: 100 * 100 = 10,000
    expect(summary.rankPriceINR).toBe(10000);

    const rows = summary.computedRows;
    expect(rows).toHaveLength(12);

    // Level 1: 25% ref, earn $25.00, 2 referrals -> $50.00 ref amount, DCB $30.00, Total $80.00, Profit $72.00
    expect(rows[0].level).toBe(1);
    expect(rows[0].timeLabel).toBe('1st Week');
    expect(rows[0].referralPercentage).toBe(25);
    expect(rows[0].earnEachReferralUSD).toBe(25.00);
    expect(rows[0].teamSizeAtLevel).toBe(2);
    expect(rows[0].refAmountUSD).toBe(50.00);
    expect(rows[0].dcbAmountUSD).toBe(30.00);
    expect(rows[0].totalUSD).toBe(80.00);
    expect(rows[0].profitUSD).toBe(72.00);

    // Level 2: 5% ref, earn $5.00, 4 referrals -> $20.00, DCB 0, Total $20.00, Profit $18.00
    expect(rows[1].level).toBe(2);
    expect(rows[1].timeLabel).toBe('2nd Week');
    expect(rows[1].referralPercentage).toBe(5);
    expect(rows[1].earnEachReferralUSD).toBe(5.00);
    expect(rows[1].teamSizeAtLevel).toBe(4);
    expect(rows[1].refAmountUSD).toBe(20.00);
    expect(rows[1].dcbAmountUSD).toBe(0);
    expect(rows[1].totalUSD).toBe(20.00);
    expect(rows[1].profitUSD).toBe(18.00);

    // Level 3: 2% ref, earn $2.00, 8 referrals -> $16.00, Profit $14.40
    expect(rows[2].level).toBe(3);
    expect(rows[2].teamSizeAtLevel).toBe(8);
    expect(rows[2].refAmountUSD).toBe(16.00);
    expect(rows[2].profitUSD).toBe(14.40);

    // Level 4: 2% ref, 16 referrals -> $32.00, Profit $28.80
    expect(rows[3].teamSizeAtLevel).toBe(16);
    expect(rows[3].refAmountUSD).toBe(32.00);
    expect(rows[3].profitUSD).toBe(28.80);

    // Level 5: 32 referrals -> $64.00, Profit $57.60
    expect(rows[4].teamSizeAtLevel).toBe(32);
    expect(rows[4].refAmountUSD).toBe(64.00);
    expect(rows[4].profitUSD).toBe(57.60);

    // Level 6: 64 referrals -> $128.00, Profit $115.20
    expect(rows[5].teamSizeAtLevel).toBe(64);
    expect(rows[5].refAmountUSD).toBe(128.00);
    expect(rows[5].profitUSD).toBe(115.20);

    // Level 7: 128 referrals -> $256.00, Profit $230.40
    expect(rows[6].teamSizeAtLevel).toBe(128);
    expect(rows[6].refAmountUSD).toBe(256.00);
    expect(rows[6].profitUSD).toBe(230.40);

    // Level 8: 256 referrals -> $512.00, Profit $460.80
    expect(rows[7].teamSizeAtLevel).toBe(256);
    expect(rows[7].refAmountUSD).toBe(512.00);
    expect(rows[7].profitUSD).toBe(460.80);

    // Level 9: 512 referrals -> $1,024.00, Profit $921.60
    expect(rows[8].teamSizeAtLevel).toBe(512);
    expect(rows[8].refAmountUSD).toBe(1024.00);
    expect(rows[8].profitUSD).toBe(921.60);

    // Level 10: 1024 referrals -> $2,048.00, Profit $1,843.20
    expect(rows[9].teamSizeAtLevel).toBe(1024);
    expect(rows[9].refAmountUSD).toBe(2048.00);
    expect(rows[9].profitUSD).toBe(1843.20);

    // Level 11: 2048 referrals -> $4,096.00, Profit $3,686.40
    expect(rows[10].teamSizeAtLevel).toBe(2048);
    expect(rows[10].refAmountUSD).toBe(4096.00);
    expect(rows[10].profitUSD).toBe(3686.40);

    // Level 12: 4096 referrals -> $8,192.00, Profit $7,372.80
    expect(rows[11].teamSizeAtLevel).toBe(4096);
    expect(rows[11].refAmountUSD).toBe(8192.00);
    expect(rows[11].profitUSD).toBe(7372.80);

    // Total Profit matches reference screenshot: 14,821.20
    expect(summary.totalProfitUSD).toBe(14821.20);
    expect(summary.totalProfitINR).toBe(1482120.00);
  });

  it('dynamically adapts when another rank like PBA 2 is selected', () => {
    const summary = computePotentialityTable(pba2, 2, DEFAULT_POTENTIALITY_ROWS, 10, 100);

    expect(summary.selectedRankName).toBe('PBA 2');
    expect(summary.rankPriceUSD).toBe(300);
    expect(summary.networkFeeUSD).toBe(9);
    expect(summary.totalWithFeeUSD).toBe(309);
    expect(summary.rankPriceINR).toBe(30000);

    // Level 1: 25% of 300 = 75. Ref amount = 2 * 75 = 150. DCB 30% = 90. Total = 240. Profit = 216
    expect(summary.computedRows[0].earnEachReferralUSD).toBe(75.00);
    expect(summary.computedRows[0].refAmountUSD).toBe(150.00);
    expect(summary.computedRows[0].dcbAmountUSD).toBe(90.00);
    expect(summary.computedRows[0].totalUSD).toBe(240.00);
    expect(summary.computedRows[0].profitUSD).toBe(216.00);

    // Total profit scales 3x
    expect(summary.totalProfitUSD).toBe(44463.60);
  });

  it('recalculates reactively when referral count changes from 2 to 3', () => {
    const summary = computePotentialityTable(pba1, 3, DEFAULT_POTENTIALITY_ROWS, 10, 100);

    // At Level 1: team size is 3, ref amount is 3 * 25 = 75
    expect(summary.computedRows[0].teamSizeAtLevel).toBe(3);
    expect(summary.computedRows[0].refAmountUSD).toBe(75.00);

    // At Level 2: team size is 3^2 = 9, ref amount is 9 * 5 = 45
    expect(summary.computedRows[1].teamSizeAtLevel).toBe(9);
    expect(summary.computedRows[1].refAmountUSD).toBe(45.00);
  });

  it('handles persistent storage save, load, and reset correctly', () => {
    resetPotentialityState();
    const loaded = loadPotentialityState();
    expect(loaded.justReferGlobal).toBe(2);
    expect(loaded.transactionFeePercent).toBe(10);
    expect(loaded.rowsConfig).toHaveLength(12);
    expect(loaded.messages.bannerTitle).toBe('ONE TIME SMART WORK');

    // Update message and verify persistence
    const modified = {
      ...loaded,
      messages: {
        ...loaded.messages,
        bannerTitle: 'CUSTOM SMART WORK TITLE',
      },
    };
    savePotentialityState(modified);
    const reloaded = loadPotentialityState();
    expect(reloaded.messages.bannerTitle).toBe('CUSTOM SMART WORK TITLE');

    // Reset back to defaults
    resetPotentialityState();
    const resetLoaded = loadPotentialityState();
    expect(resetLoaded.messages.bannerTitle).toBe('ONE TIME SMART WORK');
  });

  it('implements Excel TRIM() function accurately', async () => {
    const { excelTrim } = await import('../lib/potentiality-engine');
    expect(excelTrim('  1st 5 Days  ')).toBe('1st 5 Days');
    expect(excelTrim('1st   Week')).toBe('1st Week');
    expect(excelTrim('  2   Weeks  ')).toBe('2 Weeks');
    expect(excelTrim(null)).toBe('');
    expect(excelTrim(undefined)).toBe('');
  });

  it('implements Excel-style VLOOKUP (=VLOOKUP(TRIM(C8), A53:B115, 2, FALSE)) for all 4 period types', async () => {
    const { vlookupPotentialityPeriod, autoPopulateTimeColumn } = await import('../lib/potentiality-engine');

    // 1. 1st 5 Days -> Just 2 Months, Recommended
    const daysResult = vlookupPotentialityPeriod('  1st 5 Days  ');
    expect(daysResult.periodType).toBe('days');
    expect(daysResult.summary).toBe('Just 2 Months');
    expect(daysResult.status).toBe('Recommended');
    expect(daysResult.periods).toHaveLength(12);
    expect(daysResult.periods[0]).toBe('1st 5 Days');
    expect(daysResult.periods[11]).toBe('60 Days');

    // 2. 1st Week -> Just 3 Months, Recommended
    const weekResult = vlookupPotentialityPeriod('1st Week');
    expect(weekResult.periodType).toBe('weekly');
    expect(weekResult.summary).toBe('Just 3 Months');
    expect(weekResult.status).toBe('Recommended');
    expect(weekResult.periods[0]).toBe('1st Week');
    expect(weekResult.periods[11]).toBe('12th Week');

    // 3. 2 Weeks -> Just 6 Months, Recommended
    const intervalResult = vlookupPotentialityPeriod('  2 Weeks  ');
    expect(intervalResult.periodType).toBe('interval-weeks');
    expect(intervalResult.summary).toBe('Just 6 Months');
    expect(intervalResult.status).toBe('Recommended');
    expect(intervalResult.periods[0]).toBe('2 Weeks');
    expect(intervalResult.periods[11]).toBe('24 Weeks');

    // 4. 1st Month -> Within 1 Year, Not Recommended
    const monthResult = vlookupPotentialityPeriod('1st Month');
    expect(monthResult.periodType).toBe('monthly');
    expect(monthResult.summary).toBe('Within 1 Year');
    expect(monthResult.status).toBe('Not Recommended');
    expect(monthResult.periods[0]).toBe('1st Month');
    expect(monthResult.periods[11]).toBe('12th Month');

    // Verify auto-population of rows
    const { rows: daysRows } = autoPopulateTimeColumn('1st 5 Days');
    expect(daysRows).toHaveLength(12);
    expect(daysRows[0].timeLabel).toBe('1st 5 Days');
    expect(daysRows[0].durationLabel).toBe('1st 5 Days');
    expect(daysRows[1].timeLabel).toBe('10 Days');
    expect(daysRows[11].timeLabel).toBe('60 Days');
  });
});
