import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  authenticateWorkspaceUser,
  fetchCloudWorkspaceUsers,
  saveCloudWorkspaceUsers,
  syncWorkspaceUsers,
  type CloudWorkspaceUser,
  getDefaultOwnerUser,
  WORKSPACE_STORAGE_KEY,
} from '@/lib/workspace-user-sync';
import { getUserAllowedTabs } from '@/lib/permissions';
import { 
  startUserLoginSession, 
  checkCurrentSessionValidity, 
  adminCreateUser,
  EXPIRED_ACCOUNT_MESSAGE 
} from '@/lib/session-manager';

// In-memory mock cloud database for Supabase profiles table
let mockCloudStore: Record<string, any> = {};

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { access_token: 'mock-jwt-token', user: { id: '44999808-964c-4c87-99a5-727ab289026c' } } },
          error: null,
        })),
        signInWithPassword: vi.fn(async () => ({
          data: { session: { access_token: 'mock-jwt-token' }, user: { id: '44999808-964c-4c87-99a5-727ab289026c' } },
          error: null,
        })),
        signOut: vi.fn(async () => ({ error: null })),
        getUser: vi.fn(async () => ({
          data: { user: { id: '44999808-964c-4c87-99a5-727ab289026c', email: 'preview@nexora.example' } },
          error: null,
        })),
      },
      from: vi.fn((table: string) => ({
        select: vi.fn((cols: string) => ({
          eq: vi.fn((col: string, val: string) => ({
            single: vi.fn(async () => ({
              data: mockCloudStore[val] ? { id: val, avatar_url: mockCloudStore[val] } : null,
              error: null,
            })),
            maybeSingle: vi.fn(async () => ({
              data: mockCloudStore[val] ? { id: val, avatar_url: mockCloudStore[val] } : null,
              error: null,
            })),
          })),
          not: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: mockCloudStore['44999808-964c-4c87-99a5-727ab289026c']
                  ? { id: '44999808-964c-4c87-99a5-727ab289026c', avatar_url: mockCloudStore['44999808-964c-4c87-99a5-727ab289026c'] }
                  : null,
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn((payload: any) => ({
          eq: vi.fn((col: string, val: string) => {
            if (payload.avatar_url !== undefined) {
              mockCloudStore[val] = payload.avatar_url;
            }
            return Promise.resolve({ data: null, error: null, status: 204 });
          }),
        })),
        upsert: vi.fn(async (payload: any) => {
          const id = payload.id || '44999808-964c-4c87-99a5-727ab289026c';
          if (payload.avatar_url !== undefined) {
            mockCloudStore[id] = payload.avatar_url;
          }
          return { data: null, error: null, status: 201 };
        }),
      })),
    },
  };
});

describe('Mobile Multi-Device Authentication & User Management Cloud Persistence', () => {
  const adminEmail = 'sivaji491@gmail.com';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockCloudStore = {};

    // Prime the cloud database with default owner
    const defaultOwner = getDefaultOwnerUser();
    mockCloudStore['44999808-964c-4c87-99a5-727ab289026c'] = JSON.stringify([defaultOwner]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Administrator creates a user on Admin device; user is saved to the central database', async () => {
    const adminUser = getDefaultOwnerUser();
    const newUser: CloudWorkspaceUser = {
      id: 'usr-mobile-1',
      username: 'suresh_mobile',
      name: 'suresh_mobile',
      email: 'suresh@smartway.example',
      password: 'MobilePass@2026',
      permissions: ['home', 'ranks', 'currency'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: true,
      lastActive: 'Never logged in',
      joinedDate: 'Just now',
      loginDuration: '02:00:00',
      durationSeconds: 7200,
      sessionStartTime: null,
      sessionExpireTime: null,
    };

    const usersToSave = [adminUser, newUser];
    const saved = await saveCloudWorkspaceUsers(usersToSave);
    expect(saved).toBe(true);

    // Verify it exists in cloud database
    const cloudUsers = await fetchCloudWorkspaceUsers();
    expect(cloudUsers).not.toBeNull();
    expect(cloudUsers?.length).toBe(2);
    expect(cloudUsers?.some((u) => u.username === 'suresh_mobile')).toBe(true);
  });

  it('2. A user opens website on a brand-new mobile phone with empty localStorage and logs in successfully', async () => {
    // 1. Setup cloud state: Admin has already created "priya_phone"
    const adminUser = getDefaultOwnerUser();
    const priyaUser: CloudWorkspaceUser = {
      id: 'usr-priya',
      username: 'priya_phone',
      name: 'priya_phone',
      password: 'PriyaPassword#99',
      permissions: ['home', 'ranks', 'time-in-hand'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Never logged in',
      joinedDate: 'Just now',
      loginDuration: '01:30:00',
      durationSeconds: 5400,
      sessionStartTime: null,
      sessionExpireTime: null,
    };
    await saveCloudWorkspaceUsers([adminUser, priyaUser]);

    // 2. Simulate fresh mobile phone: localStorage has NO users
    localStorage.clear();
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();

    // 3. User enters credentials on their mobile phone
    const authResult = await authenticateWorkspaceUser('priya_phone', 'PriyaPassword#99');

    expect(authResult.success).toBe(true);
    expect(authResult.user?.username).toBe('priya_phone');
    expect(authResult.isAdmin).toBe(false);

    // 4. Start login session on this mobile device
    const sessionRes = startUserLoginSession('priya_phone');
    expect(sessionRes.success).toBe(true);
    expect(sessionRes.loginDuration).toBe('01:30:00');

    // 5. Verify user only sees permitted tabs
    localStorage.setItem('nexora-user-email', 'priya_phone');
    const allowedTabs = getUserAllowedTabs('priya_phone');
    expect(allowedTabs).toEqual(['home', 'ranks', 'time-in-hand']);
    expect(allowedTabs).not.toContain('users');
    expect(allowedTabs).not.toContain('settings');
  });

  it('3. Rejects incorrect password on mobile device with safe error message', async () => {
    const adminUser = getDefaultOwnerUser();
    const testUser: CloudWorkspaceUser = {
      id: 'usr-kiran',
      username: 'kiran_user',
      password: 'CorrectPass123',
      permissions: ['home'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Never',
      joinedDate: 'Now',
      loginDuration: '01:00:00',
      durationSeconds: 3600,
    };
    await saveCloudWorkspaceUsers([adminUser, testUser]);

    // Attempt login with wrong password
    const result = await authenticateWorkspaceUser('kiran_user', 'WrongPasswordXYZ');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Your username/email or password is incorrect. Please try again.');
  });

  it('4. Rejects non-existent username with safe error message', async () => {
    const result = await authenticateWorkspaceUser('totally_unknown_user', 'AnyPassword');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Your username/email or password is incorrect. Please try again.');
  });

  it('5. Existing administrator account continues to log in with full privileges', async () => {
    // Admin login via username
    const resultUser = await authenticateWorkspaceUser('sivaji', 'Vijashya@2828');
    expect(resultUser.success).toBe(true);
    expect(resultUser.isAdmin).toBe(true);

    // Admin login via email
    const resultEmail = await authenticateWorkspaceUser('sivaji491@gmail.com', 'Vijashya@2828');
    expect(resultEmail.success).toBe(true);
    expect(resultEmail.isAdmin).toBe(true);

    // Admin has access to all navigation tabs
    const adminTabs = getUserAllowedTabs('sivaji491@gmail.com');
    expect(adminTabs).toContain('users');
    expect(adminTabs).toContain('settings');
    expect(adminTabs).toContain('home');
    expect(adminTabs).toContain('ranks');
  });

  it('6. Multiple devices operate independently without invalidating other sessions', async () => {
    const userA: CloudWorkspaceUser = {
      id: 'usr-a',
      username: 'phone_a_user',
      password: 'SecretA@123',
      permissions: ['home', 'ranks'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Never',
      joinedDate: 'Now',
      loginDuration: '01:00:00',
      durationSeconds: 3600,
    };

    const userB: CloudWorkspaceUser = {
      id: 'usr-b',
      username: 'phone_b_user',
      password: 'SecretB@456',
      permissions: ['home', 'customer-view'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Now',
      joinedDate: 'Now',
      loginDuration: '02:00:00',
      durationSeconds: 7200,
    };

    await saveCloudWorkspaceUsers([getDefaultOwnerUser(), userA, userB]);

    // Device A authenticates
    const authA = await authenticateWorkspaceUser('phone_a_user', 'SecretA@123');
    expect(authA.success).toBe(true);

    // Device B authenticates
    const authB = await authenticateWorkspaceUser('phone_b_user', 'SecretB@456');
    expect(authB.success).toBe(true);

    // Both user records remain intact in cloud
    const cloudUsers = await fetchCloudWorkspaceUsers();
    expect(cloudUsers?.some((u) => u.username === 'phone_a_user')).toBe(true);
    expect(cloudUsers?.some((u) => u.username === 'phone_b_user')).toBe(true);
  });

  it('7. Disallowed or expired users on mobile cannot log in and see clear error', async () => {
    const expiredUser: CloudWorkspaceUser = {
      id: 'usr-exp',
      username: 'expired_mobile_user',
      password: 'ExpPassword123',
      permissions: ['home'],
      status: 'DISABLED',
      disableReason: 'SESSIONTIMEEXPIRED',
      timerStatus: 'expired',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Yesterday',
      joinedDate: 'Old',
      loginDuration: '01:00:00',
      durationSeconds: 3600,
    };

    const disabledUser: CloudWorkspaceUser = {
      id: 'usr-dis',
      username: 'disabled_mobile_user',
      password: 'DisPassword123',
      permissions: ['home'],
      status: 'DISABLED',
      disableReason: 'ADMIN_DISABLED',
      timerStatus: 'expired',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Yesterday',
      joinedDate: 'Old',
      loginDuration: '01:00:00',
      durationSeconds: 3600,
    };

    await saveCloudWorkspaceUsers([getDefaultOwnerUser(), expiredUser, disabledUser]);

    // Expired user attempt
    const resExp = await authenticateWorkspaceUser('expired_mobile_user', 'ExpPassword123');
    expect(resExp.success).toBe(false);
    expect(resExp.error).toBe(EXPIRED_ACCOUNT_MESSAGE);

    // Admin-disabled user attempt
    const resDis = await authenticateWorkspaceUser('disabled_mobile_user', 'DisPassword123');
    expect(resDis.success).toBe(false);
    expect(resDis.error).toContain('account has been disabled');
  });

  it('8. Sync merges existing users on admin device into cloud so they become accessible to all devices', async () => {
    // Admin has created user "legacy_user" locally on their phone before this fix
    const legacyUser: CloudWorkspaceUser = {
      id: 'usr-legacy',
      username: 'legacy_device_user',
      password: 'LegacySecret123',
      permissions: ['home', 'ranks'],
      status: 'ACTIVE',
      guardianProtected: true,
      mfaEnabled: false,
      lastActive: 'Never',
      joinedDate: 'Past',
      loginDuration: '01:00:00',
      durationSeconds: 3600,
    };

    // Run sync with legacy user
    const synced = await syncWorkspaceUsers([getDefaultOwnerUser(), legacyUser]);
    expect(synced.some((u) => u.username === 'legacy_device_user')).toBe(true);

    // Verify it is now in the cloud database
    const cloud = await fetchCloudWorkspaceUsers();
    expect(cloud?.some((u) => u.username === 'legacy_device_user')).toBe(true);

    // Now a mobile phone with empty storage can authenticate as this legacy user
    localStorage.clear();
    const mobileAuth = await authenticateWorkspaceUser('legacy_device_user', 'LegacySecret123');
    expect(mobileAuth.success).toBe(true);
  });

  describe('Mandatory Cross-Device Sync & Login Verification (Tests A - D)', () => {
    it('Test A: Mobile to Desktop — User created on mobile persists to central DB and appears on desktop', async () => {
      // 1. Mobile Phone creates test user A
      const mobileTestUser: CloudWorkspaceUser = {
        id: 'usr-test-a',
        username: 'test_user_a',
        name: 'test_user_a',
        email: 'test_a@smartway.example',
        password: 'PasswordA@2026',
        permissions: ['home', 'ranks', 'customer-view'],
        status: 'ACTIVE',
        guardianProtected: true,
        mfaEnabled: true,
        lastActive: 'Never logged in',
        joinedDate: 'Just now',
        loginDuration: '02:00:00',
        durationSeconds: 7200,
      };

      const owner = getDefaultOwnerUser();
      const mobileUsers = [mobileTestUser, owner];
      const saved = await saveCloudWorkspaceUsers(mobileUsers);
      expect(saved).toBe(true);

      // 2. Desktop opens User Management with empty or older local cache
      localStorage.clear();
      expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();

      // Desktop fetches freshest user list from central database
      const desktopSynced = await fetchCloudWorkspaceUsers();
      expect(desktopSynced).not.toBeNull();
      expect(desktopSynced?.some((u) => u.username === 'test_user_a')).toBe(true);

      // Desktop updates local storage from central database
      await syncWorkspaceUsers();
      const desktopLocal = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) || '[]');
      expect(desktopLocal.some((u: any) => u.username === 'test_user_a')).toBe(true);
    });

    it('Test B: Desktop to Mobile — User created on desktop persists to central DB and appears on mobile', async () => {
      // 1. Initial central DB has owner and test user A
      const currentCloud = (await fetchCloudWorkspaceUsers()) || [getDefaultOwnerUser()];

      // 2. Desktop creates test user B
      const desktopTestUser: CloudWorkspaceUser = {
        id: 'usr-test-b',
        username: 'test_user_b',
        name: 'test_user_b',
        email: 'test_b@smartway.example',
        password: 'PasswordB@2026',
        permissions: ['home', 'time-in-hand', 'dcb-90-days'],
        status: 'ACTIVE',
        guardianProtected: true,
        mfaEnabled: true,
        lastActive: 'Never logged in',
        joinedDate: 'Just now',
        loginDuration: '01:00:00',
        durationSeconds: 3600,
      };

      const nextUsers = [desktopTestUser, ...currentCloud];
      const saved = await saveCloudWorkspaceUsers(nextUsers);
      expect(saved).toBe(true);

      // 3. Mobile phone opens User Management and refreshes from central database
      localStorage.clear();
      const mobilePulled = await fetchCloudWorkspaceUsers();
      expect(mobilePulled).not.toBeNull();
      expect(mobilePulled?.some((u) => u.username === 'test_user_b')).toBe(true);

      // Mobile syncs local storage with central database
      await syncWorkspaceUsers();
      const mobileLocal = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) || '[]');
      expect(mobileLocal.some((u: any) => u.username === 'test_user_b')).toBe(true);
    });

    it('Test C: Persistence — Refresh and logout/login retains user records across devices', async () => {
      // 1. Prime central database with users created on both devices
      const userA: CloudWorkspaceUser = {
        id: 'usr-test-a',
        username: 'test_user_a',
        password: 'PasswordA@2026',
        permissions: ['home', 'ranks'],
        status: 'ACTIVE',
        guardianProtected: true,
        mfaEnabled: true,
        lastActive: 'Never',
        joinedDate: 'Now',
        loginDuration: '02:00:00',
        durationSeconds: 7200,
      };
      const userB: CloudWorkspaceUser = {
        id: 'usr-test-b',
        username: 'test_user_b',
        password: 'PasswordB@2026',
        permissions: ['home', 'customer-view'],
        status: 'ACTIVE',
        guardianProtected: true,
        mfaEnabled: false,
        lastActive: 'Now',
        joinedDate: 'Now',
        loginDuration: '01:00:00',
        durationSeconds: 3600,
      };
      await saveCloudWorkspaceUsers([userA, userB, getDefaultOwnerUser()]);

      // 2. Central database contains both created users
      const cloudBefore = await fetchCloudWorkspaceUsers();
      expect(cloudBefore?.some((u) => u.username === 'test_user_a')).toBe(true);
      expect(cloudBefore?.some((u) => u.username === 'test_user_b')).toBe(true);

      // 3. Simulate complete browser restart/refresh on Device A (Mobile)
      localStorage.clear();
      sessionStorage.clear();
      const mobileAfterRestart = await fetchCloudWorkspaceUsers();
      expect(mobileAfterRestart?.some((u) => u.username === 'test_user_a')).toBe(true);
      expect(mobileAfterRestart?.some((u) => u.username === 'test_user_b')).toBe(true);

      // 4. Simulate complete browser restart/refresh on Device B (Desktop)
      localStorage.clear();
      sessionStorage.clear();
      const desktopAfterRestart = await fetchCloudWorkspaceUsers();
      expect(desktopAfterRestart?.some((u) => u.username === 'test_user_a')).toBe(true);
      expect(desktopAfterRestart?.some((u) => u.username === 'test_user_b')).toBe(true);
    });

    it('Test D: Cross-Device Login — Account created through User Management logs in from clean mobile session', async () => {
      // 1. Setup user created through User Management in central database
      const mobileTestUser: CloudWorkspaceUser = {
        id: 'usr-test-a',
        username: 'test_user_a',
        name: 'test_user_a',
        email: 'test_a@smartway.example',
        password: 'PasswordA@2026',
        permissions: ['home', 'ranks', 'customer-view'],
        status: 'ACTIVE',
        guardianProtected: true,
        mfaEnabled: true,
        lastActive: 'Never logged in',
        joinedDate: 'Just now',
        loginDuration: '02:00:00',
        durationSeconds: 7200,
      };
      await saveCloudWorkspaceUsers([mobileTestUser, getDefaultOwnerUser()]);

      // 2. Simulate brand-new mobile phone or clean mobile private browser
      localStorage.clear();
      sessionStorage.clear();

      // 3. Attempt login using test_user_a credentials
      const authResult = await authenticateWorkspaceUser('test_user_a', 'PasswordA@2026');
      expect(authResult.success).toBe(true);
      expect(authResult.user?.username).toBe('test_user_a');
      expect(authResult.user?.permissions).toEqual(['home', 'ranks', 'customer-view']);

      // 4. Initialize mobile session timer
      const sessionResult = startUserLoginSession('test_user_a', authResult.user);
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.loginDuration).toBe('02:00:00');
      expect(sessionResult.remainingSeconds).toBeGreaterThan(0);

      // 5. Validate permitted views on mobile phone
      localStorage.setItem('nexora-user-email', 'test_user_a');
      const permittedTabs = getUserAllowedTabs('test_user_a');
      expect(permittedTabs).toEqual(['home', 'ranks', 'customer-view']);
      expect(permittedTabs).not.toContain('users');
      expect(permittedTabs).not.toContain('settings');

      // 6. Check session validity
      const validity = checkCurrentSessionValidity('test_user_a');
      expect(validity.valid).toBe(true);
      expect(validity.status).toBe('ACTIVE');
    });
  });
});
