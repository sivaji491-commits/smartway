import { createServerFn } from '@tanstack/react-start';
import { 
  EarningOpportunitiesData, 
  DEFAULT_EARNING_OPPORTUNITIES 
} from '../types/earning-opportunities';
import { 
  validateEarningOpportunities,
  loadEarningOpportunities,
  saveEarningOpportunitiesLocal
} from '../lib/earning-opportunities-storage';
import { isUserAdminOrOwner } from '../lib/permissions';

export interface EarningOpportunitiesServerResult {
  success: boolean;
  error?: string;
  data?: EarningOpportunitiesData;
}

/**
 * Server-side authoritative fetch of Source Structure / Earning Opportunities.
 */
export function getEarningOpportunitiesServerState(): EarningOpportunitiesData {
  return loadEarningOpportunities();
}

/**
 * Server-side authoritative validation and update.
 * Strictly verifies the administrator role server-side.
 */
export function validateAndUpdateEarningOpportunitiesServer(
  adminIdentifier: string,
  payload: EarningOpportunitiesData
): EarningOpportunitiesServerResult {
  // Enforce server-side role check
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only authorized administrators can update the Source Structure configuration.',
    };
  }

  const validation = validateEarningOpportunities(payload);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid configuration payload.',
    };
  }

  const updated: EarningOpportunitiesData = {
    heading: payload.heading.trim(),
    subtitle: (payload.subtitle || '').trim(),
    items: payload.items.map((item, idx) => ({
      ...item,
      number: idx + 1,
      title: item.title.trim(),
      description: item.description.trim(),
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  saveEarningOpportunitiesLocal(updated);

  return {
    success: true,
    data: updated,
  };
}

// TanStack Start Server Functions (RPC endpoints)
export const getEarningOpportunitiesFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return getEarningOpportunitiesServerState();
  });

export const updateEarningOpportunitiesFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; payload: EarningOpportunitiesData }) => data)
  .handler(async ({ data }) => {
    return validateAndUpdateEarningOpportunitiesServer(data.adminIdentifier, data.payload);
  });
