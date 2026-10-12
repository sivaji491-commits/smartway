import { createServerFn } from '@tanstack/react-start';
import { 
  KeyPointItem, 
  DEFAULT_KEY_POINTS,
  KeyPointsServerResult 
} from '../types/key-points';
import { 
  loadKeyPoints, 
  addKeyPoint, 
  updateKeyPoint, 
  deleteKeyPoint,
  validateKeyPointText,
  moveKeyPointUp,
  moveKeyPointDown,
  reorderKeyPoints
} from '../lib/key-points-storage';
import { isUserAdminOrOwner } from '../lib/permissions';

/**
 * Authoritative server-side retrieval of key points.
 */
export function getKeyPointsServerState(): KeyPointItem[] {
  return loadKeyPoints();
}

/**
 * Authoritative server-side addition of a key point.
 * Strictly verifies administrator role on the server.
 */
export function addKeyPointServer(
  adminIdentifier: string,
  text: string,
  category?: string
): KeyPointsServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can add key points on the backend.',
    };
  }

  const validation = validateKeyPointText(text);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const result = addKeyPoint(text, adminIdentifier, category);
  return {
    success: result.success,
    error: result.error,
    data: result.item,
  };
}

/**
 * Authoritative server-side update of a key point.
 * Strictly verifies administrator role on the server.
 */
export function updateKeyPointServer(
  adminIdentifier: string,
  id: string,
  text: string,
  category?: string
): KeyPointsServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can update key points on the backend.',
    };
  }

  const validation = validateKeyPointText(text);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const result = updateKeyPoint(id, text, adminIdentifier, category);
  return {
    success: result.success,
    error: result.error,
    data: result.item,
  };
}

/**
 * Authoritative server-side deletion of a key point.
 * Strictly verifies administrator role on the server.
 */
export function deleteKeyPointServer(
  adminIdentifier: string,
  id: string
): KeyPointsServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can delete key points on the backend.',
    };
  }

  const result = deleteKeyPoint(id, adminIdentifier);
  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Authoritative server-side reordering of key points.
 * Strictly verifies administrator role on the server.
 */
export function reorderKeyPointsServer(
  adminIdentifier: string,
  orderedIds: string[]
): KeyPointsServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reorder key points on the backend.',
    };
  }

  const result = reorderKeyPoints(orderedIds, adminIdentifier);
  return {
    success: result.success,
    error: result.error,
    data: result.items,
  };
}

/**
 * Authoritative server-side moving of a key point up.
 */
export function moveKeyPointUpServer(
  adminIdentifier: string,
  id: string
): KeyPointsServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reorder key points on the backend.',
    };
  }

  const result = moveKeyPointUp(id, adminIdentifier);
  return {
    success: result.success,
    error: result.error,
    data: result.items,
  };
}

/**
 * Authoritative server-side moving of a key point down.
 */
export function moveKeyPointDownServer(
  adminIdentifier: string,
  id: string
): KeyPointsServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can reorder key points on the backend.',
    };
  }

  const result = moveKeyPointDown(id, adminIdentifier);
  return {
    success: result.success,
    error: result.error,
    data: result.items,
  };
}

// TanStack Start RPC Endpoints
export const getKeyPointsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return getKeyPointsServerState();
  });

export const addKeyPointFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; text: string; category?: string }) => data)
  .handler(async ({ data }) => {
    return addKeyPointServer(data.adminIdentifier, data.text, data.category);
  });

export const updateKeyPointFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; id: string; text: string; category?: string }) => data)
  .handler(async ({ data }) => {
    return updateKeyPointServer(data.adminIdentifier, data.id, data.text, data.category);
  });

export const deleteKeyPointFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; id: string }) => data)
  .handler(async ({ data }) => {
    return deleteKeyPointServer(data.adminIdentifier, data.id);
  });

export const reorderKeyPointsFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; orderedIds: string[] }) => data)
  .handler(async ({ data }) => {
    return reorderKeyPointsServer(data.adminIdentifier, data.orderedIds);
  });
