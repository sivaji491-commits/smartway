import { createServerFn } from '@tanstack/react-start';
import { 
  validateLoginDuration, 
  parseDurationToSeconds, 
  formatSecondsToDuration, 
  getStoredWorkspaceUsers, 
  saveStoredWorkspaceUsers,
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUserPermissions,
  adminUpdateLoginDuration,
  adminEnableUser,
  adminDisableUser,
  type TimerStatus,
  type AccountStatus,
  type DisableReason,
  DEFAULT_LOGIN_DURATION,
  EXPIRED_ACCOUNT_MESSAGE
} from '../lib/session-manager';
import { isUserAdminOrOwner } from '../lib/permissions';

export interface AuthoritativeTimerState {
  identifier: string;
  isAdmin: boolean;
  timerStatus: TimerStatus;
  status: AccountStatus;
  disableReason: DisableReason | null;
  assignedDuration: string;
  durationSeconds: number;
  startedAt: number | null;
  expiresAt: number | null;
  remainingTimeSeconds: number;
  formattedTime: string;
  serverTime: number;
}

export interface AdminTimerMutationResult {
  success: boolean;
  error?: string;
  startedAt?: number;
  expiresAt?: number;
  remainingSeconds?: number;
  assignedDuration?: string;
  timerStatus?: TimerStatus;
}

/**
 * Server-side authoritative evaluation of a user's timer state.
 * Uses the authoritative server timestamp (Date.now()) and stored expiresAt.
 */
export function getServerAuthoritativeTimerState(
  identifier: string,
  serverTime: number = Date.now()
): AuthoritativeTimerState {
  const lower = (identifier || '').toLowerCase().trim();
  const users = getStoredWorkspaceUsers();
  const user = users.find(
    (u) =>
      (u.username && u.username.toLowerCase().trim() === lower) ||
      (u.email && u.email.toLowerCase().trim() === lower) ||
      (u.name && u.name.toLowerCase().trim() === lower) ||
      u.id === identifier
  );

  // Admin/Owner accounts are exempt from timer limits
  if (isUserAdminOrOwner(user || identifier, 'sivaji491@gmail.com')) {
    return {
      identifier,
      isAdmin: true,
      timerStatus: 'active',
      status: 'ACTIVE',
      disableReason: null,
      assignedDuration: 'Unlimited',
      durationSeconds: Infinity,
      startedAt: null,
      expiresAt: null,
      remainingTimeSeconds: Infinity,
      formattedTime: 'Unlimited',
      serverTime,
    };
  }

  const assignedDuration = user?.assignedDuration || user?.loginDuration || DEFAULT_LOGIN_DURATION;
  const durationSeconds = user?.durationSeconds || parseDurationToSeconds(assignedDuration);
  const startedAt = user?.startedAt || user?.sessionStartTime || null;
  const expiresAt = user?.expiresAt || user?.sessionExpireTime || null;

  // If already disabled
  if (user && user.status === 'DISABLED') {
    return {
      identifier,
      isAdmin: false,
      timerStatus: 'expired',
      status: 'DISABLED',
      disableReason: user.disableReason || 'SESSIONTIMEEXPIRED',
      assignedDuration,
      durationSeconds,
      startedAt,
      expiresAt,
      remainingTimeSeconds: 0,
      formattedTime: '00:00:00',
      serverTime,
    };
  }

  // Check if expiration timestamp has passed according to server time
  if (expiresAt && serverTime >= expiresAt) {
    return {
      identifier,
      isAdmin: false,
      timerStatus: 'expired',
      status: 'DISABLED',
      disableReason: 'SESSIONTIMEEXPIRED',
      assignedDuration,
      durationSeconds,
      startedAt,
      expiresAt,
      remainingTimeSeconds: 0,
      formattedTime: '00:00:00',
      serverTime,
    };
  }

  const remainingTimeSeconds = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - serverTime) / 1000))
    : durationSeconds;

  return {
    identifier,
    isAdmin: false,
    timerStatus: 'active',
    status: 'ACTIVE',
    disableReason: null,
    assignedDuration,
    durationSeconds,
    startedAt,
    expiresAt,
    remainingTimeSeconds,
    formattedTime: formatSecondsToDuration(remainingTimeSeconds),
    serverTime,
  };
}

/**
 * Server-side authorization check and timer reset.
 * Rejects non-admin callers to guarantee admin-only control.
 */
export function validateAndResetTimerServer(
  adminIdentifier: string,
  targetUserIdOrIdentifier: string,
  newDuration?: string,
  serverTime: number = Date.now()
): AdminTimerMutationResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only an administrator can reset user timers.',
    };
  }

  const users = getStoredWorkspaceUsers();
  const lower = (targetUserIdOrIdentifier || '').toLowerCase().trim();
  const index = users.findIndex(
    (u) =>
      u.id === targetUserIdOrIdentifier ||
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
  const startedAt = serverTime;
  const expiresAt = serverTime + durationSeconds * 1000;

  users[index] = {
    ...target,
    status: 'ACTIVE',
    timerStatus: 'active',
    loginDuration: durationStr,
    assignedDuration: durationStr,
    durationSeconds,
    sessionStartTime: startedAt,
    sessionExpireTime: expiresAt,
    startedAt,
    expiresAt,
    remainingTimeSeconds: durationSeconds,
    disableReason: null,
    disabledAt: null,
    reEnabledAt: serverTime,
    reEnabledBy: adminIdentifier,
  };

  saveStoredWorkspaceUsers(users);

  return {
    success: true,
    startedAt,
    expiresAt,
    remainingSeconds: durationSeconds,
    assignedDuration: durationStr,
    timerStatus: 'active',
  };
}

/**
 * Server-side authorization check and timer extension.
 * Rejects non-admin callers.
 */
export function validateAndExtendTimerServer(
  adminIdentifier: string,
  targetUserIdOrIdentifier: string,
  additionalSeconds: number,
  serverTime: number = Date.now()
): AdminTimerMutationResult {
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
  const lower = (targetUserIdOrIdentifier || '').toLowerCase().trim();
  const index = users.findIndex(
    (u) =>
      u.id === targetUserIdOrIdentifier ||
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

  let expiresAt: number;
  let startedAt = target.startedAt || target.sessionStartTime || serverTime;

  if (!target.expiresAt || !target.sessionExpireTime || serverTime >= (target.expiresAt || target.sessionExpireTime)) {
    // If expired, start extension from now
    startedAt = serverTime;
    expiresAt = serverTime + additionalSeconds * 1000;
  } else {
    // If active, add to existing expiration timestamp
    const currentExpire = target.expiresAt || target.sessionExpireTime;
    expiresAt = currentExpire + additionalSeconds * 1000;
  }

  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - serverTime) / 1000));

  users[index] = {
    ...target,
    status: 'ACTIVE',
    timerStatus: 'active',
    startedAt,
    expiresAt,
    sessionStartTime: startedAt,
    sessionExpireTime: expiresAt,
    remainingTimeSeconds: remainingSeconds,
    disableReason: null,
    disabledAt: null,
  };

  saveStoredWorkspaceUsers(users);

  return {
    success: true,
    startedAt,
    expiresAt,
    remainingSeconds,
    timerStatus: 'active',
  };
}

// TanStack Start Server Functions (RPC endpoints)
export const getServerTimerStateFn = createServerFn({ method: 'GET' })
  .validator((data: { identifier: string }) => data)
  .handler(async ({ data }) => {
    return getServerAuthoritativeTimerState(data.identifier);
  });

export const adminResetTimerServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string; newDuration?: string }) => data)
  .handler(async ({ data }) => {
    return validateAndResetTimerServer(data.adminIdentifier, data.targetUserId, data.newDuration);
  });

export const adminExtendTimerServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string; additionalSeconds: number }) => data)
  .handler(async ({ data }) => {
    return validateAndExtendTimerServer(data.adminIdentifier, data.targetUserId, data.additionalSeconds);
  });

export function validateAndCreateUserServer(
  adminIdentifier: string,
  userData: {
    username: string;
    email?: string;
    password?: string;
    permissions?: string[];
    loginDuration?: string;
    mfaEnabled?: boolean;
  }
) {
  return adminCreateUser(adminIdentifier, userData);
}

export function validateAndDeleteUserServer(
  adminIdentifier: string,
  targetUserId: string
) {
  return adminDeleteUser(adminIdentifier, targetUserId);
}

export function validateAndUpdatePermissionsServer(
  adminIdentifier: string,
  targetUserId: string,
  permissions: string[]
) {
  return adminUpdateUserPermissions(adminIdentifier, targetUserId, permissions);
}

export function validateAndUpdateDurationServer(
  adminIdentifier: string,
  targetUserId: string,
  newDuration: string,
  resetTimerNow = false
) {
  return adminUpdateLoginDuration(targetUserId, newDuration, adminIdentifier, resetTimerNow);
}

export function validateAndEnableUserServer(
  adminIdentifier: string,
  targetUserId: string
) {
  const success = adminEnableUser(targetUserId, adminIdentifier);
  return { success, error: success ? undefined : 'Failed to enable user or unauthorized.' };
}

export function validateAndDisableUserServer(
  adminIdentifier: string,
  targetUserId: string
) {
  const success = adminDisableUser(targetUserId, adminIdentifier);
  return { success, error: success ? undefined : 'Failed to disable user or unauthorized.' };
}

export const adminCreateUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; userData: any }) => data)
  .handler(async ({ data }) => {
    return validateAndCreateUserServer(data.adminIdentifier, data.userData);
  });

export const adminDeleteUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string }) => data)
  .handler(async ({ data }) => {
    return validateAndDeleteUserServer(data.adminIdentifier, data.targetUserId);
  });

export const adminUpdatePermissionsServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string; permissions: string[] }) => data)
  .handler(async ({ data }) => {
    return validateAndUpdatePermissionsServer(data.adminIdentifier, data.targetUserId, data.permissions);
  });

export const adminUpdateDurationServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string; newDuration: string; resetTimerNow?: boolean }) => data)
  .handler(async ({ data }) => {
    return validateAndUpdateDurationServer(data.adminIdentifier, data.targetUserId, data.newDuration, data.resetTimerNow);
  });

export const adminEnableUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string }) => data)
  .handler(async ({ data }) => {
    return validateAndEnableUserServer(data.adminIdentifier, data.targetUserId);
  });

export const adminDisableUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string }) => data)
  .handler(async ({ data }) => {
    return validateAndDisableUserServer(data.adminIdentifier, data.targetUserId);
  });
