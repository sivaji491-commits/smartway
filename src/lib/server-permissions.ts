import { isUserAdminOrOwner, getAllNavigationFieldIds, DEFAULT_NAVIGATION_FIELDS } from './permissions';

export interface PermissionCheckResult {
  authorized: boolean;
  statusCode: number;
  userId?: string;
  error?: string;
  permissions?: string[];
}

export class PermissionDeniedError extends Error {
  statusCode: number;
  constructor(message = 'Forbidden: Access to this page or resource is not authorized.', statusCode = 403) {
    super(message);
    this.name = 'PermissionDeniedError';
    this.statusCode = statusCode;
  }
}

export class AuthenticationRequiredError extends Error {
  statusCode: number;
  constructor(message = 'Unauthorized: Authentication is required to access this resource.', statusCode = 401) {
    super(message);
    this.name = 'AuthenticationRequiredError';
    this.statusCode = statusCode;
  }
}

const STORAGE_USERS_KEY = 'nexora_workspace_users';

/**
 * Backend-grade permission resolver.
 * Reads the authoritative user record and calculates effective granted permissions.
 */
export function resolveUserPermissionsFromStore(identifier?: string | null): string[] {
  if (!identifier) return [];
  const lower = identifier.toLowerCase().trim();

  // Admin and owner retain all permissions per policy
  if (isUserAdminOrOwner(lower, 'sivaji491@gmail.com')) {
    return getAllNavigationFieldIds();
  }

  // Load from persistent workspace user store
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_USERS_KEY);
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const matched = users.find((u: any) => {
            if (!u) return false;
            const uId = (u.id || '').toLowerCase().trim();
            const uName = (u.username || '').toLowerCase().trim();
            const uEmail = (u.email || '').toLowerCase().trim();
            const uDisplay = (u.name || '').toLowerCase().trim();
            return uId === lower || uName === lower || uEmail === lower || uDisplay === lower;
          });

          if (matched) {
            if (isUserAdminOrOwner(matched, 'sivaji491@gmail.com')) {
              return getAllNavigationFieldIds();
            }
            if (matched.status === 'DISABLED' || matched.timerStatus === 'expired') {
              return [];
            }
            if (Array.isArray(matched.permissions)) {
              return matched.permissions;
            }
            return [];
          }
        }
      }
    } catch {}
  }

  // Principle of least privilege: default is deny (no permissions)
  return [];
}

/**
 * Verifies if the requestor has permission to access a specific page or action.
 * Returns a structured result with exact HTTP status codes (200, 401, 403).
 */
export function verifyUserPermission(
  identifier: string | null | undefined, 
  requiredPermission: string
): PermissionCheckResult {
  if (!identifier) {
    return {
      authorized: false,
      statusCode: 401,
      error: 'Unauthorized: Authentication required to access workspace modules.',
      permissions: [],
    };
  }

  const effectivePermissions = resolveUserPermissionsFromStore(identifier);

  if (isUserAdminOrOwner(identifier, 'sivaji491@gmail.com')) {
    return {
      authorized: true,
      statusCode: 200,
      permissions: effectivePermissions,
    };
  }

  if (effectivePermissions.includes(requiredPermission)) {
    return {
      authorized: true,
      statusCode: 200,
      permissions: effectivePermissions,
    };
  }

  return {
    authorized: false,
    statusCode: 403,
    error: `Forbidden: You do not have permission to access '${requiredPermission}'.`,
    permissions: effectivePermissions,
  };
}

/**
 * Asserts that the requestor has the specified permission.
 * Throws an HTTP-compatible Error (401 or 403) if unauthorized.
 */
export function assertPermission(
  identifier: string | null | undefined, 
  requiredPermission: string
): void {
  const result = verifyUserPermission(identifier, requiredPermission);
  if (!result.authorized) {
    if (result.statusCode === 401) {
      throw new AuthenticationRequiredError(result.error);
    }
    throw new PermissionDeniedError(result.error, 403);
  }
}

/**
 * Asserts that the requestor has Administrator privileges.
 * Used to protect user creation, permission modification, and user deletion.
 */
export function assertAdminAccess(identifier: string | null | undefined): void {
  if (!identifier) {
    throw new AuthenticationRequiredError();
  }
  if (!isUserAdminOrOwner(identifier, 'sivaji491@gmail.com')) {
    throw new PermissionDeniedError('Forbidden: Administrator privileges are required to perform this action.', 403);
  }
}
