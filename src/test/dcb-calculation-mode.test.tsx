import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DcbNinetyDaysView } from '@/components/dcb-bonus/DcbNinetyDaysView';
import { resetRankCalculatorToDefault } from '@/lib/rank-storage';

describe('DCB (90 Days) Cumulative / Individual Calculation Mode Switch', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Default Mode & Mode Switch Buttons Rendering', () => {
    it('renders Cumulative and Individual buttons with Cumulative active by default', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const modeSwitch = screen.getByTestId('dcb-calculation-mode-switch');
      expect(modeSwitch).toBeInTheDocument();

      const cumulativeBtn = screen.getByTestId('dcb-mode-cumulative-btn');
      const individualBtn = screen.getByTestId('dcb-mode-individual-btn');

      expect(cumulativeBtn).toBeInTheDocument();
      expect(individualBtn).toBeInTheDocument();

      // Mode switch is positioned OUTSIDE and aligned to the far right of the entire DCB summary section
      const benefitBox = screen.getByTestId('dcb-benefit-box');
      expect(benefitBox).not.toContainElement(modeSwitch);
      expect(benefitBox.parentElement).toBe(modeSwitch.parentElement);
      expect(modeSwitch.className).toContain('absolute');
      expect(modeSwitch.className).toContain('right-0');
      expect(modeSwitch).toBeInTheDocument();
      expect(cumulativeBtn).toBeInTheDocument();
      expect(individualBtn).toBeInTheDocument();

      // Card has percentage value and DCB BENEFIT label
      const valueEl = benefitBox.querySelector('.dcb-benefit-value');
      const labelEl = benefitBox.querySelector('.dcb-benefit-label');
      expect(valueEl).toBeInTheDocument();
      expect(valueEl).toHaveTextContent('30%');
      expect(labelEl).toBeInTheDocument();
      expect(labelEl).toHaveTextContent('DCB BENEFIT');

      // Cumulative must be active by default
      expect(cumulativeBtn).toHaveAttribute('aria-checked', 'true');
      expect(individualBtn).toHaveAttribute('aria-checked', 'false');
      expect(cumulativeBtn.className).toContain('font-bold');
      expect(cumulativeBtn.className).toContain('text-emerald-800');
    });

    it('calculates values in Cumulative mode matching existing published logic', () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // Default rank is PBA 7 ($5,000 cumulative base value)
      // Rank value badge shows $5,000.00 and 'Multi ranks cumulative'
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      expect(screen.getByText('Multi ranks cumulative')).toBeInTheDocument();

      // 30% DCB = $1,500.00
      const cardCenter = screen.getByTestId('dcb-card-30-dcb');
      expect(cardCenter).toHaveTextContent('$1,500.00');

      // Gross Total (80%) = $4,000.00
      const cardGross = screen.getByTestId('dcb-card-gross');
      expect(cardGross).toHaveTextContent('$4,000.00');

      // Net Total (10% fee) = $3,600.00
      const cardNet = screen.getByTestId('dcb-card-net');
      expect(cardNet).toHaveTextContent('$3,600.00');

      // Milestone cards (₹3,60,000.00 / ₹7,20,000.00 / ₹10,80,000.00)
      const card2 = screen.getByTestId('dcb-earnings-card-2');
      const card4 = screen.getByTestId('dcb-earnings-card-4');
      const card6 = screen.getByTestId('dcb-earnings-card-6');

      expect(card2).toHaveTextContent('₹3,60,000.00');
      expect(card4).toHaveTextContent('₹7,20,000.00');
      expect(card6).toHaveTextContent('₹10,80,000.00');
    });
  });

  describe('2. Individual Mode Switching & Calculations', () => {
    it('clicking Individual mode recalculates values for PBA 7 standalone base price ($1,000)', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      const individualBtn = screen.getByTestId('dcb-mode-individual-btn');
      fireEvent.click(individualBtn);

      await waitFor(() => {
        expect(individualBtn).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('dcb-mode-cumulative-btn')).toHaveAttribute('aria-checked', 'false');
      });

      // In Individual mode for PBA 7:
      // Base Price = $1,000.00 (not $5,000.00)
      expect(screen.getByText('Individual rank base')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();

      // Ref 1 (25%) = $250.00
      const cardRef1 = screen.getByTestId('dcb-card-ref-1');
      expect(cardRef1).toHaveTextContent('$250.00');

      // Ref 2 (25%) = $250.00
      const cardRef2 = screen.getByTestId('dcb-card-ref-2');
      expect(cardRef2).toHaveTextContent('$250.00');

      // 30% DCB = $300.00
      const cardCenter = screen.getByTestId('dcb-card-30-dcb');
      expect(cardCenter).toHaveTextContent('$300.00');

      // Gross Total (80%) = $800.00
      const cardGross = screen.getByTestId('dcb-card-gross');
      expect(cardGross).toHaveTextContent('$800.00');

      // Net Total (10% fee) = $720.00
      const cardNet = screen.getByTestId('dcb-card-net');
      expect(cardNet).toHaveTextContent('$720.00');

      // Milestones for PBA 7 Individual (₹72,000.00 / ₹1,44,000.00 / ₹2,16,000.00)
      const card2 = screen.getByTestId('dcb-earnings-card-2');
      const card4 = screen.getByTestId('dcb-earnings-card-4');
      const card6 = screen.getByTestId('dcb-earnings-card-6');

      expect(card2).toHaveTextContent('₹72,000.00');
      expect(card4).toHaveTextContent('₹1,44,000.00');
      expect(card6).toHaveTextContent('₹2,16,000.00');
    });

    it('updating rank while in Individual mode recalculates correctly for that rank', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // Switch to Individual mode
      fireEvent.click(screen.getByTestId('dcb-mode-individual-btn'));

      // Switch rank to PBA 3 ($600 individual base price)
      const select = screen.getByLabelText('Select Rank:');
      fireEvent.change(select, { target: { value: 'pba-3' } });

      await waitFor(() => {
        // PBA 3 Individual base = $600.00
        expect(screen.getByText('$600.00')).toBeInTheDocument();

        // Ref 1 (25% of $600) = $150.00
        expect(screen.getByTestId('dcb-card-ref-1')).toHaveTextContent('$150.00');

        // 30% DCB (30% of $600) = $180.00
        expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('$180.00');

        // Gross (80% of $600) = $480.00
        expect(screen.getByTestId('dcb-card-gross')).toHaveTextContent('$480.00');

        // Net (After 10% fee) = $432.00 / ₹43,200.00
        expect(screen.getByTestId('dcb-card-net')).toHaveTextContent('$432.00');

        // Earnings milestone card 2
        expect(screen.getByTestId('dcb-earnings-card-2')).toHaveTextContent('₹43,200.00');
      });
    });
  });

  describe('3. Mode Toggling & State Preservation', () => {
    it('switching back to Cumulative mode preserves the active rank and restores cumulative calculations', async () => {
      render(<DcbNinetyDaysView isAdmin={false} />);

      // Switch rank to PBA 3 ($1,000 cumulative, $600 individual)
      const select = screen.getByLabelText('Select Rank:');
      fireEvent.change(select, { target: { value: 'pba-3' } });

      // Switch to Individual
      fireEvent.click(screen.getByTestId('dcb-mode-individual-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('$180.00');
        expect(screen.getByTestId('dcb-earnings-card-2')).toHaveTextContent('₹43,200.00');
      });

      // Switch back to Cumulative
      fireEvent.click(screen.getByTestId('dcb-mode-cumulative-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('dcb-mode-cumulative-btn')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('Multi ranks cumulative')).toBeInTheDocument();

        // PBA 3 Cumulative ($1,000 multi-ranks value)
        expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('$300.00');
        expect(screen.getByTestId('dcb-card-gross')).toHaveTextContent('$800.00');
        expect(screen.getByTestId('dcb-card-net')).toHaveTextContent('$720.00');
        expect(screen.getByTestId('dcb-earnings-card-2')).toHaveTextContent('₹72,000.00');
      });
    });

    it('works seamlessly on mobile view with horizontal rank selector', async () => {
      render(<DcbNinetyDaysView isMobile={true} />);

      // Switch to Individual mode on mobile
      fireEvent.click(screen.getByTestId('dcb-mode-individual-btn'));

      // Tap PBA 5 chip on mobile ($1,000 individual base price)
      const pba5Chip = screen.getByTestId('dcb-mobile-rank-chip-pba-5');
      fireEvent.click(pba5Chip);

      await waitFor(() => {
        expect(pba5Chip).toHaveAttribute('aria-pressed', 'true');
        // PBA 5 Individual base = $1,000.00
        expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('$300.00');
        expect(screen.getByTestId('dcb-earnings-card-2')).toHaveTextContent('₹72,000.00');
      });

      // Switch back to Cumulative mode on mobile
      fireEvent.click(screen.getByTestId('dcb-mode-cumulative-btn'));

      await waitFor(() => {
        // PBA 5 Cumulative ($3,000 multi-ranks value)
        expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('$900.00');
        expect(screen.getByTestId('dcb-earnings-card-2')).toHaveTextContent('₹2,16,000.00');
      });
    });
  });
});

