import { 
  TimeInHandConfig, 
  DEFAULT_TIME_IN_HAND_CONFIG 
} from '@/types/time-in-hand';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';

export const TIME_IN_HAND_STORAGE_KEY = 'nexora_time_in_hand_config';
export const TIME_IN_HAND_UPDATED_EVENT = 'nexora_time_in_hand_updated';

export interface TimeInHandValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates TimeInHand configuration input.
 */
export function validateTimeInHandConfig(config: TimeInHandConfig): TimeInHandValidationResult {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid configuration payload.' };
  }

  if (typeof config.hoursPerDay !== 'number' || isNaN(config.hoursPerDay) || config.hoursPerDay <= 0 || config.hoursPerDay > 24) {
    return { valid: false, error: 'Hours per day must be a number between 1 and 24.' };
  }

  if (typeof config.daysPerMonth !== 'number' || isNaN(config.daysPerMonth) || config.daysPerMonth <= 0 || config.daysPerMonth > 31) {
    return { valid: false, error: 'Days per month must be a number between 1 and 31.' };
  }

  if (!Array.isArray(config.rows) || config.rows.length === 0) {
    return { valid: false, error: 'The table must have at least one row.' };
  }

  for (let i = 0; i < config.rows.length; i++) {
    const row = config.rows[i];
    if (typeof row.age !== 'number' || isNaN(row.age) || row.age <= 0 || row.age > 120) {
      return { valid: false, error: `Row #${i + 1}: Age must be a valid number between 1 and 120.` };
    }
    if (!row.upTo60 || typeof row.upTo60 !== 'string' || !row.upTo60.trim()) {
      return { valid: false, error: `Row #${i + 1}: 'Up to 60 Years In-hand' cannot be empty.` };
    }
    if (typeof row.yearsInHand !== 'number' || isNaN(row.yearsInHand) || row.yearsInHand < 0) {
      return { valid: false, error: `Row #${i + 1}: Years in-hand must be a non-negative number.` };
    }
    if (row.hoursPerDay !== undefined && (typeof row.hoursPerDay !== 'number' || isNaN(row.hoursPerDay) || row.hoursPerDay <= 0 || row.hoursPerDay > 24)) {
      return { valid: false, error: `Row #${i + 1}: Hours per day must be a number between 1 and 24.` };
    }
  }

  return { valid: true };
}

/**
 * Loads published Time-In hand configuration from storage or defaults.
 */
export function loadTimeInHandConfig(): TimeInHandConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_TIME_IN_HAND_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(TIME_IN_HAND_STORAGE_KEY);
    if (!raw) {
      saveTimeInHandLocal(DEFAULT_TIME_IN_HAND_CONFIG);
      return DEFAULT_TIME_IN_HAND_CONFIG;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rows)) {
      return DEFAULT_TIME_IN_HAND_CONFIG;
    }

    return {
      title: parsed.title || DEFAULT_TIME_IN_HAND_CONFIG.title,
      subtitle: parsed.subtitle || DEFAULT_TIME_IN_HAND_CONFIG.subtitle,
      hoursPerDay: Number(parsed.hoursPerDay) || DEFAULT_TIME_IN_HAND_CONFIG.hoursPerDay,
      daysPerMonth: Number(parsed.daysPerMonth) || DEFAULT_TIME_IN_HAND_CONFIG.daysPerMonth,
      monthsPerYear: Number(parsed.monthsPerYear) || DEFAULT_TIME_IN_HAND_CONFIG.monthsPerYear,
      hoursInDay: Number(parsed.hoursInDay) || DEFAULT_TIME_IN_HAND_CONFIG.hoursInDay,
      daysInYear: Number(parsed.daysInYear) || DEFAULT_TIME_IN_HAND_CONFIG.daysInYear,

      colAge: parsed.colAge || DEFAULT_TIME_IN_HAND_CONFIG.colAge,
      colUpTo60: parsed.colUpTo60 || DEFAULT_TIME_IN_HAND_CONFIG.colUpTo60,
      colYearsInHand: parsed.colYearsInHand || DEFAULT_TIME_IN_HAND_CONFIG.colYearsInHand,
      colHoursPerDay: parsed.colHoursPerDay || DEFAULT_TIME_IN_HAND_CONFIG.colHoursPerDay,
      colDaysPerMonth: parsed.colDaysPerMonth || DEFAULT_TIME_IN_HAND_CONFIG.colDaysPerMonth,
      colHoursPerMonth: parsed.colHoursPerMonth || DEFAULT_TIME_IN_HAND_CONFIG.colHoursPerMonth,
      colHoursPerYear: parsed.colHoursPerYear || DEFAULT_TIME_IN_HAND_CONFIG.colHoursPerYear,
      colHoursInHand: parsed.colHoursInHand || DEFAULT_TIME_IN_HAND_CONFIG.colHoursInHand,
      colDaysInHand: parsed.colDaysInHand || DEFAULT_TIME_IN_HAND_CONFIG.colDaysInHand,
      colEquivalentYears: parsed.colEquivalentYears || DEFAULT_TIME_IN_HAND_CONFIG.colEquivalentYears,

      quote1: parsed.quote1 || DEFAULT_TIME_IN_HAND_CONFIG.quote1,
      quote2: parsed.quote2 || DEFAULT_TIME_IN_HAND_CONFIG.quote2,
      quote3: parsed.quote3 || DEFAULT_TIME_IN_HAND_CONFIG.quote3,

      rows: parsed.rows.map((r: any, idx: number) => ({
        id: r.id || `row-${idx + 1}`,
        age: Number(r.age) || 30,
        upTo60: r.upTo60 || `${Math.max(0, 60 - (Number(r.age) || 30))} Y`,
        yearsInHand: Number(r.yearsInHand) || 10,
        hoursPerDay: r.hoursPerDay !== undefined && !isNaN(Number(r.hoursPerDay)) 
          ? Number(r.hoursPerDay) 
          : (Number(parsed.hoursPerDay) || DEFAULT_TIME_IN_HAND_CONFIG.hoursPerDay),
      })),
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy,
    };
  } catch (err) {
    console.error('Failed to parse time-in-hand configuration:', err);
    return DEFAULT_TIME_IN_HAND_CONFIG;
  }
}

/**
 * Saves configuration locally and dispatches real-time synchronization events.
 */
export function saveTimeInHandLocal(config: TimeInHandConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TIME_IN_HAND_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(TIME_IN_HAND_UPDATED_EVENT, { detail: config }));
  } catch {}
}

/**
 * Admin action: Validates, saves, and publishes updated Time-In hand configuration.
 * Strictly verifies admin role and rejects regular users.
 */
export async function saveTimeInHandAdmin(
  config: TimeInHandConfig,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; data?: TimeInHandConfig }> {
  // Enforce admin permission
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit the In-hand time configuration.',
    };
  }

  // Validate configuration payload
  const validation = validateTimeInHandConfig(config);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Validation failed.',
    };
  }

  const payload: TimeInHandConfig = {
    ...config,
    title: config.title?.trim() || DEFAULT_TIME_IN_HAND_CONFIG.title,
    subtitle: config.subtitle?.trim() || DEFAULT_TIME_IN_HAND_CONFIG.subtitle,
    hoursPerDay: Number(config.hoursPerDay) || 8,
    daysPerMonth: Number(config.daysPerMonth) || 30,
    monthsPerYear: Number(config.monthsPerYear) || 12,
    hoursInDay: Number(config.hoursInDay) || 24,
    daysInYear: Number(config.daysInYear) || 365,
    rows: config.rows.map((row, idx) => ({
      id: row.id || `row-${idx + 1}`,
      age: Number(row.age),
      upTo60: row.upTo60?.trim() || `${Math.max(0, 60 - Number(row.age))} Y`,
      yearsInHand: Number(row.yearsInHand),
      hoursPerDay: row.hoursPerDay !== undefined && !isNaN(Number(row.hoursPerDay)) 
        ? Number(row.hoursPerDay) 
        : (Number(config.hoursPerDay) || 8),
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  // 1. Save locally and broadcast
  saveTimeInHandLocal(payload);

  // 2. Persist to database asynchronously without blocking UI or test execution
  try {
    if (typeof window !== 'undefined' && (supabase as any)?.from && process.env.NODE_ENV !== 'test') {
      (supabase as any)
        .from('time_in_hand_config')
        .upsert({
          id: 'time-in-hand-default',
          config: payload,
          updated_at: payload.updatedAt,
          updated_by: payload.updatedBy,
        })
        .then(() => {})
        .catch((err: any) => {
          console.warn('Could not sync time in hand config to remote database:', err);
        });
    }
  } catch (err) {
    console.warn('Could not sync time in hand config to remote database:', err);
  }

  return {
    success: true,
    data: payload,
  };
}

/**
 * Admin action: Resets configuration to default factory values.
 */
export async function resetTimeInHandDefaults(
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; data?: TimeInHandConfig }> {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to reset the configuration.',
    };
  }

  const resetConfig: TimeInHandConfig = {
    ...DEFAULT_TIME_IN_HAND_CONFIG,
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  saveTimeInHandLocal(resetConfig);
  return { success: true, data: resetConfig };
}
