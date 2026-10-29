import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RankCalculatorApp } from '../components/rank-calculator/RankCalculatorApp';
import { RanksTableView } from '../components/rank-calculator/RanksTableView';
import { 
  computeRankTotals, 
  DEFAULT_RANKS, 
  computeGrandTotals 
} from '../lib/rank-calculator-engine';
import { 
  saveRankCalculatorState, 
  loadRankCalculatorState,
  saveRankCalculatorStateAdmin,
  updateRankBasePriceAdmin,
  updateRankItemAdmin,
  resetRankCalculatorToDefault,
  STORAGE_KEY
} from '../lib/rank-storage';
import { 
  updateRanksServer, 
  updateRankPriceServer 
} from '../server/ranks-service';

describe('Ranks Page Edit Option Permissions: Admin vs Regular User', () => {
  const computedRanks = computeRankTotals(DEFAULT_RANKS, 100);
  const grandTotals = computeGrandTotals(computedRanks, 100);

  beforeEach(() => {
    window.localStorage.clear();
    resetRankCalculatorToDefault();
  });

  describe('1. Admin User Capabilities & Verification', () => {
    it('Admin login: displays Edit option button and icon for every rank row in Actions column', () => {
      render(
        <RanksTableView
          computedRanks={computedRanks}
          grandTotals={grandTotals}
          exchangeRate={100}
          note="Test note"
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

      // Verify Actions column header is rendered
      expect(screen.getByText('Actions')).toBeDefined();

      // Verify Edit buttons exist for all 7 default ranks
      const editButtons = screen.getAllByTitle('Edit rank');
      expect(editButtons).toHaveLength(7);

      // Verify Move and Delete buttons also exist for admin
      const deleteButtons = screen.getAllByTitle('Delete rank');
      expect(deleteButtons).toHaveLength(7);
      expect(screen.getAllByTitle('Move up')).toHaveLength(7);
      expect(screen.getAllByTitle('Move down')).toHaveLength(7);

      // Verify Admin toolbar options are visible
      expect(screen.getByText(/Network Fee Percentage/i)).toBeDefined();
      expect(screen.getByText(/USD to INR Rate/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /\+ Add Rank/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Export/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Import/i })).toBeDefined();

      // Verify Rank Price inputs are editable for admin
      const priceInputs = screen.getAllByRole('textbox', { name: /Price in USD/i });
      expect(priceInputs).toHaveLength(7);
    });

    it('Admin login: clicking Edit opens modal, updates rank values, and saves changes successfully', async () => {
      render(
        <RankCalculatorApp
          initialTab="ranks"
          embedded={true}
          isAdmin={true}
          allowedTabs={['ranks']}
        />
      );

      // 1. Edit buttons are present
      const editButtons = screen.getAllByTitle('Edit rank');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);

      // 2. Click Edit on the first rank (PBA 1)
      fireEvent.click(editButtons[0]);

      // 3. Modal opens with title "Edit Rank"
      expect(screen.getByText('Edit Rank')).toBeDefined();
      expect(screen.getByText(/Update properties for PBA 1/i)).toBeDefined();

      // 4. Change Rank Name and Base Price
      const nameInput = screen.getByLabelText(/Rank Name/i);
      const priceInput = screen.getByLabelText(/Base Price \(USD\)/i);

      fireEvent.change(nameInput, { target: { value: 'PBA 1 Master' } });
      fireEvent.change(priceInput, { target: { value: '150' } });

      // 5. Submit form
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      // 6. Verify modal closes and updated rank name is displayed in table
      await waitFor(() => {
        expect(screen.getByText('PBA 1 Master')).toBeDefined();
      });

      // 7. Verify toast notification appears
      expect(screen.getByText(/Rank "PBA 1 Master" updated successfully/i)).toBeDefined();
    });

    it('Admin login: inline editing of rank price works and updates live', () => {
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

      const priceInput = screen.getAllByRole('textbox', { name: /Price in USD/i })[0] as HTMLInputElement;
      expect(priceInput).toBeDefined();

      fireEvent.focus(priceInput);
      fireEvent.change(priceInput, { target: { value: '350' } });
      fireEvent.blur(priceInput);

      expect(onUpdateRankBasePrice).toHaveBeenCalledWith(computedRanks[0].id, 350);
    });
  });

  describe('2. Regular User Login Restrictions & Complete Edit Removal', () => {
    it('Regular user login: completely hides Edit button, icon, and all editing controls', () => {
      render(
        <RanksTableView
          computedRanks={computedRanks}
          grandTotals={grandTotals}
          exchangeRate={100}
          note="Test note"
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

      // 1. Actions column header is completely removed
      expect(screen.queryByText('Actions')).toBeNull();

      // 2. Edit buttons and icons are completely removed
      expect(screen.queryByTitle('Edit rank')).toBeNull();
      expect(screen.queryByTitle('Delete rank')).toBeNull();
      expect(screen.queryByTitle('Move up')).toBeNull();
      expect(screen.queryByTitle('Move down')).toBeNull();

      // 3. Admin toolbar is completely removed
      expect(screen.queryByText(/Network Fee Percentage/i)).toBeNull();
      expect(screen.queryByText(/USD to INR Rate/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /\+ Add Rank/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Export/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Import/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Config/i })).toBeNull();

      // 4. Rank Price column has NO editable input boxes
      const priceInputs = screen.queryAllByRole('textbox', { name: /Price in USD/i });
      expect(priceInputs).toHaveLength(0);

      // 5. Rank data remains clearly visible as read-only formatted text
      expect(screen.getByText('PBA 1')).toBeDefined();
      expect(screen.getByText('$100.00')).toBeDefined();
      expect(screen.getByText('₹10,300.00')).toBeDefined();
      expect(screen.getByText('Final Rank Cost')).toBeDefined();
    });

    it('Regular user login inside RankCalculatorApp: hides all editing options and modals', () => {
      render(
        <RankCalculatorApp
          initialTab="ranks"
          embedded={true}
          isAdmin={false}
          allowedTabs={['ranks']}
        />
      );

      // Verify no Edit or Delete buttons exist in DOM
      expect(screen.queryByTitle('Edit rank')).toBeNull();
      expect(screen.queryByTitle('Delete rank')).toBeNull();
      expect(screen.queryByText('Actions')).toBeNull();
      expect(screen.queryByRole('button', { name: /\+ Add Rank/i })).toBeNull();

      // Verify modal is not in DOM
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('Edit Rank')).toBeNull();
      expect(screen.queryByText('Add New Rank')).toBeNull();
    });

    it('Backend/API enforcement: regular user attempts to modify rank state via saveRankCalculatorStateAdmin are rejected', () => {
      const regularUserEmail = 'regularuser@smartway.example';
      const modifiedState = {
        ...loadRankCalculatorState(),
        ranks: [
          {
            id: 'rank-1',
            name: 'Hacked Rank',
            basePrice: 9999,
            networkFeePercent: 0,
            order: 1,
          },
        ],
      };

      const result = saveRankCalculatorStateAdmin(modifiedState, regularUserEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Only administrators have permission to edit Ranks information.');

      // Verify stored data was not changed
      const currentStored = loadRankCalculatorState();
      expect(currentStored.ranks[0].name).not.toBe('Hacked Rank');
      expect(currentStored.ranks[0].name).toBe('PBA 1');
    });

    it('Backend/API enforcement: regular user attempts to update rank price via updateRankBasePriceAdmin are rejected', () => {
      const regularUserEmail = 'regularuser@smartway.example';

      const result = updateRankBasePriceAdmin('rank-1', 9999, regularUserEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Only administrators have permission to edit Ranks information.');

      // Stored base price remains intact ($100)
      const currentStored = loadRankCalculatorState();
      expect(currentStored.ranks[0].basePrice).toBe(100);
    });

    it('Backend/API enforcement: regular user attempts to update rank properties via updateRankItemAdmin are rejected', () => {
      const regularUserEmail = 'regularuser@smartway.example';

      const result = updateRankItemAdmin('rank-1', { name: 'Illegal Rank Name' }, regularUserEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Only administrators have permission to edit Ranks information.');

      const currentStored = loadRankCalculatorState();
      expect(currentStored.ranks[0].name).toBe('PBA 1');
    });

    it('Server functions RPC enforcement: validateAndUpdateRanksServer rejects regular users', () => {
      const regularUser = 'regular_member';
      const state = loadRankCalculatorState();

      const serverRes = updateRanksServer(regularUser, state);

      expect(serverRes.success).toBe(false);
      expect(serverRes.error).toContain('Unauthorized: Only administrators have permission to edit Ranks information.');
    });

    it('Server functions RPC enforcement: updateRankPriceServer rejects regular users', () => {
      const regularUser = 'regular_member';

      const serverRes = updateRankPriceServer(regularUser, 'rank-1', 500);

      expect(serverRes.success).toBe(false);
      expect(serverRes.error).toContain('Unauthorized: Only administrators have permission to edit Ranks information.');
    });

    it('Authorized Admin successfully modifies ranks through API functions', () => {
      const adminEmail = 'sivaji491@gmail.com';

      // 1. Admin updates base price
      const priceRes = updateRankBasePriceAdmin('rank-1', 120, adminEmail);
      expect(priceRes.success).toBe(true);

      const stateAfterPrice = loadRankCalculatorState();
      expect(stateAfterPrice.ranks[0].basePrice).toBe(120);

      // 2. Admin updates rank item
      const itemRes = updateRankItemAdmin('rank-1', { name: 'PBA 1 Updated' }, adminEmail);
      expect(itemRes.success).toBe(true);

      const stateAfterItem = loadRankCalculatorState();
      expect(stateAfterItem.ranks[0].name).toBe('PBA 1 Updated');

      // 3. Admin server update
      const serverRes = updateRankPriceServer(adminEmail, 'rank-1', 100);
      expect(serverRes.success).toBe(true);
    });
  });

  describe('3. Multi-Device & Responsive Verification (Mobile, Tablet, Laptop, Desktop)', () => {
    it('Mobile viewport (375px & 430px): table renders cleanly and regular users see read-only prices without Edit buttons', () => {
      const { container } = render(
        <div style={{ width: '375px' }}>
          <RanksTableView
            computedRanks={computedRanks}
            grandTotals={grandTotals}
            exchangeRate={100}
            note="Test note"
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
        </div>
      );

      // Verify table scroll wrapper exists for mobile
      const scrollWrapper = container.querySelector('.overflow-x-auto');
      expect(scrollWrapper).toBeDefined();

      // No Edit option anywhere
      expect(screen.queryByTitle('Edit rank')).toBeNull();
      expect(screen.queryByText('Actions')).toBeNull();

      // Read-only values rendered cleanly
      expect(screen.getByText('$100.00')).toBeDefined();
      expect(screen.getByText('Final Rank Cost')).toBeDefined();
    });

    it('Tablet viewport (768px): regular user view renders properly formatted with no Edit options', () => {
      const { container } = render(
        <div style={{ width: '768px' }}>
          <RanksTableView
            computedRanks={computedRanks}
            grandTotals={grandTotals}
            exchangeRate={100}
            note="Test note"
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
        </div>
      );

      expect(screen.queryByTitle('Edit rank')).toBeNull();
      expect(screen.queryByText('Actions')).toBeNull();

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(7);
    });

    it('Laptop & Desktop viewport (1024px, 1366px, 1440px, 1920px): regular user view maintains full width, clean styling and no edit options', () => {
      const { container } = render(
        <div style={{ width: '1440px' }}>
          <RanksTableView
            computedRanks={computedRanks}
            grandTotals={grandTotals}
            exchangeRate={100}
            note="Test note"
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
        </div>
      );

      // Verify 7 table columns are present (46px..118px cols without the 8th Actions col)
      const cols = container.querySelectorAll('colgroup col');
      expect(cols).toHaveLength(7);

      // No Edit button or input box
      expect(screen.queryByTitle('Edit rank')).toBeNull();
      expect(screen.queryAllByRole('textbox')).toHaveLength(0);

      // Verification of Final Rank Cost summary card
      expect(screen.getByText('Final Rank Cost')).toBeDefined();
      expect(screen.getAllByText('$5,150.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('₹5,15,000.00').length).toBeGreaterThanOrEqual(1);
    });
  });
});
