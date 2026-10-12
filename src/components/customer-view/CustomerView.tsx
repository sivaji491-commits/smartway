import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UserCheck, 
  Coins, 
  Check, 
  ChevronDown, 
  ArrowRight,
  TrendingUp,
  Percent,
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  Award,
  Users,
  Info,
  ArrowUpRight,
  Infinity as InfinityIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { loadRankCalculatorState } from '@/lib/rank-storage';
import { formatUSD } from '@/lib/rank-calculator-engine';
import { RANK_PILL_STYLES } from '@/components/rank-calculator/RanksTableView';
import { 
  computeDcbRanks, 
  calculateDcbBonus,
  DEFAULT_DCB_SETTINGS
} from '@/lib/dcb-bonus-engine';
import { DcbRankRow } from '@/types/dcb-bonus';

export interface CustomerViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
}

/**
 * Formats numbers into the Indian Rupee system, matching the reference format:
 * e.g., ₹5,00,000 or ₹1,25,000/-
 */
export function formatINRCurrency(val: number, withSlash = false): string {
  const safe = Number.isFinite(val) ? val : 0;
  const rounded = Math.round(safe);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rounded);
  return `₹${formatted}${withSlash ? '/-' : ''}`;
}

export function CustomerView({
  isAdmin = false,
  userEmail,
}: CustomerViewProps) {
  const [state, setState] = useState(() => loadRankCalculatorState());
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Sync listener: auto-update when admin edits ranks, prices, gas fees, or exchange rate
  const syncLatestData = useCallback(() => {
    try {
      setIsLoading(true);
      setHasError(false);
      const latest = loadRankCalculatorState();
      setState(latest);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', syncLatestData);
    window.addEventListener('nexora_ranks_updated', syncLatestData);

    return () => {
      window.removeEventListener('storage', syncLatestData);
      window.removeEventListener('nexora_ranks_updated', syncLatestData);
    };
  }, [syncLatestData]);

  // Compute ranks using engine
  const exchangeRate = state.currency?.exchangeRateUSDToINR || 100;
  const computedRanks: DcbRankRow[] = useMemo(() => {
    try {
      return computeDcbRanks(state.ranks, exchangeRate);
    } catch {
      return [];
    }
  }, [state.ranks, exchangeRate]);

  // Default selection: PBA 7 as shown in the reference screenshot, or first rank
  useEffect(() => {
    if (computedRanks.length > 0) {
      if (!selectedRankId || !computedRanks.some((r) => r.id === selectedRankId)) {
        const pba7 = computedRanks.find((r) => r.name.toLowerCase().includes('pba 7'));
        if (pba7) {
          setSelectedRankId(pba7.id);
        } else {
          setSelectedRankId(computedRanks[0]?.id || null);
        }
      }
    } else {
      setSelectedRankId(null);
    }
  }, [computedRanks, selectedRankId]);

  const selectedRank = useMemo(() => {
    if (!computedRanks.length) return null;
    return (
      computedRanks.find((r) => r.id === selectedRankId) ||
      computedRanks.find((r) => r.name.toLowerCase().includes('pba 7')) ||
      computedRanks[0] ||
      null
    );
  }, [computedRanks, selectedRankId]);

  // Calculate benefits dynamically for the selected rank
  const benefits = useMemo(() => {
    if (!selectedRank) {
      return calculateDcbBonus('PBA 1', '', 100, exchangeRate);
    }
    return calculateDcbBonus(
      selectedRank.name,
      selectedRank.id,
      selectedRank.multiRanksUSD,
      exchangeRate
    );
  }, [selectedRank, exchangeRate]);

  // Pill style for rank badge
  const rankIndex = selectedRank ? selectedRank.serialNumber - 1 : 0;
  const rankPillStyle = RANK_PILL_STYLES[rankIndex % RANK_PILL_STYLES.length] || RANK_PILL_STYLES[0];

  if (hasError) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-6 text-center shadow-xs">
        <h2 className="text-base font-bold text-rose-700">Unable to load rank data</h2>
        <p className="text-xs text-slate-500 mt-1">Please try refreshing the page or contact your workspace administrator.</p>
        <button
          onClick={syncLatestData}
          className="mt-3 px-3 py-1.5 text-xs font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (computedRanks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">No Ranks Available</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Rank configurations have not been set up yet. Please visit the Ranks section or contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="customer-view-container bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 lg:p-3.5 space-y-2.5 w-full animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif] select-none">
      {/* 1. Header Toolbar with Page Title, Downward Dynamic Rank Dropdown, and Rate Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Customer View
              </h1>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                Rank-Based Benefits Display
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-tight">
              Select any rank to preview benefits, direct referrals, and DCB release potential.
            </p>
          </div>
        </div>

        {/* Dropdown & Rate Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Clearly Labeled Downward-Opening Rank Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <label htmlFor="customer-view-rank-select" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Select Rank:
            </label>
            <div className="relative flex-1 sm:w-64">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    id="customer-rank-dropdown-trigger"
                    data-testid="customer-rank-dropdown-trigger"
                    aria-label="Select Rank Dropdown"
                    disabled={computedRanks.length === 0}
                    className="w-full h-8 pl-2.5 pr-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer flex items-center justify-between gap-1.5"
                  >
                    <span className="truncate">
                      {selectedRank
                        ? `${selectedRank.name} — ${formatINRCurrency(benefits.rankValueINR)} (${formatUSD(benefits.rankValueUSD)})`
                        : 'Select Rank'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                {/* STRICT REQUIREMENT: Opens downwards directly below selected rank field, suitable z-index, no clipping */}
                <DropdownMenuContent
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions={false}
                  align="start"
                  className="w-72 max-h-56 overflow-y-auto scrollbar-thin [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full bg-white border border-slate-200 text-slate-800 z-50 p-1 shadow-lg rounded-md"
                >
                  {computedRanks.map((r) => {
                    const rValueINR = r.multiRanksUSD * exchangeRate;
                    const isSelected = selectedRank?.id === r.id;
                    return (
                      <DropdownMenuItem
                        key={r.id}
                        onClick={() => setSelectedRankId(r.id)}
                        className={cn(
                          "cursor-pointer text-xs px-2.5 py-1.5 rounded hover:bg-slate-100 focus:bg-slate-100 transition-colors flex items-center justify-between",
                          isSelected && "bg-blue-50 font-bold text-blue-800"
                        )}
                      >
                        <span className="truncate">
                          {r.name} — {formatINRCurrency(rValueINR)} ({formatUSD(r.multiRanksUSD)})
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Accessible fallback select */}
              <select
                id="customer-view-rank-select"
                data-testid="customer-rank-native-select"
                value={selectedRank?.id || ''}
                onChange={(e) => setSelectedRankId(e.target.value)}
                className="sr-only"
                tabIndex={-1}
              >
                {computedRanks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {formatINRCurrency(r.multiRanksUSD * exchangeRate)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Currency Rate Indicator */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs whitespace-nowrap">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Rate: ₹{exchangeRate.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Highlight Row: Selected Rank Amount vs Total Benefit Amount (Prominently Highlighted) */}
      {selectedRank && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
          {/* Selected Rank Card */}
          <div className="customer-view-card bg-gradient-to-br from-slate-50 to-white rounded-lg p-2.5 sm:p-3 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold border shadow-2xs inline-block",
                  rankPillStyle.bg,
                  rankPillStyle.text,
                  rankPillStyle.border
                )}>
                  {selectedRank.name}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  Level #{selectedRank.serialNumber}
                </span>
              </div>
              <span className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Rank-Related Amount
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {formatINRCurrency(benefits.rankValueINR)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({formatUSD(benefits.rankValueUSD)})
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500 bg-white/80 p-2 rounded border border-slate-100 shrink-0">
              <span className="block text-slate-400 text-[10px]">Cumulative Base</span>
              <span className="font-bold text-slate-700">{formatUSD(selectedRank.multiRanksUSD)}</span>
            </div>
          </div>

          {/* Highlighted Total Amount Card */}
          <div className="customer-view-card bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-white rounded-lg p-2.5 sm:p-3 border border-emerald-300 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-600 text-white shadow-2xs">
                  80% Total Return
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">
                  Combined Benefits
                </span>
              </div>
              <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                Total Amount (Gross)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-emerald-950 tracking-tight tabular-nums">
                  {formatINRCurrency(benefits.grossAmountUSD * exchangeRate, true)}
                </span>
                <span className="text-xs text-emerald-700 font-medium">
                  ({formatUSD(benefits.grossAmountUSD)})
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] bg-white p-2 rounded border border-emerald-200/80 shrink-0">
              <span className="block text-slate-400 text-[10px]">Net (10% Fee)</span>
              <span className="font-extrabold text-emerald-700 tabular-nums">
                {formatINRCurrency(benefits.netTotalINR, true)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Structured Benefit Breakdown Grid (Referral Benefits, DCB, and Total) */}
      {selectedRank && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Referral 1 Card */}
          <div className="customer-view-card bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs space-y-1 hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Referral 1
              </span>
              <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                25%
              </span>
            </div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">
              {formatINRCurrency(benefits.ref1AmountUSD * exchangeRate, true)}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              25% benefit amount on 1st direct qualifying referral ({formatUSD(benefits.ref1AmountUSD)}).
            </p>
          </div>

          {/* Referral 2 Card */}
          <div className="customer-view-card bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs space-y-1 hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Referral 2
              </span>
              <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                25%
              </span>
            </div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">
              {formatINRCurrency(benefits.ref2AmountUSD * exchangeRate, true)}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              25% benefit amount on 2nd direct qualifying referral ({formatUSD(benefits.ref2AmountUSD)}).
            </p>
          </div>

          {/* DCB Card */}
          <div className="customer-view-card bg-amber-50/50 rounded-lg p-2.5 border border-amber-200 shadow-2xs space-y-1 hover:border-amber-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                DCB Amount
              </span>
              <span className="text-[10.5px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                30%
              </span>
            </div>
            <div className="text-base font-extrabold text-amber-950 tabular-nums">
              {formatINRCurrency(benefits.dcbAmountUSD * exchangeRate, true)}
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              Double Connect Bonus released automatically ({formatUSD(benefits.dcbAmountUSD)}).
            </p>
          </div>

          {/* Total Combined Benefits Card */}
          <div className="customer-view-card bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-200 shadow-2xs space-y-1 hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Total Amount
              </span>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-300">
                80%
              </span>
            </div>
            <div className="text-base font-extrabold text-emerald-950 tabular-nums">
              {formatINRCurrency(benefits.grossAmountUSD * exchangeRate, true)}
            </div>
            <p className="text-[11px] text-emerald-800 leading-tight">
              Ref 1 (25%) + Ref 2 (25%) + DCB (30%) combined return.
            </p>
          </div>
        </div>
      )}

      {/* 4. Unlimited Progression Indicator Section (Matching Reference Screenshot & Business Logic) */}
      {selectedRank && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-white rounded-lg p-2.5 sm:p-3 border border-amber-200 shadow-2xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-200/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <InfinityIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Unlimited Progression Indicator
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                Unlimited Ref.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Every 2 direct referrals unlocks 1 full cycle with no ceiling
            </span>
          </div>

          {/* Progression Milestones Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Milestone 2 Referrals (2 ↑) */}
            <div className="customer-view-card bg-white p-2 rounded-md border border-amber-200/90 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                2 Referrals (2 ↑)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 block mt-0.5 tabular-nums">
                {formatINRCurrency(benefits.milestones[0].totalINR, true)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                Net return · 1st Completed Cycle
              </span>
            </div>

            {/* Milestone 4 Referrals (4 ↑) */}
            <div className="customer-view-card bg-white p-2 rounded-md border border-amber-200/90 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                4 Referrals (4 ↑)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 block mt-0.5 tabular-nums">
                {formatINRCurrency(benefits.milestones[1].totalINR, true)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                Net return · 2nd Completed Cycle (2X)
              </span>
            </div>

            {/* Milestone 6 Referrals (6 ↑) */}
            <div className="customer-view-card bg-white p-2 rounded-md border border-amber-200/90 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                6 Referrals (6 ↑)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 block mt-0.5 tabular-nums">
                {formatINRCurrency(benefits.milestones[2].totalINR, true)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                Net return · 3rd Completed Cycle (3X)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Key Highlights / Policy Summary (Compact, Professional, No Overflow) */}
      <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 border border-slate-200 text-xs text-slate-600 space-y-1 leading-normal font-medium">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-start gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>30% DCB:</strong> Released for every 2 active referrals across any rank.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span><strong>90-Day Cycle:</strong> Qualification window measured from 1st referral date.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Percent className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span><strong>10% Fee:</strong> Standard withdrawal fee accounted for in net calculations.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
            <span><strong>Instant Sync:</strong> All figures update dynamically upon rank change.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
