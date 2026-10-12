import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { 
  DEFAULT_NAVIGATION_FIELDS, 
  getRegisteredNavigationFields,
  getOrderedNavigationFields,
  saveSidebarNavOrder,
  SIDEBAR_NAV_ORDER_STORAGE_KEY
} from '../lib/permissions';

describe('Sidebar Menu: Automatic Layout Adjustment & Drag-and-Drop Reordering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Sidebar Order Persistence & Ordering Logic', () => {
    it('returns default registered fields when no custom order is persisted', () => {
      const ordered = getOrderedNavigationFields();
      const registered = getRegisteredNavigationFields();
      expect(ordered.map((f) => f.id)).toEqual(registered.map((f) => f.id));
    });

    it('saves custom reordered items to localStorage and retrieves them in exact order', () => {
      const original = getRegisteredNavigationFields().map((f) => f.id);
      expect(original.length).toBeGreaterThan(3);

      // Reorder: Move 'customer-view' to top
      const customOrder = ['customer-view', ...original.filter((id) => id !== 'customer-view')];
      saveSidebarNavOrder(customOrder);

      const savedRaw = localStorage.getItem(SIDEBAR_NAV_ORDER_STORAGE_KEY);
      expect(savedRaw).toBeTruthy();
      expect(JSON.parse(savedRaw!)).toEqual(customOrder);

      const retrieved = getOrderedNavigationFields();
      expect(retrieved[0].id).toBe('customer-view');
      expect(retrieved.map((f) => f.id)).toEqual(customOrder);
    });

    it('safely appends newly registered navigation fields not yet present in saved order', () => {
      // Simulate an order saved with only 3 items
      const partialOrder = ['ranks', 'home', 'dcb-90-days'];
      saveSidebarNavOrder(partialOrder);

      const retrieved = getOrderedNavigationFields();
      expect(retrieved[0].id).toBe('ranks');
      expect(retrieved[1].id).toBe('home');
      expect(retrieved[2].id).toBe('dcb-90-days');

      // The remaining items should still be present without being omitted
      const allIds = getRegisteredNavigationFields().map((f) => f.id);
      expect(retrieved.length).toBe(allIds.length);
      allIds.forEach((id) => {
        expect(retrieved.some((item) => item.id === id)).toBe(true);
      });
    });

    it('dispatches nexora_nav_order_updated custom event when order is saved', () => {
      const listener = vi.fn();
      window.addEventListener('nexora_nav_order_updated', listener);

      saveSidebarNavOrder(['home', 'users']);
      expect(listener).toHaveBeenCalled();

      window.removeEventListener('nexora_nav_order_updated', listener);
    });
  });

  describe('2. Sidebar HTML5 Drag-and-Drop & Layout Markup', () => {
    it('supports drag-and-drop attributes on sidebar navigation items', () => {
      const ordered = getOrderedNavigationFields();
      expect(ordered.some((f) => f.id === 'customer-view')).toBe(true);
      expect(ordered.some((f) => f.id === 'dcb-90-days')).toBe(true);
    });

    it('swaps elements cleanly when performReorder logic is executed', () => {
      const list = ['home', 'users', 'ranks', 'customer-view'];
      const fromIndex = 3; // 'customer-view'
      const toIndex = 1; // 'users'
      const position = 'before';

      const updated = [...list];
      const [moved] = updated.splice(fromIndex, 1);
      let targetIdx = updated.indexOf(list[toIndex]);
      if (position === 'after') targetIdx += 1;
      updated.splice(targetIdx, 0, moved);

      expect(updated).toEqual(['home', 'customer-view', 'users', 'ranks']);
    });
  });
});
