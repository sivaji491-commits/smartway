import { 
  verifyUserPermission, 
  assertPermission, 
  assertAdminAccess, 
  PermissionDeniedError, 
  AuthenticationRequiredError 
} from './server-permissions';
import { STORAGE_KEY, getAllNavigationFieldIds } from './permissions';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * Backend API handler to fetch workspace directory.
 * Requires administrator privileges ('users' permission & admin role).
 * Returns HTTP 403 Forbidden if called by an unauthorized user.
 */
export async function apiGetWorkspaceUsers(requestorId?: string | null): Promise<ApiResponse> {
  try {
    assertAdminAccess(requestorId);
    
    // Read authorized directory data
    let users: any[] = [];
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        users = JSON.parse(raw);
      }
    }

    return {
      success: true,
      data: users,
      statusCode: 200,
    };
  } catch (err: any) {
    const statusCode = err.statusCode || (err instanceof PermissionDeniedError ? 403 : 401);
    return {
      success: false,
      error: err.message || 'Unauthorized',
      statusCode,
    };
  }
}

/**
 * Backend API handler to update a user's page permissions.
 * Strictly restricted to administrators.
 * Returns HTTP 403 Forbidden if called by a non-administrator.
 */
export async function apiUpdateUserPermissions(
  requestorId: string | null | undefined,
  targetUserId: string,
  newPermissions: string[]
): Promise<ApiResponse> {
  try {
    assertAdminAccess(requestorId);

    if (!targetUserId) {
      return { success: false, error: 'Target user ID is required', statusCode: 400 };
    }

    if (!Array.isArray(newPermissions)) {
      return { success: false, error: 'Permissions must be an array of page IDs', statusCode: 400 };
    }

    // Persist to storage
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const updated = users.map((u: any) => {
            if (u.id === targetUserId) {
              return { ...u, permissions: newPermissions };
            }
            return u;
          });
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
        }
      }
    }

    return {
      success: true,
      data: { userId: targetUserId, permissions: newPermissions },
      statusCode: 200,
    };
  } catch (err: any) {
    const statusCode = err.statusCode || 403;
    return {
      success: false,
      error: err.message || 'Forbidden',
      statusCode,
    };
  }
}

/**
 * Backend API handler to fetch protected module data (e.g. ranks, currency, configuration).
 * Verifies that the authenticated requestor has the specific required permission.
 * Returns HTTP 403 Forbidden if the requestor lacks the required permission.
 */
export async function apiGetProtectedModuleData(
  requestorId: string | null | undefined,
  moduleName: string
): Promise<ApiResponse> {
  try {
    assertPermission(requestorId, moduleName);

    return {
      success: true,
      data: { module: moduleName, timestamp: Date.now(), accessGranted: true },
      statusCode: 200,
    };
  } catch (err: any) {
    const statusCode = err.statusCode || (err instanceof PermissionDeniedError ? 403 : 401);
    return {
      success: false,
      error: err.message || 'Forbidden',
      statusCode,
    };
  }
}

/**
 * Backend API handler to perform sensitive module operations.
 * Enforces permission check on every request.
 */
export async function apiExecuteProtectedAction(
  requestorId: string | null | undefined,
  moduleName: string,
  actionName: string,
  payload?: any
): Promise<ApiResponse> {
  try {
    assertPermission(requestorId, moduleName);

    return {
      success: true,
      data: { executed: actionName, module: moduleName, result: 'OK' },
      statusCode: 200,
    };
  } catch (err: any) {
    const statusCode = err.statusCode || (err instanceof PermissionDeniedError ? 403 : 401);
    return {
      success: false,
      error: err.message || 'Forbidden',
      statusCode,
    };
  }
}
