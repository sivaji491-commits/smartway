import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { 
  validateLoginDuration,
  parseDurationToSeconds,
  formatSecondsToDuration,
  startUserLoginSession,
  checkCurrentSessionValidity,
  expireAndDisableUser,
  adminEnableUser,
  adminDisableUser,
  adminForceLogoutUser,
  adminUpdateLoginDuration,
  sweepExpiredSessions,
  saveStoredWorkspaceUsers,
  getStoredWorkspaceUsers,
  EXPIRED_ACCOUNT_MESSAGE,
  DEFAULT_LOGIN_DURATION
} from '../lib/session-manager';

describe('Login Duration Validation (Section 1)', () => {
  it('accepts valid HH:MM:SS durations', () => {
    expect(validateLoginDuration('00:00:30').valid).toBe(true);
    expect(validateLoginDuration('00:00:30').totalSeconds).toBe(30);

    expect(validateLoginDuration('00:30:00').valid).toBe(true);
    expect(validateLoginDuration('00:30:00').totalSeconds).toBe(1800);

    expect(validateLoginDuration('01:00:00').valid).toBe(true);
    expect(validateLoginDuration('01:00:00').totalSeconds).toBe(3600);

    expect(validateLoginDuration('08:00:00').valid).toBe(true);
    expect(validateLoginDuration('08:00:00').totalSeconds).toBe(28800);
  });

  it('rejects invalid duration format and out-of-range minutes/seconds (e.g. 01:75:90)', () => {
    const invalidResult = validateLoginDuration('01:75:90');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('between 00 and 59');

    expect(validateLoginDuration('invalid-text').valid).toBe(false);
    expect(validateLoginDuration('01:30').valid).toBe(false);
    expect(validateLoginDuration('01:30:60').valid).toBe(false);
    expect(validateLoginDuration('01:60:00').valid).toBe(false);
  });

  it('rejects zero or negative durations', () => {
    const zeroResult = validateLoginDuration('00:00:00');
    expect(zeroResult.valid).toBe(false);
    expect(zeroResult.error).toContain('cannot be zero');
  });

  it('formats seconds to duration string accurately', () => {
    expect(formatSecondsToDuration(30)).toBe('00:00:30');
    expect(formatSecondsToDuration(1800)).toBe('00:30:00');
    expect(formatSecondsToDuration(3600)).toBe('01:00:00');
    expect(formatSecondsToDuration(28800)).toBe('08:00:00');
  });
});

describe('Session Lifecycle & Expiration Logic (Sections 2, 4, 5, 6)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles existing users without configured duration safely by falling back to 01:00:00', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-legacy',
        username: 'legacy_user',
        email: 'legacy@example.com',
        status: 'ACTIVE',
        // No loginDuration configured!
      }
    ]);

    const session = startUserLoginSession('legacy_user');
    expect(session.success).toBe(true);
    expect(session.loginDuration).toBe(DEFAULT_LOGIN_DURATION);
    expect(session.sessionExpireTime - session.sessionStartTime).toBe(3600 * 1000);
  });

  it('timer starts only after successful authentication, never at creation', () => {
    const mockUser = {
      id: 'usr-fresh',
      username: 'fresh_tester',
      status: 'ACTIVE',
      loginDuration: '00:30:00',
      sessionStartTime: null,
      sessionExpireTime: null,
    };
    saveStoredWorkspaceUsers([mockUser]);

    // Before login: no timestamps set
    const beforeCheck = checkCurrentSessionValidity('fresh_tester');
    expect(beforeCheck.valid).toBe(true);

    // User authenticates:
    const session = startUserLoginSession('fresh_tester');
    expect(session.success).toBe(true);
    expect(session.sessionStartTime).toBeGreaterThan(0);
    expect(session.sessionExpireTime).toBe(session.sessionStartTime + 1800 * 1000);

    const afterUsers = getStoredWorkspaceUsers();
    const target = afterUsers.find((u) => u.username === 'fresh_tester');
    expect(target.sessionStartTime).toBe(session.sessionStartTime);
    expect(target.sessionExpireTime).toBe(session.sessionExpireTime);
  });

  it('short-duration session expires correctly and account status changes to DISABLED', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-short',
        username: 'short_session_user',
        status: 'ACTIVE',
        loginDuration: '00:00:30', // 30 seconds
      }
    ]);

    const session = startUserLoginSession('short_session_user');
    expect(session.success).toBe(true);

    // Initial check: active with ~30 seconds remaining
    const initialCheck = checkCurrentSessionValidity('short_session_user');
    expect(initialCheck.valid).toBe(true);
    expect(initialCheck.remainingSeconds).toBe(30);

    // Fast-forward time past expiration (+35 seconds)
    const future = session.sessionExpireTime + 5000;
    vi.setSystemTime(new Date(future));

    // Session check at expiration boundary:
    const expiredCheck = checkCurrentSessionValidity('short_session_user');
    expect(expiredCheck.valid).toBe(false);
    expect(expiredCheck.status).toBe('DISABLED');
    expect(expiredCheck.disableReason).toBe('SESSIONTIMEEXPIRED');
    expect(expiredCheck.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    // Verify user in storage is now DISABLED
    const users = getStoredWorkspaceUsers();
    const user = users.find((u) => u.username === 'short_session_user');
    expect(user.status).toBe('DISABLED');
    expect(user.disableReason).toBe('SESSIONTIMEEXPIRED');
  });

  it('disabled users cannot log in and receive the required error message', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-expired',
        username: 'expired_user',
        status: 'DISABLED',
        disableReason: 'SESSIONTIMEEXPIRED',
        loginDuration: '00:30:00',
      }
    ]);

    const loginAttempt = startUserLoginSession('expired_user');
    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.error).toBe(EXPIRED_ACCOUNT_MESSAGE);
  });

  it('page refresh does not reset the countdown (calculates against absolute timestamp)', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-refresh',
        username: 'refresh_user',
        status: 'ACTIVE',
        loginDuration: '01:00:00',
      }
    ]);

    const now = Date.now();
    vi.setSystemTime(new Date(now));
    const session = startUserLoginSession('refresh_user');
    const originalExpireTime = session.sessionExpireTime;

    // Simulate 15 minutes passing, user refreshes page:
    vi.setSystemTime(new Date(now + 15 * 60 * 1000));
    const checkAfterRefresh = checkCurrentSessionValidity('refresh_user');
    expect(checkAfterRefresh.valid).toBe(true);
    // 3600 - 900 = 2700 seconds remaining
    expect(checkAfterRefresh.remainingSeconds).toBe(2700);

    // Expiration timestamp remains identical:
    const users = getStoredWorkspaceUsers();
    const user = users.find((u) => u.username === 'refresh_user');
    expect(user.sessionExpireTime).toBe(originalExpireTime);
  });

  it('multiple tabs respect the same session expiration via shared storage', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-tabs',
        username: 'tab_user',
        status: 'ACTIVE',
        loginDuration: '00:30:00',
      }
    ]);

    startUserLoginSession('tab_user');

    // Tab 1 & Tab 2 both read current session
    const tab1 = checkCurrentSessionValidity('tab_user');
    const tab2 = checkCurrentSessionValidity('tab_user');
    expect(tab1.remainingSeconds).toBe(tab2.remainingSeconds);

    // When session is expired, both detect it
    expireAndDisableUser('tab_user', 'SESSIONTIMEEXPIRED');
    const tab1Expired = checkCurrentSessionValidity('tab_user');
    const tab2Expired = checkCurrentSessionValidity('tab_user');
    expect(tab1Expired.valid).toBe(false);
    expect(tab2Expired.valid).toBe(false);
    expect(tab1Expired.disableReason).toBe('SESSIONTIMEEXPIRED');
  });

  it('admin disables a user who is currently logged in', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-active-to-disable',
        username: 'target_user',
        status: 'ACTIVE',
        loginDuration: '01:00:00',
      }
    ]);

    startUserLoginSession('target_user');
    expect(checkCurrentSessionValidity('target_user').valid).toBe(true);

    // Admin disables account:
    const disabled = adminDisableUser('usr-active-to-disable');
    expect(disabled).toBe(true);

    const check = checkCurrentSessionValidity('target_user');
    expect(check.valid).toBe(false);
    expect(check.status).toBe('DISABLED');
    expect(check.disableReason).toBe('ADMIN_DISABLED');
  });

  it('admin force logout terminates active session immediately', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-logout-target',
        username: 'logout_user',
        status: 'ACTIVE',
        loginDuration: '01:00:00',
      }
    ]);

    startUserLoginSession('logout_user');
    const loggedOut = adminForceLogoutUser('usr-logout-target');
    expect(loggedOut).toBe(true);

    const users = getStoredWorkspaceUsers();
    const user = users.find((u) => u.id === 'usr-logout-target');
    expect(user.sessionStartTime).toBeNull();
    expect(user.sessionExpireTime).toBeNull();
  });

  it('admin manually re-enables a disabled user; user must log in again to start fresh countdown', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-reenable',
        username: 'disabled_user',
        status: 'DISABLED',
        disableReason: 'SESSIONTIMEEXPIRED',
        loginDuration: '00:30:00',
        disabledAt: 1000,
      }
    ]);

    // Admin enables user
    const enabled = adminEnableUser('usr-reenable', 'sivaji');
    expect(enabled).toBe(true);

    const users = getStoredWorkspaceUsers();
    const user = users.find((u) => u.id === 'usr-reenable');
    expect(user.status).toBe('ACTIVE');
    expect(user.disableReason).toBeNull();
    expect(user.reEnabledBy).toBe('sivaji');
    expect(user.sessionStartTime).toBeNull(); // No auto-login!
    expect(user.sessionExpireTime).toBeNull();

    // User authenticates freshly:
    const freshLogin = startUserLoginSession('disabled_user');
    expect(freshLogin.success).toBe(true);
    expect(freshLogin.sessionStartTime).toBeGreaterThan(0);
    expect(freshLogin.sessionExpireTime).toBe(freshLogin.sessionStartTime + 1800 * 1000);
  });

  it('offline users with expired timestamps are disabled by background sweep task', () => {
    const pastTime = Date.now() - 60000;
    saveStoredWorkspaceUsers([
      {
        id: 'usr-offline',
        username: 'offline_user',
        status: 'ACTIVE',
        loginDuration: '00:00:30',
        sessionExpireTime: pastTime,
      },
      {
        id: 'usr-online',
        username: 'online_user',
        status: 'ACTIVE',
        loginDuration: '01:00:00',
        sessionExpireTime: Date.now() + 3600 * 1000,
      }
    ]);

    const sweptCount = sweepExpiredSessions();
    expect(sweptCount).toBe(1);

    const users = getStoredWorkspaceUsers();
    const offlineUser = users.find((u) => u.id === 'usr-offline');
    const onlineUser = users.find((u) => u.id === 'usr-online');

    expect(offlineUser.status).toBe('DISABLED');
    expect(offlineUser.disableReason).toBe('SESSIONTIMEEXPIRED');
    expect(onlineUser.status).toBe('ACTIVE');
  });

  it('admin duration edit takes effect on the next login session', () => {
    saveStoredWorkspaceUsers([
      {
        id: 'usr-edit-duration',
        username: 'duration_user',
        status: 'ACTIVE',
        loginDuration: '00:30:00',
      }
    ]);

    // Start with 30m
    const initialSession = startUserLoginSession('duration_user');
    expect(initialSession.sessionExpireTime - initialSession.sessionStartTime).toBe(1800 * 1000);

    // Admin updates duration to 8 hours
    const updateResult = adminUpdateLoginDuration('usr-edit-duration', '08:00:00');
    expect(updateResult.success).toBe(true);

    // Next login session receives the new 8h duration
    const nextSession = startUserLoginSession('duration_user');
    expect(nextSession.loginDuration).toBe('08:00:00');
    expect(nextSession.sessionExpireTime - nextSession.sessionStartTime).toBe(28800 * 1000);
  });

  describe('Admin / Owner Timer Setup Exemption', () => {
    beforeEach(() => {
      saveStoredWorkspaceUsers([
        {
          id: 'usr-owner',
          username: 'sivaji',
          email: 'sivaji491@gmail.com',
          role: 'Owner',
          status: 'ACTIVE',
          loginDuration: 'Unlimited',
        },
        {
          id: 'usr-standard',
          username: 'standard_user',
          status: 'ACTIVE',
          loginDuration: '00:30:00',
        }
      ]);
    });

    it('admin login starts unlimited session without expiration timestamp', () => {
      const session = startUserLoginSession('sivaji');
      expect(session.success).toBe(true);
      expect(session.loginDuration).toBe('Unlimited');
      expect(session.sessionExpireTime).toBe(0);

      const validity = checkCurrentSessionValidity('sivaji');
      expect(validity.valid).toBe(true);
      expect(validity.remainingSeconds).toBe(Infinity);
      expect(validity.status).toBe('ACTIVE');
    });

    it('admin login by email sivaji491@gmail.com also starts unlimited session', () => {
      const session = startUserLoginSession('sivaji491@gmail.com');
      expect(session.success).toBe(true);
      expect(session.loginDuration).toBe('Unlimited');
      expect(session.sessionExpireTime).toBe(0);

      const validity = checkCurrentSessionValidity('sivaji491@gmail.com');
      expect(validity.valid).toBe(true);
      expect(validity.remainingSeconds).toBe(Infinity);
      expect(validity.status).toBe('ACTIVE');
    });

    it('expireAndDisableUser does NOT disable the admin account', () => {
      expireAndDisableUser('sivaji', 'SESSIONTIMEEXPIRED');
      const validity = checkCurrentSessionValidity('sivaji');
      expect(validity.valid).toBe(true);
      expect(validity.status).toBe('ACTIVE');

      const users = getStoredWorkspaceUsers();
      const admin = users.find((u) => u.username === 'sivaji');
      expect(admin?.status).toBe('ACTIVE');
      expect(admin?.disableReason).toBeFalsy();
    });

    it('sweepExpiredSessions skips admin accounts', () => {
      saveStoredWorkspaceUsers([
        {
          id: 'usr-owner',
          username: 'sivaji',
          email: 'sivaji491@gmail.com',
          status: 'ACTIVE',
          sessionExpireTime: Date.now() - 5000,
        },
        {
          id: 'usr-standard',
          username: 'standard_user',
          status: 'ACTIVE',
          sessionExpireTime: Date.now() - 5000,
        }
      ]);

      const disabled = sweepExpiredSessions();
      expect(disabled).toBe(1); // Only standard user disabled

      const users = getStoredWorkspaceUsers();
      const admin = users.find((u) => u.username === 'sivaji');
      const standard = users.find((u) => u.username === 'standard_user');
      expect(admin?.status).toBe('ACTIVE');
      expect(standard?.status).toBe('DISABLED');
    });

    it('adminDisableUser and adminUpdateLoginDuration reject modifying admin accounts', () => {
      const disableResult = adminDisableUser('sivaji');
      expect(disableResult).toBe(false);

      const updateResult = adminUpdateLoginDuration('usr-owner', '00:30:00');
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Administrator accounts have permanent unlimited access');
    });

    it('heals and reactivates admin even if previously stored as disabled', () => {
      saveStoredWorkspaceUsers([
        {
          id: 'usr-owner',
          username: 'sivaji',
          email: 'sivaji491@gmail.com',
          status: 'DISABLED',
          disableReason: 'SESSIONTIMEEXPIRED',
          loginDuration: '00:30:00',
        }
      ]);

      const session = startUserLoginSession('sivaji491@gmail.com');
      expect(session.success).toBe(true);
      expect(session.loginDuration).toBe('Unlimited');

      const users = getStoredWorkspaceUsers();
      const admin = users.find((u) => u.email === 'sivaji491@gmail.com');
      expect(admin?.status).toBe('ACTIVE');
      expect(admin?.disableReason).toBeNull();
      expect(admin?.loginDuration).toBe('Unlimited');
    });
  });
});
