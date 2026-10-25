import { isUserAdminOrOwner } from './permissions';

/**
 * Session Lifecycle and Login Duration Management
 * Enforces session time limits, live countdown calculations, and automatic account disabling.
 */

export type AccountStatus = 'ACTIVE' | 'DISABLED';

export type DisableReason = 'SESSIONTIMEEXPIRED' | 'ADMIN_DISABLED';

export interface DurationValidationResult {
  valid: boolean;
  error?: string | undefined;
  totalSeconds: number;
}

export const DEFAULT_LOGIN_DURATION = '01:00:00'; // Safe fallback: 1 hour
export const DEFAULT_DURATION_SECONDS = 3600;

export const EXPIRED_ACCOUNT_MESSAGE = 
  'Session expired. Your access time has ended. Please contact the administrator.';

/**
 * Validates duration in HH:MM:SS format.
 * Hours >= 0 (2+ digits), Minutes 00-59, Seconds 00-59.
 * Must be greater than 0 seconds.
 */
export function validateLoginDuration(duration: string): DurationValidationResult {
  if (!duration || typeof duration !== 'string') {
    return { valid: false, error: 'Duration is required (HH:MM:SS).', totalSeconds: 0 };
  }

  const trimmed = duration.trim();
  const match = trimmed.match(/^(\d{2,}):([0-5][0-9]):([0-5][0-9])$/);

  if (!match) {
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length === 3) {
        const m = parseInt(parts[1] ?? '0', 10);
        const s = parseInt(parts[2] ?? '0', 10);
        if (m > 59 || s > 59) {
          return {
            valid: false,
            error: 'Minutes and seconds must be between 00 and 59.',
            totalSeconds: 0,
          };
        }
      }
    }
    return {
      valid: false,
      error: 'Invalid duration format. Use HH:MM:SS (e.g. 00:30:00 or 01:00:00).',
      totalSeconds: 0,
    };
  }

  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds <= 0) {
    return {
      valid: false,
      error: 'Duration cannot be zero. Please configure at least 1 second.',
      totalSeconds: 0,
    };
  }

  return { valid: true, totalSeconds };
}

/**
 * Converts a valid HH:MM:SS string to total seconds.
 */
export function parseDurationToSeconds(duration?: string | null): number {
  if (!duration) return DEFAULT_DURATION_SECONDS;
  const res = validateLoginDuration(duration);
  return res.valid ? res.totalSeconds : DEFAULT_DURATION_SECONDS;
}

/**
 * Formats seconds into HH:MM:SS.
 */
export function formatSecondsToDuration(totalSeconds: number): string {
  if (totalSeconds === Infinity || !isFinite(totalSeconds)) return 'Unlimited';
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats a timestamp into human-readable date/time.
 */
export function formatTimestamp(timestamp?: number | string | null): string {
  if (!timestamp) return '—';
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export function formatDateTime(timestamp?: number | string | null): string {
  if (!timestamp) return '—';
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  });
}

export type TimerStatus = 'active' | 'paused' | 'expired';

/**
 * User record with session duration fields.
 */
export interface UserSessionData {
  id: string;
  username: string;
  name?: string;
  email?: string;
  status: AccountStatus;
  timerStatus?: TimerStatus;
  loginDuration: string; // HH:MM:SS
  assignedDuration?: string; // HH:MM:SS
  durationSeconds?: number;
  sessionStartTime?: number | null;
  sessionExpireTime?: number | null;
  startedAt?: number | null;
  expiresAt?: number | null;
  remainingTimeSeconds?: number | null;
  disableReason?: DisableReason | null;
  disabledAt?: number | null;
  lastLoginTime?: number | null;
  reEnabledAt?: number | null;
  reEnabledBy?: string | null;
}

const STORAGE_USERS_KEY = 'nexora_workspace_users';
const ACTIVE_SESSION_KEY = 'nexora_active_session';

/**
 * Reads users from local storage safely.
 */
export function getStoredWorkspaceUsers(): any[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persists users to local storage and dispatches event.
 */
export function saveStoredWorkspaceUsers(users: any[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
  window.dispatchEvent(new CustomEvent('nexora_session_updated'));
  import('./workspace-user-sync')
    .then(({ saveCloudWorkspaceUsers }) => {
      saveCloudWorkspaceUsers(users).catch(() => {});
    })
    .catch(() => {});
}

/**
 * Starts or resumes a persistent timer for a user upon successful authentication.
 * Never resets on logout/login, refresh, or reconnect — maintains the authoritative expiration timestamp.
 * Only an authorized Admin reset creates a new timer.
 */
export function startUserLoginSession(identifier: string, fallbackUser?: any): {
  success: boolean;
  error?: string;
  sessionStartTime: number;
  sessionExpireTime: number;
  loginDuration: string;
  assignedDuration?: string;
  remainingSeconds?: number;
  timerStatus?: TimerStatus;
} {
  const now = Date.now();
  const users = getStoredWorkspaceUsers();
  const lower = identifier.toLowerCase().trim();

  let targetUserIndex = users.findIndex(
    (u) =>
      u.id === identifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower)
  );

  let loginDuration = DEFAULT_LOGIN_DURATION;
  let targetUser: any = null;

  if (targetUserIndex >= 0) {
    targetUser = users[targetUserIndex];
  } else if (fallbackUser) {
    users.push(fallbackUser);
    targetUserIndex = users.length - 1;
    targetUser = fallbackUser;
  }

  // Admin and owner accounts have permanent unlimited sessions and can never be disabled
  if (isUserAdminOrOwner(targetUser || lower, 'sivaji491@gmail.com')) {
    if (targetUser && targetUserIndex >= 0) {
      users[targetUserIndex] = {
        ...targetUser,
        status: 'ACTIVE',
        timerStatus: 'active',
        loginDuration: 'Unlimited',
        assignedDuration: 'Unlimited',
        sessionStartTime: now,
        sessionExpireTime: 0,
        startedAt: now,
        expiresAt: null,
        remainingTimeSeconds: Infinity,
        lastLoginTime: now,
        disableReason: null,
        disabledAt: null,
      };
      saveStoredWorkspaceUsers(users);
    }

    if (typeof window !== 'undefined') {
      const sessionMeta = {
        identifier,
        sessionStartTime: now,
        sessionExpireTime: 0,
        startedAt: now,
        expiresAt: null,
        loginDuration: 'Unlimited',
        assignedDuration: 'Unlimited',
        durationSeconds: Infinity,
        timerStatus: 'active',
        remainingTimeSeconds: Infinity,
      };
      window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionMeta));
      window.localStorage.setItem('nexora-session-expire', '0');
      window.localStorage.setItem('nexora-session-start', String(now));
      window.localStorage.setItem('nexora-session-duration', 'Unlimited');
      window.localStorage.setItem('nexora-timer-status', 'active');
      window.dispatchEvent(new CustomEvent('nexora_session_updated'));
    }

    return {
      success: true,
      sessionStartTime: now,
      sessionExpireTime: 0,
      loginDuration: 'Unlimited',
      assignedDuration: 'Unlimited',
      remainingSeconds: Infinity,
      timerStatus: 'active',
    };
  }

  if (targetUser) {
    // Reject login if disabled or already expired
    if (targetUser.status === 'DISABLED' || targetUser.timerStatus === 'expired') {
      return {
        success: false,
        error: targetUser.disableReason === 'SESSIONTIMEEXPIRED' || targetUser.timerStatus === 'expired'
          ? EXPIRED_ACCOUNT_MESSAGE
          : 'Your account has been disabled. Please contact your administrator to restore access.',
        sessionStartTime: 0,
        sessionExpireTime: targetUser.sessionExpireTime || 0,
        loginDuration: targetUser.loginDuration || DEFAULT_LOGIN_DURATION,
        timerStatus: 'expired',
      };
    }

    // Check if previously stored expiration timestamp has passed
    const existingExpire = targetUser.sessionExpireTime || targetUser.expiresAt;
    if (existingExpire && existingExpire > 0 && now >= existingExpire) {
      expireAndDisableUser(identifier, 'SESSIONTIMEEXPIRED');
      return {
        success: false,
        error: EXPIRED_ACCOUNT_MESSAGE,
        sessionStartTime: targetUser.sessionStartTime || 0,
        sessionExpireTime: existingExpire,
        loginDuration: targetUser.loginDuration || DEFAULT_LOGIN_DURATION,
        timerStatus: 'expired',
      };
    }

    loginDuration = targetUser.loginDuration || targetUser.assignedDuration || DEFAULT_LOGIN_DURATION;
  }

  const durationSeconds = targetUser?.durationSeconds || parseDurationToSeconds(loginDuration);
  const assignedDuration = targetUser?.assignedDuration || loginDuration;
  
  let sessionStartTime: number;
  let sessionExpireTime: number;

  const existingExpire = targetUser?.sessionExpireTime || targetUser?.expiresAt;
  if (existingExpire && existingExpire > 0 && now < existingExpire) {
    // RESUME EXISTING PERSISTENT TIMER: Preserve the expiration timestamp across logout/login!
    sessionExpireTime = existingExpire;
    sessionStartTime = targetUser.sessionStartTime || targetUser.startedAt || (sessionExpireTime - durationSeconds * 1000);
  } else {
    // Initialize fresh timer only when no active timer exists (brand new user or admin explicitly reset)
    sessionStartTime = now;
    sessionExpireTime = now + durationSeconds * 1000;
  }

  const remainingSeconds = Math.max(0, Math.ceil((sessionExpireTime - now) / 1000));

  if (targetUser && targetUserIndex >= 0) {
    users[targetUserIndex] = {
      ...targetUser,
      status: 'ACTIVE',
      timerStatus: 'active',
      loginDuration,
      assignedDuration,
      durationSeconds,
      sessionStartTime,
      sessionExpireTime,
      startedAt: sessionStartTime,
      expiresAt: sessionExpireTime,
      remainingTimeSeconds: remainingSeconds,
      lastLoginTime: now,
      disableReason: null,
      disabledAt: null,
    };
    saveStoredWorkspaceUsers(users);
  }

  if (typeof window !== 'undefined') {
    const sessionMeta = {
      identifier,
      sessionStartTime,
      sessionExpireTime,
      startedAt: sessionStartTime,
      expiresAt: sessionExpireTime,
      remainingTimeSeconds: remainingSeconds,
      loginDuration,
      assignedDuration,
      durationSeconds,
      timerStatus: 'active',
    };
    window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionMeta));
    window.localStorage.setItem('nexora-session-expire', String(sessionExpireTime));
    window.localStorage.setItem('nexora-session-start', String(sessionStartTime));
    window.localStorage.setItem('nexora-session-duration', loginDuration);
    window.localStorage.setItem('nexora-timer-status', 'active');
    window.dispatchEvent(new CustomEvent('nexora_session_updated'));
  }

  return {
    success: true,
    sessionStartTime,
    sessionExpireTime,
    loginDuration,
    assignedDuration,
    remainingSeconds,
    timerStatus: 'active',
  };
}

/**
 * Checks if the current session has expired or is disabled.
 * Automatically marks the account DISABLED if the absolute expiration timestamp has passed.
 */
export function checkCurrentSessionValidity(identifier?: string | null): {
  valid: boolean;
  remainingSeconds: number;
  status: AccountStatus;
  disableReason?: DisableReason | null;
  error?: string;
} {
  const now = Date.now();
  const id = identifier || (typeof window !== 'undefined' ? window.localStorage.getItem('nexora-user-email') : null);

  if (!id) {
    return { valid: false, remainingSeconds: 0, status: 'DISABLED', error: 'No active session.' };
  }

  const lower = id.toLowerCase().trim();
  const users = getStoredWorkspaceUsers();
  const user = users.find(
    (u) =>
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower)
  );

  // Admin and owner accounts always have valid sessions with unlimited time
  if (isUserAdminOrOwner(user || id, 'sivaji491@gmail.com')) {
    return {
      valid: true,
      remainingSeconds: Infinity,
      status: 'ACTIVE',
    };
  }

  // Check stored active session meta
  let expireTime = 0;
  if (user && user.sessionExpireTime) {
    expireTime = user.sessionExpireTime;
  } else if (typeof window !== 'undefined') {
    const rawExpire = window.localStorage.getItem('nexora-session-expire');
    if (rawExpire) expireTime = parseInt(rawExpire, 10);
  }

  // If already disabled
  if (user && user.status === 'DISABLED') {
    return {
      valid: false,
      remainingSeconds: 0,
      status: 'DISABLED',
      disableReason: user.disableReason,
      error: user.disableReason === 'SESSIONTIMEEXPIRED'
        ? EXPIRED_ACCOUNT_MESSAGE
        : 'Your account has been disabled. Please contact your administrator to restore access.',
    };
  }

  // If session expired
  if (expireTime > 0 && now >= expireTime) {
    // Automatically disable the account!
    expireAndDisableUser(id, 'SESSIONTIMEEXPIRED');
    return {
      valid: false,
      remainingSeconds: 0,
      status: 'DISABLED',
      disableReason: 'SESSIONTIMEEXPIRED',
      error: EXPIRED_ACCOUNT_MESSAGE,
    };
  }

  const userDuration = user?.durationSeconds || parseDurationToSeconds(user?.loginDuration || user?.assignedDuration) || DEFAULT_DURATION_SECONDS;
  const remainingSeconds = expireTime > 0 ? Math.max(0, Math.ceil((expireTime - now) / 1000)) : userDuration;

  return {
    valid: true,
    remainingSeconds,
    status: 'ACTIVE',
  };
}

/**
 * Marks a user as DISABLED in database / storage, records timestamp & reason,
 * retains expiration timestamp for display and audit, and clears active session tokens.
 */
export function expireAndDisableUser(identifier: string, reason: DisableReason = 'SESSIONTIMEEXPIRED'): void {
  const now = Date.now();
  const lower = identifier.toLowerCase().trim();
  const users = getStoredWorkspaceUsers();

  const index = users.findIndex(
    (u) =>
      u.id === identifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower)
  );

  if (index >= 0 && isUserAdminOrOwner(users[index], 'sivaji491@gmail.com')) {
    return;
  }
  if (isUserAdminOrOwner(identifier, 'sivaji491@gmail.com')) {
    return;
  }

  if (index >= 0) {
    const prev = users[index];
    // Idempotency check: if user is already disabled with the same reason and expired timer, avoid redundant writes and recursive events
    if (prev.status === 'DISABLED' && prev.timerStatus === 'expired' && prev.disableReason === reason) {
      if (typeof window !== 'undefined') {
        const hasSession = window.localStorage.getItem(ACTIVE_SESSION_KEY) || window.localStorage.getItem('nexora-session-expire');
        if (hasSession) {
          window.localStorage.removeItem(ACTIVE_SESSION_KEY);
          window.localStorage.removeItem('nexora-session-expire');
          window.localStorage.removeItem('nexora-session-start');
          window.localStorage.setItem('nexora_last_disabled_reason', reason);
          window.localStorage.setItem('nexora-timer-status', 'expired');
        }
      }
      return;
    }

    const expireTime = prev.sessionExpireTime || prev.expiresAt || now;
    users[index] = {
      ...prev,
      status: 'DISABLED',
      timerStatus: 'expired',
      disableReason: reason,
      disabledAt: expireTime <= now ? expireTime : now,
      remainingTimeSeconds: 0,
      sessionExpireTime: expireTime,
      expiresAt: expireTime,
    };
    saveStoredWorkspaceUsers(users);
  }

  if (typeof window !== 'undefined') {
    const wasAlreadyExpired = window.localStorage.getItem('nexora-timer-status') === 'expired' &&
      window.localStorage.getItem('nexora_last_disabled_reason') === reason &&
      !window.localStorage.getItem('nexora-session-expire');
    if (wasAlreadyExpired) {
      return;
    }
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    window.localStorage.removeItem('nexora-session-expire');
    window.localStorage.removeItem('nexora-session-start');
    window.localStorage.setItem('nexora_last_disabled_reason', reason);
    window.localStorage.setItem('nexora-timer-status', 'expired');
    window.dispatchEvent(new CustomEvent('nexora_account_disabled', { detail: { identifier, reason } }));
    window.dispatchEvent(new CustomEvent('nexora_session_updated'));
  }
}

/**
 * Admin-Only Action: Explicitly resets a user's persistent timer.
 * Rejects any non-admin caller. Sets new authoritative sessionExpireTime.
 */
export function adminResetUserTimer(
  userIdOrIdentifier: string,
  adminIdentifier: string = 'sivaji491@gmail.com',
  newDuration?: string
): {
  success: boolean;
  error?: string;
  sessionStartTime?: number;
  sessionExpireTime?: number;
  remainingSeconds?: number;
  loginDuration?: string;
  timerStatus?: TimerStatus;
} {
  // STRICT AUTHORIZATION CHECK: Only authenticated and authorized Admin can reset timers
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only an administrator can reset user timers.',
    };
  }

  const users = getStoredWorkspaceUsers();
  const lower = userIdOrIdentifier.toLowerCase().trim();

  const index = users.findIndex(
    (u) =>
      u.id === userIdOrIdentifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower)
  );

  if (index < 0) {
    return { success: false, error: 'User not found.' };
  }

  const target = users[index];
  if (isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Administrator accounts have permanent unlimited access and do not use session timers.',
    };
  }

  const durationStr = newDuration || target.assignedDuration || target.loginDuration || DEFAULT_LOGIN_DURATION;
  const validation = validateLoginDuration(durationStr);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid duration format.' };
  }

  const durationSeconds = validation.totalSeconds;
  const now = Date.now();
  const sessionStartTime = now;
  const sessionExpireTime = now + durationSeconds * 1000;

  users[index] = {
    ...target,
    status: 'ACTIVE',
    timerStatus: 'active',
    loginDuration: durationStr,
    assignedDuration: durationStr,
    durationSeconds,
    sessionStartTime,
    sessionExpireTime,
    startedAt: sessionStartTime,
    expiresAt: sessionExpireTime,
    remainingTimeSeconds: durationSeconds,
    disableReason: null,
    disabledAt: null,
    reEnabledAt: now,
    reEnabledBy: adminIdentifier,
  };

  saveStoredWorkspaceUsers(users);

  // If this user is currently in this browser's session, update live tokens
  if (typeof window !== 'undefined') {
    const activeEmail = window.localStorage.getItem('nexora-user-email');
    if (activeEmail && (activeEmail.toLowerCase() === lower || activeEmail === target.id)) {
      window.localStorage.setItem('nexora-session-expire', String(sessionExpireTime));
      window.localStorage.setItem('nexora-session-start', String(sessionStartTime));
      window.localStorage.setItem('nexora-session-duration', durationStr);
      window.localStorage.setItem('nexora-timer-status', 'active');
      window.localStorage.removeItem('nexora_last_disabled_reason');
    }
    window.dispatchEvent(new CustomEvent('nexora_session_updated'));
    window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
  }

  return {
    success: true,
    sessionStartTime,
    sessionExpireTime,
    remainingSeconds: durationSeconds,
    loginDuration: durationStr,
    timerStatus: 'active',
  };
}

/**
 * Admin-Only Action: Extends an active or expired user's timer by additional seconds.
 * Rejects any non-admin caller.
 */
export function adminExtendUserTimer(
  userIdOrIdentifier: string,
  adminIdentifier: string = 'sivaji491@gmail.com',
  additionalSeconds: number
): {
  success: boolean;
  error?: string;
  sessionExpireTime?: number;
  remainingSeconds?: number;
  timerStatus?: TimerStatus;
} {
  // STRICT AUTHORIZATION CHECK
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only an administrator can extend user timers.',
    };
  }

  if (isNaN(additionalSeconds) || additionalSeconds <= 0) {
    return { success: false, error: 'Additional time must be greater than 0 seconds.' };
  }

  const users = getStoredWorkspaceUsers();
  const lower = userIdOrIdentifier.toLowerCase().trim();

  const index = users.findIndex(
    (u) =>
      u.id === userIdOrIdentifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower)
  );

  if (index < 0) {
    return { success: false, error: 'User not found.' };
  }

  const target = users[index];
  if (isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Administrator accounts have permanent unlimited access.',
    };
  }

  const now = Date.now();
  let newExpireTime: number;
  let newStartTime = target.sessionStartTime || target.startedAt || now;

  if (!target.sessionExpireTime || now >= target.sessionExpireTime) {
    // If timer was expired or not started, start extension from now
    newStartTime = now;
    newExpireTime = now + additionalSeconds * 1000;
  } else {
    // If timer is actively running, extend expiration timestamp
    newExpireTime = target.sessionExpireTime + additionalSeconds * 1000;
  }

  const remainingSeconds = Math.max(0, Math.ceil((newExpireTime - now) / 1000));

  users[index] = {
    ...target,
    status: 'ACTIVE',
    timerStatus: 'active',
    sessionStartTime: newStartTime,
    sessionExpireTime: newExpireTime,
    startedAt: newStartTime,
    expiresAt: newExpireTime,
    remainingTimeSeconds: remainingSeconds,
    disableReason: null,
    disabledAt: null,
  };

  saveStoredWorkspaceUsers(users);

  if (typeof window !== 'undefined') {
    const activeEmail = window.localStorage.getItem('nexora-user-email');
    if (activeEmail && (activeEmail.toLowerCase() === lower || activeEmail === target.id)) {
      window.localStorage.setItem('nexora-session-expire', String(newExpireTime));
      window.localStorage.setItem('nexora-timer-status', 'active');
      window.localStorage.removeItem('nexora_last_disabled_reason');
    }
    window.dispatchEvent(new CustomEvent('nexora_session_updated'));
    window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
  }

  return {
    success: true,
    sessionExpireTime: newExpireTime,
    remainingSeconds,
    timerStatus: 'active',
  };
}

/**
 * Admin action: Manually re-enables a disabled account.
 * Sets status to ACTIVE, clears disabled reason, does NOT log user in,
 * requires fresh login, and fresh timer only starts on next login.
 */
export function adminEnableUser(userIdOrIdentifier: string, adminIdentifier: string = 'sivaji'): boolean {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return false;
  }

  const users = getStoredWorkspaceUsers();
  const lower = userIdOrIdentifier.toLowerCase().trim();

  const index = users.findIndex(
    (u) =>
      u.id === userIdOrIdentifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower)
  );

  if (index < 0) return false;

  const target = users[index];
  if (isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
    return false;
  }

  users[index] = {
    ...target,
    status: 'ACTIVE',
    timerStatus: 'active',
    disableReason: null,
    disabledAt: null,
    sessionStartTime: null,
    sessionExpireTime: null,
    startedAt: null,
    expiresAt: null,
    remainingTimeSeconds: target.durationSeconds || parseDurationToSeconds(target.loginDuration),
    reEnabledAt: Date.now(),
    reEnabledBy: adminIdentifier,
  };

  saveStoredWorkspaceUsers(users);
  return true;
}

/**
 * Admin action: Manually disables an account.
 */
export function adminDisableUser(userIdOrIdentifier: string, adminIdentifier: string = 'sivaji'): boolean {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return false;
  }

  const users = getStoredWorkspaceUsers();
  const lower = userIdOrIdentifier.toLowerCase().trim();

  const index = users.findIndex(
    (u) =>
      u.id === userIdOrIdentifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower)
  );

  if (index < 0) return false;

  const target = users[index];
  if (isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
    return false;
  }

  users[index] = {
    ...target,
    status: 'DISABLED',
    timerStatus: 'expired',
    disableReason: 'ADMIN_DISABLED',
    disabledAt: Date.now(),
    remainingTimeSeconds: 0,
  };

  saveStoredWorkspaceUsers(users);
  return true;
}

/**
 * Admin action: Terminates the user's active session immediately (Force Logout).
 */
export function adminForceLogoutUser(userIdOrIdentifier: string, adminIdentifier: string = 'sivaji'): boolean {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return false;
  }

  const users = getStoredWorkspaceUsers();
  const lower = userIdOrIdentifier.toLowerCase().trim();

  const index = users.findIndex(
    (u) =>
      u.id === userIdOrIdentifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower)
  );

  if (index < 0) return false;

  const target = users[index];
  if (isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
    return false;
  }

  users[index] = {
    ...users[index],
    sessionStartTime: null,
    sessionExpireTime: null,
  };

  saveStoredWorkspaceUsers(users);
  return true;
}

/**
 * Admin action: Updates login duration for a user.
 * Can optionally reset the active timer immediately if requested by Admin.
 */
export function adminUpdateLoginDuration(
  userIdOrIdentifier: string, 
  newDuration: string,
  adminIdentifier: string = 'sivaji491@gmail.com',
  resetTimerNow = false
): {
  success: boolean;
  error?: string | undefined;
} {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return { success: false, error: 'Unauthorized: Only an administrator can modify login durations.' };
  }

  const validation = validateLoginDuration(newDuration);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid duration.' };
  }

  const users = getStoredWorkspaceUsers();
  const lower = userIdOrIdentifier.toLowerCase().trim();

  const index = users.findIndex(
    (u) =>
      u.id === userIdOrIdentifier ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower)
  );

  if (index < 0) {
    return { success: false, error: 'User not found.' };
  }

  if (isUserAdminOrOwner(users[index] || userIdOrIdentifier, 'sivaji491@gmail.com')) {
    return { success: false, error: 'Administrator accounts have permanent unlimited access and do not use session timers.' };
  }

  const now = Date.now();
  const currentTarget = users[index];
  const isCurrentlyActive = Boolean(currentTarget.sessionExpireTime && now < currentTarget.sessionExpireTime && currentTarget.status === 'ACTIVE');

  const updatedUser: any = {
    ...currentTarget,
    loginDuration: newDuration.trim(),
    assignedDuration: newDuration.trim(),
    durationSeconds: validation.totalSeconds,
    status: 'ACTIVE',
    timerStatus: 'active',
    sessionStartTime: resetTimerNow ? now : null,
    sessionExpireTime: resetTimerNow ? now + validation.totalSeconds * 1000 : null,
    startedAt: resetTimerNow ? now : null,
    expiresAt: resetTimerNow ? now + validation.totalSeconds * 1000 : null,
    remainingTimeSeconds: validation.totalSeconds,
    disableReason: null,
    disabledAt: null,
    reEnabledAt: now,
    reEnabledBy: adminIdentifier,
  };

  users[index] = updatedUser;
  saveStoredWorkspaceUsers(users);

  if (resetTimerNow && typeof window !== 'undefined') {
    const activeEmail = window.localStorage.getItem('nexora-user-email');
    if (activeEmail && (activeEmail.toLowerCase() === lower || activeEmail === users[index].id)) {
      window.localStorage.setItem('nexora-session-expire', String(updatedUser.sessionExpireTime));
      window.localStorage.setItem('nexora-session-start', String(now));
      window.localStorage.setItem('nexora-session-duration', newDuration.trim());
      window.localStorage.setItem('nexora-timer-status', 'active');
      window.localStorage.removeItem('nexora_last_disabled_reason');
    }
    window.dispatchEvent(new CustomEvent('nexora_session_updated'));
  }

  return { success: true };
}

/**
 * Background / offline sweep: Scans all users and disables any whose
 * session expiration timestamp has passed while remaining in ACTIVE state.
 */
export function sweepExpiredSessions(): number {
  const now = Date.now();
  const users = getStoredWorkspaceUsers();
  let disabledCount = 0;

  const updated = users.map((u) => {
    if (isUserAdminOrOwner(u, 'sivaji491@gmail.com')) {
      return u;
    }
    const expireTime = u.sessionExpireTime || u.expiresAt;
    if (u.status === 'ACTIVE' && expireTime && now >= expireTime) {
      disabledCount++;
      return {
        ...u,
        status: 'DISABLED' as AccountStatus,
        timerStatus: 'expired' as TimerStatus,
        disableReason: 'SESSIONTIMEEXPIRED' as DisableReason,
        disabledAt: expireTime,
        remainingTimeSeconds: 0,
        // Retain expiration timestamp so User Management table accurately reflects expiration time
        sessionExpireTime: expireTime,
        expiresAt: expireTime,
      };
    }
    return u;
  });

  if (disabledCount > 0) {
    saveStoredWorkspaceUsers(updated);
  }

  return disabledCount;
}

/**
 * Admin-Only Action: Creates a new user in workspace storage.
 * Enforces admin authorization. Countdown timer NEVER starts at creation (sessionStartTime & sessionExpireTime remain null).
 */
export function adminCreateUser(
  adminIdentifier: string,
  userData: {
    username: string;
    email?: string;
    password?: string;
    permissions?: string[];
    loginDuration?: string;
    mfaEnabled?: boolean;
  }
): {
  success: boolean;
  error?: string;
  user?: any;
} {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only an administrator can create users.',
    };
  }

  const trimmedUsername = (userData.username || '').trim();
  const trimmedEmail = (userData.email || '').trim().toLowerCase();

  if (!trimmedUsername) {
    return { success: false, error: 'Please enter a username.' };
  }
  if (trimmedUsername.includes('@')) {
    return { success: false, error: 'Username cannot be an email address.' };
  }
  if (/\s/.test(trimmedUsername)) {
    return { success: false, error: 'Username cannot contain spaces.' };
  }

  const users = getStoredWorkspaceUsers();
  const lowerUser = trimmedUsername.toLowerCase();
  if (users.some((u) => u.username && u.username.toLowerCase() === lowerUser)) {
    return { success: false, error: 'A user with this username already exists in the workspace.' };
  }
  if (trimmedEmail && users.some((u) => u.email && u.email.toLowerCase() === trimmedEmail)) {
    return { success: false, error: 'A user with this email address already exists in the workspace.' };
  }

  const durationStr = userData.loginDuration || DEFAULT_LOGIN_DURATION;
  const durationCheck = validateLoginDuration(durationStr);
  if (!durationCheck.valid) {
    return { success: false, error: durationCheck.error || 'Invalid login duration.' };
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    username: trimmedUsername,
    name: trimmedUsername,
    email: trimmedEmail || undefined,
    password: userData.password || 'Nexora!2026',
    permissions: userData.permissions || ['home', 'ranks', 'currency', 'configuration'],
    status: 'ACTIVE',
    guardianProtected: true,
    mfaEnabled: userData.mfaEnabled ?? true,
    lastActive: 'Never logged in',
    joinedDate: 'Just now',
    loginDuration: durationStr.trim(),
    assignedDuration: durationStr.trim(),
    durationSeconds: durationCheck.totalSeconds,
    sessionStartTime: null, // Timer NEVER starts at creation! Starts ONLY on first successful login.
    sessionExpireTime: null,
    disableReason: null,
    disabledAt: null,
    lastLoginTime: null,
  };

  users.unshift(newUser);
  saveStoredWorkspaceUsers(users);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
  }

  return { success: true, user: newUser };
}

/**
 * Admin-Only Action: Explicitly deletes a user from workspace storage.
 * Rejects non-admin callers. Never allows deleting the workspace primary owner.
 */
export function adminDeleteUser(
  adminIdentifier: string,
  targetUserId: string
): {
  success: boolean;
  error?: string;
} {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only an administrator can delete users.',
    };
  }

  const users = getStoredWorkspaceUsers();
  const lower = (targetUserId || '').toLowerCase().trim();
  const target = users.find(
    (u) =>
      u.id === targetUserId ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower)
  );

  if (!target) {
    return { success: false, error: 'User not found.' };
  }

  if (target.id === 'usr-owner' || isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
    return { success: false, error: 'Cannot remove workspace owner.' };
  }

  const updated = users.filter((u) => u.id !== target.id);
  saveStoredWorkspaceUsers(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
  }

  return { success: true };
}

/**
 * Admin-Only Action: Modifies user navigation permissions.
 * Rejects non-admin callers.
 */
export function adminUpdateUserPermissions(
  adminIdentifier: string,
  targetUserId: string,
  permissions: string[]
): {
  success: boolean;
  error?: string;
} {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only an administrator can modify user permissions.',
    };
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return { success: false, error: 'User must have access to at least one navigation field.' };
  }

  const users = getStoredWorkspaceUsers();
  const lower = (targetUserId || '').toLowerCase().trim();
  const index = users.findIndex(
    (u) =>
      u.id === targetUserId ||
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower)
  );

  if (index < 0) {
    return { success: false, error: 'User not found.' };
  }

  users[index] = {
    ...users[index],
    permissions,
  };
  saveStoredWorkspaceUsers(users);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
  }

  return { success: true };
}
