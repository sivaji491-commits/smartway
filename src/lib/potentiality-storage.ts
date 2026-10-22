import { PotentialityState, TimePeriodType, TimePeriodTypeConfig } from '@/types/potentiality';
import { 
  DEFAULT_POTENTIALITY_STATE, 
  DEFAULT_POTENTIALITY_ROWS, 
  DEFAULT_POTENTIALITY_MESSAGES,
  DEFAULT_PERIOD_CONFIGS,
  DEFAULT_JUST_REFER_OPTIONS 
} from '@/lib/potentiality-engine';

export const POTENTIALITY_STORAGE_KEY = 'smartway_potentiality_state_v1';

/**
 * Loads the saved Potentiality configuration and messages from localStorage.
 * Falls back safely to default values if not yet configured or corrupted.
 */
export function loadPotentialityState(): PotentialityState {
  if (typeof window === 'undefined') {
    return DEFAULT_POTENTIALITY_STATE;
  }

  try {
    const raw = window.localStorage.getItem(POTENTIALITY_STORAGE_KEY);
    if (!raw) {
      savePotentialityState(DEFAULT_POTENTIALITY_STATE);
      return DEFAULT_POTENTIALITY_STATE;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_POTENTIALITY_STATE;
    }

    const validPeriodTypes: TimePeriodType[] = ['days', 'weekly', 'interval-weeks', 'monthly'];
    const activePeriodType: TimePeriodType = validPeriodTypes.includes(parsed.activePeriodType)
      ? parsed.activePeriodType
      : 'weekly';

    const periodConfigs: Record<TimePeriodType, TimePeriodTypeConfig> = {
      ...DEFAULT_PERIOD_CONFIGS,
      ...(parsed.periodConfigs && typeof parsed.periodConfigs === 'object' ? parsed.periodConfigs : {}),
    };

    const justReferGlobal = Number.isFinite(parsed.justReferGlobal) && parsed.justReferGlobal > 0 
      ? parsed.justReferGlobal 
      : DEFAULT_POTENTIALITY_STATE.justReferGlobal;

    const transactionFeePercent = Number.isFinite(parsed.transactionFeePercent) && parsed.transactionFeePercent >= 0
      ? parsed.transactionFeePercent
      : DEFAULT_POTENTIALITY_STATE.transactionFeePercent;

    const rowsConfig = Array.isArray(parsed.rowsConfig) && parsed.rowsConfig.length > 0
      ? parsed.rowsConfig.map((r: any, idx: number) => ({
          id: typeof r.id === 'string' ? r.id : `pot-row-${idx + 1}`,
          level: Number(r.level) || idx + 1,
          timeLabel: typeof r.timeLabel === 'string' ? r.timeLabel : `${idx + 1}th Week`,
          referralPercentage: Number(r.referralPercentage) || (idx === 0 ? 25 : idx === 1 ? 5 : 2),
          dcbPercentage: Number(r.dcbPercentage) || (idx === 0 ? 30 : 0),
          durationLabel: typeof r.durationLabel === 'string' ? r.durationLabel : `${idx + 1}th Week`,
        }))
      : DEFAULT_POTENTIALITY_ROWS;

    const messages = {
      ...DEFAULT_POTENTIALITY_MESSAGES,
      ...(parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {}),
    };

    const customJustReferOptions = Array.isArray(parsed.customJustReferOptions) && parsed.customJustReferOptions.length > 0
      ? parsed.customJustReferOptions.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : DEFAULT_JUST_REFER_OPTIONS;

    const availableTimePeriods = periodConfigs[activePeriodType]?.options || DEFAULT_PERIOD_CONFIGS.weekly.options;

    return {
      activePeriodType,
      periodConfigs,
      justReferGlobal,
      transactionFeePercent,
      rowsConfig,
      messages,
      customJustReferOptions,
      availableTimePeriods,
    };
  } catch (err) {
    console.error('Failed to parse Potentiality state from localStorage:', err);
    return DEFAULT_POTENTIALITY_STATE;
  }
}

/**
 * Persists the updated Potentiality configuration and messages to localStorage.
 */
export function savePotentialityState(state: PotentialityState): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const payload = JSON.stringify({
      schemaVersion: '1.0',
      savedAt: new Date().toISOString(),
      ...state,
    });
    window.localStorage.setItem(POTENTIALITY_STORAGE_KEY, payload);
    window.dispatchEvent(new CustomEvent('smartway_potentiality_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save Potentiality state to localStorage:', err);
    return false;
  }
}

/**
 * Resets the Potentiality configuration and messages back to the default state.
 */
export function resetPotentialityState(): PotentialityState {
  savePotentialityState(DEFAULT_POTENTIALITY_STATE);
  return DEFAULT_POTENTIALITY_STATE;
}
