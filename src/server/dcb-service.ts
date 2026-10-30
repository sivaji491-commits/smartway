import { createServerFn } from '@tanstack/react-start';
import { DcbConfig, DcbServerResult } from '../types/dcb-bonus';
import {
  loadDcbConfig,
  saveDcbConfigLocal,
  validateDcbConfig,
  DEFAULT_DCB_CONFIG
} from '../lib/dcb-storage';
import { isUserAdminOrOwner } from '../lib/permissions';

/**
 * Server-side authoritative fetch of DCB (90 days) configuration.
 */
export function getDcbServerConfig(): DcbConfig {
  return loadDcbConfig();
}

/**
 * Server-side authoritative validation and save of DCB configuration.
 * Strictly verifies administrator role server-side and rejects regular users.
 */
export function updateDcbConfigServer(
  adminIdentifier: string,
  payload: DcbConfig
): DcbServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit the DCB (90 days) configuration.',
    };
  }

  const validation = validateDcbConfig(payload);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid configuration payload.',
    };
  }

  const sanitized: DcbConfig = {
    ref1Percentage: Number(payload.ref1Percentage),
    ref2Percentage: Number(payload.ref2Percentage),
    dcbReleasePercentage: Number(payload.dcbReleasePercentage),
    withdrawalFeePercentage: Number(payload.withdrawalFeePercentage),
    eligibilityPeriodDays: Math.round(Number(payload.eligibilityPeriodDays)),
    subtitle: payload.subtitle?.trim() || DEFAULT_DCB_CONFIG.subtitle,
    importantPoints: Array.isArray(payload.importantPoints) && payload.importantPoints.length > 0
      ? payload.importantPoints.map((p) => String(p).trim()).filter(Boolean)
      : DEFAULT_DCB_CONFIG.importantPoints,
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  saveDcbConfigLocal(sanitized);

  return {
    success: true,
    data: sanitized,
  };
}

/**
 * Server-side authoritative reset of DCB configuration to factory defaults.
 * Strictly verifies administrator role server-side and rejects regular users.
 */
export function resetDcbConfigServer(
  adminIdentifier: string
): DcbServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to reset the DCB configuration.',
    };
  }

  const resetConfig: DcbConfig = {
    ...DEFAULT_DCB_CONFIG,
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  saveDcbConfigLocal(resetConfig);

  return {
    success: true,
    data: resetConfig,
  };
}

// Server functions for TanStack Start RPC
export const getDcbConfigFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return getDcbServerConfig();
  });

export const updateDcbConfigFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string; config: DcbConfig }) => data)
  .handler(async ({ data }) => {
    return updateDcbConfigServer(data.adminIdentifier, data.config);
  });

export const resetDcbConfigFn = createServerFn({ method: 'POST' })
  .validator((data: { adminIdentifier: string }) => data)
  .handler(async ({ data }) => {
    return resetDcbConfigServer(data.adminIdentifier);
  });
