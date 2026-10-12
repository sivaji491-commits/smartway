import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NavigationHeader } from '../components/rank-calculator/NavigationHeader';
import { RanksTableView } from '../components/rank-calculator/RanksTableView';
import { RankCalculatorApp } from '../components/rank-calculator/RankCalculatorApp';
import { computeRankTotals, DEFAULT_RANKS, computeGrandTotals } from '../lib/rank-calculator-engine';

describe('Ranks Page Layout & Compact Viewport Design (1366x768)', () => {
  const computedRanks = computeRankTotals(DEFAULT_RANKS, 100);
  const grandTotals = computeGrandTotals(computedRanks, 100);

  it('removes the redundant Business Plan – CALCULATOR horizontal strip when embedded in workspace layout', () => {
    const { container } = render(
      <NavigationHeader
        activeTab="ranks"
        onTabChange={vi.fn()}
        saveStatus="saved"
        exchangeRate={100}
        totalRanks={7}
        onDownloadBackup={vi.fn()}
        computedRanks={computedRanks}
        embedded={true}
      />
    );

    // Should return null and not render the horizontal strip
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Business Plan')).toBeNull();
    expect(screen.queryByText('Calculator')).toBeNull();
  });

  it('renders NavigationHeader normally when standalone (not embedded)', () => {
    render(
      <NavigationHeader
        activeTab="ranks"
        onTabChange={vi.fn()}
        saveStatus="saved"
        exchangeRate={100}
        totalRanks={7}
        onDownloadBackup={vi.fn()}
        computedRanks={computedRanks}
        embedded={false}
      />
    );

    expect(screen.getByText('Business Plan')).toBeDefined();
    expect(screen.getByText('Calculator')).toBeDefined();
  });

  it('RankCalculatorApp embedded mode moves table directly to top without duplicate header strip', () => {
    const { container } = render(
      <RankCalculatorApp
        initialTab="ranks"
        embedded={true}
        isAdmin={false}
        allowedTabs={['home', 'ranks']}
      />
    );

    // Business Plan – CALCULATOR strip is NOT rendered
    const calculatorBadges = screen.queryAllByText('Calculator');
    // Any remaining badge should only be inside the main heading, not a standalone strip
    calculatorBadges.forEach((badge) => {
      expect(badge.closest('header')).toBeNull();
    });

    // Heading and full 7 rows and summary card are rendered
    expect(screen.getByText('Rank Price & Accumulation Calculator')).toBeDefined();
    expect(screen.getByText('Final Rank Cost')).toBeDefined();
    expect(screen.getAllByText('$5,150.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('₹5,15,000.00').length).toBeGreaterThanOrEqual(1);

    // Verify all 7 ranks are present
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(7);
  });

  it('RanksTableView uses compact container padding and vertical spacing', () => {
    const { container } = render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Test notes"
        isAdmin={false}
        onAddRank={vi.fn()}
        onEditRank={vi.fn()}
        onDeleteRank={vi.fn()}
        onMoveRank={vi.fn()}
        onExportCSV={vi.fn()}
        onOpenImportCSVModal={vi.fn()}
        onOpenResetModal={vi.fn()}
        onNavigateToCurrency={vi.fn()}
      />
    );

    // Verify outer card container has compact padding classes
    const outerCard = container.firstElementChild as HTMLElement;
    expect(outerCard.className).toContain('p-3.5');
    expect(outerCard.className).toContain('space-y-2');

    // Verify header icon is compact (36px)
    const headerIcon = outerCard.querySelector('.w-\\[36px\\]');
    expect(headerIcon).not.toBeNull();

    // Verify all table headers are present
    expect(screen.getByText('S.No')).toBeDefined();
    expect(screen.getByText('Rank Name')).toBeDefined();
    expect(screen.getByText('Rank Price (USD)')).toBeDefined();
    expect(screen.getByText(/Network Fee \(3%\) \(USD\)/)).toBeDefined();
    expect(screen.getByText('Total (USD)')).toBeDefined();
    expect(screen.getByText('Accumulated Total (USD)')).toBeDefined();
    expect(screen.getByText('INR Value (₹)')).toBeDefined();

    // Verify Final Rank Cost summary card exists with correct totals
    expect(screen.getByText('TOTAL (USD)')).toBeDefined();
    expect(screen.getByText('TOTAL (INR)')).toBeDefined();
  });
});
