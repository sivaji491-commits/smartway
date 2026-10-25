import { createServerFn } from '@tanstack/react-start';
import { 
  fetchCloudWorkspaceUsers, 
  saveCloudWorkspaceUsers, 
  type CloudWorkspaceUser,
  getDefaultOwnerUser 
} from '../lib/workspace-user-sync';
import { isUserAdminOrOwner } from '../lib/permissions';

export interface ServerUserManagementResult {
  success: boolean;
  error?: string;
  users?: CloudWorkspaceUser[];
  user?: CloudWorkspaceUser;
}

/**
 * Server function to fetch authoritative workspace users from the central database.
 */
export const getWorkspaceUsersServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<CloudWorkspaceUser[]> => {
    const cloudUsers = await fetchCloudWorkspaceUsers();
    return cloudUsers && cloudUsers.length > 0 ? cloudUsers : [getDefaultOwnerUser()];
  });

/**
 * Server function to save a new workspace user to the central database.
 */
export const createWorkspaceUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; userData: any }) => data)
  .handler(async ({ data }): Promise<ServerUserManagementResult> => {
    if (!isUserAdminOrOwner(data.adminIdentifier, 'sivaji491@gmail.com')) {
      return { success: false, error: 'Unauthorized: Only administrators can create users.' };
    }
    const currentUsers = (await fetchCloudWorkspaceUsers()) || [getDefaultOwnerUser()];
    const username = (data.userData.username || '').trim();
    if (!username) return { success: false, error: 'Username is required.' };
    if (currentUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'A user with this username already exists.' };
    }
    const newUser: CloudWorkspaceUser = {
      id: `usr-${Date.now()}`,
      username,
      name: username,
      email: data.userData.email ? data.userData.email.trim().toLowerCase() : undefined,
      password: data.userData.password || 'Nexora!2026',
      permissions: data.userData.permissions || ['home', 'ranks', 'currency', 'configuration'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: data.userData.mfaEnabled ?? true,
      lastActive: 'Never logged in',
      joinedDate: 'Just now',
      loginDuration: data.userData.loginDuration || '01:00:00',
      assignedDuration: data.userData.loginDuration || '01:00:00',
      durationSeconds: 3600,
      sessionStartTime: null,
      sessionExpireTime: null,
    };
    const nextUsers = [newUser, ...currentUsers];
    const saved = await saveCloudWorkspaceUsers(nextUsers);
    if (!saved) return { success: false, error: 'Failed to persist user to central database.' };
    return { success: true, user: newUser, users: nextUsers };
  });

/**
 * Server function to delete a workspace user from the central database.
 */
export const deleteWorkspaceUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string }) => data)
  .handler(async ({ data }): Promise<ServerUserManagementResult> => {
    if (!isUserAdminOrOwner(data.adminIdentifier, 'sivaji491@gmail.com')) {
      return { success: false, error: 'Unauthorized: Only administrators can delete users.' };
    }
    const currentUsers = (await fetchCloudWorkspaceUsers()) || [getDefaultOwnerUser()];
    const lower = data.targetUserId.toLowerCase().trim();
    const target = currentUsers.find(
      (u) => u.id === data.targetUserId || u.username.toLowerCase() === lower
    );
    if (!target) return { success: false, error: 'User not found.' };
    if (target.id === 'usr-owner' || isUserAdminOrOwner(target, 'sivaji491@gmail.com')) {
      return { success: false, error: 'Cannot remove workspace owner.' };
    }
    const nextUsers = currentUsers.filter((u) => u.id !== target.id);
    const saved = await saveCloudWorkspaceUsers(nextUsers);
    if (!saved) return { success: false, error: 'Failed to delete user in central database.' };
    return { success: true, users: nextUsers };
  });

/**
 * Server function to update a workspace user's permissions, duration, or status in the central database.
 */
export const updateWorkspaceUserServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; targetUserId: string; updates: Partial<CloudWorkspaceUser> }) => data)
  .handler(async ({ data }): Promise<ServerUserManagementResult> => {
    if (!isUserAdminOrOwner(data.adminIdentifier, 'sivaji491@gmail.com')) {
      return { success: false, error: 'Unauthorized: Only administrators can update users.' };
    }
    const currentUsers = (await fetchCloudWorkspaceUsers()) || [getDefaultOwnerUser()];
    const lower = data.targetUserId.toLowerCase().trim();
    const index = currentUsers.findIndex(
      (u) => u.id === data.targetUserId || u.username.toLowerCase() === lower
    );
    if (index < 0) return { success: false, error: 'User not found.' };
    currentUsers[index] = { ...currentUsers[index], ...data.updates };
    const saved = await saveCloudWorkspaceUsers(currentUsers);
    if (!saved) return { success: false, error: 'Failed to update user in central database.' };
    return { success: true, users: currentUsers, user: currentUsers[index] };
  });
