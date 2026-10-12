export type NavigationField = 'home' | 'users' | 'earning-opportunities' | 'status' | 'ranks' | '12-level-bonus' | 'dcb-90-days' | 'customer-view' | 'currency' | string;

export interface NavigationFieldDef {
  id: NavigationField;
  label: string;
  description: string;
  iconName?: string;
  icon?: any;
}

export const STORAGE_KEY = 'nexora_workspace_users';
export const DYNAMIC_NAV_FIELDS_STORAGE_KEY = 'nexora_dynamic_nav_fields';

export const DEFAULT_NAVIGATION_FIELDS: NavigationFieldDef[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Workspace dashboard and summary',
    iconName: 'Home',
  },
  {
    id: 'users',
    label: 'User Management',
    description: 'User directory, user creation, and navigation permissions',
    iconName: 'Users',
  },
  {
    id: 'earning-opportunities',
    label: 'Earning Opportunities',
    description: 'Source structure and multi-layered commission opportunities',
    iconName: 'TrendingUp',
  },
  {
    id: 'ranks',
    label: 'Ranks',
    description: 'Rank calculator, pricing tiers, and accumulation details',
    iconName: 'Layers',
  },
  {
    id: '12-level-bonus',
    label: '12 Level Bonus',
    description: '12-level compressed matrix bonus structure and dynamic rank calculation',
    iconName: 'Award',
  },
  {
    id: 'dcb-90-days',
    label: 'DCB (90 days)',
    description: 'Double Connect Bonus (30%) 90-day referral program and earnings milestones',
    iconName: 'Zap',
  },
  {
    id: 'customer-view',
    label: 'Customer view',
    description: 'Customer rank-based benefits display and dynamic earnings breakdown',
    iconName: 'UserCheck',
  },
  {
    id: 'currency',
    label: 'Currency Settings',
    description: 'USD to INR exchange rate and currency configuration',
    iconName: 'Coins',
  },
  {
    id: 'configuration',
    label: 'Configuration Settings',
    description: 'Network fee percentage, exchange rates, and rank names configuration',
    iconName: 'Sliders',
  },
  {
    id: 'key-points',
    label: 'Key Points',
    description: 'Essential business plan key points, rules, and guidelines',
    iconName: 'KeyRound',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Workspace settings, key points management, and administrative options',
    iconName: 'Settings',
  },
  {
    id: 'status',
    label: 'Platform Status',
    description: 'Service health and incident status',
    iconName: 'Construction',
  },
];

/**
 * Returns all currently registered navigation fields (default + dynamically added fields).
 */
export function getRegisteredNavigationFields(): NavigationFieldDef[] {
  if (typeof window === 'undefined') {
    return DEFAULT_NAVIGATION_FIELDS;
  }
  try {
    const raw = window.localStorage.getItem(DYNAMIC_NAV_FIELDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, NavigationFieldDef>();
        DEFAULT_NAVIGATION_FIELDS.forEach((f) => map.set(f.id, f));
        parsed.forEach((f: any) => {
          if (f && typeof f.id === 'string' && f.id.trim()) {
            const cleanId = f.id.trim();
            map.set(cleanId, {
              id: cleanId,
              label: f.label || cleanId,
              description: f.description || `Access to ${f.label || cleanId} page`,
              iconName: f.iconName || 'Globe',
              icon: f.icon,
            });
          }
        });
        return Array.from(map.values());
      }
    }
  } catch {}
  return DEFAULT_NAVIGATION_FIELDS;
}

export function getAllNavigationFieldIds(): NavigationField[] {
  return getRegisteredNavigationFields().map((f) => f.id);
}

export const SIDEBAR_NAV_ORDER_STORAGE_KEY = 'nexora_sidebar_nav_order';

/**
 * Returns navigation fields ordered by the user's custom persisted drag-and-drop order.
 * Falls back to registered order if no custom order is stored.
 */
export function getOrderedNavigationFields(): NavigationFieldDef[] {
  const fields = getRegisteredNavigationFields();
  if (typeof window === 'undefined') return fields;

  try {
    const raw = window.localStorage.getItem(SIDEBAR_NAV_ORDER_STORAGE_KEY);
    if (raw) {
      const orderIds: string[] = JSON.parse(raw);
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        const fieldMap = new Map<string, NavigationFieldDef>();
        fields.forEach((f) => fieldMap.set(f.id, f));

        const ordered: NavigationFieldDef[] = [];
        orderIds.forEach((id) => {
          const found = fieldMap.get(id);
          if (found) {
            ordered.push(found);
            fieldMap.delete(id);
          }
        });

        // Append any newly registered or missing fields in natural order
        fieldMap.forEach((f) => ordered.push(f));
        return ordered;
      }
    }
  } catch {}

  return fields;
}

/**
 * Persists custom sidebar drag-and-drop menu order to localStorage.
 */
export function saveSidebarNavOrder(orderIds: string[]): void {
  if (typeof window === 'undefined' || !Array.isArray(orderIds)) return;
  try {
    window.localStorage.setItem(SIDEBAR_NAV_ORDER_STORAGE_KEY, JSON.stringify(orderIds));
    window.dispatchEvent(new CustomEvent('nexora_nav_order_updated', { detail: { orderIds } }));
  } catch {}
}

/**
 * Dynamically register a new navigation field in the navbar.
 * Automatically saves it and applies it to existing users in storage.
 */
export function registerDynamicNavigationField(
  field: NavigationFieldDef, 
  applyToExistingUsers = true
): NavigationFieldDef[] {
  if (typeof window === 'undefined') return DEFAULT_NAVIGATION_FIELDS;

  const current = getRegisteredNavigationFields();
  const existingIndex = current.findIndex((f) => f.id === field.id);
  let updatedList: NavigationFieldDef[];
  if (existingIndex >= 0) {
    updatedList = current.map((f, i) => (i === existingIndex ? { ...f, ...field } : f));
  } else {
    updatedList = [...current, field];
  }

  // Persist any non-default dynamic fields to localStorage
  const customOnly = updatedList.filter(
    (f) => !DEFAULT_NAVIGATION_FIELDS.some((df) => df.id === f.id && df.label === f.label)
  );
  window.localStorage.setItem(DYNAMIC_NAV_FIELDS_STORAGE_KEY, JSON.stringify(customOnly));

  // Automatically apply to existing users in localStorage
  if (applyToExistingUsers) {
    applyNavFieldToExistingUsers(field.id);
  }

  // Notify listeners across components
  window.dispatchEvent(new CustomEvent('nexora_nav_fields_updated', { detail: { field } }));
  window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));

  return updatedList;
}

/**
 * Adds the specified navigation field to existing users in workspace storage.
 */
export function applyNavFieldToExistingUsers(fieldId: string) {
  if (typeof window === 'undefined' || !fieldId) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const users = JSON.parse(raw);
    if (!Array.isArray(users)) return;

    let modified = false;
    const updatedUsers = users.map((u: any) => {
      if (!u) return u;
      const currentPerms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
      if (!currentPerms.includes(fieldId)) {
        modified = true;
        return {
          ...u,
          permissions: [...currentPerms, fieldId],
        };
      }
      return u;
    });

    if (modified) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
    }
  } catch {}
}

export function isUserAdminOrOwner(user: any, ownerEmail?: string | null): boolean {
  if (!user) return false;
  if (typeof user === 'string') {
    const lower = user.toLowerCase().trim();
    const owner = (ownerEmail || '').toLowerCase().trim();
    return (
      (owner && lower === owner) ||
      lower === 'sivaji491@gmail.com' ||
      lower === 'sivaji' ||
      lower.includes('sivaji') ||
      lower === 'preview@nexora.example' ||
      lower === 'usr-owner' ||
      lower === 'usr-1' ||
      lower === 'admin' ||
      lower === 'owner'
    );
  }
  const email = (user.email || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  const id = (user.id || '').toLowerCase().trim();
  const role = (user.role || '').toLowerCase().trim();
  const owner = (ownerEmail || '').toLowerCase().trim();
  return (
    (owner && (email === owner || username === owner)) ||
    email === 'sivaji491@gmail.com' ||
    username === 'sivaji' ||
    email.includes('sivaji') ||
    username.includes('sivaji') ||
    email === 'preview@nexora.example' ||
    id === 'usr-owner' ||
    id === 'usr-1' ||
    role === 'owner' ||
    role === 'admin'
  );
}

export function getUserAllowedTabs(identifier?: string | null): NavigationField[] {
  const allFieldIds = getAllNavigationFieldIds();
  if (typeof window === 'undefined') return allFieldIds;
  if (!identifier) return [];

  const lower = identifier.toLowerCase().trim();
  // Workspace primary admin always has full access to all navigation tabs
  if (
    lower === 'sivaji491@gmail.com' || 
    lower === 'sivaji' ||
    lower === 'preview@nexora.example' ||
    lower.includes('sivaji') ||
    isUserAdminOrOwner(lower, 'sivaji491@gmail.com')
  ) {
    return allFieldIds;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const users = JSON.parse(raw);
      if (Array.isArray(users)) {
        const found = users.find(
          (u: any) =>
            u &&
            ((u.username && u.username.toLowerCase().trim() === lower) ||
              (u.email && u.email.toLowerCase().trim() === lower) ||
              (u.name && u.name.toLowerCase().trim() === lower))
        );
        if (found) {
          if (isUserAdminOrOwner(found, 'sivaji491@gmail.com')) {
            return allFieldIds;
          }
          if (Array.isArray(found.permissions)) {
            // Return only the exact navigation tabs checked by the admin for this user
            return found.permissions;
          }
          return [];
        }
      }
    } catch {}
  }

  // Principle of least privilege: unknown, missing, or unconfigured users have NO access by default
  return [];
}

/**
 * Checks if a specific page or module is granted to the user.
 */
export function isPageAllowed(identifier: string | null | undefined, pageId: string): boolean {
  if (!pageId) return false;
  if (isUserAdminOrOwner(identifier, 'sivaji491@gmail.com')) return true;
  const allowed = getUserAllowedTabs(identifier);
  return allowed.includes(pageId);
}

/**
 * Returns the primary accessible landing page for a user.
 * Returns null if user has no granted permissions.
 */
export function getAccessibleLandingPage(identifier: string | null | undefined): string | null {
  if (isUserAdminOrOwner(identifier, 'sivaji491@gmail.com')) return 'home';
  const allowed = getUserAllowedTabs(identifier).filter((t) => t !== 'status');
  if (allowed.length === 0) return null;
  if (allowed.includes('home')) return 'home';
  return allowed[0] || null;
}

/**
 * Filters a list of navigation items against granted permissions.
 * Strips out any unauthorized entries without leaving empty gaps or disabled placeholders.
 */
export function filterAllowedNavigation<T extends { id: string }>(items: T[], allowedTabs: string[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => allowedTabs.includes(item.id));
}
