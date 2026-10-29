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
import { isUserAdminOrOwner, resolveEffectiveUserIdentifier } from '@/lib/permissions';

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
 * When userIdentifier is supplied, strictly checks administrator permissions.
 */
export function saveRankCalculatorState(
  state: RankCalculatorState,
  userIdentifier?: string | null
): boolean {
  if (typeof window === 'undefined') return true;

  if (userIdentifier !== undefined && userIdentifier !== null) {
    if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
      console.warn('Unauthorized rank modification rejected: user is not an administrator.');
      return false;
    }
  }

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

export interface RankMutationResult {
  success: boolean;
  error?: string;
  data?: RankCalculatorState;
}

/**
 * Admin action: Validates and persists full rank state.
 * Strictly verifies admin permissions; rejects regular users.
 */
export function saveRankCalculatorStateAdmin(
  state: RankCalculatorState,
  userIdentifier?: string | null
): RankMutationResult {
  const effectiveUser = userIdentifier ?? resolveEffectiveUserIdentifier();
  if (!isUserAdminOrOwner(effectiveUser, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit Ranks information.',
    };
  }

  if (!state || !Array.isArray(state.ranks) || state.ranks.length === 0) {
    return {
      success: false,
      error: 'At least one rank must be provided.',
    };
  }

  for (const r of state.ranks) {
    if (!r.name || !r.name.trim()) {
      return { success: false, error: 'Rank name cannot be empty.' };
    }
    if (typeof r.basePrice !== 'number' || isNaN(r.basePrice) || r.basePrice < 0) {
      return { success: false, error: `Invalid price for rank ${r.name}.` };
    }
  }

  const ok = saveRankCalculatorState(state);
  if (!ok) {
    return { success: false, error: 'Failed to persist rank calculator state.' };
  }

  return { success: true, data: state };
}

/**
 * Admin action: Validates and updates a single rank's base price.
 * Strictly verifies admin permissions; rejects regular users.
 */
export function updateRankBasePriceAdmin(
  rankId: string,
  newPrice: number,
  userIdentifier?: string | null
): RankMutationResult {
  const effectiveUser = userIdentifier ?? resolveEffectiveUserIdentifier();
  if (!isUserAdminOrOwner(effectiveUser, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit Ranks information.',
    };
  }

  if (typeof newPrice !== 'number' || isNaN(newPrice) || newPrice < 0) {
    return {
      success: false,
      error: 'Price must be a valid non-negative number.',
    };
  }

  const state = loadRankCalculatorState();
  const rankIndex = state.ranks.findIndex(
    (r) =>
      r.id === rankId ||
      r.id.toLowerCase() === rankId.toLowerCase() ||
      (rankId.startsWith('rank-') && r.id === rankId.replace('rank-', 'pba-'))
  );
  if (rankIndex === -1) {
    return {
      success: false,
      error: `Rank with id ${rankId} not found.`,
    };
  }

  const updatedRanks = [...state.ranks];
  updatedRanks[rankIndex] = {
    ...updatedRanks[rankIndex],
    basePrice: Math.round(newPrice * 100) / 100,
  };

  const newState: RankCalculatorState = {
    ...state,
    ranks: updatedRanks,
  };

  const ok = saveRankCalculatorState(newState);
  if (!ok) {
    return { success: false, error: 'Failed to persist rank calculator state.' };
  }

  return { success: true, data: newState };
}

/**
 * Admin action: Validates and updates rank properties (name, price, fee).
 * Strictly verifies admin permissions; rejects regular users.
 */
export function updateRankItemAdmin(
  rankId: string,
  updates: Partial<Omit<RankItem, 'id'>>,
  userIdentifier?: string | null
): RankMutationResult {
  const effectiveUser = userIdentifier ?? resolveEffectiveUserIdentifier();
  if (!isUserAdminOrOwner(effectiveUser, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit Ranks information.',
    };
  }

  const state = loadRankCalculatorState();
  const rankIndex = state.ranks.findIndex(
    (r) =>
      r.id === rankId ||
      r.id.toLowerCase() === rankId.toLowerCase() ||
      (rankId.startsWith('rank-') && r.id === rankId.replace('rank-', 'pba-'))
  );
  if (rankIndex === -1) {
    return {
      success: false,
      error: `Rank with id ${rankId} not found.`,
    };
  }

  if (updates.name !== undefined && !updates.name.trim()) {
    return { success: false, error: 'Rank name cannot be empty.' };
  }
  if (updates.basePrice !== undefined && (isNaN(updates.basePrice) || updates.basePrice < 0)) {
    return { success: false, error: 'Price must be a valid non-negative number.' };
  }
  if (updates.networkFeePercent !== undefined && (isNaN(updates.networkFeePercent) || updates.networkFeePercent < 0)) {
    return { success: false, error: 'Network fee percent must be a valid non-negative number.' };
  }

  const updatedRanks = [...state.ranks];
  updatedRanks[rankIndex] = {
    ...updatedRanks[rankIndex],
    ...updates,
    name: updates.name !== undefined ? updates.name.trim() : updatedRanks[rankIndex].name,
    basePrice: updates.basePrice !== undefined ? Math.round(updates.basePrice * 100) / 100 : updatedRanks[rankIndex].basePrice,
    networkFeePercent: updates.networkFeePercent !== undefined ? Math.round(updates.networkFeePercent * 100) / 100 : updatedRanks[rankIndex].networkFeePercent,
  };

  const newState: RankCalculatorState = {
    ...state,
    ranks: updatedRanks,
  };

  const ok = saveRankCalculatorState(newState);
  if (!ok) {
    return { success: false, error: 'Failed to persist rank calculator state.' };
  }

  return { success: true, data: newState };
}

/**
 * Resets storage back to default 7 ranks and sample exchange rate of 100
 */
export function resetRankCalculatorToDefault(userIdentifier?: string | null): RankCalculatorState {
  if (userIdentifier !== undefined && userIdentifier !== null) {
    if (!isUserAdminOrOwner(userIdentifier, 'sivaji491@gmail.com')) {
      console.warn('Unauthorized rank reset rejected: user is not an administrator.');
      return loadRankCalculatorState();
    }
  }

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
