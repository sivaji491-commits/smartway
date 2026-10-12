import { 
  RankCalculatorState, 
  RankItem, 
  CurrencySettings 
} from '@/types/rank-calculator';
import { 
  DEFAULT_RANKS, 
  DEFAULT_CURRENCY, 
  DEFAULT_NOTE, 
  DEFAULT_SECONDARY_NOTE 
} from '@/lib/rank-calculator-engine';

export const STORAGE_KEY = 'rank_calculator_data_v1';

/**
 * Loads saved state from localStorage.
 * Initializes default 7 ranks and sample exchange rate 100 on first launch only.
 * Recovers gracefully if storage is corrupted.
 */
export function loadRankCalculatorState(): RankCalculatorState {
  if (typeof window === 'undefined') {
    return {
      ranks: DEFAULT_RANKS,
      currency: DEFAULT_CURRENCY,
      note: DEFAULT_NOTE,
      secondaryNote: DEFAULT_SECONDARY_NOTE,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First launch: initialize sample ranks and settings
      const initial: RankCalculatorState = {
        ranks: DEFAULT_RANKS,
        currency: DEFAULT_CURRENCY,
        note: DEFAULT_NOTE,
        secondaryNote: DEFAULT_SECONDARY_NOTE,
      };
      saveRankCalculatorState(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Stored data is not an object');
    }

    // Validate ranks array
    let ranks: RankItem[] = DEFAULT_RANKS;
    if (Array.isArray(parsed.ranks)) {
      ranks = parsed.ranks.map((r: any, idx: number) => ({
        id: typeof r.id === 'string' && r.id ? r.id : `rank-${idx + 1}`,
        name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : `Rank ${idx + 1}`,
        basePrice: Math.max(0, Number(r.basePrice) || 0),
        networkFeePercent: Math.max(0, Number(r.networkFeePercent) >= 0 ? Number(r.networkFeePercent) : 3),
        order: Number(r.order) || idx + 1,
      }));
    }

    // Validate currency
    let currency: CurrencySettings = DEFAULT_CURRENCY;
    if (parsed.currency && typeof parsed.currency === 'object') {
      const rate = Number(parsed.currency.exchangeRateUSDToINR);
      currency = {
        exchangeRateUSDToINR: Number.isFinite(rate) && rate > 0 ? rate : 100,
        lastUpdated: typeof parsed.currency.lastUpdated === 'string' ? parsed.currency.lastUpdated : new Date().toISOString(),
      };
    }

    const note = typeof parsed.note === 'string' ? parsed.note : DEFAULT_NOTE;
    const secondaryNote = typeof parsed.secondaryNote === 'string' ? parsed.secondaryNote : DEFAULT_SECONDARY_NOTE;

    return {
      ranks,
      currency,
      note,
      secondaryNote,
    };
  } catch (err) {
    console.error('Failed to parse saved rank calculator state from localStorage:', err);
    // Graceful recovery without overwriting valid data
    return {
      ranks: DEFAULT_RANKS,
      currency: DEFAULT_CURRENCY,
      note: DEFAULT_NOTE,
      secondaryNote: DEFAULT_SECONDARY_NOTE,
    };
  }
}

/**
 * Persists state to localStorage. Returns true if successful, false on error.
 */
export function saveRankCalculatorState(state: RankCalculatorState): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const payload = JSON.stringify({
      schemaVersion: '1.0',
      savedAt: new Date().toISOString(),
      ranks: state.ranks,
      currency: state.currency,
      note: state.note,
      secondaryNote: state.secondaryNote,
    });
    window.localStorage.setItem(STORAGE_KEY, payload);
    window.dispatchEvent(new CustomEvent('nexora_ranks_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save rank calculator state to localStorage:', err);
    return false;
  }
}

/**
 * Resets storage back to default 7 ranks and sample exchange rate of 100
 */
export function resetRankCalculatorToDefault(): RankCalculatorState {
  const defaultState: RankCalculatorState = {
    ranks: DEFAULT_RANKS,
    currency: {
      exchangeRateUSDToINR: 100,
      lastUpdated: new Date().toISOString(),
    },
    note: DEFAULT_NOTE,
    secondaryNote: DEFAULT_SECONDARY_NOTE,
  };
  saveRankCalculatorState(defaultState);
  return defaultState;
}
