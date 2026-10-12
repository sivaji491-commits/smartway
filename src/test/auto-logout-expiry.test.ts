import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import {
  startUserLoginSession,
  checkCurrentSessionValidity,
  expireAndDisableUser,
  saveStoredWorkspaceUsers,
  getStoredWorkspaceUsers,
  EXPIRED_ACCOUNT_MESSAGE,
} from '../lib/session-manager';
import { resolveUserPermissionsFromStore } from '../lib/server-permissions';

describe('Automatic Logout on User Time-Limit Expiry Acceptance Tests', () => {
  const baseTime = 1700000000000;

  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTime));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Scenario 1: User is automatically logged out exactly when assigned time limit expires without freezing', () => {
    // Standard user with 10 seconds assigned limit
    const user = {
      id: 'usr-auto-logout',
      username: 'timer_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:00:10',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 10 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    // Active session stored in localStorage
    window.localStorage.setItem('nexora-user-email', 'timer_user');
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 10 * 1000));

    // Initially valid with 10 seconds left
    const checkInitial = checkCurrentSessionValidity('timer_user');
    expect(checkInitial.valid).toBe(true);
    expect(checkInitial.remainingSeconds).toBe(10);

    // Advance 9 seconds: still active, screen responsive
    vi.setSystemTime(new Date(baseTime + 9 * 1000));
    const checkAt9s = checkCurrentSessionValidity('timer_user');
    expect(checkAt9s.valid).toBe(true);
    expect(checkAt9s.remainingSeconds).toBe(1);

    // Advance the final 1 second: exactly hits 0
    vi.setSystemTime(new Date(baseTime + 10 * 1000));
    const checkAtExpire = checkCurrentSessionValidity('timer_user');

    expect(checkAtExpire.valid).toBe(false);
    expect(checkAtExpire.remainingSeconds).toBe(0);
    expect(checkAtExpire.status).toBe('DISABLED');
    expect(checkAtExpire.disableReason).toBe('SESSIONTIMEEXPIRED');
    expect(checkAtExpire.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    // Verify user in store was disabled with SESSIONTIMEEXPIRED
    const users = getStoredWorkspaceUsers();
    const stored = users.find((u) => u.username === 'timer_user');
    expect(stored?.status).toBe('DISABLED');
    expect(stored?.disableReason).toBe('SESSIONTIMEEXPIRED');
  });

  it('Scenario 2: Prevents duplicate logout calls and redundant storage writes (Idempotency)', () => {
    const user = {
      id: 'usr-idempotent',
      username: 'idempotent_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:00:05',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 5 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    window.localStorage.setItem('nexora-user-email', 'idempotent_user');
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 5 * 1000));

    // Fast-forward past expiry
    vi.setSystemTime(new Date(baseTime + 10 * 1000));

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    // First expiry check: disables user and dispatches events
    const firstCheck = checkCurrentSessionValidity('idempotent_user');
    expect(firstCheck.valid).toBe(false);

    const callCountAfterFirst = dispatchSpy.mock.calls.length;
    expect(callCountAfterFirst).toBeGreaterThan(0);

    // Subsequent repeated calls should be idempotent and NOT cause recursive event dispatch
    const secondCheck = checkCurrentSessionValidity('idempotent_user');
    expect(secondCheck.valid).toBe(false);

    expireAndDisableUser('idempotent_user', 'SESSIONTIMEEXPIRED');
    expireAndDisableUser('idempotent_user', 'SESSIONTIMEEXPIRED');

    // Storage and event dispatch count should remain stable without spamming
    const afterRepeated = getStoredWorkspaceUsers();
    const target = afterRepeated.find((u) => u.username === 'idempotent_user');
    expect(target?.status).toBe('DISABLED');
    expect(target?.disableReason).toBe('SESSIONTIMEEXPIRED');

    dispatchSpy.mockRestore();
  });

  it('Scenario 3: User is logged out even if the browser tab was inactive when time limit expired', () => {
    const user = {
      id: 'usr-background-tab',
      username: 'bg_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:00:30',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 30 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    window.localStorage.setItem('nexora-user-email', 'bg_user');
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 30 * 1000));

    // Simulate tab being put into background: timers paused/delayed for 60 seconds
    vi.setSystemTime(new Date(baseTime + 60 * 1000));

    // Tab becomes visible again (visibilitychange / focus fired)
    // The timestamp recalculation immediately catches up to absolute expiry timestamp
    const validityOnWakeup = checkCurrentSessionValidity('bg_user');
    expect(validityOnWakeup.valid).toBe(false);
    expect(validityOnWakeup.remainingSeconds).toBe(0);
    expect(validityOnWakeup.status).toBe('DISABLED');
    expect(validityOnWakeup.disableReason).toBe('SESSIONTIMEEXPIRED');
  });

  it('Scenario 4: Screen remains responsive in final seconds without freeze or infinite loops', () => {
    const user = {
      id: 'usr-responsive',
      username: 'responsive_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:00:03',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 3 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    window.localStorage.setItem('nexora-user-email', 'responsive_user');
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 3 * 1000));

    // 2 seconds left
    vi.setSystemTime(new Date(baseTime + 1000));
    const check1 = checkCurrentSessionValidity('responsive_user');
    expect(check1.valid).toBe(true);
    expect(check1.remainingSeconds).toBe(2);

    // 1 second left
    vi.setSystemTime(new Date(baseTime + 2000));
    const check2 = checkCurrentSessionValidity('responsive_user');
    expect(check2.valid).toBe(true);
    expect(check2.remainingSeconds).toBe(1);

    // Expiry reached
    vi.setSystemTime(new Date(baseTime + 3000));
    const check3 = checkCurrentSessionValidity('responsive_user');
    expect(check3.valid).toBe(false);
    expect(check3.remainingSeconds).toBe(0);
  });

  it('Scenario 5: Refreshing or navigating between pages does not bypass the expiry', () => {
    const user = {
      id: 'usr-nav-expiry',
      username: 'nav_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:00:20',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 20 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    window.localStorage.setItem('nexora-user-email', 'nav_user');
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 20 * 1000));

    // Fast-forward past expiration (25 seconds)
    vi.setSystemTime(new Date(baseTime + 25 * 1000));

    // Simulated page refresh / route navigation: checks session validity
    const validity = checkCurrentSessionValidity('nav_user');
    expect(validity.valid).toBe(false);
    expect(validity.status).toBe('DISABLED');
    expect(validity.disableReason).toBe('SESSIONTIMEEXPIRED');
    expect(validity.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    // Subsequent login attempt immediately fails
    const reLogin = startUserLoginSession('nav_user');
    expect(reLogin.success).toBe(false);
    expect(reLogin.error).toBe(EXPIRED_ACCOUNT_MESSAGE);
  });

  it('Scenario 6: Expired users cannot access protected routes or APIs (Server-side Permissions Revoked)', () => {
    const user = {
      id: 'usr-api-access',
      username: 'api_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:00:10',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 10 * 1000,
      permissions: ['dashboard', 'ranks', 'dcb-90-days', 'admin-users'],
    };
    saveStoredWorkspaceUsers([user]);

    // Before expiry: user has active permissions
    const activePermissions = resolveUserPermissionsFromStore('api_user');
    expect(activePermissions).toContain('dashboard');
    expect(activePermissions).toContain('ranks');

    // User session expires
    expireAndDisableUser('api_user', 'SESSIONTIMEEXPIRED');

    // Server-side permissions check: immediately returns empty array [] for disabled/expired account
    const revokedPermissions = resolveUserPermissionsFromStore('api_user');
    expect(revokedPermissions).toEqual([]);

    // Session validation fails
    const validity = checkCurrentSessionValidity('api_user');
    expect(validity.valid).toBe(false);
  });

  it('Scenario 7: Admin accounts remain unaffected and can manage users without regression', () => {
    const admin = {
      id: 'usr-admin-check',
      username: 'sivaji',
      email: 'sivaji491@gmail.com',
      role: 'Owner',
      status: 'ACTIVE' as const,
      loginDuration: 'Unlimited',
    };
    saveStoredWorkspaceUsers([admin]);

    window.localStorage.setItem('nexora-user-email', 'sivaji491@gmail.com');

    const adminSession = startUserLoginSession('sivaji491@gmail.com');
    expect(adminSession.success).toBe(true);
    expect(adminSession.loginDuration).toBe('Unlimited');
    expect(adminSession.sessionExpireTime).toBe(0);

    // Check validity at baseTime
    const validity = checkCurrentSessionValidity('sivaji491@gmail.com');
    expect(validity.valid).toBe(true);
    expect(validity.remainingSeconds).toBe(Infinity);
    expect(validity.status).toBe('ACTIVE');

    // Fast-forward 100 days: Admin remains ACTIVE and valid
    vi.setSystemTime(new Date(baseTime + 100 * 86400 * 1000));
    const validityFuture = checkCurrentSessionValidity('sivaji491@gmail.com');
    expect(validityFuture.valid).toBe(true);
    expect(validityFuture.remainingSeconds).toBe(Infinity);

    // Attempting to expire admin is a no-op
    expireAndDisableUser('sivaji491@gmail.com', 'SESSIONTIMEEXPIRED');
    const validityAfterExpire = checkCurrentSessionValidity('sivaji491@gmail.com');
    expect(validityAfterExpire.valid).toBe(true);
    expect(validityAfterExpire.status).toBe('ACTIVE');
  });
});
