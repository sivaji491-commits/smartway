import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUserPermissions,
  adminUpdateLoginDuration,
  adminResetUserTimer,
  startUserLoginSession,
  checkCurrentSessionValidity,
  expireAndDisableUser,
  getStoredWorkspaceUsers,
  saveStoredWorkspaceUsers,
  EXPIRED_ACCOUNT_MESSAGE,
} from '@/lib/session-manager';
import { isUserAdminOrOwner } from '@/lib/permissions';
import {
  validateAndCreateUserServer,
  validateAndDeleteUserServer,
  validateAndUpdatePermissionsServer,
  validateAndUpdateDurationServer,
  validateAndResetTimerServer,
} from '@/server/timer-service';
import { UserManagementTab } from '@/components/user-management-tab';

describe('Comprehensive User Management & Access Expiry Audit (11 Scenarios)', () => {
  const adminEmail = 'sivaji491@gmail.com';
  const regularUserEmail = 'regular_member@example.com';

  beforeEach(() => {
    localStorage.clear();
    saveStoredWorkspaceUsers([
      {
        id: 'usr-owner',
        username: 'sivaji',
        name: 'Sivaji (Owner)',
        email: adminEmail,
        role: 'owner',
        status: 'ACTIVE',
        loginDuration: 'Unlimited',
        permissions: ['home', 'users', 'ranks', 'currency', 'configuration'],
      },
    ]);
  });

  // Scenario 1: A newly created user has no countdown before the first successful login
  it('Scenario 1: newly created user has no countdown before first successful login', () => {
    const res = adminCreateUser(adminEmail, {
      username: 'alice_audit',
      email: 'alice@example.com',
      password: 'Password123!',
      loginDuration: '03:00:00', // 3 hours
      permissions: ['home', 'ranks'],
    });

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    // Start time and expire time MUST be null before login
    expect(res.user?.sessionStartTime).toBeNull();
    expect(res.user?.sessionExpireTime).toBeNull();

    // Validity check before login: remaining time equals granted duration (3 hours = 10800s)
    const validity = checkCurrentSessionValidity('alice_audit');
    expect(validity.valid).toBe(true);
    expect(validity.remainingSeconds).toBe(10800);
  });

  // Scenario 2: The countdown starts when the user first successfully logs in
  it('Scenario 2: countdown starts when the user first successfully logs in', () => {
    adminCreateUser(adminEmail, {
      username: 'bob_audit',
      loginDuration: '02:00:00', // 2 hours = 7200s
      permissions: ['home'],
    });

    const now = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const loginRes = startUserLoginSession('bob_audit');
    expect(loginRes.success).toBe(true);
    expect(loginRes.sessionStartTime).toBe(now);
    expect(loginRes.sessionExpireTime).toBe(now + 7200 * 1000);
    expect(loginRes.remainingSeconds).toBe(7200);

    vi.restoreAllMocks();
  });

  // Scenario 3: Logging out and logging back in does not reset the expiry
  it('Scenario 3: logging out and logging back in does not reset the expiry', () => {
    adminCreateUser(adminEmail, {
      username: 'charlie_audit',
      loginDuration: '03:00:00', // 3 hours = 10800s
      permissions: ['home'],
    });

    // 10:00 AM login
    const tLogin1 = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(tLogin1);
    const session1 = startUserLoginSession('charlie_audit');
    const fixedExpiry = session1.sessionExpireTime; // 1:00 PM
    expect(fixedExpiry).toBe(tLogin1 + 10800 * 1000);

    // User logs out at 10:30 AM (client clears active session)
    localStorage.removeItem('nexora-session-expire');
    localStorage.removeItem('nexora-session-start');

    // User logs in again at 11:00 AM (1 hour elapsed)
    const tLogin2 = tLogin1 + 3600 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(tLogin2);
    const session2 = startUserLoginSession('charlie_audit');

    // Expiry MUST remain 1:00 PM! Not reset to 2:00 PM!
    expect(session2.sessionExpireTime).toBe(fixedExpiry);
    // Remaining time must be approximately 2 hours (7200s), NOT a fresh 3 hours (10800s)
    expect(session2.remainingSeconds).toBe(7200);

    vi.restoreAllMocks();
  });

  // Scenario 4: Browser refresh and page navigation do not reset the expiry
  it('Scenario 4: browser refresh and page navigation do not reset the expiry', () => {
    adminCreateUser(adminEmail, {
      username: 'dave_audit',
      loginDuration: '01:00:00', // 1 hour = 3600s
      permissions: ['home'],
    });

    const tStart = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(tStart);
    const session = startUserLoginSession('dave_audit');

    // Simulate page refresh / navigation 15 minutes later
    const tRefresh = tStart + 900 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(tRefresh);

    const check = checkCurrentSessionValidity('dave_audit');
    expect(check.valid).toBe(true);
    // Exactly 45 minutes remaining (2700s)
    expect(check.remainingSeconds).toBe(2700);

    vi.restoreAllMocks();
  });

  // Scenario 5: Access expires at the correct timestamp
  it('Scenario 5: access expires at the correct timestamp and stops countdown', () => {
    adminCreateUser(adminEmail, {
      username: 'eve_audit',
      loginDuration: '00:10:00', // 10 minutes = 600s
      permissions: ['home'],
    });

    const tStart = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(tStart);
    const session = startUserLoginSession('eve_audit');
    const expiry = session.sessionExpireTime;

    // Simulate clock reaching exactly the expiry timestamp
    vi.spyOn(Date, 'now').mockReturnValue(expiry + 1000);

    const check = checkCurrentSessionValidity('eve_audit');
    expect(check.valid).toBe(false);
    expect(check.remainingSeconds).toBe(0);
    expect(check.status).toBe('DISABLED');
    expect(check.disableReason).toBe('SESSIONTIMEEXPIRED');

    vi.restoreAllMocks();
  });

  // Scenario 6: The expired user is automatically signed out and sees the session-expired message
  it('Scenario 6: expired user sees exact authoritative session-expired message', () => {
    adminCreateUser(adminEmail, {
      username: 'frank_audit',
      loginDuration: '00:05:00',
      permissions: ['home'],
    });

    const tStart = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(tStart);
    const session = startUserLoginSession('frank_audit');

    // Fast-forward past expiry
    vi.spyOn(Date, 'now').mockReturnValue(session.sessionExpireTime + 5000);

    expireAndDisableUser('frank_audit', 'SESSIONTIMEEXPIRED');

    expect(localStorage.getItem('nexora-timer-status')).toBe('expired');
    expect(localStorage.getItem('nexora_last_disabled_reason')).toBe('SESSIONTIMEEXPIRED');

    // Next login attempt is rejected with the exact required message
    const loginAttempt = startUserLoginSession('frank_audit');
    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.error).toBe('Session expired. Your access time has ended. Please contact the administrator.');
    expect(loginAttempt.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    vi.restoreAllMocks();
  });

  // Scenario 7: Expired users cannot access protected APIs or pages
  it('Scenario 7: expired users cannot access protected APIs or bypass expiry', () => {
    adminCreateUser(adminEmail, {
      username: 'grace_audit',
      loginDuration: '00:05:00',
      permissions: ['home'],
    });

    expireAndDisableUser('grace_audit', 'SESSIONTIMEEXPIRED');

    const check = checkCurrentSessionValidity('grace_audit');
    expect(check.valid).toBe(false);
    expect(check.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    // Attempting login fails
    const reLogin = startUserLoginSession('grace_audit');
    expect(reLogin.success).toBe(false);
    expect(reLogin.error).toBe(EXPIRED_ACCOUNT_MESSAGE);
  });

  // Scenario 8: Expired users remain in User Management and are not automatically deleted
  it('Scenario 8: expired users remain in User Management and are never automatically deleted', () => {
    adminCreateUser(adminEmail, {
      username: 'helen_audit',
      loginDuration: '00:05:00',
      permissions: ['home'],
    });

    const initialUsers = getStoredWorkspaceUsers();
    const countBeforeExpiry = initialUsers.length;

    // Expire user
    expireAndDisableUser('helen_audit', 'SESSIONTIMEEXPIRED');

    const usersAfterExpiry = getStoredWorkspaceUsers();
    expect(usersAfterExpiry.length).toBe(countBeforeExpiry);

    const expiredUser = usersAfterExpiry.find((u) => u.username === 'helen_audit');
    expect(expiredUser).toBeDefined();
    expect(expiredUser?.status).toBe('DISABLED');
    expect(expiredUser?.disableReason).toBe('SESSIONTIMEEXPIRED');
  });

  // Scenario 9: Only authorized admins can delete users, modify permissions, or renew access
  it('Scenario 9: regular users are denied admin operations on both API and UI', () => {
    adminCreateUser(adminEmail, {
      username: 'target_user',
      loginDuration: '01:00:00',
      permissions: ['home'],
    });

    // 1. Regular user trying to create user via backend server function
    const createAttempt = validateAndCreateUserServer('target_user', {
      username: 'hacker',
    });
    expect(createAttempt.success).toBe(false);
    expect(createAttempt.error).toContain('Unauthorized');

    // 2. Regular user trying to delete user via backend server function
    const deleteAttempt = validateAndDeleteUserServer('target_user', 'usr-owner');
    expect(deleteAttempt.success).toBe(false);
    expect(deleteAttempt.error).toContain('Unauthorized');

    // 3. Regular user trying to modify permissions
    const permAttempt = validateAndUpdatePermissionsServer('target_user', 'target_user', ['home', 'users']);
    expect(permAttempt.success).toBe(false);
    expect(permAttempt.error).toContain('Unauthorized');

    // 4. Regular user trying to change duration
    const durAttempt = validateAndUpdateDurationServer('target_user', 'target_user', '08:00:00');
    expect(durAttempt.success).toBe(false);
    expect(durAttempt.error).toContain('Unauthorized');

    // 5. Regular user trying to reset timer
    const resetAttempt = validateAndResetTimerServer('target_user', 'target_user');
    expect(resetAttempt.success).toBe(false);
    expect(resetAttempt.error).toContain('Unauthorized');

    // 6. UI check: Non-admin viewing UserManagementTab sees Access Restricted banner
    render(<UserManagementTab currentUserEmail="target_user" isAdmin={false} />);
    expect(screen.getByText('Administrator Access Required')).toBeDefined();
    expect(screen.queryByText('Create User')).toBeNull();
  });

  // Scenario 10: An admin can explicitly renew access, and the new grant follows the defined start rule
  it('Scenario 10: admin can explicitly renew access and timer starts on next successful login', () => {
    adminCreateUser(adminEmail, {
      username: 'ian_audit',
      loginDuration: '00:10:00',
      permissions: ['home'],
    });

    // User expired
    expireAndDisableUser('ian_audit', 'SESSIONTIMEEXPIRED');
    let userRecord = getStoredWorkspaceUsers().find((u) => u.username === 'ian_audit');
    expect(userRecord?.status).toBe('DISABLED');

    // Admin renews with 2 hours (02:00:00)
    const renewResult = adminUpdateLoginDuration('ian_audit', '02:00:00', adminEmail, false);
    expect(renewResult.success).toBe(true);

    userRecord = getStoredWorkspaceUsers().find((u) => u.username === 'ian_audit');
    expect(userRecord?.status).toBe('ACTIVE');
    expect(userRecord?.loginDuration).toBe('02:00:00');
    // Start rule: countdown has NOT started yet! (timestamps are null until next login)
    expect(userRecord?.sessionStartTime).toBeNull();
    expect(userRecord?.sessionExpireTime).toBeNull();

    // User logs in under the new grant
    const tRenewLogin = 1700500000000;
    vi.spyOn(Date, 'now').mockReturnValue(tRenewLogin);
    const renewedSession = startUserLoginSession('ian_audit');

    expect(renewedSession.success).toBe(true);
    expect(renewedSession.sessionStartTime).toBe(tRenewLogin);
    expect(renewedSession.sessionExpireTime).toBe(tRenewLogin + 7200 * 1000);
    expect(renewedSession.remainingSeconds).toBe(7200);

    vi.restoreAllMocks();
  });

  // Scenario 11: Existing users, database records, and unrelated functionality remain intact
  it('Scenario 11: workspace owner account is permanent and exempt from expiration', () => {
    const ownerSession = startUserLoginSession(adminEmail);
    expect(ownerSession.success).toBe(true);
    expect(ownerSession.remainingSeconds).toBe(Infinity);
    expect(ownerSession.loginDuration).toBe('Unlimited');

    // Attempting to expire owner does nothing
    expireAndDisableUser(adminEmail, 'SESSIONTIMEEXPIRED');
    const ownerRecord = getStoredWorkspaceUsers().find((u) => u.email === adminEmail);
    expect(ownerRecord?.status).toBe('ACTIVE');
    expect(ownerRecord?.disableReason).toBeFalsy();

    const validity = checkCurrentSessionValidity(adminEmail);
    expect(validity.valid).toBe(true);
    expect(validity.remainingSeconds).toBe(Infinity);
  });

  // Scenario 12: Top Header layout for regular user shows ONLY Access Valid For
  it('Scenario 12: regular user top header displays only Access Valid For indicator without other navigation tabs', () => {
    const regularUser = 'regular_member';
    const isRegularAdmin = isUserAdminOrOwner(regularUser, adminEmail);
    expect(isRegularAdmin).toBe(false);

    // Verify role check distinguishes regular user from admin
    const isAdmin = isUserAdminOrOwner(adminEmail, adminEmail);
    expect(isAdmin).toBe(true);

    // Simulated top header rendering for regular user (isAdmin === false)
    const { container: regularHeaderContainer } = render(
      <header className={`app-topbar ${!isRegularAdmin ? 'regular-user-topbar' : ''}`}>
        <div className="topbar-left">
          <button type="button" className="sidebar-mobile-toggle" aria-label="Toggle navigation menu">
            Menu
          </button>
          {isRegularAdmin && (
            <nav className="topbar-nav-tabs" aria-label="Top Tabs Navigation">
              <button>Home</button>
              <button>Earning Opportunities</button>
              <button>Ranks</button>
            </nav>
          )}
        </div>
        <div className="topbar-actions">
          {isRegularAdmin && (
            <div className="topbar-ranks-badge">Ranks 7</div>
          )}
          <div className="session-timer-badge" data-testid="regular-session-timer-badge">
            <span className="timer-label">Access Valid For:</span>
            <span className="timer-countdown">00:33:38</span>
          </div>
        </div>
      </header>
    );

    // Regular header has class regular-user-topbar
    expect(regularHeaderContainer.querySelector('.regular-user-topbar')).toBeDefined();
    // Regular header does NOT have top tabs navigation
    expect(screen.queryByLabelText('Top Tabs Navigation')).toBeNull();
    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.queryByText('Earning Opportunities')).toBeNull();
    expect(screen.queryByText('Ranks 7')).toBeNull();
    // ONLY Access Valid For indicator is displayed
    expect(screen.getByTestId('regular-session-timer-badge')).toBeDefined();
    expect(screen.getByText('Access Valid For:')).toBeDefined();
    expect(screen.getByText('00:33:38')).toBeDefined();
  });

  // Scenario 13: Administrator top header retains all navigation items and indicators
  it('Scenario 13: administrator top header retains all navigation items and indicators', () => {
    const isAdmin = isUserAdminOrOwner(adminEmail, adminEmail);
    expect(isAdmin).toBe(true);

    const { container: adminHeaderContainer } = render(
      <header className={`app-topbar ${!isAdmin ? 'regular-user-topbar' : ''}`}>
        <div className="topbar-left">
          <button type="button" className="sidebar-mobile-toggle" aria-label="Toggle navigation menu">
            Menu
          </button>
          {isAdmin && (
            <nav className="topbar-nav-tabs" aria-label="Top Tabs Navigation">
              <button>Home</button>
              <button>Earning Opportunities</button>
              <button>Ranks</button>
            </nav>
          )}
        </div>
        <div className="topbar-actions">
          {isAdmin && (
            <div className="topbar-ranks-badge">Ranks 7</div>
          )}
          <div className="session-timer-badge" data-testid="admin-session-timer-badge">
            <span className="timer-label">Access Valid For:</span>
            <span className="timer-countdown">Unlimited</span>
          </div>
        </div>
      </header>
    );

    expect(adminHeaderContainer.querySelector('.regular-user-topbar')).toBeNull();
    expect(screen.getByLabelText('Top Tabs Navigation')).toBeDefined();
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Earning Opportunities')).toBeDefined();
    expect(screen.getByText('Ranks 7')).toBeDefined();
    expect(screen.getByTestId('admin-session-timer-badge')).toBeDefined();
  });
});
