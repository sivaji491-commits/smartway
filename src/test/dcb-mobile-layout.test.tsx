import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DcbNinetyDaysView } from '@/components/dcb-bonus/DcbNinetyDaysView';
import { resetRankCalculatorToDefault } from '@/lib/rank-storage';

describe('DCB (90 Days) Mobile-Only Horizontal Ranks Layout', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Mobile Layout Verification (Screen width < 768px)', () => {
    it('renders the three Earnings cards above the horizontal rank selector', () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      // The 3 dark-blue earnings cards must exist
      const card2 = screen.getByTestId('dcb-earnings-card-2');
      const card4 = screen.getByTestId('dcb-earnings-card-4');
      const card6 = screen.getByTestId('dcb-earnings-card-6');
      expect(card2).toBeInTheDocument();
      expect(card4).toBeInTheDocument();
      expect(card6).toBeInTheDocument();

      // The mobile horizontal ranks container must exist
      const mobileRanksContainer = screen.getByTestId('dcb-mobile-horizontal-ranks-container');
      expect(mobileRanksContainer).toBeInTheDocument();

      // Verify DOM ordering: earnings cards appear before the horizontal ranks container
      expect(card2.compareDocumentPosition(mobileRanksContainer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not display the large vertical Ranks table on mobile', () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      // The vertical left panel table must not be rendered on mobile
      expect(screen.queryByTestId('dcb-ranks-structure-panel')).toBeNull();
      expect(screen.queryByRole('table')).toBeNull();
    });

    it('displays all seven ranks (PBA 1 to PBA 7) horizontally as compact clickable buttons', () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      const row = screen.getByTestId('dcb-mobile-ranks-row');
      expect(row).toBeInTheDocument();
      expect(row.className).toContain('overflow-x-auto');
      expect(row.className).toContain('flex');

      // Verify all 7 rank chips are present in order
      for (let i = 1; i <= 7; i++) {
        const chip = screen.getByTestId(`dcb-mobile-rank-chip-pba-${i}`);
        expect(chip).toBeInTheDocument();
        expect(chip).toHaveTextContent(`PBA ${i}`);
        expect(chip.className).toContain('shrink-0');
        expect(chip.className).toContain('rounded-[6px]');
      }
    });

    it('highlights the selected rank with amber ring and styling', () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      // Default selected is PBA 7
      const pba7Chip = screen.getByTestId('dcb-mobile-rank-chip-pba-7');
      expect(pba7Chip).toHaveAttribute('aria-pressed', 'true');
      expect(pba7Chip.className).toContain('ring-2');
      expect(pba7Chip.className).toContain('ring-amber-400');

      // Other chips should not have aria-pressed true
      const pba1Chip = screen.getByTestId('dcb-mobile-rank-chip-pba-1');
      expect(pba1Chip).toHaveAttribute('aria-pressed', 'false');
    });

    it('displays "90-Day Eligibility Cycle Active" and selected rank directly beneath the horizontal ranks', () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      const hint = screen.getByTestId('dcb-mobile-eligibility-hint');
      expect(hint).toBeInTheDocument();
      expect(hint).toHaveTextContent('90-Day Eligibility Cycle Active');
      expect(hint).toHaveTextContent('Selected: PBA 7');
    });
  });

  describe('2. Mobile Rank Selection & Reactive Calculation Updates', () => {
    it('tapping PBA 1 updates the selected rank, highlighting, and all DCB calculations', async () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      const pba1Chip = screen.getByTestId('dcb-mobile-rank-chip-pba-1');
      fireEvent.click(pba1Chip);

      await waitFor(() => {
        // PBA 1 chip is now highlighted
        expect(pba1Chip).toHaveAttribute('aria-pressed', 'true');
        expect(pba1Chip.className).toContain('ring-2');
        expect(pba1Chip.className).toContain('ring-amber-400');

        // Mobile hint updates
        expect(screen.getByTestId('dcb-mobile-eligibility-hint')).toHaveTextContent('Selected: PBA 1');

        // PBA 1 ($100 rank value): 30% DCB = $30.00
        expect(screen.getAllByText('$30.00').length).toBeGreaterThanOrEqual(1);

        // Earnings milestone card updates: 2 referrals at ₹100/USD = ₹7,200.00
        const card2 = screen.getByTestId('dcb-earnings-card-2');
        expect(card2.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹7,200.00');

        const card4 = screen.getByTestId('dcb-earnings-card-4');
        expect(card4.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹14,400.00');

        const card6 = screen.getByTestId('dcb-earnings-card-6');
        expect(card6.querySelector('.dcb-earnings-amount')?.textContent).toContain('₹21,600.00');
      });
    });

    it('switching between multiple ranks updates values accurately', async () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      // Switch to PBA 3 ($1,000 multi-ranks value)
      const pba3Chip = screen.getByTestId('dcb-mobile-rank-chip-pba-3');
      fireEvent.click(pba3Chip);

      await waitFor(() => {
        expect(screen.getByTestId('dcb-mobile-eligibility-hint')).toHaveTextContent('Selected: PBA 3');
        // PBA 3: 30% DCB = $300.00
        expect(screen.getAllByText('$300.00').length).toBeGreaterThanOrEqual(1);
      });

      // Switch to PBA 5 ($3,000 multi-ranks value)
      const pba5Chip = screen.getByTestId('dcb-mobile-rank-chip-pba-5');
      fireEvent.click(pba5Chip);

      await waitFor(() => {
        expect(screen.getByTestId('dcb-mobile-eligibility-hint')).toHaveTextContent('Selected: PBA 5');
        // PBA 5: 30% DCB = $900.00
        expect(screen.getAllByText('$900.00').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('3. Desktop & Tablet Preservation', () => {
    it('desktop mode keeps the vertical CLICK ON RANK table and does not render the mobile horizontal selector', () => {
      render(<DcbNinetyDaysView isMobile={false} />);

      // Desktop table must be present
      const desktopPanel = screen.getByTestId('dcb-ranks-structure-panel');
      expect(desktopPanel).toBeInTheDocument();
      expect(desktopPanel.querySelector('table')).not.toBeNull();
      expect(desktopPanel).toHaveTextContent('CLICK ON RANK');

      // Mobile horizontal ranks container must NOT be in desktop DOM
      expect(screen.queryByTestId('dcb-mobile-horizontal-ranks-container')).toBeNull();
    });
  });

  describe('4. Screen Width Responsiveness', () => {
    it('adapts when window is resized below 768px and above 768px', async () => {
      // Start at mobile width (375px)
      window.innerWidth = 375;
      const { rerender } = render(<DcbNinetyDaysView />);

      expect(screen.queryByTestId('dcb-mobile-horizontal-ranks-container')).toBeInTheDocument();
      expect(screen.queryByTestId('dcb-ranks-structure-panel')).toBeNull();

      // Resize to desktop width (1024px)
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.queryByTestId('dcb-ranks-structure-panel')).toBeInTheDocument();
        expect(screen.queryByTestId('dcb-mobile-horizontal-ranks-container')).toBeNull();
      });

      // Resize back to mobile width (414px)
      window.innerWidth = 414;
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        expect(screen.queryByTestId('dcb-mobile-horizontal-ranks-container')).toBeInTheDocument();
        expect(screen.queryByTestId('dcb-ranks-structure-panel')).toBeNull();
      });

      // Restore default window size
      window.innerWidth = 1024;
    });
  });
});

