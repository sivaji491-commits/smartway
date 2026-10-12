import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import {
  startUserLoginSession,
  checkCurrentSessionValidity,
  expireAndDisableUser,
  adminResetUserTimer,
  adminExtendUserTimer,
  adminUpdateLoginDuration,
  saveStoredWorkspaceUsers,
  getStoredWorkspaceUsers,
  EXPIRED_ACCOUNT_MESSAGE,
  DEFAULT_LOGIN_DURATION,
  formatSecondsToDuration,
} from '../lib/session-manager';
import {
  getServerAuthoritativeTimerState,
  validateAndResetTimerServer,
  validateAndExtendTimerServer,
} from '../server/timer-service';

describe('Persistent User Timer & Admin-Only Reset Acceptance Tests', () => {
  const baseTime = 1700000000000; // Fixed deterministic timestamp

  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTime));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test A — Logout and Login: Timer resumes from actual remaining time, never resets to original duration', () => {
    // 1. Admin assigns 30 minutes to User A
    const userA = {
      id: 'usr-user-a',
      username: 'user_a',
      name: 'User A',
      email: 'user_a@example.com',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:30:00',
      assignedDuration: '00:30:00',
      durationSeconds: 1800,
      sessionStartTime: null,
      sessionExpireTime: null,
    };
    saveStoredWorkspaceUsers([userA]);

    // User A logs in at T = baseTime
    const login1 = startUserLoginSession('user_a');
    expect(login1.success).toBe(true);
    expect(login1.sessionStartTime).toBe(baseTime);
    expect(login1.sessionExpireTime).toBe(baseTime + 1800 * 1000); // 30 minutes
    expect(login1.remainingSeconds).toBe(1800);

    // 2. User A uses the application for 10 minutes (600 seconds)
    const tenMinutesLater = baseTime + 10 * 60 * 1000;
    vi.setSystemTime(new Date(tenMinutesLater));

    const checkBeforeLogout = checkCurrentSessionValidity('user_a');
    expect(checkBeforeLogout.valid).toBe(true);
    expect(checkBeforeLogout.remainingSeconds).toBe(1200); // 20 minutes left

    // 3. User A logs out (client clears local active tokens, but persistent storage remains intact)
    window.localStorage.removeItem('nexora-user-email');
    window.localStorage.removeItem('nexora_active_session');

    // 4. User A logs in again immediately (or shortly after)
    const login2 = startUserLoginSession('user_a');
    expect(login2.success).toBe(true);

    // CRITICAL ACCEPTANCE ASSERTION:
    // Approximately 20 minutes (1200 seconds) remain, NOT 30 minutes (1800 seconds)!
    expect(login2.sessionExpireTime).toBe(baseTime + 1800 * 1000); // Same authoritative expiration
    expect(login2.remainingSeconds).toBe(1200); // 20 minutes remaining!
    expect(login2.remainingSeconds).not.toBe(1800);
  });

  it('Test B — Page Refresh: Countdown continues accurately from remaining time', () => {
    // User has 15 minutes remaining (900 seconds)
    const userB = {
      id: 'usr-user-b',
      username: 'user_b',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:30:00',
      assignedDuration: '00:30:00',
      durationSeconds: 1800,
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 1800 * 1000,
    };
    saveStoredWorkspaceUsers([userB]);

    // Fast-forward 15 minutes (900 seconds passed)
    vi.setSystemTime(new Date(baseTime + 15 * 60 * 1000));

    // Page refresh re-evaluates session validity
    const refreshCheck = checkCurrentSessionValidity('user_b');
    expect(refreshCheck.valid).toBe(true);
    expect(refreshCheck.remainingSeconds).toBe(900); // exactly 15 minutes
    expect(formatSecondsToDuration(refreshCheck.remainingSeconds)).toBe('00:15:00');

    // Fast-forward another 5 seconds after refresh
    vi.setSystemTime(new Date(baseTime + 15 * 60 * 1000 + 5000));
    const countdownCheck = checkCurrentSessionValidity('user_b');
    expect(countdownCheck.remainingSeconds).toBe(895);
  });

  it('Test C — Browser Restart: Timer persists across browser restart', () => {
    // User has 8 minutes remaining (480 seconds)
    const userC = {
      id: 'usr-user-c',
      username: 'user_c',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:20:00',
      assignedDuration: '00:20:00',
      durationSeconds: 1200,
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 1200 * 1000,
    };
    saveStoredWorkspaceUsers([userC]);

    // Advance 12 minutes (720 seconds) -> 8 minutes remaining
    vi.setSystemTime(new Date(baseTime + 12 * 60 * 1000));

    // Simulate browser close: window and in-memory context cleared, only persistent storage survives
    window.sessionStorage.clear();

    // Browser reopens and user checks session
    const validity = checkCurrentSessionValidity('user_c');
    expect(validity.valid).toBe(true);
    expect(validity.remainingSeconds).toBe(480); // 8 minutes
    expect(formatSecondsToDuration(validity.remainingSeconds)).toBe('00:08:00');
  });

  it('Test D — Timer Expiration: Expired timer stays expired on logout & login, blocking protected access', () => {
    const userD = {
      id: 'usr-user-d',
      username: 'user_d',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:10:00',
      assignedDuration: '00:10:00',
      durationSeconds: 600,
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 600 * 1000, // 10 minutes
    };
    saveStoredWorkspaceUsers([userD]);

    // Advance time past expiration (11 minutes later)
    vi.setSystemTime(new Date(baseTime + 11 * 60 * 1000));

    // 1. Session detection marks expired and disabled
    const expireCheck = checkCurrentSessionValidity('user_d');
    expect(expireCheck.valid).toBe(false);
    expect(expireCheck.status).toBe('DISABLED');
    expect(expireCheck.disableReason).toBe('SESSIONTIMEEXPIRED');

    // 2. User logs out
    window.localStorage.removeItem('nexora-user-email');

    // 3. User attempts to log in again
    const loginAttempt = startUserLoginSession('user_d');

    // CRITICAL ACCEPTANCE ASSERTION:
    // Login MUST fail with EXPIRED_ACCOUNT_MESSAGE and timer MUST NOT restart!
    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    // Account remains disabled
    const users = getStoredWorkspaceUsers();
    const storedUserD = users.find((u) => u.username === 'user_d');
    expect(storedUserD.status).toBe('DISABLED');
    expect(storedUserD.timerStatus).toBe('expired');
  });

  it('Test E — Admin Reset: Only authorized Admin can reset expired timer to a fresh duration', () => {
    // User E is currently expired
    const userE = {
      id: 'usr-user-e',
      username: 'user_e',
      status: 'DISABLED' as const,
      timerStatus: 'expired' as const,
      disableReason: 'SESSIONTIMEEXPIRED' as const,
      loginDuration: '00:30:00',
      assignedDuration: '00:30:00',
      durationSeconds: 1800,
      sessionStartTime: baseTime - 3600 * 1000,
      sessionExpireTime: baseTime - 1800 * 1000,
    };
    saveStoredWorkspaceUsers([userE]);

    // Admin explicitly resets the timer to 30 minutes
    const resetResult = adminResetUserTimer('usr-user-e', 'sivaji491@gmail.com', '00:30:00');
    expect(resetResult.success).toBe(true);
    expect(resetResult.timerStatus).toBe('active');
    expect(resetResult.remainingSeconds).toBe(1800);
    expect(resetResult.sessionStartTime).toBe(baseTime);
    expect(resetResult.sessionExpireTime).toBe(baseTime + 1800 * 1000);

    // Verify user record in database/storage is re-enabled with active timer
    const users = getStoredWorkspaceUsers();
    const storedUserE = users.find((u) => u.id === 'usr-user-e');
    expect(storedUserE.status).toBe('ACTIVE');
    expect(storedUserE.timerStatus).toBe('active');
    expect(storedUserE.disableReason).toBeNull();

    // User E can now log in successfully with the fresh 30-minute timer
    const login = startUserLoginSession('user_e');
    expect(login.success).toBe(true);
    expect(login.remainingSeconds).toBe(1800);
  });

  it('Test F — Unauthorized Reset: Non-admin users cannot reset, extend, or bypass their timers', () => {
    const normalUser = {
      id: 'usr-normal',
      username: 'normal_user',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:10:00',
      assignedDuration: '00:10:00',
      durationSeconds: 600,
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 600 * 1000,
    };
    saveStoredWorkspaceUsers([normalUser]);

    // Non-admin attempts to reset timer via backend method
    const unauthorizedReset = adminResetUserTimer('usr-normal', 'normal_user', '08:00:00');
    expect(unauthorizedReset.success).toBe(false);
    expect(unauthorizedReset.error).toContain('Unauthorized');

    // Non-admin attempts to extend timer
    const unauthorizedExtend = adminExtendUserTimer('usr-normal', 'normal_user', 3600);
    expect(unauthorizedExtend.success).toBe(false);
    expect(unauthorizedExtend.error).toContain('Unauthorized');

    // Server-side RPC verification: validateAndResetTimerServer rejects non-admin
    const serverResetAttempt = validateAndResetTimerServer('normal_user', 'usr-normal', '08:00:00', baseTime);
    expect(serverResetAttempt.success).toBe(false);
    expect(serverResetAttempt.error).toContain('Unauthorized');

    // Server-side RPC verification: validateAndExtendTimerServer rejects non-admin
    const serverExtendAttempt = validateAndExtendTimerServer('normal_user', 'usr-normal', 3600, baseTime);
    expect(serverExtendAttempt.success).toBe(false);
    expect(serverExtendAttempt.error).toContain('Unauthorized');

    // The user's timer in storage remains completely unchanged
    const users = getStoredWorkspaceUsers();
    const target = users.find((u) => u.id === 'usr-normal');
    expect(target.sessionExpireTime).toBe(baseTime + 600 * 1000);
    expect(target.loginDuration).toBe('00:10:00');
  });

  it('Test G — Multiple Tabs: Multiple tabs synchronize and share the same authoritative expiration', () => {
    const userG = {
      id: 'usr-user-g',
      username: 'user_g',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:20:00',
      assignedDuration: '00:20:00',
      durationSeconds: 1200,
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 1200 * 1000,
    };
    saveStoredWorkspaceUsers([userG]);

    // Tab 1 and Tab 2 query validity simultaneously
    const tab1 = checkCurrentSessionValidity('user_g');
    const tab2 = checkCurrentSessionValidity('user_g');
    expect(tab1.remainingSeconds).toBe(1200);
    expect(tab2.remainingSeconds).toBe(1200);
    expect(tab1.remainingSeconds).toBe(tab2.remainingSeconds);

    // Fast-forward 5 minutes (300 seconds)
    vi.setSystemTime(new Date(baseTime + 300 * 1000));

    // Both tabs reflect 900 seconds remaining
    const tab1Later = checkCurrentSessionValidity('user_g');
    const tab2Later = checkCurrentSessionValidity('user_g');
    expect(tab1Later.remainingSeconds).toBe(900);
    expect(tab2Later.remainingSeconds).toBe(900);
  });

  it('Server Authoritative Timer Service: Calculates remaining time accurately via server timestamp', () => {
    const userServer = {
      id: 'usr-server-test',
      username: 'server_test_user',
      status: 'ACTIVE' as const,
      timerStatus: 'active' as const,
      loginDuration: '00:30:00',
      assignedDuration: '00:30:00',
      durationSeconds: 1800,
      startedAt: baseTime,
      expiresAt: baseTime + 1800 * 1000,
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 1800 * 1000,
    };
    saveStoredWorkspaceUsers([userServer]);

    // Server time at baseTime + 600s (10m in)
    const serverState = getServerAuthoritativeTimerState('server_test_user', baseTime + 600 * 1000);
    expect(serverState.isAdmin).toBe(false);
    expect(serverState.timerStatus).toBe('active');
    expect(serverState.remainingTimeSeconds).toBe(1200); // 20m
    expect(serverState.formattedTime).toBe('00:20:00');

    // Server time at baseTime + 1900s (expired)
    const expiredServerState = getServerAuthoritativeTimerState('server_test_user', baseTime + 1900 * 1000);
    expect(expiredServerState.timerStatus).toBe('expired');
    expect(expiredServerState.status).toBe('DISABLED');
    expect(expiredServerState.remainingTimeSeconds).toBe(0);
    expect(expiredServerState.formattedTime).toBe('00:00:00');
  });

  it('Admin Accounts Exemption: Administrators have permanent unlimited access and are never timed out', () => {
    const adminState = getServerAuthoritativeTimerState('sivaji491@gmail.com', baseTime);
    expect(adminState.isAdmin).toBe(true);
    expect(adminState.remainingTimeSeconds).toBe(Infinity);
    expect(adminState.formattedTime).toBe('Unlimited');
    expect(adminState.timerStatus).toBe('active');

    // Admin login returns unlimited session
    const adminLogin = startUserLoginSession('sivaji491@gmail.com');
    expect(adminLogin.success).toBe(true);
    expect(adminLogin.loginDuration).toBe('Unlimited');
    expect(adminLogin.sessionExpireTime).toBe(0);

    // Fast-forward 100 days
    vi.setSystemTime(new Date(baseTime + 100 * 86400 * 1000));
    const adminCheck = checkCurrentSessionValidity('sivaji491@gmail.com');
    expect(adminCheck.valid).toBe(true);
    expect(adminCheck.remainingSeconds).toBe(Infinity);
  });
});
