import { NoticeItem, DEFAULT_NOTICES } from '@/types/notice';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { HOME_PAGE_PUBLISHED_KEY } from '@/lib/home-page-storage';
import { supabase } from '@/integrations/supabase/client';

export const NOTICE_STORAGE_KEY = 'nexora_admin_notices_v1';
export const NOTICE_UPDATED_EVENT = 'nexora_notices_updated';

export interface NoticeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates notice message input.
 */
export function validateNoticeText(text?: string | null): NoticeValidationResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      valid: false,
      error: 'Notice message is required and cannot be empty.',
    };
  }

  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return {
      valid: false,
      error: 'Notice message must contain at least 3 characters.',
    };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      error: 'Notice message cannot exceed 500 characters.',
    };
  }

  return { valid: true };
}

/**
 * Loads all notices from local persistent storage or default seeded announcements.
 */
export function loadNotices(): NoticeItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTICES;
  }

  try {
    const raw = window.localStorage.getItem(NOTICE_STORAGE_KEY);
    if (!raw) {
      // Check if home page published data has a custom marqueeText to initialize with
      const homeRaw = window.localStorage.getItem(HOME_PAGE_PUBLISHED_KEY);
      if (homeRaw) {
        try {
          const homeParsed = JSON.parse(homeRaw);
          if (homeParsed?.marqueeText && typeof homeParsed.marqueeText === 'string' && homeParsed.marqueeText.trim()) {
            const initial: NoticeItem[] = [
              {
                id: 'notice-initial',
                text: homeParsed.marqueeText.trim(),
                createdAt: new Date().toISOString(),
                isActive: true,
              },
            ];
            saveNoticesLocal(initial, false);
            return initial;
          }
        } catch {}
      }

      saveNoticesLocal(DEFAULT_NOTICES, false);
      return DEFAULT_NOTICES;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, idx: number) => ({
        id: item.id || `notice-${idx + 1}`,
        text: String(item.text || '').trim(),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt,
        isActive: item.isActive !== false,
      })).filter((n) => Boolean(n.text));
    }

    return DEFAULT_NOTICES;
  } catch (err) {
    console.error('Failed to load notices from persistent storage:', err);
    return DEFAULT_NOTICES;
  }
}

/**
 * Persists notices locally and synchronizes the published home page marquee text.
 */
export function saveNoticesLocal(items: NoticeItem[], notify = true): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(items));

    // Synchronize with Home Page published data marqueeText
    try {
      const activeTexts = items.filter((n) => n.isActive !== false).map((n) => n.text);
      const combinedText = activeTexts.length > 0 ? activeTexts.join('   ✦   ') : '';
      const homeRaw = window.localStorage.getItem(HOME_PAGE_PUBLISHED_KEY);
      if (homeRaw) {
        const homeParsed = JSON.parse(homeRaw);
        if (homeParsed && typeof homeParsed === 'object') {
          homeParsed.marqueeText = combinedText || DEFAULT_NOTICES[0].text;
          window.localStorage.setItem(HOME_PAGE_PUBLISHED_KEY, JSON.stringify(homeParsed));
        }
      }
    } catch {}

    if (notify) {
      window.dispatchEvent(new CustomEvent(NOTICE_UPDATED_EVENT, { detail: { notices: items } }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.error('Failed to save notices locally:', err);
  }
}

/**
 * Adds a new notice message (Admin only).
 */
export async function addNoticeAdmin(
  text: string,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; notices?: NoticeItem[]; notice?: NoticeItem }> {
  // Enforce admin permission on the backend / storage layer
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators are authorized to create notices.',
    };
  }

  const validation = validateNoticeText(text);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid notice message.',
    };
  }

  const current = loadNotices();
  const newNotice: NoticeItem = {
    id: `notice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  const updated = [...current, newNotice];
  saveNoticesLocal(updated, true);

  // Background Cloud/Database sync if connected
  syncNoticesToCloud(updated, adminIdentifier).catch(() => {});

  return {
    success: true,
    notices: updated,
    notice: newNotice,
  };
}

/**
 * Updates an existing notice message (Admin only).
 */
export async function updateNoticeAdmin(
  id: string,
  text: string,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; notices?: NoticeItem[] }> {
  // Enforce admin permission
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators are authorized to update notices.',
    };
  }

  const validation = validateNoticeText(text);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid notice message.',
    };
  }

  const current = loadNotices();
  const index = current.findIndex((n) => n.id === id);
  if (index === -1) {
    return {
      success: false,
      error: 'Notice not found.',
    };
  }

  const updated = [...current];
  updated[index] = {
    ...updated[index],
    text: text.trim(),
    updatedAt: new Date().toISOString(),
  };

  saveNoticesLocal(updated, true);
  syncNoticesToCloud(updated, adminIdentifier).catch(() => {});

  return {
    success: true,
    notices: updated,
  };
}

/**
 * Deletes a notice message (Admin only).
 */
export async function deleteNoticeAdmin(
  id: string,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; notices?: NoticeItem[] }> {
  // Enforce admin permission
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators are authorized to delete notices.',
    };
  }

  const current = loadNotices();
  const filtered = current.filter((n) => n.id !== id);

  saveNoticesLocal(filtered, true);
  syncNoticesToCloud(filtered, adminIdentifier).catch(() => {});

  return {
    success: true,
    notices: filtered,
  };
}

/**
 * Toggles a notice active status (Admin only).
 */
export async function toggleNoticeStatusAdmin(
  id: string,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; notices?: NoticeItem[] }> {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators are authorized to modify notices.',
    };
  }

  const current = loadNotices();
  const updated = current.map((n) => (n.id === id ? { ...n, isActive: !n.isActive } : n));

  saveNoticesLocal(updated, true);
  syncNoticesToCloud(updated, adminIdentifier).catch(() => {});

  return {
    success: true,
    notices: updated,
  };
}

/**
 * Restores factory default notices (Admin only).
 */
export async function resetNoticesDefaultsAdmin(
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; notices?: NoticeItem[] }> {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reset notices.',
    };
  }

  saveNoticesLocal(DEFAULT_NOTICES, true);
  syncNoticesToCloud(DEFAULT_NOTICES, adminIdentifier).catch(() => {});

  return {
    success: true,
    notices: DEFAULT_NOTICES,
  };
}

/**
 * Background cloud persistence helper (non-blocking).
 */
async function syncNoticesToCloud(items: NoticeItem[], adminIdentifier: string): Promise<void> {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return;
  try {
    if ((supabase as any)?.from) {
      await (supabase as any)
        .from('system_settings')
        .upsert(
          {
            key: NOTICE_STORAGE_KEY,
            value: items,
            updated_at: new Date().toISOString(),
            updated_by: adminIdentifier,
          },
          { onConflict: 'key' }
        );
    }
  } catch (err) {
    console.warn('[NoticeStorage] Cloud database synchronization notice:', err);
  }
}
