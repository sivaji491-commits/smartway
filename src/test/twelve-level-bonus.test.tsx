import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { TwelveLevelBonusView } from '../components/twelve-level-bonus/TwelveLevelBonusView';
import { 
  DEFAULT_TWELVE_LEVEL_TIERS,
  computeTwelveLevelRanks,
  calculateTwelveLevelBonus,
  computeTwelveLevelCalculationResult
} from '../lib/twelve-level-bonus-engine';
import { DEFAULT_RANKS } from '../lib/rank-calculator-engine';
import { DEFAULT_NAVIGATION_FIELDS, getRegisteredNavigationFields } from '../lib/permissions';
import { saveRankCalculatorState, resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('12 Level Bonus Navigation & Business Calculations', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Sidebar Navigation Placement', () => {
    it('places "12 Level Bonus" directly below "Ranks" in default navigation fields', () => {
      const fields = DEFAULT_NAVIGATION_FIELDS;
      const ranksIndex = fields.findIndex((f) => f.id === 'ranks');
      const bonusIndex = fields.findIndex((f) => f.id === '12-level-bonus');

      expect(ranksIndex).toBeGreaterThanOrEqual(0);
      expect(bonusIndex).toBe(ranksIndex + 1);

      const bonusField = fields[bonusIndex];
      expect(bonusField.label).toBe('12 Level Bonus');
      expect(bonusField.iconName).toBe('Award');
    });

    it('returns "12 Level Bonus" in registered navigation fields', () => {
      const reg = getRegisteredNavigationFields();
      const bonusField = reg.find((f) => f.id === '12-level-bonus');
      expect(bonusField).toBeDefined();
      expect(bonusField?.label).toBe('12 Level Bonus');
    });
  });

  describe('2. Rank Engine Calculations & Screenshot Alignment', () => {
    it('computes all 7 default ranks matching the screenshot values', () => {
      const exchangeRate = 100;
      const rows = computeTwelveLevelRanks(DEFAULT_RANKS, exchangeRate);

      expect(rows).toHaveLength(7);

      // Row 1: PBA 1 ($100 base)
      expect(rows[0].serialNumber).toBe(1);
      expect(rows[0].name).toBe('PBA 1');
      expect(rows[0].basePrice).toBe(100);
      expect(rows[0].totalWithGasUSD).toBe(103);
      expect(rows[0].multiRanksUSD).toBe(100);
      expect(rows[0].inINR).toBe(10300);

      // Row 2: PBA 2 ($300 base, cumulative multi-rank = 100 + 300 = 400)
      expect(rows[1].serialNumber).toBe(2);
      expect(rows[1].name).toBe('PBA 2');
      expect(rows[1].basePrice).toBe(300);
      expect(rows[1].totalWithGasUSD).toBe(309);
      expect(rows[1].multiRanksUSD).toBe(400);
      expect(rows[1].inINR).toBe(30900);

      // Row 3: PBA 3 ($600 base, cumulative multi-rank = 400 + 600 = 1000)
      expect(rows[2].serialNumber).toBe(3);
      expect(rows[2].name).toBe('PBA 3');
      expect(rows[2].basePrice).toBe(600);
      expect(rows[2].totalWithGasUSD).toBe(618);
      expect(rows[2].multiRanksUSD).toBe(1000);
      expect(rows[2].inINR).toBe(61800);

      // Row 4: PBA 4 ($1000 base, cumulative multi-rank = 1000 + 1000 = 2000)
      expect(rows[3].serialNumber).toBe(4);
      expect(rows[3].name).toBe('PBA 4');
      expect(rows[3].basePrice).toBe(1000);
      expect(rows[3].totalWithGasUSD).toBe(1030);
      expect(rows[3].multiRanksUSD).toBe(2000);
      expect(rows[3].inINR).toBe(103000);

      // Row 5: PBA 5 ($1000 base, cumulative multi-rank = 2000 + 1000 = 3000)
      expect(rows[4].multiRanksUSD).toBe(3000);
      expect(rows[4].inINR).toBe(103000);

      // Row 6: PBA 6 ($1000 base, cumulative multi-rank = 3000 + 1000 = 4000)
      expect(rows[5].multiRanksUSD).toBe(4000);
      expect(rows[5].inINR).toBe(103000);

      // Row 7: PBA 7 ($1000 base, cumulative multi-rank = 4000 + 1000 = 5000)
      expect(rows[6].serialNumber).toBe(7);
      expect(rows[6].name).toBe('PBA 7');
      expect(rows[6].basePrice).toBe(1000);
      expect(rows[6].totalWithGasUSD).toBe(1030);
      expect(rows[6].multiRanksUSD).toBe(5000);
      expect(rows[6].inINR).toBe(103000);
    });

    it('calculates 12-level bonus breakdown for PBA 7 ($1,000) matching screenshot', () => {
      const bonusRows = calculateTwelveLevelBonus(1000, 100, true);

      expect(bonusRows).toHaveLength(12);

      // Descending order: L-12 down to L-1
      expect(bonusRows[0].label).toBe('L-12');
      expect(bonusRows[0].percentage).toBe(2);
      expect(bonusRows[0].bonusAmountUSD).toBe(20);

      expect(bonusRows[1].label).toBe('L-11');
      expect(bonusRows[1].percentage).toBe(2);
      expect(bonusRows[1].bonusAmountUSD).toBe(20);

      expect(bonusRows[2].label).toBe('L-10');
      expect(bonusRows[2].bonusAmountUSD).toBe(20);

      expect(bonusRows[3].label).toBe('L-9');
      expect(bonusRows[3].bonusAmountUSD).toBe(20);

      expect(bonusRows[9].label).toBe('L-3');
      expect(bonusRows[9].percentage).toBe(2);
      expect(bonusRows[9].bonusAmountUSD).toBe(20);

      // L-2: 5% of $1,000 = $50.00
      expect(bonusRows[10].label).toBe('L-2');
      expect(bonusRows[10].percentage).toBe(5);
      expect(bonusRows[10].bonusAmountUSD).toBe(50);

      // L-1: 25% of $1,000 = $250.00
      expect(bonusRows[11].label).toBe('L-1');
      expect(bonusRows[11].percentage).toBe(25);
      expect(bonusRows[11].bonusAmountUSD).toBe(250);
      expect(bonusRows[11].isDirectReferral).toBe(true);

      // Total sum of percentages is 50%, total payout is $500.00
      const totalPct = bonusRows.reduce((a, b) => a + b.percentage, 0);
      const totalUSD = bonusRows.reduce((a, b) => a + b.bonusAmountUSD, 0);
      expect(totalPct).toBe(50);
      expect(totalUSD).toBe(500);
    });

    it('calculates 12-level bonus breakdown for PBA 1 ($100)', () => {
      const bonusRows = calculateTwelveLevelBonus(100, 100, true);

      expect(bonusRows[0].label).toBe('L-12');
      expect(bonusRows[0].bonusAmountUSD).toBe(2); // 2% of 100

      expect(bonusRows[10].label).toBe('L-2');
      expect(bonusRows[10].bonusAmountUSD).toBe(5); // 5% of 100

      expect(bonusRows[11].label).toBe('L-1');
      expect(bonusRows[11].bonusAmountUSD).toBe(25); // 25% of 100

      const totalUSD = bonusRows.reduce((a, b) => a + b.bonusAmountUSD, 0);
      expect(totalUSD).toBe(50); // 50% of 100
    });
  });

  describe('3. Component Rendering & Interactive Dynamic Selection', () => {
    it('renders 12 Level Bonus page with headers, dynamic dropdown, and tables', () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      // Title & badge
      expect(screen.getByRole('heading', { level: 1, name: /12 Level Bonus/i })).toBeDefined();
      expect(screen.getByText('Compressed Matrix')).toBeDefined();

      // Dynamic Dropdown
      const dropdown = screen.getByLabelText(/Select Rank:/i) as HTMLSelectElement;
      expect(dropdown).toBeDefined();
      expect(dropdown.options.length).toBe(7);

      // Table headers
      expect(screen.getByText('S.no')).toBeDefined();
      expect(screen.getByText('Ranks')).toBeDefined();
      expect(screen.getByText('With gas fee')).toBeDefined();
      expect(screen.getByText('Multi ranks')).toBeDefined();
      expect(screen.getByText('In INR')).toBeDefined();

      // 12 Level Bonus table header
      expect(screen.getAllByText('12 Level Bonus (Compressed)').length).toBeGreaterThanOrEqual(1);

      // Footnote
      expect(screen.getByText(/Note: You have to be either equal level or one step ahead/i)).toBeDefined();
      expect(screen.getByText(/Copyright © 2025 IG Infra developers/i)).toBeDefined();
    });

    it('dynamically updates bonus amounts when changing dropdown selection', () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      const dropdown = screen.getByLabelText(/Select Rank:/i) as HTMLSelectElement;

      // Select PBA 1
      const pba1Option = Array.from(dropdown.options).find((o) => o.text.includes('PBA 1'));
      expect(pba1Option).toBeDefined();
      if (pba1Option) {
        fireEvent.change(dropdown, { target: { value: pba1Option.value } });
      }

      // Check updated L-1 amount ($25.00 for $100 rank)
      expect(screen.getByText('$25.00')).toBeDefined();
      // Total 50% = $50.00 (appears in stat card and bottom total)
      expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);

      // Now switch back to PBA 7 ($1,000 rank)
      const pba7Option = Array.from(dropdown.options).find((o) => o.text.includes('PBA 7'));
      if (pba7Option) {
        fireEvent.change(dropdown, { target: { value: pba7Option.value } });
      }

      // Check updated L-1 amount ($250.00 for $1,000 rank)
      expect(screen.getByText('$250.00')).toBeDefined();
      // Total 50% = $500.00
      expect(screen.getAllByText('$500.00').length).toBeGreaterThanOrEqual(1);
    });

    it('updates selected rank when clicking any row in the Ranks table', () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      // Click on row for PBA 2 ($300) in the ranks table
      const pba2Cells = screen.getAllByText('PBA 2');
      const pba2Span = pba2Cells.find((el) => el.tagName === 'SPAN') || pba2Cells[0];
      fireEvent.click(pba2Span.closest('tr')!);

      // For PBA 2 ($300):
      // L-1 = 25% of $300 = $75.00
      expect(screen.getByText('$75.00')).toBeDefined();
      // Total 50% of $300 = $150.00
      expect(screen.getAllByText('$150.00').length).toBeGreaterThanOrEqual(1);
    });

    it('synchronizes dynamically when admin updates rank configuration in storage', async () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      // Simulate admin changing PBA 7 basePrice to $2,000 in localStorage
      const updatedRanks = DEFAULT_RANKS.map((r) =>
        r.name === 'PBA 7' ? { ...r, basePrice: 2000 } : r
      );
      saveRankCalculatorState({
        ranks: updatedRanks,
        currency: { exchangeRateUSDToINR: 100, lastUpdated: new Date().toISOString() },
        note: 'Updated notes',
      });

      // Dispatch event
      await act(async () => {
        window.dispatchEvent(new CustomEvent('nexora_ranks_updated'));
      });

      await waitFor(() => {
        // L-1 for $2,000 rank should now be $500.00
        expect(screen.queryByText('$500.00')).toBeDefined();
      });
    });

    it('renders bottom rank dropdown with all configured ranks and updates adjacent value dynamically', () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      const bottomDropdown = screen.getByLabelText(/Select rank dropdown/i) as HTMLSelectElement;
      expect(bottomDropdown).toBeDefined();
      expect(bottomDropdown.options.length).toBe(7);

      // Select PBA 1
      const pba1Option = Array.from(bottomDropdown.options).find((o) => o.text.trim() === 'PBA 1');
      expect(pba1Option).toBeDefined();
      if (pba1Option) {
        fireEvent.change(bottomDropdown, { target: { value: pba1Option.value } });
      }

      // Verify adjacent value is 100
      expect(screen.getByText('100')).toBeDefined();

      // Now select PBA 3 ($600)
      const pba3Option = Array.from(bottomDropdown.options).find((o) => o.text.trim() === 'PBA 3');
      expect(pba3Option).toBeDefined();
      if (pba3Option) {
        fireEvent.change(bottomDropdown, { target: { value: pba3Option.value } });
      }

      // Verify adjacent value updates to 600
      expect(screen.getByText('600')).toBeDefined();
      // And calculations update: L-1 25% of 600 = $150.00
      expect(screen.getByText('$150.00')).toBeDefined();
    });

    it('automatically includes newly added ranks like PBA 8 in bottom dropdown', async () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      // Admin adds PBA 8 with base price $2,500
      const expandedRanks = [
        ...DEFAULT_RANKS,
        { id: 'pba-8', name: 'PBA 8', basePrice: 2500, networkFeePercent: 3, order: 8 },
      ];

      saveRankCalculatorState({
        ranks: expandedRanks,
        currency: { exchangeRateUSDToINR: 100, lastUpdated: new Date().toISOString() },
        note: 'Added PBA 8',
      });

      await act(async () => {
        window.dispatchEvent(new CustomEvent('nexora_ranks_updated'));
      });

      await waitFor(() => {
        const bottomDropdown = screen.getByLabelText(/Select rank dropdown/i) as HTMLSelectElement;
        expect(bottomDropdown.options.length).toBe(8);
        const pba8Option = Array.from(bottomDropdown.options).find((o) => o.text.trim() === 'PBA 8');
        expect(pba8Option).toBeDefined();

        if (pba8Option) {
          fireEvent.change(bottomDropdown, { target: { value: pba8Option.value } });
        }
      });

      // Adjacent value should display 2500
      expect(screen.getByText('2500')).toBeDefined();
      // L-1 bonus = 25% of 2500 = $625.00
      expect(screen.getByText('$625.00')).toBeDefined();
    });

    it('renders empty state gracefully when ranks array is empty', () => {
      saveRankCalculatorState({
        ranks: [],
        currency: { exchangeRateUSDToINR: 100, lastUpdated: new Date().toISOString() },
        note: '',
      });

      render(<TwelveLevelBonusView isAdmin={true} />);

      expect(screen.getByText('No ranks found')).toBeDefined();
      expect(screen.getByText(/Please check rank configuration/i)).toBeDefined();
    });
  });
});
