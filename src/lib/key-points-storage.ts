import { 
  KeyPointItem, 
  DEFAULT_KEY_POINTS,
  ValidationResult
} from '@/types/key-points';
import { isUserAdminOrOwner } from '@/lib/permissions';

export const KEY_POINTS_STORAGE_KEY = 'nexora_key_points_store_v1';
export const KEY_POINTS_UPDATED_EVENT = 'nexora_key_points_updated';

/**
 * Validates the key point text entry.
 */
export function validateKeyPointText(text?: string | null): ValidationResult {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      valid: false,
      error: 'Key point text is required and cannot be empty.',
    };
  }

  if (text.trim().length < 3) {
    return {
      valid: false,
      error: 'Key point text must contain at least 3 characters.',
    };
  }

  return { valid: true };
}

/**
 * Loads all key points from persistent storage, falling back to defaults.
 */
export function loadKeyPoints(): KeyPointItem[] {
  if (typeof window === 'undefined') {
    return DEFAULT_KEY_POINTS;
  }

  try {
    const raw = window.localStorage.getItem(KEY_POINTS_STORAGE_KEY);
    if (!raw) {
      saveKeyPointsLocal(DEFAULT_KEY_POINTS, false);
      return DEFAULT_KEY_POINTS;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    saveKeyPointsLocal(DEFAULT_KEY_POINTS, false);
    return DEFAULT_KEY_POINTS;
  } catch {
    return DEFAULT_KEY_POINTS;
  }
}

/**
 * Persists key points list to localStorage and notifies listeners.
 */
export function saveKeyPointsLocal(items: KeyPointItem[], notify = true): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(KEY_POINTS_STORAGE_KEY, JSON.stringify(items));
    if (notify) {
      window.dispatchEvent(new CustomEvent(KEY_POINTS_UPDATED_EVENT, { detail: { items } }));
    }
  } catch {}
}

/**
 * Adds a new key point (Admin only).
 */
export function addKeyPoint(
  text: string, 
  userIdentifier: string, 
  category = 'General'
): { success: boolean; error?: string; item?: KeyPointItem } {
  // Enforce role permission
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can add key points.',
    };
  }

  const validation = validateKeyPointText(text);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const current = loadKeyPoints();
  const nextPointNumber = current.length > 0 
    ? Math.max(...current.map((k) => k.pointNumber || 0)) + 1 
    : 1;

  const newItem: KeyPointItem = {
    id: `kp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    pointNumber: nextPointNumber,
    text: text.trim(),
    category: category.trim() || 'General',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userIdentifier,
  };

  const updated = [...current, newItem];
  saveKeyPointsLocal(updated, true);

  return {
    success: true,
    item: newItem,
  };
}

/**
 * Updates an existing key point (Admin only).
 */
export function updateKeyPoint(
  id: string, 
  text: string, 
  userIdentifier: string, 
  category?: string
): { success: boolean; error?: string; item?: KeyPointItem } {
  // Enforce role permission
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can edit key points.',
    };
  }

  const validation = validateKeyPointText(text);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const current = loadKeyPoints();
  const idx = current.findIndex((k) => k.id === id);
  if (idx === -1) {
    return {
      success: false,
      error: 'Key point not found.',
    };
  }

  const updatedItem: KeyPointItem = {
    ...current[idx],
    text: text.trim(),
    category: category !== undefined ? category.trim() : current[idx].category,
    updatedAt: new Date().toISOString(),
  };

  const updated = [...current];
  updated[idx] = updatedItem;
  saveKeyPointsLocal(updated, true);

  return {
    success: true,
    item: updatedItem,
  };
}

/**
 * Deletes a key point (Admin only) and re-indexes point numbers.
 */
export function deleteKeyPoint(
  id: string, 
  userIdentifier: string
): { success: boolean; error?: string } {
  // Enforce role permission
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can delete key points.',
    };
  }

  const current = loadKeyPoints();
  const exists = current.some((k) => k.id === id);
  if (!exists) {
    return {
      success: false,
      error: 'Key point not found.',
    };
  }

  const filtered = current.filter((k) => k.id !== id);
  // Re-index remaining points cleanly (1, 2, 3...)
  const reindexed = filtered.map((k, index) => ({
    ...k,
    pointNumber: index + 1,
  }));

  saveKeyPointsLocal(reindexed, true);

  return {
    success: true,
  };
}

/**
 * Moves a key point up one position (Admin only).
 */
export function moveKeyPointUp(
  id: string, 
  userIdentifier: string
): { success: boolean; error?: string; items?: KeyPointItem[] } {
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reorder key points.',
    };
  }

  const current = loadKeyPoints();
  const idx = current.findIndex((k) => k.id === id);
  if (idx <= 0) {
    return {
      success: false,
      error: 'Cannot move up: item is already at the top.',
    };
  }

  const updated = [...current];
  const temp = updated[idx];
  updated[idx] = updated[idx - 1];
  updated[idx - 1] = temp;

  const reindexed = updated.map((k, index) => ({
    ...k,
    pointNumber: index + 1,
  }));

  saveKeyPointsLocal(reindexed, true);

  return {
    success: true,
    items: reindexed,
  };
}

/**
 * Moves a key point down one position (Admin only).
 */
export function moveKeyPointDown(
  id: string, 
  userIdentifier: string
): { success: boolean; error?: string; items?: KeyPointItem[] } {
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reorder key points.',
    };
  }

  const current = loadKeyPoints();
  const idx = current.findIndex((k) => k.id === id);
  if (idx === -1 || idx >= current.length - 1) {
    return {
      success: false,
      error: 'Cannot move down: item is already at the bottom.',
    };
  }

  const updated = [...current];
  const temp = updated[idx];
  updated[idx] = updated[idx + 1];
  updated[idx + 1] = temp;

  const reindexed = updated.map((k, index) => ({
    ...k,
    pointNumber: index + 1,
  }));

  saveKeyPointsLocal(reindexed, true);

  return {
    success: true,
    items: reindexed,
  };
}

/**
 * Persists an entirely new order of key points by id array (Admin only).
 * Supports drag-and-drop reordering.
 */
export function reorderKeyPoints(
  orderedIds: string[], 
  userIdentifier: string
): { success: boolean; error?: string; items?: KeyPointItem[] } {
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reorder key points.',
    };
  }

  if (!Array.isArray(orderedIds)) {
    return {
      success: false,
      error: 'Invalid order list provided.',
    };
  }

  const current = loadKeyPoints();
  const map = new Map<string, KeyPointItem>();
  current.forEach((k) => map.set(k.id, k));

  const reordered: KeyPointItem[] = [];
  orderedIds.forEach((id) => {
    const item = map.get(id);
    if (item) {
      reordered.push(item);
      map.delete(id);
    }
  });

  // Append any missing items
  map.forEach((item) => reordered.push(item));

  const reindexed = reordered.map((k, index) => ({
    ...k,
    pointNumber: index + 1,
  }));

  saveKeyPointsLocal(reindexed, true);

  return {
    success: true,
    items: reindexed,
  };
}

/**
 * Resets key points to system defaults (Admin only).
 */
export function resetKeyPointsDefaults(
  userIdentifier: string
): { success: boolean; error?: string } {
  if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reset key points.',
    };
  }

  saveKeyPointsLocal(DEFAULT_KEY_POINTS, true);
  return { success: true };
}
