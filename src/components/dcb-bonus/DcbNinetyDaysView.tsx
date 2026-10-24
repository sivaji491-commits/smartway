import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Layers, 
  Coins, 
  Check, 
  Info, 
  ChevronDown, 
  ArrowRight,
  ArrowUp,
  Percent,
  Clock,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { loadRankCalculatorState } from '@/lib/rank-storage';
import { formatUSD, formatINR } from '@/lib/rank-calculator-engine';
import { RANK_PILL_STYLES } from '@/components/rank-calculator/RanksTableView';
import { 
  computeDcbRanks, 
  calculateDcbBonus,
  DEFAULT_DCB_SETTINGS
} from '@/lib/dcb-bonus-engine';
import { DcbRankRow } from '@/types/dcb-bonus';

export interface DcbNinetyDaysViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
}

export function DcbNinetyDaysView({
  isAdmin = false,
  userEmail,
}: DcbNinetyDaysViewProps) {
  // 1. Data synchronization with single source of truth in Rank Calculator state
  const [state, setState] = useState(() => loadRankCalculatorState());
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync listener: auto-update when admin edits ranks, prices, gas fees, or exchange rate
  const syncLatestData = useCallback(() => {
    try {
      setIsLoading(true);
      const latest = loadRankCalculatorState();
      setState(latest);
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
    return computeDcbRanks(state.ranks, exchangeRate);
  }, [state.ranks, exchangeRate]);

  // Ensure an active rank is selected (defaults to PBA 7 as shown in the screenshot, or last rank)
  useEffect(() => {
    if (computedRanks.length > 0) {
      if (!selectedRankId || !computedRanks.some((r) => r.id === selectedRankId)) {
        const pba7 = computedRanks.find((r) => r.name.toLowerCase().includes('pba 7'));
        if (pba7) {
          setSelectedRankId(pba7.id);
        } else {
          setSelectedRankId(computedRanks[computedRanks.length - 1]?.id || computedRanks[0]?.id || null);
        }
      }
    } else {
      setSelectedRankId(null);
    }
  }, [computedRanks, selectedRankId]);

  const selectedRank = useMemo(() => {
    if (!computedRanks.length) return null;
    return computedRanks.find((r) => r.id === selectedRankId) || computedRanks[computedRanks.length - 1] || computedRanks[0] || null;
  }, [computedRanks, selectedRankId]);

  // Calculate DCB for active rank dynamically using multiRanksUSD (cumulative base price)
  const dcbResult = useMemo(() => {
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

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 lg:p-3.5 space-y-2.5 w-full animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]">
      {/* 1. Header Toolbar with Page Title, Dynamic Rank Dropdown, and Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                DCB (90 days)
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Double Connect Bonus 30%
                </span>
              </h1>
              <p className="text-xs text-slate-500 leading-tight">
                Every 2 direct active referrals earn 30% DCB release within 90-day qualification window.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Rank Dropdown & Rate Chip */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Dynamic Rank Selection Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="dcb-rank-select-dropdown" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Select Rank:
            </label>
            <div className="relative flex-1 sm:w-56">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    id="dcb-rank-select-dropdown-trigger"
                    aria-label="Select rank trigger"
                    disabled={computedRanks.length === 0}
                    className="w-full h-8 pl-2.5 pr-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer flex items-center justify-between gap-1.5"
                  >
                    <span className="truncate">
                      {selectedRank
                        ? `${selectedRank.name} — ${formatUSD(selectedRank.multiRanksUSD)}`
                        : 'No Ranks Available'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions={false}
                  align="start"
                  className="w-72 max-h-56 overflow-y-auto scrollbar-thin [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full bg-white border border-slate-200 text-slate-800 z-50 p-1 shadow-lg"
                >
                  {computedRanks.map((r) => (
                    <DropdownMenuItem
                      key={r.id}
                      onClick={() => setSelectedRankId(r.id)}
                      className={cn(
                        "cursor-pointer text-xs px-2.5 py-1.5 rounded hover:bg-slate-100 focus:bg-slate-100 transition-colors flex items-center justify-between",
                        selectedRank?.id === r.id && "bg-amber-50 font-bold text-amber-800"
                      )}
                    >
                      <span className="truncate">
                        {r.name} — {formatUSD(r.multiRanksUSD)} (With Gas: {formatUSD(r.totalWithGasUSD)})
                      </span>
                      {selectedRank?.id === r.id && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Accessible fallback select for screen readers and test automation */}
              <select
                id="dcb-rank-select-dropdown"
                aria-label="Select Rank:"
                value={selectedRank?.id || ''}
                onChange={(e) => setSelectedRankId(e.target.value)}
                disabled={computedRanks.length === 0}
                className="sr-only"
                tabIndex={-1}
              >
                {computedRanks.length === 0 ? (
                  <option value="">No Ranks Available</option>
                ) : (
                  computedRanks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {formatUSD(r.multiRanksUSD)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Currency Rate Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Rate: ₹{exchangeRate.toFixed(2)}/USD</span>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Stat Badges for Active Selected Rank */}
      {selectedRank && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {/* Active Rank */}
          <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-200/80">
            <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Selected Rank
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-slate-800 mt-0.5 block truncate">
              {selectedRank.name}
            </span>
            <span className="text-[9.5px] text-slate-400">Level #{selectedRank.serialNumber}</span>
          </div>

          {/* Multi Ranks Value */}
          <div className="bg-blue-50/60 rounded-lg p-2 border border-blue-200/70">
            <span className="block text-[9.5px] font-bold text-blue-700 uppercase tracking-wider">
              Rank Value ($)
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-blue-900 mt-0.5 block tabular-nums">
              {formatUSD(dcbResult.rankValueUSD)}
            </span>
            <span className="text-[9.5px] text-blue-600">Multi ranks cumulative</span>
          </div>

          {/* Rank Value In INR */}
          <div className="bg-amber-50/60 rounded-lg p-2 border border-amber-200/70">
            <span className="block text-[9.5px] font-bold text-amber-700 uppercase tracking-wider">
              In INR (₹)
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-amber-900 mt-0.5 block tabular-nums truncate">
              {formatINR(dcbResult.rankValueINR)}
            </span>
            <span className="text-[9.5px] text-amber-600">At ₹{exchangeRate}/USD</span>
          </div>

          {/* 30% DCB Release */}
          <div className="bg-emerald-50/60 rounded-lg p-2 border border-emerald-200/70">
            <span className="block text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">
              DCB Release (30%)
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-emerald-900 mt-0.5 block tabular-nums">
              {formatUSD(dcbResult.dcbAmountUSD)}
            </span>
            <span className="text-[9.5px] text-emerald-600">Every 2 referrals</span>
          </div>

          {/* Gross Total (80%) */}
          <div className="bg-purple-50/60 rounded-lg p-2 border border-purple-200/70">
            <span className="block text-[9.5px] font-bold text-purple-700 uppercase tracking-wider">
              Gross Total (80%)
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-purple-900 mt-0.5 block tabular-nums">
              {formatUSD(dcbResult.grossAmountUSD)}
            </span>
            <span className="text-[9.5px] text-purple-600">Ref1 + Ref2 + DCB</span>
          </div>

          {/* Net Total (After 10% Fee) */}
          <div className="bg-teal-50/60 rounded-lg p-2 border border-teal-200/70">
            <span className="block text-[9.5px] font-bold text-teal-700 uppercase tracking-wider">
              Net Total (2 Refs)
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-teal-900 mt-0.5 block tabular-nums">
              {formatUSD(dcbResult.netTotalUSD)}
            </span>
            <span className="text-[9.5px] text-teal-600">{formatINR(dcbResult.netTotalINR)}</span>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Layout (Matching Attached Screenshot Visual Reference) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 lg:gap-3.5 items-start">
        {/* Left Side: Ranks Table (Reusing the Existing Ranks Table Columns & Design) */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="h-8 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-4 h-4 text-slate-700 shrink-0" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                Ranks Structure
              </h2>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                (Click row to select rank)
              </span>
            </div>
            {isAdmin && (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                Single Source of Truth
              </span>
            )}
          </div>

          {/* Ranks Presentation Table */}
          <div className="mt-2 overflow-hidden rounded-[8px] border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto dcb-ranks-table-scroll">
              <table className="w-full border-collapse text-left text-xs min-w-full font-['Inter',system-ui,sans-serif]">
                {/* Brown / Dark Top Banner Header matching the screenshot */}
                <thead className="bg-[#854d0e] text-white select-none">
                  <tr className="h-8">
                    <th className="py-1.5 px-2.5 w-10 text-center font-semibold text-[11px] text-slate-100 align-middle">
                      S.no
                    </th>
                    <th className="py-1.5 px-2.5 font-semibold text-[11px] text-white min-w-[70px] align-middle">
                      Ranks
                    </th>
                    <th className="py-1.5 px-2 text-right font-semibold text-[11px] text-slate-100 align-middle">
                      $
                    </th>
                    <th className="py-1.5 px-2 text-right font-semibold text-[11px] text-slate-100 whitespace-nowrap align-middle">
                      With gas fee
                    </th>
                    <th className="py-1.5 px-2 text-right font-semibold text-[11px] text-slate-100 whitespace-nowrap align-middle">
                      Multi ranks
                    </th>
                    <th className="py-1.5 px-2 text-right font-semibold text-[11px] text-slate-100 whitespace-nowrap align-middle">
                      In INR
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {computedRanks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        <Layers className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <p className="font-semibold text-xs text-slate-700">No ranks found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Please check rank configuration.</p>
                      </td>
                    </tr>
                  ) : (
                    computedRanks.map((rank, index) => {
                      const isSelected = selectedRank?.id === rank.id;
                      const pillStyle = RANK_PILL_STYLES[index % RANK_PILL_STYLES.length] ?? {
                        bg: 'bg-[#e0f2fe]',
                        text: 'text-[#0284c7]',
                        border: 'border-[#bae6fd]',
                      };

                      return (
                        <tr
                          key={rank.id}
                          onClick={() => setSelectedRankId(rank.id)}
                          className={`h-[30px] sm:h-[31px] cursor-pointer transition-colors duration-150 border-b border-slate-100 last:border-b-0 ${
                            isSelected
                              ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-400/50 font-medium'
                              : 'even:bg-[#f8fafc] odd:bg-white hover:bg-slate-50'
                          }`}
                        >
                          {/* S.no */}
                          <td className="py-1 px-2.5 text-center font-medium text-slate-500 text-[11.5px] tabular-nums">
                            {rank.serialNumber}
                          </td>

                          {/* Ranks with pill styling */}
                          <td className="py-1 px-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded-[4px] text-[10.5px] font-medium border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border} ${
                                isSelected ? 'ring-1 ring-amber-400' : ''
                              }`}
                            >
                              {rank.name}
                            </span>
                          </td>

                          {/* $ (Base Price) */}
                          <td className="py-1 px-2 text-right font-medium text-slate-800 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatUSD(rank.basePrice)}
                          </td>

                          {/* With gas fee */}
                          <td className="py-1 px-2 text-right font-normal text-slate-700 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatUSD(rank.totalWithGasUSD)}
                          </td>

                          {/* Multi ranks */}
                          <td className="py-1 px-2 text-right font-semibold text-slate-800 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatUSD(rank.multiRanksUSD)}
                          </td>

                          {/* In INR */}
                          <td className="py-1 px-2 text-right font-semibold text-slate-900 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatINR(rank.inINR)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reference badge block directly underneath (matches screenshot) */}
          {selectedRank && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="w-full sm:w-auto">
                <div className="inline-flex rounded-md overflow-hidden shadow-2xs border border-slate-300">
                  {/* Dynamic Rank Dropdown replacing static label */}
                  <div className="relative bg-[#0f2b5c]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          id="dcb-bottom-rank-dropdown-trigger"
                          aria-label="Choose rank trigger"
                          className="bg-[#0f2b5c] hover:bg-[#133570] text-white font-bold text-xs pl-3.5 pr-2.5 py-2 text-center min-w-[105px] cursor-pointer inline-flex items-center justify-between gap-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
                        >
                          <span>{selectedRank.name}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-white/80 shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={false}
                        align="start"
                        className="z-50 min-w-[125px] max-h-56 overflow-y-auto scrollbar-thin [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full bg-[#0f2b5c] border border-slate-700 p-1 text-white shadow-xl rounded-md"
                      >
                        {computedRanks.map((r) => (
                          <DropdownMenuItem
                            key={r.id}
                            onClick={() => setSelectedRankId(r.id)}
                            className={cn(
                              "cursor-pointer text-xs px-2.5 py-1.5 rounded hover:bg-[#1a448c] focus:bg-[#1a448c] text-white flex items-center justify-between transition-colors",
                              selectedRank.id === r.id && "bg-[#1f51a6] font-bold"
                            )}
                          >
                            <span>{r.name}</span>
                            {selectedRank.id === r.id && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0 ml-2" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Value Badges beside rank badge */}
                  <div className="bg-white px-3 py-1.5 flex items-center gap-3 border-l border-slate-200">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-medium block">In ($)</span>
                      <span className="font-bold text-xs text-slate-900 tabular-nums">
                        {formatUSD(dcbResult.rankValueUSD)}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-medium block">In (₹)</span>
                      <span className="font-bold text-xs text-slate-900 tabular-nums">
                        {formatINR(dcbResult.rankValueINR)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Hint */}
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>90-Day Eligibility Cycle Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: DOUBLE CONNECT BONUS (DCB 30%) Panel (Matching Screenshot Layout) */}
        <div className="xl:col-span-7 flex flex-col">
          {/* Header Bar matching screenshot: Olive/Green header */}
          <div className="overflow-hidden rounded-[8px] border border-slate-300 shadow-2xs bg-white">
            <div className="bg-[#415328] text-white text-center py-2 px-3 shadow-inner">
              <h2 className="text-sm font-bold tracking-wide uppercase">
                DOUBLE CONNECT BONUS (DCB 30%)
              </h2>
            </div>

            <div className="p-3 sm:p-4 bg-[#fbfdf9] space-y-4">
              {/* Top Subtitle & Highlighted 30% DCB Release Box */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-slate-600 mb-1.5">
                  (Automatically)
                </span>
                <div className="bg-[#f59e0b] hover:bg-[#d97706] transition-colors text-slate-950 font-bold px-6 py-2 rounded-md shadow-xs text-center border border-amber-500/40 min-w-[170px]">
                  <div className="text-base tracking-tight font-extrabold leading-none">30%</div>
                  <div className="text-xs font-bold tracking-wider mt-0.5">DCB Release</div>
                </div>
              </div>

              {/* Bonus Breakdown Flow Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-1.5 items-center justify-items-center text-center pt-1">
                {/* Ref 1 */}
                <div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs w-full max-w-[130px]">
                  <div className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatUSD(dcbResult.ref1AmountUSD)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                    {dcbResult.ref1Percentage}%
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                    Ref. 1
                  </div>
                </div>

                {/* Ref 2 */}
                <div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs w-full max-w-[130px]">
                  <div className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatUSD(dcbResult.ref2AmountUSD)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                    {dcbResult.ref2Percentage}%
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                    Ref. 2
                  </div>
                </div>

                {/* DCB Release (30%) */}
                <div className="bg-amber-50/70 p-2.5 rounded-md border border-amber-200 shadow-2xs w-full max-w-[130px]">
                  <div className="text-xs font-bold text-amber-950 tabular-nums">
                    {formatUSD(dcbResult.dcbAmountUSD)}
                  </div>
                  <div className="text-xs font-bold text-amber-700 mt-0.5">
                    {dcbResult.dcbPercentage}%
                  </div>
                  <div className="text-[11px] font-bold text-amber-900 mt-0.5">
                    30% DCB
                  </div>
                </div>

                {/* Gross Total */}
                <div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs w-full max-w-[130px]">
                  <div className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatUSD(dcbResult.grossAmountUSD)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Gross (80%)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Before fee
                  </div>
                </div>

                {/* Net Total */}
                <div className="bg-emerald-50/80 p-2.5 rounded-md border border-emerald-300 shadow-2xs w-full max-w-[130px]">
                  <div className="text-xs font-bold text-emerald-950 tabular-nums">
                    {formatUSD(dcbResult.netTotalUSD)}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">
                    Total
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">
                    Net (10% fee)
                  </div>
                </div>
              </div>

              {/* Milestones Row matching screenshot: Unlimited ref.. ₹ 3,60,000.00 | 100 | ₹ 7,20,000.00 | ₹ 10,80,000.00 */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex flex-col md:flex-row items-center justify-between gap-2.5">
                  <div className="font-bold text-xs text-slate-800 whitespace-nowrap self-start md:self-center">
                    Unlimited ref..
                  </div>

                  {/* Milestone Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto flex-1 max-w-xl">
                    {/* 2 Referrals Milestone */}
                    <div 
                      className="dcb-earnings-card"
                      data-testid="dcb-earnings-card-2"
                      title="Milestone Earnings for 2 Direct Qualifying Referrals"
                    >
                      <div className="dcb-earnings-card-inner">
                        <div className="dcb-earnings-amount">
                          {formatINR(dcbResult.milestones[0].totalINR)}
                        </div>
                        <div className="dcb-earnings-label">
                          <span>Earnings ($)</span> <span className="dcb-earnings-highlight">2 ↑</span>
                        </div>
                      </div>
                    </div>

                    {/* 4 Referrals Milestone */}
                    <div 
                      className="dcb-earnings-card"
                      data-testid="dcb-earnings-card-4"
                      title="Milestone Earnings for 4 Direct Qualifying Referrals"
                    >
                      <div className="dcb-earnings-card-inner">
                        <div className="dcb-earnings-amount">
                          {formatINR(dcbResult.milestones[1].totalINR)}
                        </div>
                        <div className="dcb-earnings-label">
                          <span>Earnings ($)</span> <span className="dcb-earnings-highlight">4 ↑</span>
                        </div>
                      </div>
                    </div>

                    {/* 6 Referrals Milestone */}
                    <div 
                      className="dcb-earnings-card"
                      data-testid="dcb-earnings-card-6"
                      title="Milestone Earnings for 6 Direct Qualifying Referrals"
                    >
                      <div className="dcb-earnings-card-inner">
                        <div className="dcb-earnings-amount">
                          {formatINR(dcbResult.milestones[2].totalINR)}
                        </div>
                        <div className="dcb-earnings-label">
                          <span>Earnings ($)</span> <span className="dcb-earnings-highlight">6 ↑</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Points Section matching screenshot: Brown Header Banner */}
              <div className="mt-4 overflow-hidden rounded-[6px] border border-amber-900/30">
                <div className="bg-[#854d0e] text-white py-1 px-3 text-center">
                  <span className="text-xs font-bold tracking-wide uppercase">
                    Important Points
                  </span>
                </div>
                <div className="bg-white p-3 text-xs text-slate-700 space-y-1.5 leading-relaxed font-medium">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">1)</span>
                    <span>
                      To, every 2 direct active referrals have 30% DCB to any rank.{' '}
                      <strong className="text-rose-600 font-bold">Unlimited ref.</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">2)</span>
                    <span>
                      90 days time period for 2nd referral, from date of 1st referral.{' '}
                      <ArrowUp className="inline-block w-3.5 h-3.5 text-slate-700 -mt-0.5" />
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">3)</span>
                    <span>
                      Withdrawl fee 10% & Transaction fee applicable.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">4)</span>
                    <span>
                      Here calculated withdrawl fee also.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
