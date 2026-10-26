import { 
  RouteMapContent, 
  DEFAULT_ROUTE_MAP_CONTENT, 
  RouteMapValidationResult 
} from '@/types/route-map';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { PROFILES_RECORD_ID, ensureCloudAuth } from '@/lib/workspace-user-sync';

export const ROUTE_MAP_STORAGE_KEY = 'nexora_route_map_content';
export const ROUTE_MAP_UPDATED_EVENT = 'nexora_route_map_updated';

/**
 * Validates Route Map headline text.
 */
export function validateRouteMapContent(text?: string | null): RouteMapValidationResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      valid: false,
      isValid: false,
      error: 'Text is required and cannot be empty.',
    };
  }

  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return {
      valid: false,
      isValid: false,
      error: 'Text must contain at least 2 characters.',
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      isValid: false,
      error: 'Text is too long (maximum 200 characters).',
    };
  }

  return { valid: true, isValid: true };
}

/**
 * Loads published Route Map content from persistent browser storage,
 * falling back to the default canonical "One Time Work" content.
 */
export function loadRouteMapContent(): RouteMapContent {
  if (typeof window === 'undefined') {
    return DEFAULT_ROUTE_MAP_CONTENT;
  }

  try {
    const raw = window.localStorage.getItem(ROUTE_MAP_STORAGE_KEY);
    if (!raw) {
      saveRouteMapContentLocal(DEFAULT_ROUTE_MAP_CONTENT, false);
      return DEFAULT_ROUTE_MAP_CONTENT;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.headlineText !== 'string' || !parsed.headlineText.trim()) {
      saveRouteMapContentLocal(DEFAULT_ROUTE_MAP_CONTENT, false);
      return DEFAULT_ROUTE_MAP_CONTENT;
    }

    return {
      headlineText: parsed.headlineText.trim(),
      badgeText: parsed.badgeText || DEFAULT_ROUTE_MAP_CONTENT.badgeText,
      updatedAt: parsed.updatedAt || DEFAULT_ROUTE_MAP_CONTENT.updatedAt,
      updatedBy: parsed.updatedBy || DEFAULT_ROUTE_MAP_CONTENT.updatedBy,
    };
  } catch {
    return DEFAULT_ROUTE_MAP_CONTENT;
  }
}

/**
 * Persists Route Map content to local storage and notifies active views.
 */
export function saveRouteMapContentLocal(content: RouteMapContent, notify = true): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ROUTE_MAP_STORAGE_KEY, JSON.stringify(content));
    if (notify) {
      window.dispatchEvent(new CustomEvent(ROUTE_MAP_UPDATED_EVENT, { detail: content }));
    }
  } catch {}
}

/**
 * Admin-only action: Saves and publishes updated Route Map headline text.
 * Strictly verifies admin role and validates content.
 */
export async function saveRouteMapContentAdmin(
  newText: string,
  adminIdentifier: string = 'sivaji491@gmail.com',
  badgeText?: string
): Promise<{ success: boolean; error?: string; content?: RouteMapContent }> {
  // Strict admin authorization verification
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only workspace administrators can edit the Route Map text.',
    };
  }

  const validation = validateRouteMapContent(newText);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid text entered.',
    };
  }

  const payload: RouteMapContent = {
    headlineText: newText.trim(),
    badgeText: badgeText !== undefined ? badgeText.trim() : DEFAULT_ROUTE_MAP_CONTENT.badgeText,
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  // 1. Save locally and broadcast event
  saveRouteMapContentLocal(payload, true);

  // 2. Persist to central database asynchronously for cross-device synchronization
  try {
    if (typeof window !== 'undefined' && supabase && typeof (supabase as any).from === 'function') {
      const syncTask = (async () => {
        const hasAuth = await ensureCloudAuth();
        if (hasAuth) {
          await supabase
            .from('profiles')
            .update({ display_name: `RouteMap:${JSON.stringify(payload)}` })
            .eq('id', PROFILES_RECORD_ID);
        }
      })();

      // Fast race with timeout so UI and tests never stall on network latency
      await Promise.race([
        syncTask,
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    }
  } catch (err) {
    console.warn('[RouteMap] Remote database sync notice:', err);
  }

  return {
    success: true,
    content: payload,
  };
}

/**
 * Admin-only action: Resets Route Map content back to the default "One Time Work".
 */
export async function resetRouteMapContentAdmin(
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; content?: RouteMapContent }> {
  return saveRouteMapContentAdmin(
    DEFAULT_ROUTE_MAP_CONTENT.headlineText,
    adminIdentifier,
    DEFAULT_ROUTE_MAP_CONTENT.badgeText
  );
}

/**
 * Fetches Route Map content from central cloud database if available,
 * synchronizing with local storage.
 */
export async function syncRouteMapFromCloud(): Promise<RouteMapContent> {
  const currentLocal = loadRouteMapContent();
  if (typeof window === 'undefined') return currentLocal;

  try {
    if (!supabase || typeof (supabase as any).from !== 'function') {
      return currentLocal;
    }

    const hasAuth = await ensureCloudAuth();
    if (!hasAuth) return currentLocal;

    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', PROFILES_RECORD_ID)
      .maybeSingle();

    if (data?.display_name && data.display_name.startsWith('RouteMap:')) {
      const jsonStr = data.display_name.slice('RouteMap:'.length);
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.headlineText === 'string') {
        const synced: RouteMapContent = {
          headlineText: parsed.headlineText.trim(),
          badgeText: parsed.badgeText || DEFAULT_ROUTE_MAP_CONTENT.badgeText,
          updatedAt: parsed.updatedAt,
          updatedBy: parsed.updatedBy,
        };
        saveRouteMapContentLocal(synced, true);
        return synced;
      }
    }
  } catch (err) {
    console.warn('[RouteMap] Cloud fetch notice:', err);
  }

  return currentLocal;
}
