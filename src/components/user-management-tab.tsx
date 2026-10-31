import { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Key, 
  CheckCircle2, 
  Mail, 
  X, 
  Filter, 
  Trash2, 
  UserCheck, 
  UserX, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  RotateCcw,
  Edit3,
  Sliders,
  Home,
  Construction,
  Clock,
  LogOut,
  Timer,
  AlertTriangle,
  Layers,
  Coins,
  Globe,
  TrendingUp,
  Wallet,
  Award,
  Zap,
  KeyRound,
  Settings,
  ShieldAlert,
  Target,
  RefreshCw,
  Route as RouteIcon,
  Map as MapIcon,
  Bell,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  validateLoginDuration, 
  formatDateTime, 
  formatTimestamp,
  parseDurationToSeconds,
  formatSecondsToDuration,
  adminEnableUser,
  adminDisableUser,
  adminForceLogoutUser,
  adminUpdateLoginDuration,
  adminResetUserTimer,
  adminExtendUserTimer,
  DEFAULT_LOGIN_DURATION,
  type AccountStatus,
  type DisableReason,
  type TimerStatus
} from '@/lib/session-manager';
import { 
  getRegisteredNavigationFields, 
  getAllNavigationFieldIds,
  type NavigationField as CoreNavigationField
} from '@/lib/permissions';
import { 
  saveCloudWorkspaceUsers, 
  syncWorkspaceUsers,
  fetchCloudWorkspaceUsers,
  type CloudWorkspaceUser
} from '@/lib/workspace-user-sync';

export type NavigationField = CoreNavigationField;

export interface NavigationFieldDef {
  id: NavigationField;
  label: string;
  description: string;
  icon: any;
  iconName?: string;
}

export const NAV_ICON_MAP: Record<string, any> = {
  home: Home,
  why: Lightbulb,
  lightbulb: Lightbulb,
  users: Users,
  'earning-opportunities': TrendingUp,
  earning_opportunities: TrendingUp,
  trendingup: TrendingUp,
  wallet: Wallet,
  ranks: Layers,
  potentiality: Target,
  target: Target,
  '12-level-bonus': Award,
  '12_level_bonus': Award,
  'twelve-level-bonus': Award,
  award: Award,
  'dcb-90-days': Zap,
  'dcb_90_days': Zap,
  'dcb-bonus': Zap,
  zap: Zap,
  'customer-view': UserCheck,
  'customer_view': UserCheck,
  usercheck: UserCheck,
  'route-map': RouteIcon,
  'route_map': RouteIcon,
  routemap: RouteIcon,
  route: RouteIcon,
  map: MapIcon,
  currency: Coins,
  configuration: Sliders,
  sliders: Sliders,
  'key-points': KeyRound,
  'key_points': KeyRound,
  keypoints: KeyRound,
  keyround: KeyRound,
  key: KeyRound,
  'time-in-hand': Clock,
  'time_in_hand': Clock,
  timeinhand: Clock,
  clock: Clock,
  notice: Bell,
  bell: Bell,
  settings: Settings,
  status: Construction,
};

export function resolveNavIcon(id: string, iconName?: string) {
  if (NAV_ICON_MAP[id]) return NAV_ICON_MAP[id];
  if (iconName && NAV_ICON_MAP[iconName.toLowerCase()]) return NAV_ICON_MAP[iconName.toLowerCase()];
  return Globe;
}

export function getResolvedNavigationFields(): NavigationFieldDef[] {
  return getRegisteredNavigationFields()
    .filter((f) => f.id !== 'status')
    .map((f) => ({
      ...f,
      icon: f.icon || resolveNavIcon(f.id, f.iconName),
    }));
}

export const NAVIGATION_FIELDS: NavigationFieldDef[] = getResolvedNavigationFields();

export interface WorkspaceUser {
  id: string;
  username?: string | undefined;
  name: string;
  email?: string | undefined;
  password?: string | undefined;
  permissions: NavigationField[];
  status: AccountStatus | 'Active' | 'Suspended';
  timerStatus?: TimerStatus | undefined;
  guardianProtected: boolean;
  mfaEnabled: boolean;
  lastActive: string;
  joinedDate: string;
  loginDuration: string; // HH:MM:SS
  assignedDuration?: string | undefined;
  durationSeconds?: number | undefined;
  sessionStartTime?: number | null | undefined;
  sessionExpireTime?: number | null | undefined;
  startedAt?: number | null | undefined;
  expiresAt?: number | null | undefined;
  remainingTimeSeconds?: number | null | undefined;
  disableReason?: DisableReason | null | undefined;
  disabledAt?: number | null | undefined;
  lastLoginTime?: number | null | undefined;
  reEnabledAt?: number | null | undefined;
  reEnabledBy?: string | null | undefined;
}

const STORAGE_KEY = 'nexora_workspace_users';

const MOCK_EMAILS = [
  'elena.vance@nexora.io',
  'marcus.s@nexora.io',
  'aria.c@nexora.io',
  'david.k@nexora.io',
  'sophia.m@nexora.io',
];

const DURATION_PRESETS = [
  { label: '30s', value: '00:00:30' },
  { label: '30m', value: '00:30:00' },
  { label: '1h', value: '01:00:00' },
  { label: '8h', value: '08:00:00' },
];

function isUserAdminOrOwner(u: any, ownerEmail?: string | null): boolean {
  if (!u) return false;
  if (typeof u === 'string') {
    const lower = u.toLowerCase().trim();
    const owner = (ownerEmail || '').toLowerCase().trim();
    return (
      (owner && lower === owner) ||
      lower === 'sivaji491@gmail.com' ||
      lower === 'sivaji' ||
      lower.includes('sivaji') ||
      lower === 'preview@nexora.example' ||
      lower === 'usr-owner' ||
      lower === 'admin' ||
      lower === 'owner'
    );
  }
  const email = (u.email || '').toLowerCase().trim();
  const username = (u.username || '').toLowerCase().trim();
  const id = (u.id || '').toLowerCase().trim();
  const role = (u.role || '').toLowerCase().trim();
  const owner = (ownerEmail || '').toLowerCase().trim();
  return (
    (owner && (email === owner || username === owner)) ||
    email === 'sivaji491@gmail.com' ||
    username === 'sivaji' ||
    email.includes('sivaji') ||
    username.includes('sivaji') ||
    email === 'preview@nexora.example' ||
    id === 'usr-owner' ||
    role === 'owner' ||
    role === 'admin'
  );
}

function normalizeStatus(rawStatus?: string): AccountStatus {
  if (!rawStatus) return 'ACTIVE';
  const upper = rawStatus.toUpperCase();
  if (upper === 'DISABLED' || upper === 'SUSPENDED') return 'DISABLED';
  return 'ACTIVE';
}

function loadDynamicUsers(ownerEmail: string): WorkspaceUser[] {
  const effectiveOwnerEmail = ownerEmail || 'sivaji491@gmail.com';
  const ownerName = effectiveOwnerEmail.split('@')[0] || 'sivaji';
  const capitalizedOwnerName = ownerName.charAt(0).toUpperCase() + ownerName.slice(1);

  const currentOwner: WorkspaceUser = {
    id: 'usr-owner',
    username: 'sivaji',
    name: `${capitalizedOwnerName} (Owner)`,
    email: effectiveOwnerEmail,
    password: 'Vijashya@2828',
    permissions: getAllNavigationFieldIds(),
    status: 'ACTIVE',
    guardianProtected: true,
    mfaEnabled: true,
    lastActive: 'Active now',
    joinedDate: 'Current session',
    loginDuration: '08:00:00',
    durationSeconds: 28800,
    lastLoginTime: Date.now(),
  };

  if (typeof window === 'undefined') {
    return [currentOwner];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out legacy mock accounts and normalize permissions & duration
        const cleaned = parsed
          .filter((u: any) => u && (u.email || u.username) && !MOCK_EMAILS.includes((u.email || '').toLowerCase()))
          .map((u: any) => {
            const isOwner = isUserAdminOrOwner(u, effectiveOwnerEmail);
            const username = u.username || (isOwner ? 'sivaji' : (u.name || (u.email ? u.email.split('@')[0] : 'user')));
            // Admin/Owner MUST always have full access to all navigation tabs
            const permissions: NavigationField[] = isOwner
              ? getAllNavigationFieldIds()
              : Array.isArray(u.permissions)
              ? u.permissions
              : ['home', 'earning-opportunities', 'status'];

            const loginDuration = u.loginDuration || (isOwner ? '08:00:00' : DEFAULT_LOGIN_DURATION);
            const assignedDuration = u.assignedDuration || loginDuration;
            const status = normalizeStatus(u.status);
            const expireTime = u.sessionExpireTime || u.expiresAt || null;
            const isExpired = Boolean(expireTime && Date.now() >= expireTime && !isOwner);
            const timerStatus: TimerStatus = isExpired ? 'expired' : (u.timerStatus || (status === 'DISABLED' ? 'expired' : 'active'));

            return {
              ...u,
              username,
              name: username,
              email: u.email || undefined,
              permissions,
              status: isExpired ? 'DISABLED' : status,
              timerStatus,
              loginDuration,
              assignedDuration,
              durationSeconds: u.durationSeconds || parseDurationToSeconds(loginDuration),
              sessionStartTime: u.sessionStartTime || u.startedAt || null,
              sessionExpireTime: expireTime,
              startedAt: u.startedAt || u.sessionStartTime || null,
              expiresAt: expireTime,
              disableReason: isExpired ? 'SESSIONTIMEEXPIRED' : u.disableReason,
              password: u.password || (isOwner ? 'Vijashya@2828' : 'Nexora!2026'),
            };
          });

        const hasOwner = cleaned.some((u: WorkspaceUser) => isUserAdminOrOwner(u, effectiveOwnerEmail));
        const result = hasOwner ? cleaned : [currentOwner, ...cleaned];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        return result;
      }
    } catch {
      // fallback
    }
  }

  const initial = [currentOwner];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

interface UserManagementTabProps {
  currentUserEmail?: string | null | undefined;
  isAdmin?: boolean;
}

export function UserManagementTab({ currentUserEmail, isAdmin }: UserManagementTabProps) {
  const primaryOwnerEmail = 'sivaji491@gmail.com';
  const effectiveCallerEmail = currentUserEmail || primaryOwnerEmail;
  const isCurrentUserAdmin = typeof isAdmin === 'boolean'
    ? isAdmin
    : (currentUserEmail ? isUserAdminOrOwner(currentUserEmail, primaryOwnerEmail) : true);

  const [users, setUsers] = useState<WorkspaceUser[]>(() => {
    return loadDynamicUsers(primaryOwnerEmail);
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldFilter, setFieldFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<WorkspaceUser | null>(null);
  const [editPermissionsSelection, setEditPermissionsSelection] = useState<NavigationField[]>([]);
  const [editingDurationUser, setEditingDurationUser] = useState<WorkspaceUser | null>(null);
  const [editingDurationValue, setEditingDurationValue] = useState<string>(DEFAULT_LOGIN_DURATION);
  const [editingDurationError, setEditingDurationError] = useState<string>('');
  const [resetTimerImmediately, setResetTimerImmediately] = useState(false);
  const [viewingPasswordUser, setViewingPasswordUser] = useState<WorkspaceUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Navigation Fields state
  const [navFields, setNavFields] = useState<NavigationFieldDef[]>(() => getResolvedNavigationFields());

  // Create User Form State
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createPermissions, setCreatePermissions] = useState<NavigationField[]>(() => {
    return getResolvedNavigationFields()
      .filter((f) => f.id !== 'users')
      .map((f) => f.id);
  });
  const [createDuration, setCreateDuration] = useState<string>(DEFAULT_LOGIN_DURATION);
  const [createMfa, setCreateMfa] = useState(true);
  const [createError, setCreateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize state with storage events and dynamic navigation field events
  useEffect(() => {
    const handleUpdate = () => {
      setNavFields(getResolvedNavigationFields());
      setUsers(loadDynamicUsers(primaryOwnerEmail));
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('nexora_session_updated', handleUpdate);
    window.addEventListener('nexora_account_disabled', handleUpdate);
    window.addEventListener('nexora_nav_fields_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('nexora_session_updated', handleUpdate);
      window.removeEventListener('nexora_account_disabled', handleUpdate);
      window.removeEventListener('nexora_nav_fields_updated', handleUpdate);
    };
  }, [primaryOwnerEmail]);

  // Pulls freshest user accounts directly from central database without passive overwrites
  const refreshFromCloud = async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const cloudUsers = await fetchCloudWorkspaceUsers();
      if (cloudUsers && cloudUsers.length > 0) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudUsers));
          window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
        }
        setUsers(loadDynamicUsers(primaryOwnerEmail));
        if (showNotification) {
          showToast('User directory refreshed from central database.');
        }
      } else {
        const local = loadDynamicUsers(primaryOwnerEmail);
        if (local.length > 0) {
          await saveCloudWorkspaceUsers(local as CloudWorkspaceUser[]);
        }
      }
    } catch (err) {
      console.warn('[UserManagement] Refresh failed:', err);
      if (showNotification) {
        showToast('Could not reach database. Showing cached users.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial synchronization with central database on mount
  useEffect(() => {
    refreshFromCloud(false);
  }, [primaryOwnerEmail]);

  // Auto-refresh when tab/window gains focus or becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud(false);
      }
    };
    const handleFocus = () => {
      refreshFromCloud(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [primaryOwnerEmail]);

  // Persist users to localStorage and dispatch update event for reactive components (sidebar, etc.)
  // NOTE: Central cloud saves are executed only in explicit administrator mutation handlers, NEVER passively on mount!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
    }
  }, [users]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePreviewAsUser = (targetUser: WorkspaceUser) => {
    if (typeof window !== 'undefined') {
      const targetIdentifier = targetUser.username || targetUser.email || targetUser.name;
      window.localStorage.setItem('nexora-preview-user-email', targetIdentifier);
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
      showToast(`Testing navigation view as @${targetUser.username || targetUser.name} (${targetUser.permissions.join(', ')})`);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreatePassword(pwd);
    setShowCreatePassword(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = 
        (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesField = 
        fieldFilter === 'All' || 
        (u.permissions && u.permissions.includes(fieldFilter as NavigationField));
      
      const currentNormStatus = normalizeStatus(u.status);
      const matchesStatus = 
        statusFilter === 'All' || 
        currentNormStatus === statusFilter ||
        (statusFilter === 'Active' && currentNormStatus === 'ACTIVE') ||
        (statusFilter === 'Suspended' && currentNormStatus === 'DISABLED');

      return matchesSearch && matchesField && matchesStatus;
    });
  }, [users, searchQuery, fieldFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => normalizeStatus(u.status) === 'ACTIVE').length;
    const disabled = users.filter((u) => normalizeStatus(u.status) === 'DISABLED').length;
    const expiredCount = users.filter((u) => u.disableReason === 'SESSIONTIMEEXPIRED').length;
    const mfaCount = users.filter((u) => u.mfaEnabled).length;
    return { 
      total, 
      active, 
      disabled,
      expiredCount,
      mfaPercent: total > 0 ? Math.round((mfaCount / total) * 100) : 0 
    };
  }, [users]);

  // Handle Create User with Duration validation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCurrentUserAdmin) {
      setCreateError('Unauthorized: Only administrators can create users.');
      return;
    }
    if (isSaving) return;
    setCreateError('');

    const trimmedUsername = createUsername.trim();
    const trimmedEmail = createEmail.trim().toLowerCase();

    if (!trimmedUsername) {
      setCreateError('Please enter a username.');
      return;
    }
    if (trimmedUsername.includes('@')) {
      setCreateError('Username cannot be an email address. Please enter a username only.');
      return;
    }
    if (/\s/.test(trimmedUsername)) {
      setCreateError('Username cannot contain spaces.');
      return;
    }
    if (trimmedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setCreateError('Please enter a valid email address, or leave it blank.');
        return;
      }
    }
    if (!createPassword || createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters long.');
      return;
    }
    if (createPermissions.length === 0) {
      setCreateError('Please check at least one navigation field permission for this user.');
      return;
    }
    if (users.some((u) => (u.username || u.name).toLowerCase() === trimmedUsername.toLowerCase())) {
      setCreateError('A user with this username already exists in the workspace.');
      return;
    }
    if (trimmedEmail && users.some((u) => u.email && u.email.toLowerCase() === trimmedEmail)) {
      setCreateError('A user with this email address already exists in the workspace.');
      return;
    }

    // Validate login duration
    const durationCheck = validateLoginDuration(createDuration);
    if (!durationCheck.valid) {
      setCreateError(durationCheck.error || 'Invalid login duration.');
      return;
    }

    setIsSaving(true);
    try {
      const newUser: WorkspaceUser = {
        id: `usr-${Date.now()}`,
        username: trimmedUsername,
        name: trimmedUsername,
        email: trimmedEmail || undefined,
        password: createPassword,
        permissions: createPermissions,
        status: 'ACTIVE',
        guardianProtected: true,
        mfaEnabled: createMfa,
        lastActive: 'Never logged in',
        joinedDate: 'Just now',
        loginDuration: createDuration.trim(),
        durationSeconds: durationCheck.totalSeconds,
        sessionStartTime: null, // Timer NEVER starts at creation!
        sessionExpireTime: null,
        disableReason: null,
        disabledAt: null,
        lastLoginTime: null,
      };

      const nextUsers = [newUser, ...users];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUsers));
        window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
      }
      setUsers(nextUsers);
      await saveCloudWorkspaceUsers(nextUsers as CloudWorkspaceUser[]).catch(() => {});
      setIsCreateOpen(false);
      setCreateUsername('');
      setCreateEmail('');
      setCreatePassword('');
      setShowCreatePassword(false);
      setCreatePermissions(['home', 'ranks', 'currency', 'configuration']);
      setCreateDuration(DEFAULT_LOGIN_DURATION);
      showToast(`User @${newUser.username} created with duration ${newUser.loginDuration}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelCreate = () => {
    if (isSaving) return;
    setIsCreateOpen(false);
    setCreateError('');
    setCreateUsername('');
    setCreateEmail('');
    setCreatePassword('');
    setShowCreatePassword(false);
  };

  // Open Edit Permissions Modal
  const openEditPermissions = (user: WorkspaceUser) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can edit permissions.');
      return;
    }
    setEditingPermissionsUser(user);
    setEditPermissionsSelection((user.permissions || []).filter((p) => p !== 'status'));
  };

  // Save Permissions
  const handleSavePermissions = () => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can modify permissions.');
      return;
    }
    if (!editingPermissionsUser) return;
    if (editPermissionsSelection.length === 0) {
      showToast('User must have access to at least one navigation field.');
      return;
    }

    const updated = users.map((u) => 
      u.id === editingPermissionsUser.id ? { ...u, permissions: [...editPermissionsSelection] } : u
    );
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
    }
    setUsers(updated);
    saveCloudWorkspaceUsers(updated as CloudWorkspaceUser[]).catch(() => {});
    showToast(`Navigation permissions updated for ${editingPermissionsUser.name}`);
    setEditingPermissionsUser(null);
  };

  // Open Edit Duration Modal
  const openEditDuration = (user: WorkspaceUser) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can edit access duration.');
      return;
    }
    setEditingDurationUser(user);
    setEditingDurationValue(user.assignedDuration || user.loginDuration || DEFAULT_LOGIN_DURATION);
    setEditingDurationError('');
    setResetTimerImmediately(false);
  };

  // Save Duration
  const handleSaveDuration = () => {
    if (!isCurrentUserAdmin) {
      setEditingDurationError('Unauthorized: Only administrators can change access duration.');
      return;
    }
    if (!editingDurationUser) return;
    const validation = validateLoginDuration(editingDurationValue);
    if (!validation.valid) {
      setEditingDurationError(validation.error || 'Invalid duration.');
      return;
    }

    const res = adminUpdateLoginDuration(
      editingDurationUser.id, 
      editingDurationValue, 
      effectiveCallerEmail, 
      resetTimerImmediately
    );
    if (!res.success) {
      setEditingDurationError(res.error || 'Failed to update duration.');
      return;
    }

    setUsers(loadDynamicUsers(primaryOwnerEmail));
    showToast(
      resetTimerImmediately
        ? `Timer for @${editingDurationUser.username || editingDurationUser.name} reset to ${editingDurationValue.trim()} now!`
        : `Login duration for @${editingDurationUser.username || editingDurationUser.name} set to ${editingDurationValue.trim()} (applies to next login)`
    );
    setEditingDurationUser(null);
    setResetTimerImmediately(false);
  };

  // Admin action: Reset User Timer
  const handleResetUserTimer = (user: WorkspaceUser, newDuration?: string) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can reset user timers.');
      return;
    }
    if (isUserAdminOrOwner(user, primaryOwnerEmail)) {
      showToast('Workspace administrator accounts have permanent unlimited access.');
      return;
    }
    const result = adminResetUserTimer(user.id, effectiveCallerEmail, newDuration);
    if (!result.success) {
      showToast(result.error || 'Failed to reset user timer.');
      return;
    }
    setUsers(loadDynamicUsers(primaryOwnerEmail));
    showToast(`Timer for @${user.username || user.name} reset to ${result.loginDuration || user.loginDuration}!`);
  };

  // Admin action: Extend User Timer
  const handleExtendUserTimer = (user: WorkspaceUser, additionalMinutes: number) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can extend user timers.');
      return;
    }
    if (isUserAdminOrOwner(user, primaryOwnerEmail)) {
      showToast('Workspace administrator accounts have permanent unlimited access.');
      return;
    }
    const result = adminExtendUserTimer(user.id, effectiveCallerEmail, additionalMinutes * 60);
    if (!result.success) {
      showToast(result.error || 'Failed to extend user timer.');
      return;
    }
    setUsers(loadDynamicUsers(primaryOwnerEmail));
    showToast(`Added +${additionalMinutes}m to @${user.username || user.name}'s timer.`);
  };

  // Admin action: Enable User
  const handleEnableUser = (user: WorkspaceUser) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can enable users.');
      return;
    }
    adminEnableUser(user.id, effectiveCallerEmail.split('@')[0] || 'sivaji');
    setUsers(loadDynamicUsers(primaryOwnerEmail));
    showToast(`User @${user.username || user.name} enabled. Fresh session timer will start on next login.`);
  };

  // Admin action: Disable User
  const handleDisableUser = (user: WorkspaceUser) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can disable users.');
      return;
    }
    if (user.id === 'usr-owner' || isUserAdminOrOwner(user, primaryOwnerEmail)) {
      showToast('Cannot disable workspace owner.');
      return;
    }
    adminDisableUser(user.id, effectiveCallerEmail);
    setUsers(loadDynamicUsers(primaryOwnerEmail));
    showToast(`User @${user.username || user.name} disabled by administrator.`);
  };

  // Admin action: Force Logout
  const handleForceLogout = (user: WorkspaceUser) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can terminate user sessions.');
      return;
    }
    adminForceLogoutUser(user.id, effectiveCallerEmail);
    setUsers(loadDynamicUsers(primaryOwnerEmail));
    showToast(`Active session terminated for @${user.username || user.name}.`);
  };

  // Delete user
  const handleDeleteUser = (id: string, name: string) => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can remove users.');
      return;
    }
    const target = users.find((u) => u.id === id);
    if (!target) return;
    if (target.id === 'usr-owner' || isUserAdminOrOwner(target, primaryOwnerEmail)) {
      showToast('Cannot remove workspace owner.');
      return;
    }

    const nextUsers = users.filter((u) => u.id !== id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUsers));
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
    }
    setUsers(nextUsers);
    saveCloudWorkspaceUsers(nextUsers as CloudWorkspaceUser[]).catch(() => {});
    showToast(`${name} has been removed from workspace`);
  };

  // Reset to only dynamic owner account
  const handleResetData = () => {
    if (!isCurrentUserAdmin) {
      showToast('Unauthorized: Only administrators can reset directory data.');
      return;
    }
    if (window.confirm('Reset directory to only your active authenticated account?')) {
      const reset: WorkspaceUser[] = [
        {
          id: 'usr-owner',
          username: 'sivaji',
          name: 'Sivaji (Owner)',
          email: primaryOwnerEmail,
          password: 'Vijashya@2828',
          permissions: ['home', 'users', 'status'],
          status: 'ACTIVE',
          guardianProtected: true,
          mfaEnabled: true,
          lastActive: 'Active now',
          joinedDate: 'Current session',
          loginDuration: '08:00:00',
          durationSeconds: 28800,
          sessionStartTime: Date.now(),
          sessionExpireTime: Date.now() + 28800 * 1000,
          lastLoginTime: Date.now(),
        },
      ];
      setUsers(reset);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
        window.localStorage.removeItem('nexora-preview-user-email');
        window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
      }
      saveCloudWorkspaceUsers(reset as CloudWorkspaceUser[]).catch(() => {});
      showToast('Directory reset to dynamic authenticated state');
    }
  };

  const renderPermissionBadges = (perms: NavigationField[]) => {
    return (
      <div className="perm-badges-wrap">
        {perms.map((permId) => {
          const fieldDef = navFields.find((f) => f.id === permId);
          if (!fieldDef) return null;
          const Icon = fieldDef.icon;
          return (
            <span key={permId} className={`perm-badge perm-badge-${permId}`}>
              <Icon className="w-3 h-3" /> {fieldDef.label}
            </span>
          );
        })}
        {perms.length === 0 && (
          <span className="text-muted-foreground text-xs italic">No page access</span>
        )}
      </div>
    );
  };

  if (!isCurrentUserAdmin) {
    return (
      <div className="users-dashboard animate-in fade-in duration-300">
        <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-card border border-border shadow-xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Administrator Access Required</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              User Management, access duration settings, and account permissions are strictly reserved for authorized administrators.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/60 text-xs text-muted-foreground border border-border/40 font-mono">
            <span>Identity: {currentUserEmail || 'Standard User'}</span>
            <span>·</span>
            <span className="text-destructive font-medium">Access Restricted</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users-dashboard animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="users-toast" role="status">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Top Header / Action Bar */}
      <section className="users-header-banner-compact">
        <div className="users-header-info">
          <div className="home-badge">
            <Users className="w-3 h-3 text-primary" />
            <span>IG INFRA ACCESS CONTROL</span>
            <span className="badge-divider">·</span>
            <span className="badge-highlight">SESSION DURATION & EXPIRATION</span>
          </div>
          <h1>User Management</h1>
          <p className="users-header-desc">
            Configure login durations (HH:MM:SS), session timeouts, and granular navigation permissions.
          </p>
        </div>
        <div className="users-header-actions">
          <Button 
            className="invite-btn"
            onClick={() => setIsCreateOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refreshFromCloud(true)}
            disabled={isRefreshing}
            title="Refresh user list from central database"
            className="refresh-btn flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing…' : 'Refresh'}</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleResetData}
            title="Reset to default authenticated state"
            className="reset-btn"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </section>

      {/* Reduced / Compact Stats Grid */}
      <section className="users-compact-stats-grid">
        <div className="compact-stat-card">
          <div className="compact-stat-header">
            <span className="stat-title">Total Members</span>
            <div className="compact-stat-icon-wrap compact-stat-icon-primary">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="compact-stat-number">{stats.total}</div>
        </div>

        <div className="compact-stat-card">
          <div className="compact-stat-header">
            <span className="stat-title">Active Accounts</span>
            <div className="compact-stat-icon-wrap compact-stat-icon-emerald">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="compact-stat-number text-emerald-600">{stats.active}</div>
        </div>

        <div className="compact-stat-card">
          <div className="compact-stat-header">
            <span className="stat-title">Disabled Accounts</span>
            <div className="compact-stat-icon-wrap compact-stat-icon-rose">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="compact-stat-number text-red-600">{stats.disabled}</div>
        </div>

        <div className="compact-stat-card">
          <div className="compact-stat-header">
            <span className="stat-title">MFA Compliance</span>
            <div className="compact-stat-icon-wrap compact-stat-icon-cyan">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="compact-stat-number">{stats.mfaPercent}%</div>
        </div>
      </section>

      {/* Search & Filter Controls */}
      <section className="users-controls-card">
        <div className="search-bar-wrap">
          <Search className="w-4 h-4 text-muted-foreground search-icon" />
          <Input 
            type="text"
            placeholder="Search by name or email address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="filter-label">Page Access:</span>
            <select 
              value={fieldFilter} 
              onChange={(e) => setFieldFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Pages</option>
              {navFields.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>

          <div className="results-count">
            Showing <strong>{filteredUsers.length}</strong> of {users.length} members
          </div>
        </div>
      </section>

      {/* Users Directory Table */}
      <section className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username & Email</th>
              <th>Account Status</th>
              <th>Login Duration</th>
              <th>Session Timestamps</th>
              <th>Page Permissions</th>
              <th>Security Shield</th>
              <th>Password</th>
              <th className="text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state-cell">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="empty-title">No members found</p>
                  <p className="empty-desc">Try adjusting your search query or filters.</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const displayName = user.username || user.name;
                const initials = displayName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                const isOwner = isUserAdminOrOwner(user, primaryOwnerEmail);
                const normStatus = normalizeStatus(user.status);
                const hasActiveSession = Boolean(
                  user.sessionStartTime && 
                  user.sessionExpireTime && 
                  Date.now() < user.sessionExpireTime
                );

                return (
                  <tr key={user.id} className="user-table-row">
                    {/* Username & Email */}
                    <td>
                      <div className="user-cell">
                        <div className={`user-avatar ${isOwner ? 'avatar-owner' : ''}`}>
                          {initials}
                        </div>
                        <div className="user-meta">
                          <span className="user-name">@{displayName}</span>
                          <span className="user-email">
                            {user.email ? (
                              user.email
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">No email · Login via username</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Account Status: ACTIVE or DISABLED */}
                    <td>
                      {normStatus === 'ACTIVE' ? (
                        <div>
                          <span className="status-tag status-active">
                            <span className="status-dot-active" /> ACTIVE
                          </span>
                          {user.reEnabledBy && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Re-enabled by @{user.reEnabledBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="status-tag status-disabled">
                            <span className="status-dot-disabled" /> DISABLED
                          </span>
                          <div className="text-[10px] text-destructive font-medium mt-0.5">
                            {user.disableReason === 'SESSIONTIMEEXPIRED' 
                              ? 'Session Time Expired' 
                              : user.disableReason === 'ADMIN_DISABLED' 
                              ? 'Disabled by Admin' 
                              : 'Disabled'}
                          </div>
                          {user.disabledAt && (
                            <div className="text-[10px] text-muted-foreground">
                              {formatDateTime(user.disabledAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Configured Login Duration */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="duration-pill" title={`Valid duration: ${user.loginDuration || DEFAULT_LOGIN_DURATION}`}>
                          <Clock className="w-3 h-3 text-primary" />
                          {user.loginDuration || DEFAULT_LOGIN_DURATION}
                        </span>
                        {!isOwner && (
                          <button
                            type="button"
                            className="edit-role-trigger"
                            title="Edit login duration"
                            onClick={() => openEditDuration(user)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Session Timestamps */}
                    <td>
                      <div className="text-xs space-y-0.5">
                        <div className="text-muted-foreground text-[11px]">
                          Last login: <span className="text-foreground font-mono">{formatDateTime(user.lastLoginTime)}</span>
                        </div>
                        {hasActiveSession ? (
                          <div className="text-emerald-600 font-mono text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Exp: {formatTimestamp(user.sessionExpireTime)}
                          </div>
                        ) : user.sessionExpireTime && Date.now() >= user.sessionExpireTime ? (
                          <div className="text-destructive font-mono text-[11px]">
                            Expired at {formatTimestamp(user.sessionExpireTime)}
                          </div>
                        ) : (
                          <div className="text-muted-foreground italic text-[11px]">
                            No active session
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Page Permissions */}
                    <td>
                      <div className="flex items-center gap-2">
                        {renderPermissionBadges(user.permissions || [])}
                        <button
                          type="button"
                          className="edit-role-trigger"
                          title="Edit page permissions"
                          onClick={() => openEditPermissions(user)}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Security Shield */}
                    <td>
                      <div className="security-cell">
                        <span className="security-shield-pill">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Protected</span>
                        </span>
                        {user.mfaEnabled && (
                          <span className="mfa-pill">MFA</span>
                        )}
                      </div>
                    </td>

                    {/* Password */}
                    <td>
                      {user.password ? (
                        <button
                          type="button"
                          className="password-inspect-btn"
                          title="View user password"
                          onClick={() => setViewingPasswordUser(user)}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          <span>••••••••</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Admin Actions */}
                    <td className="text-right">
                      {isOwner ? (
                        <span className="owner-action-label">Workspace Primary</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Enable / Disable User Buttons */}
                          {normStatus === 'DISABLED' ? (
                            <button
                              type="button"
                              className="table-action-btn-sm btn-enable"
                              title="Enable User (sets status to ACTIVE; user must log in again)"
                              onClick={() => handleEnableUser(user)}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Enable</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="table-action-btn-sm btn-disable"
                              title="Disable User"
                              onClick={() => handleDisableUser(user)}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Disable</span>
                            </button>
                          )}

                          {/* Force Logout */}
                          {hasActiveSession && (
                            <button
                              type="button"
                              className="table-action-btn-sm text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Force Logout (terminate active session immediately)"
                              onClick={() => handleForceLogout(user)}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Logout</span>
                            </button>
                          )}

                          {/* Reset Timer */}
                          <button
                            type="button"
                            className="action-icon-btn reset-timer-btn"
                            title={`Reset timer for @${displayName} to assigned duration (${user.assignedDuration || user.loginDuration || DEFAULT_LOGIN_DURATION})`}
                            onClick={() => handleResetUserTimer(user)}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-primary" />
                          </button>

                          {/* Test Navigation Preview */}
                          <button
                            type="button"
                            className="action-icon-btn preview-perm-btn"
                            title={`Test navigation view as ${user.name}`}
                            onClick={() => handlePreviewAsUser(user)}
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            className="action-icon-btn delete-btn"
                            title="Remove user"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Create User Modal Dialog (Username, Optional Email, Password, Duration, & Navigation Permissions) */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={handleCancelCreate}>
          <div 
            className="invite-modal-card animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-modal-title"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 id="create-user-modal-title">Create Workspace User</h2>
                  <p>Configure credentials, login time limit (HH:MM:SS), and navigation permissions.</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={handleCancelCreate}
                aria-label="Close dialog"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="modal-form-body">
                {createError && (
                  <div className="modal-error-banner" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="modal-field">
                  <label htmlFor="create-username">Username</label>
                  <Input
                    id="create-username"
                    type="text"
                    placeholder="e.g. alex24"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    disabled={isSaving}
                    autoFocus
                  />
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Username only (no @ symbol or email address).
                  </span>
                </div>

                <div className="modal-field">
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="create-email" className="mb-0">Email</label>
                    <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
                  </div>
                  <div className="modal-input-wrap">
                    <Mail className="w-4 h-4 text-muted-foreground modal-input-icon" />
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="e.g. alex@company.com (optional)"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      disabled={isSaving}
                      className="modal-email-input"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Optional. If empty, the user can log in with their username and password.
                  </span>
                </div>

                <div className="modal-field">
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="create-password" className="mb-0">User Password</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="generate-pwd-btn"
                      disabled={isSaving}
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> Generate Strong Password
                    </button>
                  </div>
                  <div className="modal-input-wrap">
                    <Lock className="w-4 h-4 text-muted-foreground modal-input-icon" />
                    <Input
                      id="create-password"
                      type={showCreatePassword ? 'text' : 'password'}
                      placeholder="Enter user password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      disabled={isSaving}
                      className="modal-email-input pr-10"
                    />
                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                      disabled={isSaving}
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Login Duration (HH:MM:SS) Field */}
                <div className="modal-field">
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="create-duration" className="mb-0 font-semibold text-xs">
                      Login Duration (HH:MM:SS)
                    </label>
                    <span className="text-[11px] text-muted-foreground">Timer starts after login</span>
                  </div>
                  <div className="modal-input-wrap">
                    <Clock className="w-4 h-4 text-muted-foreground modal-input-icon" />
                    <Input
                      id="create-duration"
                      type="text"
                      placeholder="HH:MM:SS (e.g. 01:00:00)"
                      value={createDuration}
                      onChange={(e) => setCreateDuration(e.target.value)}
                      disabled={isSaving}
                      className="modal-email-input font-mono"
                    />
                  </div>
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        className={`duration-preset-btn ${createDuration === p.value ? 'active' : ''}`}
                        onClick={() => setCreateDuration(p.value)}
                        disabled={isSaving}
                      >
                        {p.label} ({p.value})
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Valid format: HH:MM:SS. Minutes and seconds between 00 and 59. Account is automatically disabled once expired.
                  </span>
                </div>

                {/* Navigation Fields Permission Checkboxes */}
                <div className="modal-field">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="mb-0 font-semibold text-xs">Navigation & Page Permissions</label>
                    <span className="text-[11px] text-muted-foreground">{createPermissions.length} pages selected</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2.5">
                    Check the navigation fields to show those pages for this user:
                  </p>
                  <div className="nav-permissions-grid">
                    {navFields.filter((f) => f.id !== 'status' && f.id !== 'notice').map(({ id, label, description, icon: Icon }) => {
                      const isChecked = createPermissions.includes(id);
                      return (
                        <label 
                          key={id} 
                          className={`nav-perm-card ${isChecked ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isSaving}
                            onChange={() => {
                              if (isChecked) {
                                setCreatePermissions(createPermissions.filter((p) => p !== id));
                              } else {
                                setCreatePermissions([...createPermissions, id]);
                              }
                            }}
                          />
                          <div className="nav-perm-content">
                            <div className="nav-perm-title">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                              <strong>{label}</strong>
                            </div>
                            <p>{description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-checkbox-row">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={createMfa} 
                      disabled={isSaving}
                      onChange={(e) => setCreateMfa(e.target.checked)} 
                    />
                    <span>Enforce Multi-Factor Authentication (MFA) on this user</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelCreate}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="action-btn-primary"
                  disabled={isSaving}
                  data-testid="save-user-button"
                >
                  {isSaving ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Save User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Login Duration Modal Dialog */}
      {editingDurationUser && (
        <div className="modal-backdrop" onClick={() => setEditingDurationUser(null)}>
          <div 
            className="invite-modal-card max-w-md animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2>Edit Login Duration</h2>
                  <p>@{editingDurationUser.username || editingDurationUser.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setEditingDurationUser(null)}
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-form">
              <div className="modal-form-body">
                {editingDurationError && (
                  <div className="modal-error-banner" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editingDurationError}</span>
                  </div>
                )}

                <div className="modal-field">
                  <label htmlFor="edit-duration-input" className="font-semibold text-xs">
                    Login Duration (HH:MM:SS)
                  </label>
                  <div className="modal-input-wrap">
                    <Clock className="w-4 h-4 text-muted-foreground modal-input-icon" />
                    <Input
                      id="edit-duration-input"
                      type="text"
                      placeholder="HH:MM:SS"
                      value={editingDurationValue}
                      onChange={(e) => setEditingDurationValue(e.target.value)}
                      className="modal-email-input font-mono"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        className={`duration-preset-btn ${editingDurationValue === p.value ? 'active' : ''}`}
                        onClick={() => setEditingDurationValue(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="mb-0 font-semibold text-xs">Quick Extend Remaining Time</label>
                      <span className="text-[11px] text-muted-foreground">Admin Only</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: '+5 min', min: 5 },
                        { label: '+15 min', min: 15 },
                        { label: '+30 min', min: 30 },
                        { label: '+1 hour', min: 60 },
                      ].map((ext) => (
                        <button
                          key={ext.label}
                          type="button"
                          className="duration-preset-btn hover:border-primary text-xs"
                          onClick={() => {
                            if (editingDurationUser) {
                              handleExtendUserTimer(editingDurationUser, ext.min);
                              setEditingDurationUser(null);
                            }
                          }}
                        >
                          {ext.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="checkbox-label text-xs flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resetTimerImmediately}
                        onChange={(e) => setResetTimerImmediately(e.target.checked)}
                      />
                      <span>Reset user's active timer immediately to this duration</span>
                    </label>
                  </div>

                  <div className="mt-3 p-2.5 rounded bg-muted text-[11px] text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong>Persistent Timer Policy:</strong> Timer persists across logout/login and page refresh. Only an authorized administrator can reset or extend a user's timer.
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <Button variant="outline" onClick={() => setEditingDurationUser(null)}>
                  Cancel
                </Button>
                <Button className="action-btn-primary" onClick={handleSaveDuration}>
                  Save Duration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Navigation Permissions Modal Dialog */}
      {editingPermissionsUser && (
        <div className="modal-backdrop" onClick={() => setEditingPermissionsUser(null)}>
          <div 
            className="invite-modal-card animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Sliders className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2>Edit Page Permissions: @{editingPermissionsUser.username || editingPermissionsUser.name}</h2>
                  <p>Check or uncheck navigation fields to control visible pages for @{editingPermissionsUser.username || editingPermissionsUser.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setEditingPermissionsUser(null)}
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-form">
              <div className="modal-form-body">
                <div className="modal-field">
                  <div className="nav-permissions-grid">
                    {navFields.filter((f) => f.id !== 'status' && f.id !== 'notice').map(({ id, label, description, icon: Icon }) => {
                      const isChecked = editPermissionsSelection.includes(id);
                      return (
                        <label 
                          key={id} 
                          className={`nav-perm-card ${isChecked ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditPermissionsSelection(editPermissionsSelection.filter((p) => p !== id));
                              } else {
                                setEditPermissionsSelection([...editPermissionsSelection, id]);
                              }
                            }}
                          />
                          <div className="nav-perm-content">
                            <div className="nav-perm-title">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                              <strong>{label}</strong>
                            </div>
                            <p>{description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <Button variant="outline" onClick={() => setEditingPermissionsUser(null)}>
                  Cancel
                </Button>
                <Button className="action-btn-primary" onClick={handleSavePermissions}>
                  Save Permissions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Password Modal */}
      {viewingPasswordUser && (
        <div className="modal-backdrop" onClick={() => setViewingPasswordUser(null)}>
          <div 
            className="invite-modal-card max-w-sm animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2>User Credentials</h2>
                  <p>@{viewingPasswordUser.username || viewingPasswordUser.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setViewingPasswordUser(null)}
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-form">
              <div className="modal-form-body">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="text-xs text-muted-foreground">Username:</div>
                  <div className="font-mono text-xs font-semibold">@{viewingPasswordUser.username || viewingPasswordUser.name}</div>
                  {viewingPasswordUser.email && (
                    <>
                      <div className="text-xs text-muted-foreground pt-1">Email:</div>
                      <div className="font-mono text-xs font-semibold">{viewingPasswordUser.email}</div>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground pt-2">Password:</div>
                  <div className="font-mono text-xs font-semibold text-primary select-all bg-card p-2 rounded border border-border">
                    {viewingPasswordUser.password || '••••••••'}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <Button onClick={() => setViewingPasswordUser(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
