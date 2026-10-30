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

      // Verify DCB 30% header and benefit component
      expect(screen.getByText('DOUBLE CONNECT BONUS (DCB 30%)')).toBeDefined();
      expect(screen.getByText('(Automatically)')).toBeDefined();
      expect(screen.getByText('DCB BENEFIT')).toBeDefined();

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
      });
    });

    it('verifies balanced table container and balanced column sizing without obsolete full-screen stretching', () => {
      const { container } = render(<DcbNinetyDaysView isAdmin={false} />);

      const table = container.querySelector('table');
      expect(table).not.toBeNull();

      // Table container is enclosed in a dedicated rounded panel
      const tableWrapper = table?.closest('.overflow-hidden');
      expect(tableWrapper?.className).toContain('rounded-[8px]');

      // Table does not have min-w-full or full-screen grid stretching
      expect(table?.className).not.toContain('min-w-full');

      // S.No header has explicit balanced width
      const sNoTh = table?.querySelector('thead th');
      expect(sNoTh?.className).toContain('w-14');
    });
  });

  describe('6. Removal of Three-Cell Summary Section Beneath Ranks Table', () => {
    it('completely removes the three-cell summary section (dark-blue dropdown, In $, and In ₹ cells)', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // The 3-cell strip and its elements must not exist in the DOM
      expect(screen.queryByTestId('dcb-selected-rank-strip')).toBeNull();
      expect(screen.queryByTestId('dcb-bottom-rank-dropdown-trigger')).toBeNull();
      expect(screen.queryByTestId('dcb-bottom-rank-selected-name')).toBeNull();
      expect(screen.queryByTestId('dcb-bottom-rank-value-usd')).toBeNull();
      expect(screen.queryByTestId('dcb-bottom-rank-value-inr')).toBeNull();
    });

    it('preserves the "90-Day Eligibility Cycle Active" hint directly beneath the table without blank gaps', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const hint = screen.getByText('90-Day Eligibility Cycle Active');
      expect(hint).toBeDefined();
      expect(hint).toBeInTheDocument();
    });

    it('preserves rank calculations and synchronization when selecting ranks via table row or top selector', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const select = screen.getByLabelText('Select Rank:');

      // 1. Switch to PBA 3
      fireEvent.change(select, { target: { value: 'pba-3' } });
      await waitFor(() => {
        // PBA 3 ($1,000 multi-ranks cumulative value): 30% DCB = $300.00
        expect(screen.getAllByText('$300.00').length).toBeGreaterThanOrEqual(1);
      });

      // 2. Switch to PBA 5
      fireEvent.change(select, { target: { value: 'pba-5' } });
      await waitFor(() => {
        // PBA 5 ($3,000 multi-ranks cumulative value): 30% DCB = $900.00
        expect(screen.getAllByText('$900.00').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('7. Side-by-Side Balanced Layout & Header Cleanup Verification', () => {
    it('renames heading to "CLICK ON RANK", removes old "RANKS STRUCTURE" text, "(Click row)", and "Active" badge', () => {
      render(<DcbNinetyDaysView isAdmin={true} />);

      // Heading text is exactly CLICK ON RANK
      const leftPanel = screen.getByTestId('dcb-ranks-structure-panel');
      expect(leftPanel).toBeInTheDocument();
      expect(leftPanel.textContent).toContain('CLICK ON RANK');

      // Old heading "RANKS STRUCTURE" is completely removed
      expect(screen.queryByText('RANKS STRUCTURE')).toBeNull();
      expect(screen.queryByText('Ranks Structure')).toBeNull();

      // "(Click row)" is completely removed
      expect(screen.queryByText('(Click row)')).toBeNull();
      expect(screen.queryByText(/click row/i)).toBeNull();

      // "Active" badge is completely removed even when isAdmin is true
      expect(leftPanel.querySelector('.bg-emerald-100')).toBeNull();
      expect(leftPanel.querySelector('.bg-emerald-50')).toBeNull();
    });

    it('positions CLICK ON RANK and DCB sections side-by-side with reduced gap and balanced height', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // Main layout container positions both sections side by side on md+ with items-stretch
      const mainLayout = screen.getByTestId('dcb-main-sections-container');
      expect(mainLayout).not.toBeNull();
      expect(mainLayout.className).toContain('flex');
      expect(mainLayout.className).toContain('md:flex-row');
      expect(mainLayout.className).toContain('items-stretch');
      expect(mainLayout.className).toContain('gap-2.5');

      // Left panel has dedicated balanced width and full height stretch
      const leftPanel = screen.getByTestId('dcb-ranks-structure-panel');
      expect(leftPanel).not.toBeNull();
      expect(leftPanel.className).toContain('md:w-[210px]');
      expect(leftPanel.className).toContain('shrink-0');

      // Right panel sits immediately beside it and expands to use available width
      const rightPanel = screen.getByTestId('dcb-bonus-panel');
      expect(rightPanel).not.toBeNull();
      expect(rightPanel.className).toContain('flex-1');
      expect(rightPanel.className).toContain('min-w-0');

      // DCB content has reduced vertical gaps
      const dcbInner = rightPanel?.querySelector('.space-y-2');
      expect(dcbInner).not.toBeNull();
      expect(dcbInner?.className).toContain('space-y-2');
      expect(dcbInner?.className).toContain('p-2');
    });

    it('retains all 5 summary cards, 3 milestone cards, and Important Points with redesigned DCB BENEFIT component', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // Redesigned 30% DCB Benefit component with dedicated class
      const benefitBox = screen.getByTestId('dcb-benefit-box');
      expect(benefitBox).toBeInTheDocument();
      expect(benefitBox.className).toContain('dcb-benefit-box');
      expect(screen.getAllByText('30%').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('DCB BENEFIT')).toBeInTheDocument();
      expect(screen.getByText('(Automatically)')).toBeInTheDocument();

      // 5 premium summary cards with zoom support and individual accent classes
      const cardRef1 = screen.getByTestId('dcb-card-ref-1');
      const cardRef2 = screen.getByTestId('dcb-card-ref-2');
      const cardCenter = screen.getByTestId('dcb-card-30-dcb');
      const cardGross = screen.getByTestId('dcb-card-gross');
      const cardNet = screen.getByTestId('dcb-card-net');

      expect(cardRef1.className).toContain('dcb-summary-card');
      expect(cardRef1.className).toContain('dcb-summary-card-ref');

      expect(cardRef2.className).toContain('dcb-summary-card');
      expect(cardRef2.className).toContain('dcb-summary-card-ref');

      expect(cardCenter.className).toContain('dcb-summary-card');
      expect(cardCenter.className).toContain('dcb-summary-card-center');

      expect(cardGross.className).toContain('dcb-summary-card');
      expect(cardGross.className).toContain('dcb-summary-card-gross');

      expect(cardNet.className).toContain('dcb-summary-card');
      expect(cardNet.className).toContain('dcb-summary-card-net');

      // Labels and metrics inside cards
      expect(screen.getByText('Ref. 1')).toBeInTheDocument();
      expect(screen.getByText('Ref. 2')).toBeInTheDocument();
      expect(screen.getByText('30% DCB')).toBeInTheDocument();
      expect(screen.getByText('Gross (80%)')).toBeInTheDocument();
      expect(screen.getByText('Before fee')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Net (10% fee)')).toBeInTheDocument();

      // 3 milestone cards preserved
      expect(screen.getByTestId('dcb-earnings-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('dcb-earnings-card-4')).toBeInTheDocument();
      expect(screen.getByTestId('dcb-earnings-card-6')).toBeInTheDocument();

      // Important Points preserved
      expect(screen.getByText('Important Points')).toBeInTheDocument();
      expect(screen.getByText('Unlimited ref..')).toBeInTheDocument();
    });
  });
});
