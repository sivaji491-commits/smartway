import { createServerFn } from '@tanstack/react-start';
import { HomePageData, DEFAULT_HOME_PAGE_DATA } from '../types/home-page';
import { 
  validateHomePageData,
  loadPublishedHomePage,
  savePublishedHomePageLocal
} from '../lib/home-page-storage';
import { isUserAdminOrOwner } from '../lib/permissions';

export interface HomePageServerResult {
  success: boolean;
  error?: string;
  data?: HomePageData;
}

/**
 * Server-side authoritative fetch of published Real Estate Home Page data.
 */
export function getHomePageServerState(): HomePageData {
  return loadPublishedHomePage();
}

/**
 * Server-side authoritative validation and publishing.
 * Strictly verifies administrator role server-side.
 */
export function validateAndPublishHomePageServer(
  adminIdentifier: string,
  payload: HomePageData
): HomePageServerResult {
  // Enforce server-side role check
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only authorized administrators can publish Home Page changes.',
    };
  }

  const validation = validateHomePageData(payload);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid home page payload.',
    };
  }

  const updated: HomePageData = {
    ...payload,
    status: 'published',
    version: (payload.version || 1) + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  savePublishedHomePageLocal(updated);

  return {
    success: true,
    data: updated,
  };
}

// TanStack Start Server Functions (RPC endpoints)
export const getHomePageFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return getHomePageServerState();
  });

export const publishHomePageFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; payload: HomePageData }) => data)
  .handler(async ({ data }) => {
    return validateAndPublishHomePageServer(data.adminIdentifier, data.payload);
  });
