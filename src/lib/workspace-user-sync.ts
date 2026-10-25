import { supabase } from '@/integrations/supabase/client';
import { isUserAdminOrOwner, getAllNavigationFieldIds, type NavigationField } from './permissions';
import { 
  DEFAULT_LOGIN_DURATION, 
  parseDurationToSeconds, 
  type AccountStatus, 
  type DisableReason,
  type TimerStatus,
  EXPIRED_ACCOUNT_MESSAGE
} from './session-manager';

export const WORKSPACE_STORAGE_KEY = 'nexora_workspace_users';
export const PROFILES_RECORD_ID = '44999808-964c-4c87-99a5-727ab289026c';
export const PREVIEW_AUTH_EMAIL = 'preview@nexora.example';
export const PREVIEW_AUTH_PASSWORD = 'Nexora!Work2026#48';

export interface CloudWorkspaceUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  password?: string;
  permissions: NavigationField[];
  status: AccountStatus | 'Active' | 'Suspended';
  timerStatus?: TimerStatus;
  guardianProtected: boolean;
  mfaEnabled: boolean;
  lastActive: string;
  joinedDate: string;
  loginDuration: string;
  assignedDuration?: string;
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
  role?: string;
}

export function getDefaultOwnerUser(): CloudWorkspaceUser {
  return {
    id: 'usr-owner',
    username: 'sivaji',
    name: 'Sivaji (Owner)',
    email: 'sivaji491@gmail.com',
    role: 'owner',
    password: 'Vijashya@2828',
    permissions: getAllNavigationFieldIds(),
    status: 'ACTIVE',
    timerStatus: 'active',
    guardianProtected: true,
    mfaEnabled: true,
    lastActive: 'Active now',
    joinedDate: 'Current session',
    loginDuration: 'Unlimited',
    assignedDuration: 'Unlimited',
    durationSeconds: Infinity,
    sessionStartTime: Date.now(),
    sessionExpireTime: 0,
    startedAt: Date.now(),
    expiresAt: null,
    remainingTimeSeconds: Infinity,
    lastLoginTime: Date.now(),
    disableReason: null,
    disabledAt: null,
  };
}

/**
 * Ensures an authenticated Supabase session exists so PostgREST can read/update `public.profiles`.
 */
export async function ensureCloudAuth(): Promise<boolean> {
  try {
    if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== 'function') {
      return false;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session && sessionData.session.user?.id === PROFILES_RECORD_ID) {
      return true;
    }

    if (typeof supabase.auth.signInWithPassword !== 'function') {
      return false;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: PREVIEW_AUTH_EMAIL,
      password: PREVIEW_AUTH_PASSWORD,
    });

    if (error) {
      console.warn('[WorkspaceSync] Cloud auth sign-in warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[WorkspaceSync] Cloud auth exception:', err);
    return false;
  }
}

/**
 * Fetches the authoritative list of workspace users from the Supabase database.
 */
export async function fetchCloudWorkspaceUsers(): Promise<CloudWorkspaceUser[] | null> {
  try {
    if (!supabase || typeof supabase.from !== 'function') {
      return null;
    }

    const hasAuth = await ensureCloudAuth();
    if (!hasAuth) return null;

    let { data, error } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .eq('id', PROFILES_RECORD_ID)
      .maybeSingle();

    // In case single row query returned null/error, attempt fallback to profiles record with avatar_url
    if ((error || !data || !data.avatar_url) && typeof supabase.from === 'function') {
      try {
        const fallback = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .not('avatar_url', 'is', null)
          .limit(1)
          .maybeSingle();
        if (fallback.data && fallback.data.avatar_url) {
          data = fallback.data;
        }
      } catch {}
    }

    if (!data || !data.avatar_url) {
      return null;
    }

    const raw = data.avatar_url;
    if (typeof raw !== 'string' || !raw.trim().startsWith('[')) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('[WorkspaceSync] Failed to fetch cloud workspace users:', err);
    return null;
  }
}

/**
 * Saves the authoritative list of workspace users to the Supabase database.
 */
export async function saveCloudWorkspaceUsers(users: CloudWorkspaceUser[]): Promise<boolean> {
  try {
    if (!supabase || typeof supabase.from !== 'function') {
      return false;
    }

    const hasAuth = await ensureCloudAuth();
    if (!hasAuth) return false;

    // Filter out invalid items and normalize owner
    const cleaned = users.filter((u) => u && (u.username || u.email));
    const hasOwner = cleaned.some((u) => isUserAdminOrOwner(u, 'sivaji491@gmail.com'));
    const finalUsers = hasOwner ? cleaned : [getDefaultOwnerUser(), ...cleaned];

    const json = JSON.stringify(finalUsers);

    // Try upsert first to support both insert and update gracefully
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: PROFILES_RECORD_ID,
        avatar_url: json,
        display_name: 'Workspace Dynamic Profiles',
      });

    if (upsertError) {
      // Fallback to update in case upsert is restricted by table constraints
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: json })
        .eq('id', PROFILES_RECORD_ID);

      if (updateError) {
        console.error('[WorkspaceSync] Failed to save cloud workspace users:', updateError.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('[WorkspaceSync] Save cloud users exception:', err);
    return false;
  }
}

/**
 * Synchronizes local browser storage with the central cloud database.
 * The central database is the single source of truth across all devices.
 * If cloud has records, cloud records are authoritative and update local storage.
 * If cloud database is empty, local records are migrated to cloud.
 */
export async function syncWorkspaceUsers(localUsers?: CloudWorkspaceUser[]): Promise<CloudWorkspaceUser[]> {
  const currentLocal: CloudWorkspaceUser[] = localUsers || (() => {
    if (typeof window === 'undefined') return [getDefaultOwnerUser()];
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [getDefaultOwnerUser()];
  })();

  try {
    const cloudUsers = await fetchCloudWorkspaceUsers();

    if (!cloudUsers || cloudUsers.length === 0) {
      // Cloud is completely empty or uninitialized. Seed local users to cloud so all devices see them.
      if (currentLocal.length > 0) {
        await saveCloudWorkspaceUsers(currentLocal);
      }
      return currentLocal;
    }

    const hasOnlyAdminInCloud = cloudUsers.every((u) => isUserAdminOrOwner(u, 'sivaji491@gmail.com'));
    const hasNonOwnerLocal = currentLocal.some((u) => !isUserAdminOrOwner(u, 'sivaji491@gmail.com'));

    // One-time legacy migration: If cloud only has the default admin, but this device already has
    // created users locally, merge them into cloud so all other devices can access them.
    if (hasOnlyAdminInCloud && hasNonOwnerLocal) {
      const userMap = new Map<string, CloudWorkspaceUser>();
      cloudUsers.forEach((u) => {
        const key = (u.username || u.email || u.id || '').toLowerCase().trim();
        if (key) userMap.set(key, u);
      });
      currentLocal.forEach((u) => {
        const key = (u.username || u.email || u.id || '').toLowerCase().trim();
        if (key && !userMap.has(key)) {
          userMap.set(key, u);
        }
      });
      const merged = Array.from(userMap.values());
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
        window.dispatchEvent(new CustomEvent('nexora_session_updated'));
      }
      await saveCloudWorkspaceUsers(merged);
      return merged;
    }

    // Cloud database is the authoritative single source of truth!
    // Update local storage to match cloud database
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(cloudUsers));
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
      window.dispatchEvent(new CustomEvent('nexora_session_updated'));
    }

    return cloudUsers;
  } catch (err) {
    console.warn('[WorkspaceSync] Sync failed, using local users fallback:', err);
    return currentLocal;
  }
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: CloudWorkspaceUser;
  isAdmin?: boolean;
}

/**
 * Validates login credentials against the authoritative cloud database.
 * Supports usernames, emails, and device independence.
 */
export async function authenticateWorkspaceUser(
  identifier: string,
  plainPassword?: string
): Promise<AuthResult> {
  const trimmedId = (identifier || '').trim();
  const lowerId = trimmedId.toLowerCase();
  const password = (plainPassword || '').trim();

  if (!trimmedId) {
    return { success: false, error: 'Enter your username or email address.' };
  }
  if (!password) {
    return { success: false, error: 'Enter your password.' };
  }

  // 1. Check Admin master credentials first
  const isAdminCredentials = 
    (lowerId === 'sivaji491@gmail.com' || lowerId === 'sivaji') && password === 'Vijashya@2828';

  if (isAdminCredentials) {
    // Ensure cloud session is active
    await ensureCloudAuth();
    return {
      success: true,
      isAdmin: true,
      user: getDefaultOwnerUser(),
    };
  }

  // 2. Fetch latest workspace users directly from cloud database
  let users: CloudWorkspaceUser[] = [];
  try {
    const cloudUsers = await fetchCloudWorkspaceUsers();
    if (cloudUsers && cloudUsers.length > 0) {
      users = cloudUsers;
      // Cache to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(cloudUsers));
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSync] Error loading cloud users during auth:', err);
  }

  // Fallback to local storage if network was unreachable
  if (users.length === 0 && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) users = parsed;
      }
    } catch {}
  }

  // 3. Search for matching user
  const matched = users.find((u) => {
    if (!u) return false;
    const matchUser = (u.username && u.username.toLowerCase().trim() === lowerId) ||
                      (u.name && u.name.toLowerCase().trim() === lowerId);
    const matchEmail = u.email && u.email.toLowerCase().trim() === lowerId;
    return matchUser || matchEmail;
  });

  if (!matched) {
    return {
      success: false,
      error: 'Your username/email or password is incorrect. Please try again.',
    };
  }

  // 4. Verify Password
  if (!matched.password || matched.password !== password) {
    return {
      success: false,
      error: 'Your username/email or password is incorrect. Please try again.',
    };
  }

  const isAdmin = isUserAdminOrOwner(matched, 'sivaji491@gmail.com');

  // 5. Check if user is Disabled or Expired
  if (!isAdmin) {
    if (matched.status === 'DISABLED' || matched.timerStatus === 'expired') {
      if (matched.disableReason === 'ADMIN_DISABLED') {
        return {
          success: false,
          error: 'Your account has been disabled. Please contact your administrator to restore access.',
        };
      }
      return {
        success: false,
        error: matched.disableReason === 'SESSIONTIMEEXPIRED' || matched.timerStatus === 'expired'
          ? EXPIRED_ACCOUNT_MESSAGE
          : 'Your account has been disabled. Please contact your administrator to restore access.',
      };
    }

    if (matched.status === 'Suspended') {
      return {
        success: false,
        error: 'This account has been suspended. Please contact your workspace administrator.',
      };
    }

    // Check if session expire time has already passed
    const expireTime = matched.sessionExpireTime || matched.expiresAt;
    if (expireTime && expireTime > 0 && Date.now() >= expireTime) {
      return {
        success: false,
        error: EXPIRED_ACCOUNT_MESSAGE,
      };
    }
  }

  // Ensure cloud auth session is established for the platform
  await ensureCloudAuth();

  return {
    success: true,
    isAdmin,
    user: matched,
  };
}
