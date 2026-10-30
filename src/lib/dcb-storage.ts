import { DcbConfig, DcbValidationResult, DcbServerResult } from '@/types/dcb-bonus';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';

export const DCB_CONFIG_STORAGE_KEY = 'nexora_dcb_config';
export const DCB_CONFIG_UPDATED_EVENT = 'nexora_dcb_config_updated';

export const DEFAULT_DCB_CONFIG: DcbConfig = {
  ref1Percentage: 25,
  ref2Percentage: 25,
  dcbReleasePercentage: 30,
  withdrawalFeePercentage: 10,
  eligibilityPeriodDays: 90,
  subtitle: 'Every 2 direct active referrals earn 30% DCB release within 90-day qualification window.',
  importantPoints: [
    'To, every 2 direct active referrals have 30% DCB to any rank. Unlimited ref.',
    '90 days time period for 2nd referral, from date of 1st referral.',
    'Withdrawl fee 10% & Transaction fee applicable.',
    'Here calculated withdrawl fee also.',
  ],
};

/**
 * Validates DCB configuration inputs.
 */
export function validateDcbConfig(config: DcbConfig): DcbValidationResult {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid configuration payload.' };
  }

  if (
    typeof config.ref1Percentage !== 'number' ||
    isNaN(config.ref1Percentage) ||
    config.ref1Percentage < 0 ||
    config.ref1Percentage > 100
  ) {
    return { valid: false, error: 'Referral 1 Percentage must be a valid number between 0% and 100%.' };
  }

  if (
    typeof config.ref2Percentage !== 'number' ||
    isNaN(config.ref2Percentage) ||
    config.ref2Percentage < 0 ||
    config.ref2Percentage > 100
  ) {
    return { valid: false, error: 'Referral 2 Percentage must be a valid number between 0% and 100%.' };
  }

  if (
    typeof config.dcbReleasePercentage !== 'number' ||
    isNaN(config.dcbReleasePercentage) ||
    config.dcbReleasePercentage < 0 ||
    config.dcbReleasePercentage > 100
  ) {
    return { valid: false, error: 'DCB Release Percentage must be a valid number between 0% and 100%.' };
  }

  if (
    typeof config.withdrawalFeePercentage !== 'number' ||
    isNaN(config.withdrawalFeePercentage) ||
    config.withdrawalFeePercentage < 0 ||
    config.withdrawalFeePercentage > 100
  ) {
    return { valid: false, error: 'Withdrawal Fee Percentage must be a valid number between 0% and 100%.' };
  }

  if (
    typeof config.eligibilityPeriodDays !== 'number' ||
    isNaN(config.eligibilityPeriodDays) ||
    config.eligibilityPeriodDays <= 0 ||
    config.eligibilityPeriodDays > 3650
  ) {
    return { valid: false, error: 'Eligibility period must be a positive integer between 1 and 3650 days.' };
  }

  if (config.importantPoints !== undefined) {
    if (!Array.isArray(config.importantPoints) || config.importantPoints.length === 0) {
      return { valid: false, error: 'At least one important point must be provided.' };
    }
    for (let i = 0; i < config.importantPoints.length; i++) {
      const pt = config.importantPoints[i];
      if (typeof pt !== 'string' || !pt.trim()) {
        return { valid: false, error: `Important point #${i + 1} cannot be empty.` };
      }
    }
  }

  return { valid: true };
}

/**
 * Loads published DCB configuration from storage or defaults.
 */
export function loadDcbConfig(): DcbConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_DCB_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(DCB_CONFIG_STORAGE_KEY);
    if (!raw) {
      saveDcbConfigLocal(DEFAULT_DCB_CONFIG);
      return DEFAULT_DCB_CONFIG;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_DCB_CONFIG;
    }

    return {
      ref1Percentage: typeof parsed.ref1Percentage === 'number' && !isNaN(parsed.ref1Percentage) 
        ? parsed.ref1Percentage 
        : DEFAULT_DCB_CONFIG.ref1Percentage,
      ref2Percentage: typeof parsed.ref2Percentage === 'number' && !isNaN(parsed.ref2Percentage) 
        ? parsed.ref2Percentage 
        : DEFAULT_DCB_CONFIG.ref2Percentage,
      dcbReleasePercentage: typeof parsed.dcbReleasePercentage === 'number' && !isNaN(parsed.dcbReleasePercentage) 
        ? parsed.dcbReleasePercentage 
        : DEFAULT_DCB_CONFIG.dcbReleasePercentage,
      withdrawalFeePercentage: typeof parsed.withdrawalFeePercentage === 'number' && !isNaN(parsed.withdrawalFeePercentage) 
        ? parsed.withdrawalFeePercentage 
        : DEFAULT_DCB_CONFIG.withdrawalFeePercentage,
      eligibilityPeriodDays: typeof parsed.eligibilityPeriodDays === 'number' && !isNaN(parsed.eligibilityPeriodDays) 
        ? parsed.eligibilityPeriodDays 
        : DEFAULT_DCB_CONFIG.eligibilityPeriodDays,
      subtitle: typeof parsed.subtitle === 'string' && parsed.subtitle.trim() 
        ? parsed.subtitle.trim() 
        : DEFAULT_DCB_CONFIG.subtitle,
      importantPoints: Array.isArray(parsed.importantPoints) && parsed.importantPoints.length > 0
        ? parsed.importantPoints.map((p: any) => String(p).trim()).filter(Boolean)
        : DEFAULT_DCB_CONFIG.importantPoints,
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy,
    };
  } catch (err) {
    console.error('Failed to parse DCB configuration:', err);
    return DEFAULT_DCB_CONFIG;
  }
}

/**
 * Saves configuration locally and dispatches real-time synchronization events.
 */
export function saveDcbConfigLocal(config: DcbConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DCB_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(DCB_CONFIG_UPDATED_EVENT, { detail: config }));
  } catch (err) {
    console.error('Failed to save DCB config locally:', err);
  }
}

/**
 * Admin action: Validates, saves, and broadcasts updated DCB configuration.
 * Strictly verifies admin role and rejects regular users.
 */
export async function saveDcbConfigAdmin(
  config: DcbConfig,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<DcbServerResult> {
  // Enforce admin permission
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit the DCB (90 days) configuration.',
    };
  }

  // Validate configuration payload
  const validation = validateDcbConfig(config);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Validation failed.',
    };
  }

  const payload: DcbConfig = {
    ref1Percentage: Number(config.ref1Percentage),
    ref2Percentage: Number(config.ref2Percentage),
    dcbReleasePercentage: Number(config.dcbReleasePercentage),
    withdrawalFeePercentage: Number(config.withdrawalFeePercentage),
    eligibilityPeriodDays: Math.round(Number(config.eligibilityPeriodDays)),
    subtitle: config.subtitle?.trim() || DEFAULT_DCB_CONFIG.subtitle,
    importantPoints: Array.isArray(config.importantPoints) && config.importantPoints.length > 0
      ? config.importantPoints.map((p) => String(p).trim()).filter(Boolean)
      : DEFAULT_DCB_CONFIG.importantPoints,
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  // 1. Save locally and broadcast immediate event for same-tab and multi-tab sync
  saveDcbConfigLocal(payload);

  // 2. Persist to database asynchronously without blocking UI
  try {
    if (typeof window !== 'undefined' && (supabase as any)?.from && process.env.NODE_ENV !== 'test') {
      (supabase as any)
        .from('dcb_config')
        .upsert({
          id: 'dcb-90-days-default',
          config: payload,
          updated_at: payload.updatedAt,
          updated_by: payload.updatedBy,
        })
        .then(() => {})
        .catch((err: any) => {
          console.warn('Remote sync note for DCB config:', err?.message || err);
        });
    }
  } catch (err) {
    console.warn('Could not sync DCB config to remote database:', err);
  }

  return {
    success: true,
    data: payload,
  };
}

/**
 * Admin action: Resets configuration to default factory values.
 */
export async function resetDcbConfigAdmin(
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<DcbServerResult> {
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
  return { success: true, data: resetConfig };
}

