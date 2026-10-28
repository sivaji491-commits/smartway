import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RanksTableView } from '../components/rank-calculator/RanksTableView';
import { RankCalculatorApp } from '../components/rank-calculator/RankCalculatorApp';
import { TwelveLevelBonusView } from '../components/twelve-level-bonus/TwelveLevelBonusView';
import { computeRankTotals, DEFAULT_RANKS, computeGrandTotals } from '../lib/rank-calculator-engine';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('Ranks and 12 Level Bonus Pages ONE TIME WORK Animated Highlight', () => {
  const computedRanks = computeRankTotals(DEFAULT_RANKS, 100);
  const grandTotals = computeGrandTotals(computedRanks, 100);

  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Ranks Page ONE TIME WORK Highlight', () => {
    it('renders the ONE TIME WORK highlight at the top-left of RanksTableView', () => {
      render(
        <RanksTableView
          computedRanks={computedRanks}
          grandTotals={grandTotals}
          exchangeRate={100}
          note="Test notes"
          isAdmin={false}
          onAddRank={() => {}}
          onEditRank={() => {}}
          onDeleteRank={() => {}}
          onMoveRank={() => {}}
          onExportCSV={() => {}}
          onOpenImportCSVModal={() => {}}
          onOpenResetModal={() => {}}
          onNavigateToCurrency={() => {}}
        />
      );

      // Highlight badge is present
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(highlight.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      // Exact text
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Exactly two moving stars
      expect(screen.getByTestId('one-time-work-star-1')).toBeDefined();
      expect(screen.getByTestId('one-time-work-star-2')).toBeDefined();

      // Existing Ranks header & table are intact
      expect(screen.getByText('Rank Price & Accumulation Calculator')).toBeDefined();
      expect(screen.getByText('Final Rank Cost')).toBeDefined();
    });

    it('renders the ONE TIME WORK highlight inside RankCalculatorApp embedded mode', () => {
      render(
        <RankCalculatorApp
          initialTab="ranks"
          embedded={true}
          isAdmin={true}
          allowedTabs={['ranks']}
        />
      );

      expect(screen.getByTestId('key-points-one-time-work')).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();
    });
  });

  describe('2. 12 Level Bonus Page ONE TIME WORK Highlight', () => {
    it('renders the ONE TIME WORK highlight at the top-left of TwelveLevelBonusView', () => {
      render(<TwelveLevelBonusView isAdmin={true} />);

      // Highlight badge is present
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(highlight.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      // Exact text
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Exactly two moving stars with 180-degree offset classes
      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');
      expect(star1.textContent).toBe('✦');
      expect(star2.textContent).toBe('✦');
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);

      // Existing 12 Level Bonus header & table are intact
      expect(screen.getByRole('heading', { level: 1, name: /12 Level Bonus/i })).toBeDefined();
      expect(screen.getByText('Compressed Matrix')).toBeDefined();
      expect(screen.getByText('S.no')).toBeDefined();
      expect(screen.getByText('Ranks')).toBeDefined();
    });
  });
});
