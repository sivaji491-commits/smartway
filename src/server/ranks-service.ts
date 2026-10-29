import { createServerFn } from '@tanstack/react-start';
import { RankCalculatorState } from '../types/rank-calculator';
import { loadRankCalculatorState, saveRankCalculatorState } from '../lib/rank-storage';
import { isUserAdminOrOwner } from '../lib/permissions';

export interface RanksServerResult {
  success: boolean;
  error?: string;
  data?: RankCalculatorState;
}

/**
 * Server-side authoritative fetch of Ranks data.
 */
export function getRanksServerState(): RankCalculatorState {
  return loadRankCalculatorState();
}

/**
 * Server-side authoritative validation and save of full rank state.
 * Strictly verifies administrator role server-side.
 */
export function validateAndUpdateRanksServer(
  adminIdentifier: string,
  payload: RankCalculatorState
): RanksServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit Ranks information.',
    };
  }

  if (!payload || !Array.isArray(payload.ranks) || payload.ranks.length === 0) {
    return {
      success: false,
      error: 'At least one rank must be provided.',
    };
  }

  for (const r of payload.ranks) {
    if (!r.name || !r.name.trim()) {
      return { success: false, error: 'Rank name cannot be empty.' };
    }
    if (typeof r.basePrice !== 'number' || isNaN(r.basePrice) || r.basePrice < 0) {
      return { success: false, error: `Invalid price for rank ${r.name}.` };
    }
    if (typeof r.networkFeePercent !== 'number' || isNaN(r.networkFeePercent) || r.networkFeePercent < 0) {
      return { success: false, error: `Invalid network fee percentage for rank ${r.name}.` };
    }
  }

  const ok = saveRankCalculatorState(payload, adminIdentifier);
  if (!ok) {
    return { success: false, error: 'Failed to persist rank calculator state.' };
  }

  return { success: true, data: payload };
}

export const updateRanksServer = validateAndUpdateRanksServer;

/**
 * Server-side authoritative update of a single rank's base price.
 * Strictly verifies administrator role server-side.
 */
export function updateRankPriceServer(
  adminIdentifier: string,
  rankId: string,
  newPrice: number
): RanksServerResult {
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
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

  const ok = saveRankCalculatorState(newState, adminIdentifier);
  if (!ok) {
    return { success: false, error: 'Failed to persist rank calculator state.' };
  }

  return { success: true, data: newState };
}

// TanStack Start Server Functions (RPC endpoints)
export const getRanksServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return getRanksServerState();
  });

export const updateRanksServerFn = createServerFn({ method: 'POST' })
  .validator((d: { adminIdentifier: string; payload: RankCalculatorState }) => d)
  .handler(async ({ data }) => {
    return validateAndUpdateRanksServer(data.adminIdentifier, data.payload);
  });

export const updateRankPriceServerFn = createServerFn({ method: 'POST' })
  .validator((d: { adminIdentifier: string; rankId: string; newPrice: number }) => d)
  .handler(async ({ data }) => {
    return updateRankPriceServer(data.adminIdentifier, data.rankId, data.newPrice);
  });
