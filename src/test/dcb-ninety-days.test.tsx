import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DcbNinetyDaysView } from '../components/dcb-bonus/DcbNinetyDaysView';
import { 
  computeDcbRanks, 
  calculateDcbBonus,
  DEFAULT_DCB_SETTINGS 
} from '../lib/dcb-bonus-engine';
import { DEFAULT_RANKS } from '../lib/rank-calculator-engine';
import { DEFAULT_NAVIGATION_FIELDS, getRegisteredNavigationFields } from '../lib/permissions';
import { saveRankCalculatorState, resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('DCB (90 days) Navigation & Business Calculations', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Sidebar Navigation Placement & Registration', () => {
    it('places "DCB (90 days)" directly below "12 Level Bonus" in default navigation fields', () => {
      const fields = DEFAULT_NAVIGATION_FIELDS;
      const bonusIndex = fields.findIndex((f) => f.id === '12-level-bonus');
      const dcbIndex = fields.findIndex((f) => f.id === 'dcb-90-days');

      expect(bonusIndex).toBeGreaterThanOrEqual(0);
      expect(dcbIndex).toBe(bonusIndex + 1);

      const dcbField = fields[dcbIndex];
      expect(dcbField.label).toBe('DCB (90 days)');
      expect(dcbField.iconName).toBe('Zap');
    });

    it('returns "DCB (90 days)" in registered navigation fields', () => {
      const reg = getRegisteredNavigationFields();
      const dcbField = reg.find((f) => f.id === 'dcb-90-days');
      expect(dcbField).toBeDefined();
      expect(dcbField?.label).toBe('DCB (90 days)');
    });
  });

  describe('2. DCB Business Logic Calculations (Matching Screenshot Reference)', () => {
    it('computes exact values for PBA 7 ($5,000 multi-ranks value) matching screenshot', () => {
      const exchangeRate = 100;
      const result = calculateDcbBonus('PBA 7', 'pba-7', 5000, exchangeRate);

      // Rank values
      expect(result.rankValueUSD).toBe(5000);
      expect(result.rankValueINR).toBe(500000);

      // Referral 1 (25%) and Referral 2 (25%)
      expect(result.ref1Percentage).toBe(25);
      expect(result.ref1AmountUSD).toBe(1250);
      expect(result.ref2Percentage).toBe(25);
      expect(result.ref2AmountUSD).toBe(1250);

      // 30% DCB Release
      expect(result.dcbPercentage).toBe(30);
      expect(result.dcbAmountUSD).toBe(1500);

      // Gross Total (80%) = 1250 + 1250 + 1500 = $4,000.00
      expect(result.grossAmountUSD).toBe(4000);

      // 10% Withdrawal fee = $400.00
      expect(result.withdrawalFeePercent).toBe(10);
      expect(result.withdrawalFeeUSD).toBe(400);

      // Net Total = $4,000 - $400 = $3,600.00
      expect(result.netTotalUSD).toBe(3600);
      expect(result.netTotalINR).toBe(360000);

      // Milestones for 2, 4, 6 referrals
      expect(result.milestones).toHaveLength(3);
      // 2 referrals
      expect(result.milestones[0].referralCount).toBe(2);
      expect(result.milestones[0].totalUSD).toBe(3600);
      expect(result.milestones[0].totalINR).toBe(360000);
      // 4 referrals
      expect(result.milestones[1].referralCount).toBe(4);
      expect(result.milestones[1].totalUSD).toBe(7200);
      expect(result.milestones[1].totalINR).toBe(720000);
      // 6 referrals
      expect(result.milestones[2].referralCount).toBe(6);
      expect(result.milestones[2].totalUSD).toBe(10800);
      expect(result.milestones[2].totalINR).toBe(1080000);
    });

    it('computes exact values dynamically for PBA 1 ($100 multi-ranks value)', () => {
      const exchangeRate = 100;
      const result = calculateDcbBonus('PBA 1', 'pba-1', 100, exchangeRate);

      expect(result.rankValueUSD).toBe(100);
      expect(result.rankValueINR).toBe(10000);
      expect(result.ref1AmountUSD).toBe(25);
      expect(result.ref2AmountUSD).toBe(25);
      expect(result.dcbAmountUSD).toBe(30);
      expect(result.grossAmountUSD).toBe(80);
      expect(result.withdrawalFeeUSD).toBe(8);
      expect(result.netTotalUSD).toBe(72);
      expect(result.netTotalINR).toBe(7200);

      expect(result.milestones[0].totalINR).toBe(7200);
      expect(result.milestones[1].totalINR).toBe(14400);
      expect(result.milestones[2].totalINR).toBe(21600);
    });
  });

  describe('3. Ranks Table Computation', () => {
    it('computes all rank rows preserving columns and cumulative multi-ranks', () => {
      const exchangeRate = 100;
      const rows = computeDcbRanks(DEFAULT_RANKS, exchangeRate);

      expect(rows).toHaveLength(7);
      expect(rows[0].multiRanksUSD).toBe(100);
      expect(rows[1].multiRanksUSD).toBe(400);
      expect(rows[2].multiRanksUSD).toBe(1000);
      expect(rows[3].multiRanksUSD).toBe(2000);
      expect(rows[4].multiRanksUSD).toBe(3000);
      expect(rows[5].multiRanksUSD).toBe(4000);
      expect(rows[6].multiRanksUSD).toBe(5000);
    });
  });

  describe('4. Component Rendering & Downward Dropdown Interactivity', () => {
    it('renders DCB (90 days) page with table, calculations, and downward dropdown', () => {
      render(<DcbNinetyDaysView isAdmin={true} />);

      // Verify page title
      expect(screen.getByRole('heading', { name: /DCB \(90 days\)/i })).toBeDefined();

      // Verify table headers: only S.No and Ranks are visible
      expect(screen.getByText('S.no')).toBeDefined();
      expect(screen.getByText('S.No')).toBeDefined();
      expect(screen.getByText('Ranks')).toBeDefined();
      expect(screen.queryByText('With gas fee')).toBeNull();
      expect(screen.queryByText('Multi ranks')).toBeNull();
      expect(screen.queryByText('In INR')).toBeNull();

      // Verify DCB 30% header and release
      expect(screen.getByText('DOUBLE CONNECT BONUS (DCB 30%)')).toBeDefined();
      expect(screen.getByText('(Automatically)')).toBeDefined();
      expect(screen.getByText('DCB Release')).toBeDefined();

      // Verify Important Points
      expect(screen.getByText('Important Points')).toBeDefined();
      expect(screen.getByText(/every 2 direct active referrals have 30% DCB/i)).toBeDefined();
      expect(screen.getByText(/90 days time period for 2nd referral/i)).toBeDefined();
      expect(screen.getByText(/Withdrawl fee 10% & Transaction fee applicable/i)).toBeDefined();
    });

    it('updates calculations when rank is switched via select', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const select = screen.getByLabelText('Select Rank:');
      
      // Switch to PBA 1
      const pba1Option = screen.getByRole('option', { name: /PBA 1/i });
      fireEvent.change(select, { target: { value: (pba1Option as HTMLOptionElement).value } });

      await waitFor(() => {
        // PBA 1: Ref 1 (25%) of 100 = $25.00
        expect(screen.getAllByText('$25.00').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders the 3 premium animated earnings cards with correct amounts, labels, and hierarchy', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // Verify all 3 cards exist
      const card2 = screen.getByTestId('dcb-earnings-card-2');
      const card4 = screen.getByTestId('dcb-earnings-card-4');
      const card6 = screen.getByTestId('dcb-earnings-card-6');

      expect(card2).toBeDefined();
      expect(card4).toBeDefined();
      expect(card6).toBeDefined();

      expect(card2.classList.contains('dcb-earnings-card')).toBe(true);
      expect(card4.classList.contains('dcb-earnings-card')).toBe(true);
      expect(card6.classList.contains('dcb-earnings-card')).toBe(true);

      // Verify inner card elements
      expect(card2.querySelector('.dcb-earnings-card-inner')).not.toBeNull();
      expect(card4.querySelector('.dcb-earnings-card-inner')).not.toBeNull();
      expect(card6.querySelector('.dcb-earnings-card-inner')).not.toBeNull();

      // Verify default PBA 7 amounts (₹3,60,000.00, ₹7,20,000.00, ₹10,80,000.00)
      expect(card2.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹3,60,000.00');
      expect(card4.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹7,20,000.00');
      expect(card6.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹10,80,000.00');

      // Verify high-contrast labels and highlights
      expect(card2.querySelector('.dcb-earnings-label')?.textContent).toContain('Earnings ($)');
      expect(card2.querySelector('.dcb-earnings-highlight')?.textContent).toContain('2 ↑');

      expect(card4.querySelector('.dcb-earnings-label')?.textContent).toContain('Earnings ($)');
      expect(card4.querySelector('.dcb-earnings-highlight')?.textContent).toContain('4 ↑');

      expect(card6.querySelector('.dcb-earnings-label')?.textContent).toContain('Earnings ($)');
      expect(card6.querySelector('.dcb-earnings-highlight')?.textContent).toContain('6 ↑');

      // Dynamic update test: switch rank to PBA 1
      const select = screen.getByLabelText('Select Rank:');
      const pba1Option = screen.getByRole('option', { name: /PBA 1/i });
      fireEvent.change(select, { target: { value: (pba1Option as HTMLOptionElement).value } });

      await waitFor(() => {
        expect(card2.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹7,200.00');
        expect(card4.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹14,400.00');
        expect(card6.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹21,600.00');
      });
    });
  });

  describe('5. Two-Column Table UI & Calculation Preservation', () => {
    it('verifies that exactly two column headers (S.No and Ranks) are rendered in the table header', () => {
      const { container } = render(<DcbNinetyDaysView isAdmin={false} />);

      const table = container.querySelector('table');
      expect(table).not.toBeNull();

      const thElements = table?.querySelectorAll('thead th');
      expect(thElements).toHaveLength(2);

      // First header is S.No (with S.no accessible fallback)
      expect(thElements?.[0].textContent).toContain('S.No');
      expect(thElements?.[0].textContent).toContain('S.no');

      // Second header is Ranks
      expect(thElements?.[1].textContent).toContain('Ranks');

      // Ensure removed columns are not in the table
      expect(thElements?.[0].textContent).not.toContain('With gas fee');
      expect(thElements?.[1].textContent).not.toContain('With gas fee');
      expect(table?.textContent).not.toContain('Multi ranks');
      expect(table?.textContent).not.toContain('With gas fee');
    });

    it('verifies each rank row has exactly two cells (serial number and rank name)', () => {
      const { container } = render(<DcbNinetyDaysView isAdmin={false} />);

      const table = container.querySelector('table');
      const rows = table?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(7);

      rows?.forEach((row, idx) => {
        const cells = row.querySelectorAll('td');
        expect(cells).toHaveLength(2);

        // Cell 0: Serial number
        expect(cells[0].textContent?.trim()).toBe(String(idx + 1));

        // Cell 1: Rank name
        expect(cells[1].textContent?.trim()).toContain(`PBA ${idx + 1}`);
      });
    });

    it('verifies clicking a row in the two-column table updates DCB calculations accurately', async () => {
      const { container } = render(<DcbNinetyDaysView isAdmin={false} />);

      const table = container.querySelector('table');
      const rows = table?.querySelectorAll('tbody tr');
      expect(rows?.length).toBeGreaterThan(0);

      // Click on row 1 (PBA 1)
      const pba1Row = rows?.[0];
      if (pba1Row) {
        fireEvent.click(pba1Row);
      }

      await waitFor(() => {
        // DCB Release (30%) for PBA 1 ($100 * 30%) = $30.00
        expect(screen.getAllByText('$30.00').length).toBeGreaterThanOrEqual(1);

        // Milestone cards for PBA 1
        const card2 = screen.getByTestId('dcb-earnings-card-2');
        expect(card2.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹7,200.00');

        // Bottom rank badge also updates to PBA 1
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 1');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$100.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹10,000.00');
      });
    });

    it('verifies compact table container and balanced column sizing without obsolete full-screen stretching', () => {
      const { container } = render(<DcbNinetyDaysView isAdmin={false} />);

      const table = container.querySelector('table');
      expect(table).not.toBeNull();

      // Table container has compact max-width to eliminate the unused empty space
      const tableWrapper = table?.closest('.overflow-hidden');
      expect(tableWrapper?.className).toContain('max-w-[280px]');

      // Table does not have min-w-full or full-screen grid stretching
      expect(table?.className).not.toContain('min-w-full');

      // S.No header has explicit balanced width
      const sNoTh = table?.querySelector('thead th');
      expect(sNoTh?.className).toContain('w-16');
    });
  });

  describe('6. Selected Rank Controls Value Display and Compact Continuous Row', () => {
    it('initial render displays PBA 7 with $5,000.00 and ₹5,00,000.00 in the compact continuous strip', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const strip = screen.getByTestId('dcb-selected-rank-strip');
      expect(strip).toBeDefined();

      const rankName = screen.getByTestId('dcb-bottom-rank-selected-name');
      expect(rankName.textContent).toBe('PBA 7');

      const usdVal = screen.getByTestId('dcb-bottom-rank-value-usd');
      expect(usdVal.textContent).toBe('$5,000.00');

      const inrVal = screen.getByTestId('dcb-bottom-rank-value-inr');
      expect(inrVal.textContent).toBe('₹5,00,000.00');
    });

    it('selecting PBA 3 immediately updates In ($) to $1,000.00 and In (₹) to ₹1,00,000.00', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const select = screen.getByLabelText('Select Rank:');
      fireEvent.change(select, { target: { value: 'pba-3' } });

      await waitFor(() => {
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 3');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$1,000.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹1,00,000.00');
      });
    });

    it('selecting PBA 5 immediately updates In ($) to $3,000.00 and In (₹) to ₹3,00,000.00', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const select = screen.getByLabelText('Select Rank:');
      fireEvent.change(select, { target: { value: 'pba-5' } });

      await waitFor(() => {
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 5');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$3,000.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹3,00,000.00');
      });
    });

    it('changing selection multiple times (PBA 1 -> PBA 5 -> PBA 2 -> PBA 7) remains 100% synchronized', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const select = screen.getByLabelText('Select Rank:');

      // 1. Switch to PBA 1
      fireEvent.change(select, { target: { value: 'pba-1' } });
      await waitFor(() => {
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 1');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$100.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹10,000.00');
      });

      // 2. Switch to PBA 5
      fireEvent.change(select, { target: { value: 'pba-5' } });
      await waitFor(() => {
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 5');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$3,000.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹3,00,000.00');
      });

      // 3. Switch to PBA 2
      fireEvent.change(select, { target: { value: 'pba-2' } });
      await waitFor(() => {
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 2');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$400.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹40,000.00');
      });

      // 4. Switch back to PBA 7
      fireEvent.change(select, { target: { value: 'pba-7' } });
      await waitFor(() => {
        expect(screen.getByTestId('dcb-bottom-rank-selected-name').textContent).toBe('PBA 7');
        expect(screen.getByTestId('dcb-bottom-rank-value-usd').textContent).toBe('$5,000.00');
        expect(screen.getByTestId('dcb-bottom-rank-value-inr').textContent).toBe('₹5,00,000.00');
      });
    });

    it('verifies compact continuous row layout contains dark-blue cell, In ($), divider, and In (₹) with no unnecessary gaps', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const strip = screen.getByTestId('dcb-selected-rank-strip');
      expect(strip.className).toContain('flex');
      expect(strip.className).toContain('rounded-md');
      expect(strip.className).toContain('overflow-hidden');
      expect(strip.className).toContain('border-slate-300');

      // Dark blue cell
      const trigger = screen.getByTestId('dcb-bottom-rank-dropdown-trigger');
      expect(trigger.className).toContain('bg-[#0f2b5c]');
      expect(trigger.className).toContain('text-white');

      // In ($) and In (₹) are inside adjacent white flex container
      const usdVal = screen.getByTestId('dcb-bottom-rank-value-usd');
      const inrVal = screen.getByTestId('dcb-bottom-rank-value-inr');
      expect(usdVal).toBeDefined();
      expect(inrVal).toBeDefined();
    });
  });
});
