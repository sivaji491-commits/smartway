import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState, useEffect } from 'react';
import {
  getUserAllowedTabs,
  isPageAllowed,
  getAccessibleLandingPage,
  filterAllowedNavigation,
  isUserAdminOrOwner,
  getOrderedNavigationFields,
  resolveEffectiveUserIdentifier,
  STORAGE_KEY,
  DEFAULT_NAVIGATION_FIELDS,
} from '@/lib/permissions';
import {
  verifyUserPermission,
  assertPermission,
  assertAdminAccess,
  PermissionDeniedError,
  AuthenticationRequiredError,
} from '@/lib/server-permissions';
import {
  apiGetWorkspaceUsers,
  apiUpdateUserPermissions,
  apiGetProtectedModuleData,
} from '@/lib/protected-api';

/**
 * Realistic Sidebar Component mimicking the exact rendering logic in maintenance.tsx
 */
function TestSidebar({ effectiveEmail }: { effectiveEmail: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [navItems, setNavItems] = useState(() =>
    getOrderedNavigationFields().filter((f) => f.id !== 'status')
  );

  useEffect(() => {
    const handleUpdate = () => {
      setNavItems(getOrderedNavigationFields().filter((f) => f.id !== 'status'));
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('nexora_permissions_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nexora_permissions_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const allowedTabs = getUserAllowedTabs(effectiveEmail);

  return (
    <aside className="app-sidebar" data-testid="test-sidebar" key={refreshKey}>
      <nav className="sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => {
          if (!allowedTabs.includes(item.id)) return null;
          return (
            <button
              key={item.id}
              type="button"
              data-item-id={item.id}
              aria-label={item.label}
              className="sidebar-nav-btn"
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

describe('USER MANAGEMENT SIDEBAR PERMISSION SYNCHRONIZATION (10 Acceptance Scenarios)', () => {
  const adminEmail = 'sivaji491@gmail.com';

  const initialWorkspaceUsers = [
    {
      id: 'usr-owner',
      name: 'Sivaji (Owner)',
      username: 'sivaji',
      email: 'sivaji491@gmail.com',
      role: 'owner',
      status: 'ACTIVE',
      permissions: [
        'home',
        'users',
        'earning-opportunities',
        'ranks',
        '12-level-bonus',
        'dcb-90-days',
        'customer-view',
        'currency',
        'configuration',
        'key-points',
        'time-in-hand',
        'settings',
      ],
    },
    {
      id: 'usr-trio',
      name: 'Trio User',
      username: 'triouser',
      email: 'trio@example.com',
      role: 'member',
      status: 'ACTIVE',
      permissions: ['home', 'ranks', 'currency'],
    },
    {
      id: 'usr-dual',
      name: 'Dual User',
      username: 'dualuser',
      email: 'dual@example.com',
      role: 'member',
      status: 'ACTIVE',
      permissions: ['home', '12-level-bonus'],
    },
    {
      id: 'usr-none',
      name: 'No Perms User',
      username: 'noperms',
      email: 'noperms@example.com',
      role: 'member',
      status: 'ACTIVE',
      permissions: [],
    },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialWorkspaceUsers));
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // Scenario 1: Existing user with permission for three menu items sees exactly those three
  // -------------------------------------------------------------
  it('Scenario 1: An existing user with permission for three menu items sees exactly those three permitted items', () => {
    window.localStorage.setItem('nexora-user-email', 'triouser');
    const effective = resolveEffectiveUserIdentifier('preview@nexora.example');
    expect(effective).toBe('triouser');

    const allowed = getUserAllowedTabs(effective);
    expect(allowed).toEqual(['home', 'ranks', 'currency']);

    const { container } = render(<TestSidebar effectiveEmail={effective} />);
    const buttons = container.querySelectorAll('.sidebar-nav-btn');
    expect(buttons).toHaveLength(3);

    expect(container.querySelector('[data-item-id="home"]')).not.toBeNull();
    expect(container.querySelector('[data-item-id="ranks"]')).not.toBeNull();
    expect(container.querySelector('[data-item-id="currency"]')).not.toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 2: Existing user without permission for a particular menu item does not see it
  // -------------------------------------------------------------
  it('Scenario 2: An existing user without permission for a particular menu item does not see it', () => {
    window.localStorage.setItem('nexora-user-email', 'triouser');
    const effective = resolveEffectiveUserIdentifier('preview@nexora.example');

    const { container } = render(<TestSidebar effectiveEmail={effective} />);

    // Items NOT granted must not be rendered
    expect(container.querySelector('[data-item-id="users"]')).toBeNull();
    expect(container.querySelector('[data-item-id="12-level-bonus"]')).toBeNull();
    expect(container.querySelector('[data-item-id="dcb-90-days"]')).toBeNull();
    expect(container.querySelector('[data-item-id="configuration"]')).toBeNull();
    expect(container.querySelector('[data-item-id="customer-view"]')).toBeNull();
    expect(container.querySelector('[data-item-id="key-points"]')).toBeNull();
    expect(container.querySelector('[data-item-id="time-in-hand"]')).toBeNull();
    expect(container.querySelector('[data-item-id="settings"]')).toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 3: Newly created user sees only the menu items assigned by the administrator
  // -------------------------------------------------------------
  it('Scenario 3: A newly created user sees only the menu items assigned by the administrator', () => {
    // Admin creates a new user with 2 assigned tabs: 'home' and 'time-in-hand'
    const newUserId = 'usr-new-tester';
    const newUsername = 'newtester';
    const assignedPermissions = ['home', 'time-in-hand'];

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    stored.push({
      id: newUserId,
      username: newUsername,
      name: newUsername,
      email: 'newtester@example.com',
      role: 'member',
      status: 'ACTIVE',
      permissions: assignedPermissions,
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    // New user logs in
    window.localStorage.setItem('nexora-user-email', newUsername);
    const effective = resolveEffectiveUserIdentifier('preview@nexora.example');
    expect(effective).toBe(newUsername);

    const allowed = getUserAllowedTabs(effective);
    expect(allowed).toEqual(['home', 'time-in-hand']);

    const { container } = render(<TestSidebar effectiveEmail={effective} />);
    const buttons = container.querySelectorAll('.sidebar-nav-btn');
    expect(buttons).toHaveLength(2);
    expect(container.querySelector('[data-item-id="home"]')).not.toBeNull();
    expect(container.querySelector('[data-item-id="time-in-hand"]')).not.toBeNull();
    expect(container.querySelector('[data-item-id="ranks"]')).toBeNull();
    expect(container.querySelector('[data-item-id="currency"]')).toBeNull();
  });

  // -------------------------------------------------------------
  // Scenario 4: Updating a user's permissions correctly updates the sidebar
  // -------------------------------------------------------------
  it('Scenario 4: Updating a users permissions correctly updates the sidebar immediately', async () => {
    window.localStorage.setItem('nexora-user-email', 'triouser');
    const effective = resolveEffectiveUserIdentifier('preview@nexora.example');

    const { container } = render(<TestSidebar effectiveEmail={effective} />);
    expect(container.querySelectorAll('.sidebar-nav-btn')).toHaveLength(3);

    // Administrator updates permissions for triouser: removes 'currency', adds 'key-points' and 'settings'
    const newPermissions = ['home', 'ranks', 'key-points', 'settings'];
    const updateResult = await apiUpdateUserPermissions(adminEmail, 'usr-trio', newPermissions);
    expect(updateResult.success).toBe(true);

    // Ensure getUserAllowedTabs returns updated permissions
    const updatedTabs = getUserAllowedTabs(effective);
    expect(updatedTabs).toEqual(newPermissions);

    // Sidebar should immediately reflect the change
    await waitFor(() => {
      expect(container.querySelector('[data-item-id="currency"]')).toBeNull();
      expect(container.querySelector('[data-item-id="key-points"]')).not.toBeNull();
      expect(container.querySelector('[data-item-id="settings"]')).not.toBeNull();
      expect(container.querySelectorAll('.sidebar-nav-btn')).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------
  // Scenario 5: Logging out and logging back in preserves the correct permissions
  // -------------------------------------------------------------
  it('Scenario 5: Logging out and logging back in preserves the correct permissions', () => {
    // User is logged in
    window.localStorage.setItem('nexora-user-email', 'dualuser');
    let effective = resolveEffectiveUserIdentifier('preview@nexora.example');
    expect(getUserAllowedTabs(effective)).toEqual(['home', '12-level-bonus']);

    // User logs out (client storage cleared)
    window.localStorage.removeItem('nexora-user-email');
    window.localStorage.removeItem('nexora-preview-user-email');

    // While logged out, resolveEffectiveUserIdentifier returns null (no fallback to admin!)
    effective = resolveEffectiveUserIdentifier('preview@nexora.example');
    expect(effective).toBeNull();
    expect(getUserAllowedTabs(effective)).toEqual([]);

    // User logs back in
    window.localStorage.setItem('nexora-user-email', 'dualuser');
    effective = resolveEffectiveUserIdentifier('preview@nexora.example');
    expect(effective).toBe('dualuser');

    // Permissions are completely preserved from database
    expect(getUserAllowedTabs(effective)).toEqual(['home', '12-level-bonus']);
  });

  // -------------------------------------------------------------
  // Scenario 6: Refreshing the browser does not cause permitted items to disappear or unauthorized items to appear
  // -------------------------------------------------------------
  it('Scenario 6: Refreshing the browser does not cause permitted items to disappear or unauthorized items to appear', () => {
    window.localStorage.setItem('nexora-user-email', 'triouser');

    // Simulate multiple simulated page refreshes
    for (let cycle = 1; cycle <= 3; cycle++) {
      const effective = resolveEffectiveUserIdentifier('preview@nexora.example');
      expect(effective).toBe('triouser');

      const allowed = getUserAllowedTabs(effective);
      expect(allowed).toEqual(['home', 'ranks', 'currency']);

      const { container, unmount } = render(<TestSidebar effectiveEmail={effective} />);
      const buttons = container.querySelectorAll('.sidebar-nav-btn');
      expect(buttons).toHaveLength(3);
      expect(container.querySelector('[data-item-id="home"]')).not.toBeNull();
      expect(container.querySelector('[data-item-id="ranks"]')).not.toBeNull();
      expect(container.querySelector('[data-item-id="currency"]')).not.toBeNull();
      expect(container.querySelector('[data-item-id="users"]')).toBeNull();
      unmount();
    }
  });

  // -------------------------------------------------------------
  // Scenario 7: Navigating between pages does not change the assigned permissions unexpectedly
  // -------------------------------------------------------------
  it('Scenario 7: Navigating between pages does not change the assigned permissions unexpectedly', () => {
    window.localStorage.setItem('nexora-user-email', 'triouser');
    const effective = resolveEffectiveUserIdentifier('preview@nexora.example');

    const tabsToNavigate = ['home', 'ranks', 'currency'];
    tabsToNavigate.forEach((page) => {
      expect(isPageAllowed(effective, page)).toBe(true);
      // Tabs permission query remains consistent
      expect(getUserAllowedTabs(effective)).toEqual(['home', 'ranks', 'currency']);
    });
  });

  // -------------------------------------------------------------
  // Scenario 8: Multiple users with different permissions each see their own correct sidebar menus
  // -------------------------------------------------------------
  it('Scenario 8: Multiple users with different permissions each see their own correct sidebar menus', () => {
    // User A: triouser
    const userATabs = getUserAllowedTabs('triouser');
    expect(userATabs).toEqual(['home', 'ranks', 'currency']);

    // User B: dualuser
    const userBTabs = getUserAllowedTabs('dualuser');
    expect(userBTabs).toEqual(['home', '12-level-bonus']);

    // User C: noperms
    const userCTabs = getUserAllowedTabs('noperms');
    expect(userCTabs).toEqual([]);

    // Render User A sidebar
    const { container: containerA, unmount: unmountA } = render(<TestSidebar effectiveEmail="triouser" />);
    expect(containerA.querySelectorAll('.sidebar-nav-btn')).toHaveLength(3);
    unmountA();

    // Render User B sidebar
    const { container: containerB, unmount: unmountB } = render(<TestSidebar effectiveEmail="dualuser" />);
    expect(containerB.querySelectorAll('.sidebar-nav-btn')).toHaveLength(2);
    expect(containerB.querySelector('[data-item-id="12-level-bonus"]')).not.toBeNull();
    expect(containerB.querySelector('[data-item-id="ranks"]')).toBeNull();
    unmountB();

    // Render User C sidebar
    const { container: containerC, unmount: unmountC } = render(<TestSidebar effectiveEmail="noperms" />);
    expect(containerC.querySelectorAll('.sidebar-nav-btn')).toHaveLength(0);
    unmountC();
  });

  // -------------------------------------------------------------
  // Scenario 9: Direct URL access and protected API operations remain blocked when the user lacks permission
  // -------------------------------------------------------------
  it('Scenario 9: Direct URL access and protected API operations remain blocked when the user lacks permission', async () => {
    window.localStorage.setItem('nexora-user-email', 'triouser');
    const effective = resolveEffectiveUserIdentifier('preview@nexora.example');

    // 1. Direct page check: user has no permission for 'configuration' or 'users'
    expect(isPageAllowed(effective, 'configuration')).toBe(false);
    expect(isPageAllowed(effective, 'users')).toBe(false);
    expect(isPageAllowed(effective, '12-level-bonus')).toBe(false);

    // 2. Protected backend assertPermission throws 403 Forbidden
    expect(() => assertPermission(effective, 'configuration')).toThrow(PermissionDeniedError);
    expect(() => assertAdminAccess(effective)).toThrow(PermissionDeniedError);

    // 3. Protected API endpoint blocks unauthorized module data request with 403
    const apiModuleResp = await apiGetProtectedModuleData(effective, 'configuration');
    expect(apiModuleResp.success).toBe(false);
    expect(apiModuleResp.statusCode).toBe(403);

    // 4. Regular user blocked from modifying permissions via API
    const apiUpdateResp = await apiUpdateUserPermissions(effective, 'usr-dual', ['home', 'ranks']);
    expect(apiUpdateResp.success).toBe(false);
    expect(apiUpdateResp.statusCode).toBe(403);
  });

  // -------------------------------------------------------------
  // Scenario 10: Admin functionality remains unchanged
  // -------------------------------------------------------------
  it('Scenario 10: Admin functionality remains completely unchanged with full access', async () => {
    // Admin identifier
    const adminIdentifier = 'sivaji491@gmail.com';
    expect(isUserAdminOrOwner(adminIdentifier)).toBe(true);

    const adminTabs = getUserAllowedTabs(adminIdentifier);
    expect(adminTabs).toContain('home');
    expect(adminTabs).toContain('users');
    expect(adminTabs).toContain('ranks');
    expect(adminTabs).toContain('12-level-bonus');
    expect(adminTabs).toContain('dcb-90-days');
    expect(adminTabs).toContain('customer-view');
    expect(adminTabs).toContain('currency');
    expect(adminTabs).toContain('configuration');
    expect(adminTabs).toContain('key-points');
    expect(adminTabs).toContain('time-in-hand');
    expect(adminTabs).toContain('settings');

    // Admin passes assertAdminAccess without throwing
    expect(() => assertAdminAccess(adminIdentifier)).not.toThrow();

    // Admin can fetch workspace users via API
    const usersResp = await apiGetWorkspaceUsers(adminIdentifier);
    expect(usersResp.success).toBe(true);
    expect(usersResp.statusCode).toBe(200);

    // Admin sidebar shows all items
    const { container } = render(<TestSidebar effectiveEmail={adminIdentifier} />);
    const buttons = container.querySelectorAll('.sidebar-nav-btn');
    expect(buttons.length).toBeGreaterThanOrEqual(11);
    expect(container.querySelector('[data-item-id="users"]')).not.toBeNull();
  });
});
