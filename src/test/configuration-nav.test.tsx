import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationHeader } from '../components/rank-calculator/NavigationHeader';
import { ConfigurationDropdown } from '../components/rank-calculator/ConfigurationDropdown';
import { RanksTableView } from '../components/rank-calculator/RanksTableView';
import { CurrencySettingsView } from '../components/rank-calculator/CurrencySettingsView';
import { RankCalculatorApp } from '../components/rank-calculator/RankCalculatorApp';
import { AddEditRankModal } from '../components/rank-calculator/AddEditRankModal';
import { computeRankTotals, DEFAULT_RANKS, computeGrandTotals } from '../lib/rank-calculator-engine';

describe('Configuration Settings Nav Field & Dropdown', () => {
  const computedRanks = computeRankTotals(DEFAULT_RANKS, 100);
  const grandTotals = computeGrandTotals(computedRanks, 100);

  it('renders Configuration Settings nav field in NavigationHeader', () => {
    const handleTabChange = vi.fn();
    render(
      <NavigationHeader
        activeTab="ranks"
        onTabChange={handleTabChange}
        saveStatus="saved"
        exchangeRate={100}
        totalRanks={7}
        onDownloadBackup={vi.fn()}
        computedRanks={computedRanks}
      />
    );

    const configNavBtn = screen.getByRole('button', { name: /configuration settings/i });
    expect(configNavBtn).toBeDefined();
  });

  it('toggles configuration dropdown when clicking the nav field button', () => {
    render(
      <NavigationHeader
        activeTab="ranks"
        onTabChange={vi.fn()}
        saveStatus="saved"
        exchangeRate={100}
        totalRanks={7}
        onDownloadBackup={vi.fn()}
        computedRanks={computedRanks}
      />
    );

    const configNavBtn = screen.getByRole('button', { name: /configuration settings/i });

    // Dropdown is not visible initially
    expect(screen.queryByText('Update the values below to recalculate all results.')).toBeNull();

    // Click to open dropdown
    fireEvent.click(configNavBtn);

    // Dropdown details should now be visible
    expect(screen.getByText('Update the values below to recalculate all results.')).toBeDefined();
    expect(screen.getByText(/Network Fee Percentage/i)).toBeDefined();
    expect(screen.getByText(/USD to INR Rate/i)).toBeDefined();
    expect(screen.getByText(/Rank Names \(7\)/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeDefined();
  });

  it('ConfigurationDropdown allows updating fee presets, exchange rate, and rank names', () => {
    const onUpdateFeePercent = vi.fn();
    const onUpdateExchangeRate = vi.fn();
    const onUpdateRankName = vi.fn();
    const onOpenResetModal = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfigurationDropdown
        isOpen={true}
        onClose={onClose}
        computedRanks={computedRanks}
        exchangeRate={100}
        onUpdateFeePercent={onUpdateFeePercent}
        onUpdateExchangeRate={onUpdateExchangeRate}
        onUpdateRankName={onUpdateRankName}
        onOpenResetModal={onOpenResetModal}
      />
    );

    // Click 5% fee preset
    const fivePercentBtn = screen.getByRole('button', { name: '5%' });
    fireEvent.click(fivePercentBtn);
    expect(onUpdateFeePercent).toHaveBeenCalledWith(5);

    // Click quick rate preset
    const quickRateBtn = screen.getByRole('button', { name: '₹90' });
    fireEvent.click(quickRateBtn);
    expect(onUpdateExchangeRate).toHaveBeenCalledWith(90);

    // Edit PBA 1 name
    const pba1Input = screen.getByDisplayValue('PBA 1');
    fireEvent.change(pba1Input, { target: { value: 'Starter Rank' } });
    expect(onUpdateRankName).toHaveBeenCalledWith(computedRanks[0]!.id, 'Starter Rank');

    // Click Reset to Default
    const resetBtn = screen.getByRole('button', { name: /Reset to Default/i });
    fireEvent.click(resetBtn);
    expect(onClose).toHaveBeenCalled();
    expect(onOpenResetModal).toHaveBeenCalled();
  });

  it('ConfigurationDropdown fits within viewport height without page scrolling and only scrolls rank list internally', () => {
    const { container } = render(
      <ConfigurationDropdown
        isOpen={true}
        onClose={vi.fn()}
        computedRanks={computedRanks}
        exchangeRate={100}
      />
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeDefined();
    expect(dialog?.className).toContain('configuration-panel');
    expect(dialog?.className).toContain('max-h-[calc(100dvh-120px)]');
    expect(dialog?.className).toContain('flex-col');

    // Header and primary controls are visible
    expect(screen.getByText('Configuration Settings')).toBeDefined();
    expect(screen.getByText(/Network Fee Percentage/i)).toBeDefined();
    expect(screen.getByText(/USD to INR Rate/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeDefined();

    // Internal scroll container for rank list
    const rankListScroll = container.querySelector('.overflow-y-auto');
    expect(rankListScroll).toBeDefined();
    expect(rankListScroll?.className).toContain('overflow-y-auto');
  });

  it('RanksTableView renders table in full page width without the right configuration card', () => {
    const { container } = render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Formula notes"
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

    // Right column card is no longer in RanksTableView
    expect(container.querySelector('.lg\\:col-span-4')).toBeNull();
    expect(container.querySelector('.xl\\:col-span-3')).toBeNull();

    // Table container spans full width
    const tableContainer = container.querySelector('table');
    expect(tableContainer).toBeDefined();
    expect(tableContainer?.className).toContain('w-full');

    // Headers are all present across the page
    expect(screen.getByText('S.No')).toBeDefined();
    expect(screen.getByText('Rank Name')).toBeDefined();
    expect(screen.getByText('Rank Price (USD)')).toBeDefined();
    expect(screen.getByText('INR Value (₹)')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();

    // Final Rank Cost summary card is rendered
    expect(screen.getByText('Final Rank Cost')).toBeDefined();
  });

  it('hides admin settings controls and actions in RanksTableView for regular user login so table moves up', () => {
    render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Formula notes"
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

    // Controls that should be removed for user login
    expect(screen.queryByText(/Network Fee Percentage/i)).toBeNull();
    expect(screen.queryByText(/USD to INR Rate/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /\+ Add Rank/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Export/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Import/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Config/i })).toBeNull();
    expect(screen.queryByText('Actions')).toBeNull();

    // Table data and summary remain visible and moved to the top
    expect(screen.getByText('Rank Price & Accumulation Calculator')).toBeDefined();
    expect(screen.getByText('S.No')).toBeDefined();
    expect(screen.getByText('Rank Name')).toBeDefined();
    expect(screen.getByText('Final Rank Cost')).toBeDefined();
  });

  it('hides Configuration Settings and Backup in NavigationHeader for regular user login', () => {
    render(
      <NavigationHeader
        activeTab="ranks"
        onTabChange={vi.fn()}
        saveStatus="saved"
        exchangeRate={100}
        totalRanks={7}
        onDownloadBackup={vi.fn()}
        computedRanks={computedRanks}
        isAdmin={false}
      />
    );

    expect(screen.queryByRole('button', { name: /configuration settings/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /backup/i })).toBeNull();
    expect(screen.queryByText(/All changes saved/i)).toBeNull();
    expect(screen.getByRole('button', { name: /ranks/i })).toBeDefined();
  });

  it('renders Full System Backup & Restore and Factory Reset in CurrencySettingsView', () => {
    const currency = {
      baseCurrency: 'USD' as const,
      quoteCurrency: 'INR' as const,
      exchangeRateUSDToINR: 100,
      lastUpdated: new Date().toISOString(),
      source: 'manual' as const,
    };

    render(
      <CurrencySettingsView
        currency={currency}
        note="Test note"
        onUpdateExchangeRate={vi.fn()}
        onUpdateNotes={vi.fn()}
        onDownloadBackup={vi.fn()}
        onOpenRestoreModal={vi.fn()}
        onOpenResetModal={vi.fn()}
      />
    );

    expect(screen.getByText(/Full System Backup & Restore/i)).toBeDefined();
    expect(screen.getByText(/Download Full Backup/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Download Backup/i })).toBeDefined();
    expect(screen.getByText(/Restore from Backup/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Select File & Restore/i })).toBeDefined();
    expect(screen.getByText(/Factory Reset/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeDefined();
    expect(screen.getByText(/Device Storage Note/i)).toBeDefined();
    expect(screen.getByText(/USD-to-INR Exchange Rate/i)).toBeDefined();
  });

  it('AddEditRankModal renders accessible and visible Save and Cancel buttons in pinned footer', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <AddEditRankModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        suggestedName="PBA 8"
        defaultFeePercent={3}
      />
    );

    // Header title and close button
    expect(screen.getByText('Add New Rank')).toBeDefined();
    expect(screen.getByRole('button', { name: /Close/i })).toBeDefined();

    // Fields
    expect(screen.getByLabelText(/Rank Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Base Price \(USD\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Network Fee Percentage \(%\)/i)).toBeDefined();

    // Visible Cancel and Save buttons
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    const saveBtn = screen.getByRole('button', { name: /Add Rank/i });
    expect(cancelBtn).toBeDefined();
    expect(saveBtn).toBeDefined();

    // Clicking cancel calls handleClose
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('RanksTableView layout keeps all controls, search, and action buttons fully visible in responsive toolbar', () => {
    const onAddRank = vi.fn();
    const onExportCSV = vi.fn();
    const onOpenImportCSVModal = vi.fn();
    const onOpenConfigDropdown = vi.fn();

    render(
      <RanksTableView
        computedRanks={computedRanks}
        grandTotals={grandTotals}
        exchangeRate={100}
        note="Formula notes"
        isAdmin={true}
        onAddRank={onAddRank}
        onEditRank={vi.fn()}
        onDeleteRank={vi.fn()}
        onMoveRank={vi.fn()}
        onExportCSV={onExportCSV}
        onOpenImportCSVModal={onOpenImportCSVModal}
        onOpenResetModal={vi.fn()}
        onNavigateToCurrency={vi.fn()}
        onOpenConfigDropdown={onOpenConfigDropdown}
      />
    );

    // All controls are present and visible
    expect(screen.getByText(/Network Fee Percentage/i)).toBeDefined();
    expect(screen.getByText(/USD to INR Rate/i)).toBeDefined();
    expect(screen.getByPlaceholderText('Search...')).toBeDefined();

    const addRankBtn = screen.getByRole('button', { name: /\+ Add Rank/i });
    const exportBtn = screen.getByRole('button', { name: /Export/i });
    const importBtn = screen.getByRole('button', { name: /Import/i });
    const configBtn = screen.getByRole('button', { name: /Config/i });

    expect(addRankBtn).toBeDefined();
    expect(exportBtn).toBeDefined();
    expect(importBtn).toBeDefined();
    expect(configBtn).toBeDefined();

    // Clicking buttons triggers callbacks
    fireEvent.click(addRankBtn);
    expect(onAddRank).toHaveBeenCalled();

    fireEvent.click(exportBtn);
    expect(onExportCSV).toHaveBeenCalled();

    fireEvent.click(importBtn);
    expect(onOpenImportCSVModal).toHaveBeenCalled();

    fireEvent.click(configBtn);
    expect(onOpenConfigDropdown).toHaveBeenCalled();
  });
});
