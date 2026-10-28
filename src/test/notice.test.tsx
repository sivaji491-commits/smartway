import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { 
  DEFAULT_NAVIGATION_FIELDS, 
  getOrderedNavigationFields, 
  getRegisteredNavigationFields,
  getUserAllowedTabs, 
  isPageAllowed, 
  isUserAdminOrOwner 
} from '../lib/permissions';
import { 
  loadNotices, 
  saveNoticesLocal, 
  addNoticeAdmin, 
  updateNoticeAdmin, 
  deleteNoticeAdmin, 
  toggleNoticeStatusAdmin, 
  resetNoticesDefaultsAdmin,
  validateNoticeText,
  NOTICE_STORAGE_KEY,
  NOTICE_UPDATED_EVENT 
} from '../lib/notice-storage';
import { DEFAULT_NOTICES, NoticeItem } from '../types/notice';
import { NoticeManagementView } from '../components/notice/NoticeManagementView';
import { HomeScrollingMarquee, DEFAULT_MARQUEE_TEXT } from '../components/home/HomeScrollingMarquee';
import { resolveNavIcon } from '../components/user-management-tab';

describe('Notice Management & Home Page Scrolling Marquee Feature Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Navigation & Placement
  // --------------------------------------------------------------------------
  describe('1. Navigation & Placement', () => {
    it('registers Notice in DEFAULT_NAVIGATION_FIELDS with Bell icon', () => {
      const noticeField = DEFAULT_NAVIGATION_FIELDS.find((f) => f.id === 'notice');
      expect(noticeField).toBeDefined();
      expect(noticeField?.label).toBe('Notice');
      expect(noticeField?.iconName).toBe('Bell');
    });

    it('orders Notice in getOrderedNavigationFields() properly', () => {
      const ordered = getOrderedNavigationFields();
      const noticeIdx = ordered.findIndex((f) => f.id === 'notice');
      expect(noticeIdx).toBeGreaterThanOrEqual(0);

      const settingsIdx = ordered.findIndex((f) => f.id === 'settings');
      expect(settingsIdx).toBeGreaterThan(noticeIdx);
    });

    it('resolves Bell icon correctly for notice and bell identifiers', () => {
      const noticeIcon = resolveNavIcon('notice');
      const bellIcon = resolveNavIcon('bell');
      expect(noticeIcon).toBeDefined();
      expect(bellIcon).toBeDefined();
      expect(noticeIcon).toBe(bellIcon);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Strict Role Permissions & Access Control
  // --------------------------------------------------------------------------
  describe('2. Strict Role Permissions & Access Control', () => {
    it('identifies sivaji491@gmail.com as Admin/Owner', () => {
      expect(isUserAdminOrOwner('sivaji491@gmail.com')).toBe(true);
      expect(isUserAdminOrOwner('user@example.com')).toBe(false);
    });

    it('allows Admin to access notice page but strictly blocks regular users', () => {
      expect(isPageAllowed('sivaji491@gmail.com', 'notice')).toBe(true);
      expect(isPageAllowed('regular@example.com', 'notice')).toBe(false);
      expect(isPageAllowed(null, 'notice')).toBe(false);
      expect(isPageAllowed(undefined, 'notice')).toBe(false);
    });

    it('never includes notice in getUserAllowedTabs for non-admin users', () => {
      const regularTabs = getUserAllowedTabs('regular@example.com');
      expect(regularTabs).not.toContain('notice');
    });

    it('renders AccessDeniedView when non-admin accesses NoticeManagementView', () => {
      render(<NoticeManagementView isAdmin={false} userEmail="regular@example.com" />);
      expect(screen.getByText(/Access Restricted/i)).toBeDefined();
      expect(screen.queryByText(/Live Home Page Marquee Preview/i)).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Validation Logic
  // --------------------------------------------------------------------------
  describe('3. Validation Logic', () => {
    it('rejects empty or whitespace-only notice text', () => {
      expect(validateNoticeText('').valid).toBe(false);
      expect(validateNoticeText('   ').valid).toBe(false);
      expect(validateNoticeText(null).valid).toBe(false);
    });

    it('rejects notice text shorter than 3 characters', () => {
      const res = validateNoticeText('ab');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('at least 3 characters');
    });

    it('rejects notice text longer than 500 characters', () => {
      const longText = 'A'.repeat(501);
      const res = validateNoticeText(longText);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('500 characters');
    });

    it('accepts valid notice text', () => {
      const res = validateNoticeText('Special weekend announcement for all active members.');
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Storage Operations (CRUD & Authorization)
  // --------------------------------------------------------------------------
  describe('4. Storage Operations (CRUD & Authorization)', () => {
    it('loads default notices when localStorage is empty', () => {
      const notices = loadNotices();
      expect(notices.length).toBeGreaterThanOrEqual(1);
      expect(notices[0].text).toBe(DEFAULT_NOTICES[0].text);
    });

    it('allows Admin to add a new notice message', async () => {
      const res = await addNoticeAdmin('Admin created notice test', 'sivaji491@gmail.com');
      expect(res.success).toBe(true);
      expect(res.notices).toBeDefined();

      const stored = loadNotices();
      expect(stored.some((n) => n.text === 'Admin created notice test')).toBe(true);
    });

    it('blocks non-admin from adding a notice', async () => {
      const res = await addNoticeAdmin('Unauthorized notice', 'regular@example.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });

    it('allows Admin to update an existing notice message', async () => {
      const current = loadNotices();
      const firstId = current[0].id;

      const res = await updateNoticeAdmin(firstId, 'Updated notice announcement', 'sivaji491@gmail.com');
      expect(res.success).toBe(true);

      const stored = loadNotices();
      expect(stored.find((n) => n.id === firstId)?.text).toBe('Updated notice announcement');
    });

    it('allows Admin to toggle notice active/inactive status', async () => {
      const current = loadNotices();
      const firstId = current[0].id;
      const initialStatus = current[0].isActive !== false;

      const res = await toggleNoticeStatusAdmin(firstId, 'sivaji491@gmail.com');
      expect(res.success).toBe(true);

      const stored = loadNotices();
      expect(stored.find((n) => n.id === firstId)?.isActive).toBe(!initialStatus);
    });

    it('allows Admin to delete a notice message', async () => {
      const addRes = await addNoticeAdmin('Notice to delete', 'sivaji491@gmail.com');
      const addedId = addRes.notice!.id;

      const delRes = await deleteNoticeAdmin(addedId, 'sivaji491@gmail.com');
      expect(delRes.success).toBe(true);

      const stored = loadNotices();
      expect(stored.some((n) => n.id === addedId)).toBe(false);
    });

    it('allows Admin to reset notices back to factory defaults', async () => {
      await addNoticeAdmin('Notice 1', 'sivaji491@gmail.com');
      await addNoticeAdmin('Notice 2', 'sivaji491@gmail.com');

      const resetRes = await resetNoticesDefaultsAdmin('sivaji491@gmail.com');
      expect(resetRes.success).toBe(true);

      const stored = loadNotices();
      expect(stored.length).toBe(DEFAULT_NOTICES.length);
      expect(stored[0].text).toBe(DEFAULT_NOTICES[0].text);
    });
  });

  // --------------------------------------------------------------------------
  // 5. NoticeManagementView Component Interaction
  // --------------------------------------------------------------------------
  describe('5. NoticeManagementView Component Interaction', () => {
    it('renders admin toolbar, preview banner, and add form', () => {
      render(<NoticeManagementView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByText('Notice Management')).toBeDefined();
      expect(screen.getByText(/Live Home Page Marquee Preview/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Enter announcement text to scroll/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Save & Publish Notice/i })).toBeDefined();
    });

    it('allows Admin to add a new notice via the UI form', async () => {
      render(<NoticeManagementView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const textarea = screen.getByPlaceholderText(/Enter announcement text to scroll/i);
      fireEvent.change(textarea, { target: { value: 'New interactive announcement 2026' } });

      const saveBtn = screen.getByRole('button', { name: /Save & Publish Notice/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getAllByText('New interactive announcement 2026').length).toBeGreaterThan(0);
        expect(screen.getByText(/New notice added and published/i)).toBeDefined();
      });

      const stored = loadNotices();
      expect(stored.some((n) => n.text === 'New interactive announcement 2026')).toBe(true);
    });

    it('allows Admin to edit an existing notice and save changes', async () => {
      render(<NoticeManagementView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const editButtons = screen.getAllByTitle(/Edit this notice/i);
      expect(editButtons.length).toBeGreaterThan(0);

      // Click Edit on the first notice
      fireEvent.click(editButtons[0]);

      // Form enters inline edit mode
      expect(screen.getByText(/Editing Mode/i)).toBeDefined();
      const saveChangesBtn = screen.getByRole('button', { name: /Save Changes/i });

      // Change text
      const editInput = screen.getByDisplayValue(DEFAULT_NOTICES[0].text);
      fireEvent.change(editInput, { target: { value: 'Revised business plan announcement' } });

      fireEvent.click(saveChangesBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Revised business plan announcement').length).toBeGreaterThan(0);
        expect(screen.getByText(/Notice updated successfully/i)).toBeDefined();
      });
    });

    it('allows Admin to delete a notice via confirmation dialog', async () => {
      // Seed with an extra notice to delete
      await addNoticeAdmin('Notice that should be deleted', 'sivaji491@gmail.com');

      render(<NoticeManagementView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getAllByText('Notice that should be deleted').length).toBeGreaterThan(0);

      const deleteButtons = screen.getAllByTitle(/Delete this notice/i);
      // Click delete on the last notice
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      // Confirmation dialog opens
      expect(screen.getByText(/Delete Notice Announcement\?/i)).toBeDefined();

      const confirmBtn = screen.getByRole('button', { name: 'Delete Notice' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.queryAllByText('Notice that should be deleted').length).toBe(0);
        expect(screen.getByText(/Notice deleted successfully/i)).toBeDefined();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 6. HomeScrollingMarquee Component
  // --------------------------------------------------------------------------
  describe('6. HomeScrollingMarquee Component', () => {
    it('renders single fallback text when no notices provided', () => {
      render(<HomeScrollingMarquee />);
      expect(screen.getAllByText(DEFAULT_MARQUEE_TEXT).length).toBeGreaterThan(0);
      expect(screen.getByText('NOTICE')).toBeDefined();
    });

    it('renders multiple active notices in the continuous marquee track', () => {
      const mockNotices: NoticeItem[] = [
        { id: '1', text: 'First Notice Test', createdAt: new Date().toISOString(), isActive: true },
        { id: '2', text: 'Second Notice Test', createdAt: new Date().toISOString(), isActive: true },
        { id: '3', text: 'Hidden Notice Test', createdAt: new Date().toISOString(), isActive: false },
      ];

      render(<HomeScrollingMarquee notices={mockNotices} />);

      expect(screen.getAllByText('First Notice Test').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Second Notice Test').length).toBeGreaterThan(0);
      expect(screen.queryByText('Hidden Notice Test')).toBeNull();
    });

    it('pauses on mouseEnter and resumes on mouseLeave', () => {
      const { container } = render(<HomeScrollingMarquee text="Hover Pause Test" />);
      const marqueeRegion = screen.getByRole('region', { name: /Important Announcement Marquee/i });
      const track = container.querySelector('.home-marquee-track');

      expect(track?.classList.contains('paused')).toBe(false);

      // Mouse enter triggers pause
      fireEvent.mouseEnter(marqueeRegion);
      expect(track?.classList.contains('paused')).toBe(true);

      // Mouse leave resumes
      fireEvent.mouseLeave(marqueeRegion);
      expect(track?.classList.contains('paused')).toBe(false);
    });

    it('pauses on touchStart and resumes on touchEnd for mobile devices', () => {
      const { container } = render(<HomeScrollingMarquee text="Touch Pause Test" />);
      const marqueeRegion = screen.getByRole('region', { name: /Important Announcement Marquee/i });
      const track = container.querySelector('.home-marquee-track');

      // Touch start triggers pause
      fireEvent.touchStart(marqueeRegion);
      expect(track?.classList.contains('paused')).toBe(true);

      // Touch end resumes
      fireEvent.touchEnd(marqueeRegion);
      expect(track?.classList.contains('paused')).toBe(false);
    });
  });
});
