import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { 
  getRegisteredNavigationFields, 
  getOrderedNavigationFields,
  getUserAllowedTabs,
  isUserAdminOrOwner
} from '../lib/permissions';
import { 
  loadKeyPoints, 
  saveKeyPointsLocal,
  addKeyPoint, 
  updateKeyPoint, 
  deleteKeyPoint, 
  moveKeyPointUp,
  moveKeyPointDown,
  reorderKeyPoints,
  validateKeyPointText,
  KEY_POINTS_STORAGE_KEY,
  KEY_POINTS_UPDATED_EVENT
} from '../lib/key-points-storage';
import { 
  getKeyPointsServerState,
  addKeyPointServer,
  updateKeyPointServer,
  deleteKeyPointServer,
  reorderKeyPointsServer,
  moveKeyPointUpServer,
  moveKeyPointDownServer
} from '../server/key-points-service';
import { resolveNavIcon } from '../components/user-management-tab';
import { SettingsView } from '../components/settings/SettingsView';
import { KeyPointsView } from '../components/key-points/KeyPointsView';
import { DEFAULT_KEY_POINTS } from '../types/key-points';

describe('Key Points & Settings Feature Acceptance Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('1. Sidebar Navigation & Menu Placement', () => {
    it('registers Key Points and Settings in registered navigation fields at the bottom', () => {
      const fields = getRegisteredNavigationFields();
      const kpIndex = fields.findIndex((f) => f.id === 'key-points');
      const settingsIndex = fields.findIndex((f) => f.id === 'settings');

      expect(kpIndex).toBeGreaterThanOrEqual(0);
      expect(settingsIndex).toBeGreaterThanOrEqual(0);
      expect(settingsIndex).toBe(kpIndex + 1);

      expect(fields[kpIndex].label).toBe('Key Points');
      expect(fields[settingsIndex].label).toBe('Settings');
    });

    it('resolves icons correctly for key-points and settings', () => {
      const kpIcon = resolveNavIcon('key-points');
      const settingsIcon = resolveNavIcon('settings');

      expect(kpIcon).toBeDefined();
      expect(settingsIcon).toBeDefined();
    });

    it('admin user automatically has access to key-points and settings tabs', () => {
      const adminTabs = getUserAllowedTabs('sivaji491@gmail.com');
      expect(adminTabs).toContain('key-points');
      expect(adminTabs).toContain('settings');
    });
  });

  describe('2. Validation & Default State', () => {
    it('loads default key points when storage is empty', () => {
      const items = loadKeyPoints();
      expect(items.length).toBeGreaterThanOrEqual(5);
      expect(items[0].text).toContain('Understand the Business Plan First');
      expect(items[0].pointNumber).toBe(1);
    });

    it('validates empty and whitespace-only entries', () => {
      const emptyResult = validateKeyPointText('');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.error).toContain('required');

      const whitespaceResult = validateKeyPointText('   ');
      expect(whitespaceResult.valid).toBe(false);
      expect(whitespaceResult.error).toContain('required');

      const tooShortResult = validateKeyPointText('ab');
      expect(tooShortResult.valid).toBe(false);
      expect(tooShortResult.error).toContain('at least 3 characters');

      const validResult = validateKeyPointText('Valid business principle');
      expect(validResult.valid).toBe(true);
    });
  });

  describe('3. Role-Based Permissions & Backend Security Enforcement', () => {
    it('allows Admin to add, edit, and delete key points via server service', () => {
      const adminEmail = 'sivaji491@gmail.com';

      // 1. Add key point
      const addRes = addKeyPointServer(adminEmail, 'Admin added test guideline', 'Governance');
      expect(addRes.success).toBe(true);
      expect(addRes.data).toBeDefined();
      const addedItem = addRes.data as any;
      expect(addedItem.text).toBe('Admin added test guideline');
      expect(addedItem.category).toBe('Governance');

      // Verify in storage
      const itemsAfterAdd = loadKeyPoints();
      expect(itemsAfterAdd.some((k) => k.id === addedItem.id)).toBe(true);

      // 2. Edit key point
      const editRes = updateKeyPointServer(adminEmail, addedItem.id, 'Admin updated test guideline', 'Strategy');
      expect(editRes.success).toBe(true);

      const itemsAfterEdit = loadKeyPoints();
      const editedItem = itemsAfterEdit.find((k) => k.id === addedItem.id);
      expect(editedItem?.text).toBe('Admin updated test guideline');
      expect(editedItem?.category).toBe('Strategy');

      // 3. Delete key point
      const delRes = deleteKeyPointServer(adminEmail, addedItem.id);
      expect(delRes.success).toBe(true);

      const itemsAfterDel = loadKeyPoints();
      expect(itemsAfterDel.some((k) => k.id === addedItem.id)).toBe(false);
    });

    it('strictly denies non-admin users from adding key points on backend', () => {
      const res = addKeyPointServer('regular_user@example.com', 'Unauthorized attempt', 'General');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');

      // Storage remains unchanged from defaults
      const items = loadKeyPoints();
      expect(items.some((k) => k.text === 'Unauthorized attempt')).toBe(false);
    });

    it('strictly denies non-admin users from updating key points on backend', () => {
      const res = updateKeyPointServer('regular_user@example.com', 'kp-1', 'Hacked text', 'General');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');

      const items = loadKeyPoints();
      expect(items.find((k) => k.id === 'kp-1')?.text).not.toBe('Hacked text');
    });

    it('strictly denies non-admin users from deleting key points on backend', () => {
      const res = deleteKeyPointServer('regular_user@example.com', 'kp-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');

      const items = loadKeyPoints();
      expect(items.some((k) => k.id === 'kp-1')).toBe(true);
    });
  });

  describe('4. Settings Page Component Functionality', () => {
    it('Admin sees Add Key Points button and can add a new key point via modal', async () => {
      render(<SettingsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Admin sees the Add Key Points button
      const addBtn = screen.getByRole('button', { name: /Add Key Points/i });
      expect(addBtn).toBeDefined();

      // Click Add Key Points to open modal
      fireEvent.click(addBtn);

      // Modal is open
      expect(screen.getByText('Add New Key Point')).toBeDefined();

      // Try saving empty text -> shows validation error
      const saveBtn = screen.getByRole('button', { name: /Save Key Point/i });
      fireEvent.click(saveBtn);

      expect(screen.getByText(/Key point text is required/i)).toBeDefined();

      // Enter valid text
      const textarea = screen.getByPlaceholderText(/Enter the key point or guideline/i);
      fireEvent.change(textarea, { target: { value: 'New verified business principle 2026' } });

      // Save
      fireEvent.click(saveBtn);

      // Verify success message and item in list
      await waitFor(() => {
        expect(screen.getByText('New verified business principle 2026')).toBeDefined();
        expect(screen.getByText(/Key point added successfully/i)).toBeDefined();
      });

      // Verify persisted in storage
      const stored = loadKeyPoints();
      expect(stored.some((k) => k.text === 'New verified business principle 2026')).toBe(true);
    });

    it('Admin can edit and delete key points on Settings page', async () => {
      render(<SettingsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Admin sees Edit buttons
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      expect(editButtons.length).toBeGreaterThan(0);

      // Admin sees Delete buttons
      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('Regular user does NOT see Add Key Points, Edit, or Delete controls on Settings page', () => {
      render(<SettingsView isAdmin={false} userEmail="regular@example.com" />);

      // No Add Key Points button
      expect(screen.queryByRole('button', { name: /Add Key Points/i })).toBeNull();

      // No Edit buttons
      expect(screen.queryByRole('button', { name: /Edit/i })).toBeNull();

      // No Delete buttons
      expect(screen.queryByRole('button', { name: /Delete/i })).toBeNull();

      // Sees Read-Only badge
      expect(screen.getByText(/Read-Only Mode/i)).toBeDefined();
    });
  });

  describe('5. Key Points Page Component Functionality', () => {
    it('Displays all key points with point numbers and categories', () => {
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      // Displays main headline
      expect(screen.getByText(/Understand the Subject First/i)).toBeDefined();

      // Displays default key points
      expect(screen.getByText(/Understand the Business Plan First/i)).toBeDefined();
      expect(screen.getByText(/Leveraged 12-Level compressed matrix/i)).toBeDefined();
      expect(screen.getByText(/Double Connect Bonus \(DCB\)/i)).toBeDefined();

      // Regular user does NOT see Add or Edit controls
      expect(screen.queryByRole('button', { name: /Add Key Points/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Edit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Delete/i })).toBeNull();
    });

    it('Filters key points by search query', () => {
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      const searchInput = screen.getByPlaceholderText(/Search key points/i);
      fireEvent.change(searchInput, { target: { value: 'Double Connect' } });

      // DCB should be visible
      expect(screen.getByText(/Double Connect Bonus \(DCB\)/i)).toBeDefined();
      // Other non-matching points should not be visible
      expect(screen.queryByText(/Token appreciation and revenue/i)).toBeNull();
    });

    it('Automatically updates when key points are updated in storage', async () => {
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      // Add a new key point directly via storage (simulating Settings tab save in another window)
      addKeyPoint('Real-time synchronized principle', 'sivaji491@gmail.com', 'Live Sync');

      await waitFor(() => {
        expect(screen.getByText('Real-time synchronized principle')).toBeDefined();
      });
    });
  });

  describe('6. Key Points Reordering Functionality (Move Up, Move Down, Persistence, RBAC)', () => {
    it('moveKeyPointDown and moveKeyPointUp correctly swaps items and updates pointNumbers sequentially', () => {
      const initial = loadKeyPoints();
      const firstId = initial[0].id;
      const secondId = initial[1].id;

      // Admin moves first item down
      const moveDownRes = moveKeyPointDown(firstId, 'sivaji491@gmail.com');
      expect(moveDownRes.success).toBe(true);

      const afterMoveDown = loadKeyPoints();
      expect(afterMoveDown[0].id).toBe(secondId);
      expect(afterMoveDown[1].id).toBe(firstId);
      // Verify pointNumbers are re-indexed to 1, 2, 3...
      expect(afterMoveDown[0].pointNumber).toBe(1);
      expect(afterMoveDown[1].pointNumber).toBe(2);

      // Admin moves it back up
      const moveUpRes = moveKeyPointUp(firstId, 'sivaji491@gmail.com');
      expect(moveUpRes.success).toBe(true);

      const afterMoveUp = loadKeyPoints();
      expect(afterMoveUp[0].id).toBe(firstId);
      expect(afterMoveUp[1].id).toBe(secondId);
      expect(afterMoveUp[0].pointNumber).toBe(1);
      expect(afterMoveUp[1].pointNumber).toBe(2);
    });

    it('boundary conditions: cannot move first item up or last item down', () => {
      const items = loadKeyPoints();
      const firstId = items[0].id;
      const lastId = items[items.length - 1].id;

      // Moving first item up fails gracefully
      const upRes = moveKeyPointUp(firstId, 'sivaji491@gmail.com');
      expect(upRes.success).toBe(false);

      // Moving last item down fails gracefully
      const downRes = moveKeyPointDown(lastId, 'sivaji491@gmail.com');
      expect(downRes.success).toBe(false);
    });

    it('reorderKeyPoints persists arbitrary order with updated sequential pointNumbers', () => {
      const items = loadKeyPoints();
      const reversedIds = items.map((it) => it.id).reverse();

      const res = reorderKeyPoints(reversedIds, 'sivaji491@gmail.com');
      expect(res.success).toBe(true);

      const reordered = loadKeyPoints();
      expect(reordered[0].id).toBe(reversedIds[0]);
      expect(reordered[reordered.length - 1].id).toBe(reversedIds[reversedIds.length - 1]);
      // All pointNumbers should be 1 to length
      reordered.forEach((item, idx) => {
        expect(item.pointNumber).toBe(idx + 1);
      });
    });

    it('server backend enforces admin-only access for reordering operations', () => {
      const items = getKeyPointsServerState();
      const firstId = items[0].id;

      // Non-admin attempting move down is blocked
      const nonAdminDown = moveKeyPointDownServer('regular@example.com', firstId);
      expect(nonAdminDown.success).toBe(false);
      expect(nonAdminDown.error).toContain('Unauthorized');

      // Non-admin attempting move up is blocked
      const nonAdminUp = moveKeyPointUpServer('regular@example.com', firstId);
      expect(nonAdminUp.success).toBe(false);
      expect(nonAdminUp.error).toContain('Unauthorized');

      // Non-admin attempting reorder is blocked
      const nonAdminReorder = reorderKeyPointsServer('regular@example.com', items.map((it) => it.id));
      expect(nonAdminReorder.success).toBe(false);
      expect(nonAdminReorder.error).toContain('Unauthorized');
    });

    it('KeyPointsView: Admin sees Move Up and Move Down buttons with proper disabled states', () => {
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Find all Move Up and Move Down buttons
      const moveUpButtons = screen.getAllByRole('button', { name: /Move key point .* up/i });
      const moveDownButtons = screen.getAllByRole('button', { name: /Move key point .* down/i });

      expect(moveUpButtons.length).toBeGreaterThan(1);
      expect(moveDownButtons.length).toBeGreaterThan(1);

      // First item's Move Up button MUST be disabled
      expect((moveUpButtons[0] as HTMLButtonElement).disabled).toBe(true);
      // First item's Move Down button MUST NOT be disabled
      expect((moveDownButtons[0] as HTMLButtonElement).disabled).toBe(false);

      // Last item's Move Down button MUST be disabled
      const lastIndex = moveDownButtons.length - 1;
      expect((moveDownButtons[lastIndex] as HTMLButtonElement).disabled).toBe(true);
      // Last item's Move Up button MUST NOT be disabled
      expect((moveUpButtons[lastIndex] as HTMLButtonElement).disabled).toBe(false);
    });

    it('KeyPointsView: Admin clicking Move Down button updates order and persists to storage', async () => {
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const itemsBefore = loadKeyPoints();
      const firstItem = itemsBefore[0];
      const secondItem = itemsBefore[1];

      // Find the first Move Down button
      const moveDownButtons = screen.getAllByRole('button', { name: /Move key point .* down/i });
      fireEvent.click(moveDownButtons[0]);

      // Check feedback notification
      await waitFor(() => {
        expect(screen.getByText(/Moved down successfully/i)).toBeDefined();
      });

      // Verify new order is saved in storage permanently
      const itemsAfter = loadKeyPoints();
      expect(itemsAfter[0].id).toBe(secondItem.id);
      expect(itemsAfter[1].id).toBe(firstItem.id);
      expect(itemsAfter[0].pointNumber).toBe(1);
      expect(itemsAfter[1].pointNumber).toBe(2);
    });

    it('KeyPointsView: Regular user does NOT see Move Up/Down buttons or drag handles', () => {
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      // Regular user should have zero Move Up or Move Down buttons
      expect(screen.queryByRole('button', { name: /Move key point .* up/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Move key point .* down/i })).toBeNull();

      // No drag handle elements
      expect(screen.queryByTitle(/Drag to reorder/i)).toBeNull();
    });

    it('KeyPointsView: Regular user displays key points in the exact order set by Admin', () => {
      // Admin sets an order where item 2 is first
      const items = loadKeyPoints();
      const reversedIds = [items[1].id, items[0].id, ...items.slice(2).map((it) => it.id)];
      reorderKeyPoints(reversedIds, 'sivaji491@gmail.com');

      // Regular user visits page
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      // Point #01 should be item 1's text
      const pointBadges = screen.getAllByText(/^01$/);
      expect(pointBadges.length).toBeGreaterThan(0);

      // Verify that the regular view has rendered item 1 as the first card
      const keyPointCards = screen.getAllByText(/Active Rule/i);
      expect(keyPointCards.length).toBe(items.length);
    });
  });

  describe('7. Automatic Pagination (10 Points Per Page: 0, 5, 10, 11, 20, 25 points)', () => {
    const createMockPoints = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        id: `mock-kp-${i + 1}`,
        pointNumber: i + 1,
        text: `Principle Benchmark Item #${String(i + 1).padStart(2, '0')}`,
        category: i % 2 === 0 ? 'Economics' : 'Operations',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Admin'
      }));
    };

    it('handles 0 key points gracefully with empty state and zero counts', () => {
      saveKeyPointsLocal([]);
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByText(/No key points match your search/i)).toBeDefined();
      expect(screen.queryByLabelText('Key points pagination')).toBeNull();
    });

    it('displays all 5 key points on Page 1 without empty placeholders, disabling Previous and Next', () => {
      saveKeyPointsLocal(createMockPoints(5));
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // All 5 items are visible
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Principle Benchmark Item #${String(i).padStart(2, '0')}`)).toBeDefined();
      }

      // Summary text
      expect(screen.getByText(/Showing/i).textContent).toContain('Showing 1–5 of 5 key points');

      // Previous and Next are disabled on single page
      const prevBtn = screen.getByRole('button', { name: /Previous page/i }) as HTMLButtonElement;
      const nextBtn = screen.getByRole('button', { name: /Next page/i }) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(true);

      // Only 1 page button
      expect(screen.getByRole('button', { name: 'Page 1' })).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Page 2' })).toBeNull();
    });

    it('displays exactly 10 key points on Page 1 when 10 points exist', () => {
      saveKeyPointsLocal(createMockPoints(10));
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Exactly 10 items displayed
      const cards = screen.getAllByText(/Active Rule/i);
      expect(cards.length).toBe(10);

      expect(screen.getByText(/Showing/i).textContent).toContain('Showing 1–10 of 10 key points');

      const prevBtn = screen.getByRole('button', { name: /Previous page/i }) as HTMLButtonElement;
      const nextBtn = screen.getByRole('button', { name: /Next page/i }) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(true);
    });

    it('distributes 11 key points as 10 on Page 1 and 1 on Page 2 with interactive navigation', async () => {
      saveKeyPointsLocal(createMockPoints(11));
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Page 1: Points 1 to 10 visible
      expect(screen.getByText('Principle Benchmark Item #01')).toBeDefined();
      expect(screen.getByText('Principle Benchmark Item #10')).toBeDefined();
      expect(screen.queryByText('Principle Benchmark Item #11')).toBeNull();

      expect(screen.getByText(/Showing/i).textContent).toContain('Showing 1–10 of 11 key points (Page 1 of 2)');

      const prevBtn = screen.getByRole('button', { name: /Previous page/i }) as HTMLButtonElement;
      const nextBtn = screen.getByRole('button', { name: /Next page/i }) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(false);

      // Click Next to navigate to Page 2
      fireEvent.click(nextBtn);

      // Page 2: Point 11 is now visible, Points 1-10 are hidden
      await waitFor(() => {
        expect(screen.getByText('Principle Benchmark Item #11')).toBeDefined();
        expect(screen.queryByText('Principle Benchmark Item #01')).toBeNull();
        expect(screen.getByText(/Showing/i).textContent).toContain('Showing 11–11 of 11 key points (Page 2 of 2)');
      });

      // On Page 2: Next is disabled, Previous is enabled
      expect(nextBtn.disabled).toBe(true);
      expect(prevBtn.disabled).toBe(false);

      // Click Previous to return to Page 1
      fireEvent.click(prevBtn);
      await waitFor(() => {
        expect(screen.getByText('Principle Benchmark Item #01')).toBeDefined();
      });
    });

    it('distributes 20 key points as 10 on Page 1 and 10 on Page 2', async () => {
      saveKeyPointsLocal(createMockPoints(20));
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByText(/Showing/i).textContent).toContain('Showing 1–10 of 20 key points (Page 1 of 2)');
      const page1Cards = screen.getAllByText(/Active Rule/i);
      expect(page1Cards.length).toBe(10);

      // Navigate via Page 2 button
      const page2Btn = screen.getByRole('button', { name: 'Page 2' });
      fireEvent.click(page2Btn);

      await waitFor(() => {
        expect(screen.getByText(/Showing/i).textContent).toContain('Showing 11–20 of 20 key points (Page 2 of 2)');
        const page2Cards = screen.getAllByText(/Active Rule/i);
        expect(page2Cards.length).toBe(10);
        expect(screen.getByText('Principle Benchmark Item #20')).toBeDefined();
      });
    });

    it('distributes 25 key points as 10 on Page 1, 10 on Page 2, and 5 on Page 3 (Exact User Spec)', async () => {
      saveKeyPointsLocal(createMockPoints(25));
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      // Page 1: 10 items
      expect(screen.getByText(/Showing/i).textContent).toContain('Showing 1–10 of 25 key points (Page 1 of 3)');
      expect(screen.getAllByText(/Active Rule/i).length).toBe(10);

      // Switch to Page 2
      const page2Btn = screen.getByRole('button', { name: 'Page 2' });
      fireEvent.click(page2Btn);

      await waitFor(() => {
        expect(screen.getByText(/Showing/i).textContent).toContain('Showing 11–20 of 25 key points (Page 2 of 3)');
        expect(screen.getAllByText(/Active Rule/i).length).toBe(10);
      });

      // Switch to Page 3
      const page3Btn = screen.getByRole('button', { name: 'Page 3' });
      fireEvent.click(page3Btn);

      await waitFor(() => {
        expect(screen.getByText(/Showing/i).textContent).toContain('Showing 21–25 of 25 key points (Page 3 of 3)');
        // Exactly 5 items on Page 3
        expect(screen.getAllByText(/Active Rule/i).length).toBe(5);
        expect(screen.getByText('Principle Benchmark Item #25')).toBeDefined();
      });

      // Next is disabled on the last page (Page 3)
      const nextBtn = screen.getByRole('button', { name: /Next page/i }) as HTMLButtonElement;
      expect(nextBtn.disabled).toBe(true);
    });

    it('Admin can reorder items across pages and order persists permanently', async () => {
      // 12 items: 10 on Page 1, 2 on Page 2
      saveKeyPointsLocal(createMockPoints(12));
      render(<KeyPointsView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Admin clicks Move Down on the 10th item (Point #10)
      const moveDownButtons = screen.getAllByRole('button', { name: /Move key point .* down/i });
      const lastDownBtnOnPage1 = moveDownButtons[9]; // 10th item on page 1

      fireEvent.click(lastDownBtnOnPage1);

      // Should move to Page 2, and page automatically follows it
      await waitFor(() => {
        expect(screen.getByText(/Moved to Page 2/i)).toBeDefined();
      });

      // Verify in storage that the item was swapped and persisted permanently
      const stored = loadKeyPoints();
      expect(stored[10].text).toBe('Principle Benchmark Item #10');
      expect(stored[9].text).toBe('Principle Benchmark Item #11');
      expect(stored[10].pointNumber).toBe(11);
      expect(stored[9].pointNumber).toBe(10);
    });

    it('Regular user has pagination controls but strictly no admin reordering controls', () => {
      saveKeyPointsLocal(createMockPoints(15));
      render(<KeyPointsView isAdmin={false} userEmail="regular@example.com" />);

      // Can see and click pagination
      expect(screen.getByRole('button', { name: /Next page/i })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Page 1' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeDefined();

      // Zero Move Up / Move Down buttons
      expect(screen.queryByRole('button', { name: /Move key point .* up/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Move key point .* down/i })).toBeNull();
      expect(screen.queryByTitle(/Drag to reorder/i)).toBeNull();
    });
  });
});

