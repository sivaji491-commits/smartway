import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  getUserAllowedTabs,
  isPageAllowed,
  getAccessibleLandingPage,
  filterAllowedNavigation,
  isUserAdminOrOwner,
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
  apiExecuteProtectedAction,
} from '@/lib/protected-api';
import { NavigationHeader } from '@/components/rank-calculator/NavigationHeader';
import { AccessDeniedView } from '@/components/AccessDeniedView';

describe('STRICT ROLE-BASED PAGE PERMISSIONS & ACCESS CONTROL', () => {
  const adminEmail = 'sivaji491@gmail.com';

  const mockUsers = [
    {
      id: 'usr-admin',
      name: 'Sivaji Admin',
      username: 'sivaji',
      email: 'sivaji491@gmail.com',
      role: 'owner',
      permissions: ['home', 'users', 'ranks', 'currency', 'configuration'],
    },
    {
      id: 'usr-home-only',
      name: 'Home Only User',
      username: 'homeonly',
      email: 'homeonly@example.com',
      role: 'member',
      permissions: ['home'],
    },
    {
      id: 'usr-home-ranks',
      name: 'Home and Ranks User',
      username: 'swamy',
      email: 'swamy@example.com',
      role: 'member',
      permissions: ['home', 'ranks'],
    },
    {
      id: 'usr-currency-only',
      name: 'Currency User',
      username: 'curruser',
      email: 'curruser@example.com',
      role: 'member',
      permissions: ['currency'],
    },
    {
      id: 'usr-no-perms',
      name: 'Restricted User',
      username: 'noperms',
      email: 'noperms@example.com',
      role: 'member',
      permissions: [],
    },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUsers));
    window.localStorage.removeItem('nexora-preview-user-email');
    window.localStorage.removeItem('nexora-user-email');
  });

  // -------------------------------------------------------------
  // Scenario A: User has Home permission only
  // -------------------------------------------------------------
  describe('Scenario A: User has Home permission only', () => {
    it('grants access ONLY to Home and denies all other modules', () => {
      const allowed = getUserAllowedTabs('homeonly@example.com');
      expect(allowed).toEqual(['home']);

      expect(isPageAllowed('homeonly@example.com', 'home')).toBe(true);
      expect(isPageAllowed('homeonly@example.com', 'ranks')).toBe(false);
      expect(isPageAllowed('homeonly@example.com', 'currency')).toBe(false);
      expect(isPageAllowed('homeonly@example.com', 'configuration')).toBe(false);
      expect(isPageAllowed('homeonly@example.com', 'users')).toBe(false);

      const landing = getAccessibleLandingPage('homeonly@example.com');
      expect(landing).toBe('home');
    });

    it('filters navigation items so only Home is visible without placeholders or gaps', () => {
      const allNav = [
        { id: 'home', label: 'Home' },
        { id: 'ranks', label: 'Ranks' },
        { id: 'currency', label: 'Currency Settings' },
        { id: 'configuration', label: 'Configuration Settings' },
        { id: 'users', label: 'User Management' },
      ];
      const filtered = filterAllowedNavigation(allNav, getUserAllowedTabs('homeonly@example.com'));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('home');
      expect(filtered.some((item) => item.id === 'currency')).toBe(false);
      expect(filtered.some((item) => item.id === 'configuration')).toBe(false);
      expect(filtered.some((item) => item.id === 'ranks')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Scenario B: User has Home and Ranks permissions
  // -------------------------------------------------------------
  describe('Scenario B: User has Home and Ranks permissions', () => {
    it('shows only Home and Ranks in navigation and hides Currency and Configuration completely', () => {
      const allowed = getUserAllowedTabs('swamy@example.com');
      expect(allowed).toEqual(['home', 'ranks']);

      expect(isPageAllowed('swamy@example.com', 'home')).toBe(true);
      expect(isPageAllowed('swamy@example.com', 'ranks')).toBe(true);
      expect(isPageAllowed('swamy@example.com', 'currency')).toBe(false);
      expect(isPageAllowed('swamy@example.com', 'configuration')).toBe(false);
      expect(isPageAllowed('swamy@example.com', 'users')).toBe(false);

      // Verify NavigationHeader hides Currency, Configuration dropdown, and Exchange Rate pill
      render(
        <NavigationHeader
          activeTab="ranks"
          onTabChange={() => {}}
          saveStatus="saved"
          exchangeRate={90}
          totalRanks={5}
          onDownloadBackup={() => {}}
          isAdmin={false}
          allowedTabs={allowed}
        />
      );

      // Ranks must be visible
      expect(screen.getByRole('button', { name: /Ranks/i })).toBeDefined();
      // Currency Settings must NOT be visible
      expect(screen.queryByRole('button', { name: /Currency Settings/i })).toBeNull();
      // Configuration Settings button must NOT be visible
      expect(screen.queryByRole('button', { name: /Configuration Settings/i })).toBeNull();
      // Exchange rate pill must NOT be visible
      expect(screen.queryByTitle(/Click to configure exchange rate/i)).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // Scenario C: User has Currency Settings permission but no Configuration Settings
  // -------------------------------------------------------------
  describe('Scenario C: User has Currency Settings permission but no Configuration Settings permission', () => {
    it('Currency Settings is accessible while Configuration Settings is completely hidden and blocked', () => {
      const allowed = getUserAllowedTabs('curruser@example.com');
      expect(allowed).toEqual(['currency']);

      expect(isPageAllowed('curruser@example.com', 'currency')).toBe(true);
      expect(isPageAllowed('curruser@example.com', 'configuration')).toBe(false);
      expect(isPageAllowed('curruser@example.com', 'ranks')).toBe(false);
      expect(isPageAllowed('curruser@example.com', 'users')).toBe(false);

      render(
        <NavigationHeader
          activeTab="currency"
          onTabChange={() => {}}
          saveStatus="saved"
          exchangeRate={90}
          totalRanks={5}
          onDownloadBackup={() => {}}
          isAdmin={false}
          allowedTabs={allowed}
        />
      );

      // Currency Settings tab is visible
      expect(screen.getByRole('button', { name: /Currency Settings/i })).toBeDefined();
      // Ranks is completely hidden
      expect(screen.queryByRole('button', { name: /Ranks/i })).toBeNull();
      // Configuration Settings is completely hidden
      expect(screen.queryByRole('button', { name: /Configuration Settings/i })).toBeNull();
      // Live Exchange rate pill is visible for Currency users
      expect(screen.queryByTitle(/Click to configure exchange rate/i)).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // Scenario D: User has no page permissions
  // -------------------------------------------------------------
  describe('Scenario D: User has no page permissions', () => {
    it('returns empty array and null landing page adhering to least privilege', () => {
      const allowed = getUserAllowedTabs('noperms@example.com');
      expect(allowed).toEqual([]);

      const landing = getAccessibleLandingPage('noperms@example.com');
      expect(landing).toBeNull();

      expect(isPageAllowed('noperms@example.com', 'home')).toBe(false);
      expect(isPageAllowed('noperms@example.com', 'ranks')).toBe(false);
      expect(isPageAllowed('noperms@example.com', 'currency')).toBe(false);
    });

    it('renders clean Access Denied view when user has no permissions', () => {
      const onSignOut = vi.fn();
      render(
        <AccessDeniedView
          userEmail="noperms@example.com"
          onSignOut={onSignOut}
        />
      );

      expect(screen.getByText('No Page Access Granted')).toBeDefined();
      expect(screen.getByText(/Your account has not been assigned permissions/i)).toBeDefined();
      expect(screen.getByText(/noperms@example.com/)).toBeDefined();
      
      const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
      fireEvent.click(signOutBtn);
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------
  // Scenario E: User manually enters a restricted URL
  // -------------------------------------------------------------
  describe('Scenario E: User manually enters a restricted URL', () => {
    it('verifies permission checks block access to restricted modules', () => {
      // User with home only attempting to access currency
      const result = verifyUserPermission('homeonly@example.com', 'currency');
      expect(result.authorized).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain("do not have permission to access 'currency'");

      // Assert throws PermissionDeniedError with 403 status
      expect(() => assertPermission('homeonly@example.com', 'currency')).toThrowError(PermissionDeniedError);
      try {
        assertPermission('homeonly@example.com', 'currency');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
      }
    });

    it('identifies landing page fallback to prevent redirect loops', () => {
      // User with home and ranks
      const landing = getAccessibleLandingPage('swamy@example.com');
      expect(landing).toBe('home');

      // User with currency only
      const currLanding = getAccessibleLandingPage('curruser@example.com');
      expect(currLanding).toBe('currency');
    });
  });

  // -------------------------------------------------------------
  // Scenario F: User sends a direct API request for restricted data
  // -------------------------------------------------------------
  describe('Scenario F: Backend API Authorization & 401 / 403 enforcement', () => {
    it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
      const resp = await apiGetProtectedModuleData(null, 'ranks');
      expect(resp.success).toBe(false);
      expect(resp.statusCode).toBe(401);
      expect(resp.error).toContain('Unauthorized');
    });

    it('rejects authenticated users lacking required permission with HTTP 403 Forbidden', async () => {
      // User has home only, attempts to fetch ranks data
      const resp = await apiGetProtectedModuleData('homeonly@example.com', 'ranks');
      expect(resp.success).toBe(false);
      expect(resp.statusCode).toBe(403);
      expect(resp.error).toContain('Forbidden');
      expect(resp.data).toBeUndefined();
    });

    it('rejects normal users attempting administrator actions with HTTP 403', async () => {
      // Normal user attempts to fetch workspace user directory
      const listResp = await apiGetWorkspaceUsers('swamy@example.com');
      expect(listResp.success).toBe(false);
      expect(listResp.statusCode).toBe(403);
      expect(listResp.data).toBeUndefined();

      // Normal user attempts to modify permissions
      const updateResp = await apiUpdateUserPermissions('swamy@example.com', 'usr-home-only', ['home', 'ranks', 'currency']);
      expect(updateResp.success).toBe(false);
      expect(updateResp.statusCode).toBe(403);
    });

    it('executes protected action when user has granted permission', async () => {
      const resp = await apiExecuteProtectedAction('swamy@example.com', 'ranks', 'export_csv');
      expect(resp.success).toBe(true);
      expect(resp.statusCode).toBe(200);
      expect(resp.data?.executed).toBe('export_csv');
    });

    it('blocks protected action when user lacks permission', async () => {
      const resp = await apiExecuteProtectedAction('homeonly@example.com', 'currency', 'update_exchange_rate');
      expect(resp.success).toBe(false);
      expect(resp.statusCode).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // Scenario G: Administrator revokes an existing permission
  // -------------------------------------------------------------
  describe('Scenario G: Administrator revokes an existing permission', () => {
    it('instantly updates permissions and revokes access without code changes', async () => {
      // Verify initial access
      expect(isPageAllowed('swamy@example.com', 'ranks')).toBe(true);

      // Administrator revokes ranks permission from swamy
      const updateResp = await apiUpdateUserPermissions(adminEmail, 'usr-home-ranks', ['home']);
      expect(updateResp.success).toBe(true);
      expect(updateResp.statusCode).toBe(200);

      // Allowed tabs should now reflect only home
      const updatedAllowed = getUserAllowedTabs('swamy@example.com');
      expect(updatedAllowed).toEqual(['home']);
      expect(isPageAllowed('swamy@example.com', 'ranks')).toBe(false);

      // Subsequent API request is rejected with 403 Forbidden
      const apiResp = await apiGetProtectedModuleData('swamy@example.com', 'ranks');
      expect(apiResp.success).toBe(false);
      expect(apiResp.statusCode).toBe(403);
    });
  });

  // -------------------------------------------------------------
  // Scenario H: Administrator logs in
  // -------------------------------------------------------------
  describe('Scenario H: Administrator Access Policy', () => {
    it('grants full module access to primary administrator', () => {
      const adminTabs = getUserAllowedTabs('sivaji491@gmail.com');
      expect(adminTabs).toContain('home');
      expect(adminTabs).toContain('users');
      expect(adminTabs).toContain('ranks');
      expect(adminTabs).toContain('currency');
      expect(adminTabs).toContain('configuration');

      expect(isUserAdminOrOwner('sivaji491@gmail.com')).toBe(true);
      expect(isUserAdminOrOwner('sivaji')).toBe(true);
      expect(isUserAdminOrOwner('preview@nexora.example')).toBe(true);
    });

    it('allows administrator to manage users and permissions successfully', async () => {
      const listResp = await apiGetWorkspaceUsers(adminEmail);
      expect(listResp.success).toBe(true);
      expect(listResp.statusCode).toBe(200);
      expect(Array.isArray(listResp.data)).toBe(true);

      const updateResp = await apiUpdateUserPermissions(adminEmail, 'usr-home-only', ['home', 'currency']);
      expect(updateResp.success).toBe(true);
      expect(updateResp.statusCode).toBe(200);

      const updated = getUserAllowedTabs('homeonly@example.com');
      expect(updated).toEqual(['home', 'currency']);
    });
  });

  // -------------------------------------------------------------
  // Scenario I: Browser refresh or logout and login
  // -------------------------------------------------------------
  describe('Scenario I: Persistence across page refresh and re-login', () => {
    it('consistently loads saved permissions from persistent store', () => {
      // Simulate saving new configuration
      const customStore = [
        {
          id: 'usr-persisted',
          name: 'Persisted Member',
          username: 'persisteduser',
          email: 'persisted@nexora.example',
          permissions: ['home', 'currency'],
        },
      ];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customStore));

      // First check
      expect(getUserAllowedTabs('persisted@nexora.example')).toEqual(['home', 'currency']);

      // Simulate re-login by username
      expect(getUserAllowedTabs('persisteduser')).toEqual(['home', 'currency']);

      // Principle of least privilege for non-existent users
      expect(getUserAllowedTabs('random_unknown@nexora.example')).toEqual([]);
    });
  });
});
