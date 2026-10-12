import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RanksTableView } from '../components/rank-calculator/RanksTableView';
import { computeRankTotals, DEFAULT_RANKS, computeGrandTotals } from '../lib/rank-calculator-engine';

describe('Rank Price (USD) Column & Compact Table UI Design', () => {
  const computedRanks = computeRankTotals(DEFAULT_RANKS, 100);
  const grandTotals = computeGrandTotals(computedRanks, 100);

  it('renders Rank Price input boxes with elegant Inter font, medium weight, and correct values', () => {
    render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Test notes"
        isAdmin={true}
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

    // Verify Rank Price column header is centered
    const priceHeader = screen.getByText('Rank Price (USD)');
    expect(priceHeader).toBeDefined();
    expect(priceHeader.closest('th')?.className).toContain('text-center');

    // Verify all 7 rank price inputs are rendered with correct values
    const inputs = screen.getAllByRole('textbox', { name: /Price in USD/i }) as HTMLInputElement[];
    expect(inputs).toHaveLength(7);

    expect(inputs[0].value).toBe('$100.00');
    expect(inputs[1].value).toBe('$300.00');
    expect(inputs[2].value).toBe('$600.00');
    expect(inputs[3].value).toBe('$1,000.00');
    expect(inputs[4].value).toBe('$1,000.00');
    expect(inputs[5].value).toBe('$1,000.00');
    expect(inputs[6].value).toBe('$1,000.00');

    // Verify font, border, height, and compact styling on the inputs
    inputs.forEach((input) => {
      const cls = input.className;
      expect(cls).toContain('h-[31px]');
      expect(cls).toContain('w-[102px]');
      expect(cls).toContain('border-[#D6DFEA]');
      expect(cls).toContain('rounded-[5px]');
      expect(cls).toContain('bg-white');
      expect(cls).toContain('text-[13px]');
      expect(cls).toContain('font-medium');
      expect(cls).toContain('tabular-nums');
      expect(cls).toContain('text-center');
      expect(cls).toContain('focus:border-[#3B82F6]');
    });
  });

  it('allows inline editing of rank price by admin and updates live', () => {
    const onUpdateRankBasePrice = vi.fn();
    render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Test notes"
        isAdmin={true}
        onAddRank={vi.fn()}
        onEditRank={vi.fn()}
        onDeleteRank={vi.fn()}
        onMoveRank={vi.fn()}
        onExportCSV={vi.fn()}
        onOpenImportCSVModal={vi.fn()}
        onOpenResetModal={vi.fn()}
        onNavigateToCurrency={vi.fn()}
        onUpdateRankBasePrice={onUpdateRankBasePrice}
      />
    );

    const firstInput = screen.getAllByRole('textbox', { name: /Price in USD/i })[0] as HTMLInputElement;
    expect(firstInput).toBeDefined();

    // Focus input -> displays unformatted value for clean editing
    fireEvent.focus(firstInput);
    expect(firstInput.value).toBe('100');

    // Change value
    fireEvent.change(firstInput, { target: { value: '150' } });
    expect(firstInput.value).toBe('150');

    // Blur input -> invokes update
    fireEvent.blur(firstInput);
    expect(onUpdateRankBasePrice).toHaveBeenCalledWith(computedRanks[0].id, 150);
  });

  it('renders compact rows with subtle alternating background #FFFFFF and #F8FAFC', () => {
    const { container } = render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Test notes"
        isAdmin={true}
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

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(7);

    rows.forEach((row) => {
      const cls = row.className;
      expect(cls).toContain('h-[38px]');
      expect(cls).toContain('even:bg-[#f8fafc]');
      expect(cls).toContain('odd:bg-white');
    });

    // Dark navy header
    const thead = container.querySelector('thead');
    expect(thead?.className).toContain('bg-[#142D50]');
    expect(thead?.className).toContain('text-white');
  });

  it('applies the redesigned Rank Price input and compact layout to regular user login as well', () => {
    const onUpdateRankBasePrice = vi.fn();
    render(
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
        onUpdateRankBasePrice={onUpdateRankBasePrice}
      />
    );

    // Header has Rank Price (USD) centered
    const priceHeader = screen.getByText('Rank Price (USD)');
    expect(priceHeader).toBeDefined();

    // Admin toolbar and Actions column are hidden
    expect(screen.queryByText(/Network Fee Percentage/i)).toBeNull();
    expect(screen.queryByText(/USD to INR Rate/i)).toBeNull();
    expect(screen.queryByText('Actions')).toBeNull();

    // Rank Price input boxes are rendered with the exact same modern Inter styling in user login
    const inputs = screen.getAllByRole('textbox', { name: /Price in USD/i }) as HTMLInputElement[];
    expect(inputs).toHaveLength(7);
    expect(inputs[0].value).toBe('$100.00');

    // Focus & edit works in user login too
    fireEvent.focus(inputs[0]);
    expect(inputs[0].value).toBe('100');
    fireEvent.change(inputs[0], { target: { value: '250' } });
    fireEvent.blur(inputs[0]);
    expect(onUpdateRankBasePrice).toHaveBeenCalledWith(computedRanks[0].id, 250);
  });
});
