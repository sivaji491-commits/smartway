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

      // Verify table headers
      expect(screen.getByText('S.no')).toBeDefined();
      expect(screen.getByText('Ranks')).toBeDefined();
      expect(screen.getByText('With gas fee')).toBeDefined();
      expect(screen.getByText('Multi ranks')).toBeDefined();
      expect(screen.getByText('In INR')).toBeDefined();

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
  });
});
