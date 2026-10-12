import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DEFAULT_RANKS, 
  computeRankTotals, 
  computeGrandTotals, 
  formatUSD, 
  formatINR, 
  formatPercent, 
  generateNextRankName, 
  exportRanksToCSV, 
  parseRanksFromCSV, 
  validateBackupData 
} from '@/lib/rank-calculator-engine';
import { 
  loadRankCalculatorState, 
  saveRankCalculatorState, 
  resetRankCalculatorToDefault, 
  STORAGE_KEY 
} from '@/lib/rank-storage';
import { RankItem, RankCalculatorState } from '@/types/rank-calculator';

describe('Rank Management & Cost Calculator Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Section 2 & 3: Default Ranks & Calculation Accuracy', () => {
    it('initializes with seven default ranks and correct base prices', () => {
      expect(DEFAULT_RANKS).toHaveLength(7);
      expect(DEFAULT_RANKS[0]?.name).toBe('PBA 1');
      expect(DEFAULT_RANKS[0]?.basePrice).toBe(100);
      expect(DEFAULT_RANKS[1]?.name).toBe('PBA 2');
      expect(DEFAULT_RANKS[1]?.basePrice).toBe(300);
      expect(DEFAULT_RANKS[2]?.name).toBe('PBA 3');
      expect(DEFAULT_RANKS[2]?.basePrice).toBe(600);
      expect(DEFAULT_RANKS[3]?.name).toBe('PBA 4');
      expect(DEFAULT_RANKS[3]?.basePrice).toBe(1000);
      expect(DEFAULT_RANKS[4]?.name).toBe('PBA 5');
      expect(DEFAULT_RANKS[4]?.basePrice).toBe(1000);
      expect(DEFAULT_RANKS[5]?.name).toBe('PBA 6');
      expect(DEFAULT_RANKS[5]?.basePrice).toBe(1000);
      expect(DEFAULT_RANKS[6]?.name).toBe('PBA 7');
      expect(DEFAULT_RANKS[6]?.basePrice).toBe(1000);
    });

    it('calculates PBA 1: Base $100 -> Fee $3 (3%) -> Total Cost $103 -> Cumulative Total $103', () => {
      const computed = computeRankTotals(DEFAULT_RANKS, 100);
      const pba1 = computed[0]!;

      expect(pba1.basePrice).toBe(100);
      expect(pba1.networkFeePercent).toBe(3);
      expect(pba1.networkFeeUSD).toBe(3);
      expect(pba1.totalRankCostUSD).toBe(103);
      expect(pba1.cumulativeTotalUSD).toBe(103);
      expect(pba1.cumulativeTotalINR).toBe(10300);
    });

    it('calculates PBA 2: Base $300 -> Fee $9 -> Total Cost $309 -> Cumulative Total $412', () => {
      const computed = computeRankTotals(DEFAULT_RANKS, 100);
      const pba2 = computed[1]!;

      expect(pba2.basePrice).toBe(300);
      expect(pba2.networkFeeUSD).toBe(9);
      expect(pba2.totalRankCostUSD).toBe(309);
      expect(pba2.cumulativeTotalUSD).toBe(412); // 103 + 309 = 412
      expect(pba2.cumulativeTotalINR).toBe(41200);
    });

    it('calculates PBA 3: Base $600 -> Fee $18 -> Total Cost $618 -> Cumulative Total $1,030', () => {
      const computed = computeRankTotals(DEFAULT_RANKS, 100);
      const pba3 = computed[2]!;

      expect(pba3.basePrice).toBe(600);
      expect(pba3.networkFeeUSD).toBe(18);
      expect(pba3.totalRankCostUSD).toBe(618);
      expect(pba3.cumulativeTotalUSD).toBe(1030); // 412 + 618 = 1030
    });

    it('verifies that at exchange rate 100, PBA 3 cumulative INR equals ₹1,03,000', () => {
      const computed = computeRankTotals(DEFAULT_RANKS, 100);
      const pba3 = computed[2]!;

      expect(pba3.cumulativeTotalUSD).toBe(1030);
      expect(pba3.cumulativeTotalINR).toBe(103000);
      // Format verify
      const inrStr = formatINR(pba3.cumulativeTotalINR);
      expect(inrStr).toContain('1,03,000.00');
    });

    it('calculates full progression through PBA 7 and verifies Grand Total matches last rank', () => {
      const computed = computeRankTotals(DEFAULT_RANKS, 100);
      expect(computed).toHaveLength(7);

      // Total Base: 100+300+600+1000+1000+1000+1000 = 4600
      // 3% Fees: 3+9+18+30+30+30+30 = 150
      // Total Investment: 4600 + 150 = 4750 (Wait, 3% of 4600 is 138: 3+9+18+30+30+30+30 = 150. Wait! 3% of 1000 is 30, so 3+9+18+30+30+30+30 = 150)
      const lastRank = computed[6]!;
      expect(lastRank.cumulativeTotalUSD).toBe(5150); // wait: 103+309+618+1030+1030+1030+1030 = 5150!

      const grandTotals = computeGrandTotals(computed, 100);
      expect(grandTotals.totalRanks).toBe(7);
      expect(grandTotals.totalInvestmentUSD).toBe(lastRank.cumulativeTotalUSD);
      expect(grandTotals.totalInvestmentINR).toBe(lastRank.cumulativeTotalINR);
    });
  });

  describe('Section 4: Exchange Rate Dynamics', () => {
    it('changing exchange rate updates INR only while keeping USD values untouched', () => {
      const computedAt100 = computeRankTotals(DEFAULT_RANKS, 100);
      const computedAt85 = computeRankTotals(DEFAULT_RANKS, 85);

      for (let i = 0; i < DEFAULT_RANKS.length; i++) {
        const at100 = computedAt100[i]!;
        const at85 = computedAt85[i]!;

        // USD values are strictly identical
        expect(at85.basePrice).toBe(at100.basePrice);
        expect(at85.networkFeeUSD).toBe(at100.networkFeeUSD);
        expect(at85.totalRankCostUSD).toBe(at100.totalRankCostUSD);
        expect(at85.cumulativeTotalUSD).toBe(at100.cumulativeTotalUSD);

        // INR values are updated according to new rate 85
        expect(at85.cumulativeTotalINR).toBe(Math.round(at100.cumulativeTotalUSD * 85 * 100) / 100);
      }
    });
  });

  describe('Section 2: Dynamic Ranks (Unlimited, Add, Edit, Delete, Reorder)', () => {
    it('generates sensible next rank name (PBA 8 after PBA 7)', () => {
      const next = generateNextRankName(DEFAULT_RANKS);
      expect(next).toBe('PBA 8');

      const customRanks: RankItem[] = [
        { id: '1', name: 'Starter', basePrice: 50, networkFeePercent: 3, order: 1 }
      ];
      expect(generateNextRankName(customRanks)).toBe('Rank 2');
    });

    it('editing prices updates all downstream cumulative totals immediately', () => {
      const modifiedRanks: RankItem[] = [
        { id: '1', name: 'PBA 1', basePrice: 200, networkFeePercent: 3, order: 1 }, // Changed from 100 to 200
        { id: '2', name: 'PBA 2', basePrice: 300, networkFeePercent: 3, order: 2 },
      ];

      const computed = computeRankTotals(modifiedRanks, 100);
      // PBA 1: Base 200, Fee 6, Total 206
      expect(computed[0]?.totalRankCostUSD).toBe(206);
      expect(computed[0]?.cumulativeTotalUSD).toBe(206);

      // PBA 2: Base 300, Fee 9, Total 309 -> Cumulative: 206 + 309 = 515
      expect(computed[1]?.totalRankCostUSD).toBe(309);
      expect(computed[1]?.cumulativeTotalUSD).toBe(515);
    });

    it('reordering ranks recalculates cumulative totals in new order', () => {
      // Swap PBA 1 and PBA 2
      const reordered: RankItem[] = [
        { id: '2', name: 'PBA 2', basePrice: 300, networkFeePercent: 3, order: 1 },
        { id: '1', name: 'PBA 1', basePrice: 100, networkFeePercent: 3, order: 2 },
      ];

      const computed = computeRankTotals(reordered, 100);
      // In new order: PBA 2 comes first (Total 309, Cumulative 309)
      expect(computed[0]?.name).toBe('PBA 2');
      expect(computed[0]?.cumulativeTotalUSD).toBe(309);

      // PBA 1 comes second (Total 103, Cumulative 309 + 103 = 412)
      expect(computed[1]?.name).toBe('PBA 1');
      expect(computed[1]?.cumulativeTotalUSD).toBe(412);
    });
  });

  describe('Section 6: Auto-Save & localStorage Persistence', () => {
    it('initializes default 7 ranks when localStorage is empty', () => {
      const state = loadRankCalculatorState();
      expect(state.ranks).toHaveLength(7);
      expect(state.currency.exchangeRateUSDToINR).toBe(100);
    });

    it('persists changes to localStorage and reloads them cleanly', () => {
      const customState: RankCalculatorState = {
        ranks: [
          { id: 'c1', name: 'Elite Tier', basePrice: 5000, networkFeePercent: 2, order: 1 }
        ],
        currency: {
          exchangeRateUSDToINR: 92.5,
          lastUpdated: '2026-10-09T12:00:00Z',
        },
        note: 'Custom notes',
      };

      const saved = saveRankCalculatorState(customState);
      expect(saved).toBe(true);

      const reloaded = loadRankCalculatorState();
      expect(reloaded.ranks).toHaveLength(1);
      expect(reloaded.ranks[0]?.name).toBe('Elite Tier');
      expect(reloaded.currency.exchangeRateUSDToINR).toBe(92.5);
      expect(reloaded.note).toBe('Custom notes');
    });

    it('gracefully handles corrupted JSON in localStorage without crashing', () => {
      localStorage.setItem(STORAGE_KEY, '{invalid-json:::');
      const recovered = loadRankCalculatorState();
      expect(recovered.ranks).toHaveLength(7);
      expect(recovered.currency.exchangeRateUSDToINR).toBe(100);
    });

    it('resets to factory default 7 ranks and exchange rate 100 on resetRankCalculatorToDefault', () => {
      resetRankCalculatorToDefault();
      const state = loadRankCalculatorState();
      expect(state.ranks).toHaveLength(7);
      expect(state.currency.exchangeRateUSDToINR).toBe(100);
    });
  });

  describe('Section 7: Full JSON Backup & Atomic Restore', () => {
    it('validates a correct backup structure', () => {
      const validBackup = {
        schemaVersion: '1.0',
        exportTimestamp: new Date().toISOString(),
        currency: { exchangeRateUSDToINR: 95, lastUpdated: new Date().toISOString() },
        ranks: [
          { id: 'r1', name: 'PBA 1', basePrice: 100, networkFeePercent: 3, order: 1 },
          { id: 'r2', name: 'PBA 2', basePrice: 300, networkFeePercent: 3, order: 2 },
        ],
        note: 'Test note',
      };

      const result = validateBackupData(validBackup);
      expect(result.valid).toBe(true);
      expect(result.preview?.rankCount).toBe(2);
      expect(result.preview?.exchangeRate).toBe(95);
      expect(result.backupData?.ranks).toHaveLength(2);
    });

    it('rejects invalid backup without ranks or with corrupted data atomically', () => {
      const invalidBackup1 = { note: 'only a note' };
      const res1 = validateBackupData(invalidBackup1);
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('missing ranks data');

      const invalidBackup2 = {
        ranks: [{ name: 'Bad Rank', basePrice: -500 }]
      };
      const res2 = validateBackupData(invalidBackup2);
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('invalid base price');
    });
  });

  describe('Section 8: CSV Export & Import', () => {
    it('exports ranks with all required columns and calculated totals', () => {
      const computed = computeRankTotals(DEFAULT_RANKS.slice(0, 3), 100);
      const csv = exportRanksToCSV(computed);

      expect(csv).toContain('S.No.,Rank Name,Base Price (USD),Network Fee (%),Network Fee (USD),Total Rank Cost (USD),Cumulative Total (USD),Cumulative Total (INR)');
      expect(csv).toContain('1,PBA 1,100.00,3%,3.00,103.00,103.00,10300.00');
      expect(csv).toContain('2,PBA 2,300.00,3%,9.00,309.00,412.00,41200.00');
      expect(csv).toContain('3,PBA 3,600.00,3%,18.00,618.00,1030.00,103000.00');
    });

    it('parses imported CSV data and flags row-specific errors', () => {
      const sampleCSV = `Rank Name,Base Price (USD),Network Fee (%)
PBA Alpha,150,3
PBA Beta,450,2.5`;

      const result = parseRanksFromCSV(sampleCSV);
      expect(result.success).toBe(true);
      expect(result.ranks).toHaveLength(2);
      expect(result.ranks?.[0]?.name).toBe('PBA Alpha');
      expect(result.ranks?.[0]?.basePrice).toBe(150);
      expect(result.ranks?.[1]?.name).toBe('PBA Beta');
      expect(result.ranks?.[1]?.networkFeePercent).toBe(2.5);
    });

    it('reports row-level errors for invalid prices in CSV import', () => {
      const badCSV = `Rank Name,Base Price,Network Fee
Valid Rank,100,3
Invalid Rank,NOT_A_PRICE,3`;

      const result = parseRanksFromCSV(badCSV);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Base price must be a positive number');
    });
  });

  describe('Section 10: Formatting Utilities', () => {
    it('formats USD correctly with 2 decimal places', () => {
      expect(formatUSD(100)).toBe('$100.00');
      expect(formatUSD(1000)).toBe('$1,000.00');
      expect(formatUSD(1030.5)).toBe('$1,030.50');
    });

    it('formats INR using Indian number grouping (thousands, lakhs, crores)', () => {
      const inr1Lakh = formatINR(103000);
      expect(inr1Lakh).toContain('1,03,000.00');
      expect(inr1Lakh).toContain('₹');
    });

    it('formats percent values cleanly', () => {
      expect(formatPercent(3)).toBe('3%');
      expect(formatPercent(3.5)).toBe('3.5%');
    });
  });
});
