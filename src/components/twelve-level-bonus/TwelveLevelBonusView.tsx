import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Award, 
  Layers, 
  Coins, 
  ArrowUpDown, 
  Check, 
  Info, 
  ChevronDown, 
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  CornerDownRight,
  ArrowUpRight,
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
import { formatUSD, formatINR, formatPercent } from '@/lib/rank-calculator-engine';
import { OneTimeWorkHighlight } from '@/components/key-points/OneTimeWorkHighlight';
import { RANK_PILL_STYLES } from '@/components/rank-calculator/RanksTableView';
import { 
  computeTwelveLevelRanks, 
  calculateTwelveLevelBonus,
  computeTwelveLevelCalculationResult
} from '@/lib/twelve-level-bonus-engine';
import { TwelveLevelRankRow } from '@/types/twelve-level-bonus';

export interface TwelveLevelBonusViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
  onNavigateToRanks?: () => void;
}

export function TwelveLevelBonusView({
  isAdmin = false,
  userEmail,
  onNavigateToRanks,
}: TwelveLevelBonusViewProps) {
  // 1. Data synchronization with single source of truth in Rank Calculator state
  const [state, setState] = useState(() => loadRankCalculatorState());
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);
  const [descendingOrder, setDescendingOrder] = useState(true);
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
  const exchangeRate = state.currency.exchangeRateUSDToINR || 100;
  const computedRanks: TwelveLevelRankRow[] = useMemo(() => {
    return computeTwelveLevelRanks(state.ranks, exchangeRate);
  }, [state.ranks, exchangeRate]);

  // Ensure an active rank is selected (defaults to the highest rank like PBA 7 in screenshot, or first available)
  useEffect(() => {
    if (computedRanks.length > 0) {
      if (!selectedRankId || !computedRanks.some((r) => r.id === selectedRankId)) {
        // Select PBA 7 if it exists, or last rank, as shown in the screenshot
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

  // 12-level bonus rows dynamically calculated from selected rank
  const bonusCalculation = useMemo(() => {
    const basePrice = selectedRank ? selectedRank.basePrice : 0;
    const rows = calculateTwelveLevelBonus(basePrice, exchangeRate, descendingOrder);
    const totalPercentage = rows.reduce((acc, r) => acc + r.percentage, 0);
    const totalBonusUSD = rows.reduce((acc, r) => acc + r.bonusAmountUSD, 0);
    const totalBonusINR = rows.reduce((acc, r) => acc + r.bonusAmountINR, 0);

    return {
      rows,
      totalPercentage,
      totalBonusUSD,
      totalBonusINR,
    };
  }, [selectedRank, exchangeRate, descendingOrder]);

  const filteredRanks = computedRanks;

  const currentFeePercent = computedRanks.length > 0 ? computedRanks[0]?.networkFeePercent : 3;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2 sm:p-2.5 lg:p-2.5 space-y-1.5 sm:space-y-2 w-full animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]">
      {/* Top-Left Animated "ONE TIME WORK" Highlight */}
      <div className="flex items-center justify-start self-start pb-0.5">
        <OneTimeWorkHighlight />
      </div>

      {/* 1. Header Toolbar with Page Title, Dynamic Rank Dropdown, and Summary Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                12 Level Bonus
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Compressed Matrix
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                Dynamic rank multi-tier calculation and 12-level distribution model (50% max payout).
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Rank Dropdown & Quick Select Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Dynamic Rank Selection Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="rank-select-dropdown" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Select Rank:
            </label>
            <div className="relative flex-1 sm:w-56">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    id="rank-select-dropdown-trigger"
                    aria-label="Select rank trigger"
                    disabled={computedRanks.length === 0}
                    className="w-full h-7 pl-2.5 pr-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition cursor-pointer flex items-center justify-between gap-1.5"
                  >
                    <span className="truncate">
                      {selectedRank
                        ? `${selectedRank.name} — ${formatUSD(selectedRank.basePrice)} (With Gas: ${formatUSD(selectedRank.totalWithGasUSD)})`
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
                        selectedRank?.id === r.id && "bg-emerald-50 font-bold text-emerald-800"
                      )}
                    >
                      <span className="truncate">
                        {r.name} — {formatUSD(r.basePrice)} (With Gas: {formatUSD(r.totalWithGasUSD)})
                      </span>
                      {selectedRank?.id === r.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Accessible fallback select for screen readers and test suites */}
              <select
                id="rank-select-dropdown"
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
                      {r.name} — {formatUSD(r.basePrice)} (With Gas: {formatUSD(r.totalWithGasUSD)})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Currency Rate Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Rate: ₹{exchangeRate.toFixed(2)}/USD</span>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Stat Badges for Active Selected Rank */}
      {selectedRank && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {/* Active Rank */}
          <div className="bg-slate-50/80 rounded-lg p-1.5 border border-slate-200/80">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Selected Rank
            </span>
            <span className="text-xs sm:text-[12px] font-bold text-slate-800 mt-0.5 block truncate">
              {selectedRank.name}
            </span>
            <span className="text-[9px] text-slate-400">Level #{selectedRank.serialNumber}</span>
          </div>

          {/* Base Amount */}
          <div className="bg-blue-50/60 rounded-lg p-1.5 border border-blue-200/70">
            <span className="block text-[9px] font-bold text-blue-700 uppercase tracking-wider">
              Base Amount ($)
            </span>
            <span className="text-xs sm:text-[12px] font-bold text-blue-900 mt-0.5 block tabular-nums">
              {formatUSD(selectedRank.basePrice)}
            </span>
            <span className="text-[9px] text-blue-600">Exclusive of gas</span>
          </div>

          {/* With Gas Fee */}
          <div className="bg-emerald-50/60 rounded-lg p-1.5 border border-emerald-200/70">
            <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
              With Gas ({selectedRank.networkFeePercent}%)
            </span>
            <span className="text-xs sm:text-[12px] font-bold text-emerald-900 mt-0.5 block tabular-nums">
              {formatUSD(selectedRank.totalWithGasUSD)}
            </span>
            <span className="text-[9px] text-emerald-600">+{formatUSD(selectedRank.networkFeeUSD)} gas</span>
          </div>

          {/* Multi Ranks */}
          <div className="bg-purple-50/60 rounded-lg p-1.5 border border-purple-200/70">
            <span className="block text-[9px] font-bold text-purple-700 uppercase tracking-wider">
              Multi Ranks
            </span>
            <span className="text-xs sm:text-[12px] font-bold text-purple-900 mt-0.5 block tabular-nums">
              {formatUSD(selectedRank.multiRanksUSD)}
            </span>
            <span className="text-[9px] text-purple-600">Cumulative base</span>
          </div>

          {/* In INR */}
          <div className="bg-amber-50/60 rounded-lg p-1.5 border border-amber-200/70">
            <span className="block text-[9px] font-bold text-amber-700 uppercase tracking-wider">
              In INR (₹)
            </span>
            <span className="text-xs sm:text-[12px] font-bold text-amber-900 mt-0.5 block tabular-nums truncate">
              {formatINR(selectedRank.inINR)}
            </span>
            <span className="text-[9px] text-amber-600">At ₹{exchangeRate}/USD</span>
          </div>

          {/* 12-Level Payout (50%) */}
          <div className="bg-teal-50/60 rounded-lg p-1.5 border border-teal-200/70">
            <span className="block text-[9px] font-bold text-teal-700 uppercase tracking-wider">
              12-Level Total (50%)
            </span>
            <span className="text-xs sm:text-[12px] font-bold text-teal-900 mt-0.5 block tabular-nums">
              {formatUSD(bonusCalculation.totalBonusUSD)}
            </span>
            <span className="text-[9px] text-teal-600">{formatINR(bonusCalculation.totalBonusINR)}</span>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Layout (Matching Attached Screenshot Visual Reference) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 lg:gap-3 items-start">
        {/* Left Side: Ranks Table (Reusing the Existing Ranks Table Columns & Design) */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="h-7 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                Ranks Structure
              </h2>
              <span className="text-[10.5px] text-slate-500 font-medium hidden sm:inline">
                (Click any row to select rank)
              </span>
            </div>
            {isAdmin && (
              <span className="text-[9.5px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                Single Source of Truth (Synced)
              </span>
            )}
          </div>

          {/* Ranks Presentation Table */}
          <div className="mt-1 overflow-hidden rounded-[8px] border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto twelve-ranks-table-scroll">
              <table className="w-full border-collapse text-left text-xs min-w-full font-['Inter',system-ui,sans-serif]">
                {/* Brown / Dark Top Banner Header matching the screenshot */}
                <thead className="bg-[#854d0e] text-white select-none">
                  <tr className="h-7">
                    <th className="py-1 px-2.5 w-10 text-center font-semibold text-[10.5px] text-slate-100 align-middle">
                      S.no
                    </th>
                    <th className="py-1 px-2.5 font-semibold text-[10.5px] text-white min-w-[70px] align-middle">
                      Ranks
                    </th>
                    <th className="py-1 px-2 text-right font-semibold text-[10.5px] text-slate-100 align-middle">
                      $
                    </th>
                    <th className="py-1 px-2 text-right font-semibold text-[10.5px] text-slate-100 whitespace-nowrap align-middle">
                      With gas fee
                    </th>
                    <th className="py-1 px-2 text-right font-semibold text-[10.5px] text-slate-100 whitespace-nowrap align-middle">
                      Multi ranks
                    </th>
                    <th className="py-1 px-2 text-right font-semibold text-[10.5px] text-slate-100 whitespace-nowrap align-middle">
                      In INR
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {filteredRanks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        <Layers className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                        <p className="font-semibold text-xs text-slate-700">No ranks found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Please check rank configuration.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRanks.map((rank, index) => {
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
                          className={`h-[24px] sm:h-[25px] cursor-pointer transition-colors duration-150 border-b border-slate-100 last:border-b-0 ${
                            isSelected
                              ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-400/50 font-medium'
                              : 'even:bg-[#f8fafc] odd:bg-white hover:bg-slate-50'
                          }`}
                        >
                          {/* S.no */}
                          <td className="py-0.5 px-2.5 text-center font-medium text-slate-500 text-[11px] tabular-nums">
                            {rank.serialNumber}
                          </td>

                          {/* Ranks with pill styling */}
                          <td className="py-0.5 px-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border} ${
                                isSelected ? 'ring-1 ring-blue-400' : ''
                              }`}
                            >
                              {rank.name}
                            </span>
                          </td>

                          {/* $ (Base Price) */}
                          <td className="py-0.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatUSD(rank.basePrice)}
                          </td>

                          {/* With gas fee */}
                          <td className="py-0.5 px-2 text-right font-normal text-slate-700 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatUSD(rank.totalWithGasUSD)}
                          </td>

                          {/* Multi ranks */}
                          <td className="py-0.5 px-2 text-right font-semibold text-slate-800 whitespace-nowrap text-[11.5px] tabular-nums">
                            {formatUSD(rank.multiRanksUSD)}
                          </td>

                          {/* In INR */}
                          <td className="py-0.5 px-2 text-right font-semibold text-slate-900 whitespace-nowrap text-[11.5px] tabular-nums">
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

          {/* Visual reference badge block directly underneath (matches screenshot) */}
          {selectedRank && (
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="w-full sm:w-auto">
                <div className="inline-flex rounded-md overflow-hidden shadow-2xs border border-slate-300">
                  {/* Dynamic Rank Dropdown replacing static label */}
                  <div className="relative bg-[#0f2b5c]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          id="bottom-rank-dropdown-trigger"
                          aria-label="Choose rank trigger"
                          className="bg-[#0f2b5c] hover:bg-[#133570] text-white font-bold text-xs pl-3 pr-2 py-1.5 text-center min-w-[95px] cursor-pointer inline-flex items-center justify-between gap-1 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
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
                              "cursor-pointer text-xs font-semibold px-2.5 py-1.5 rounded text-white hover:bg-white/15 focus:bg-white/15 focus:text-white transition-colors flex items-center justify-between",
                              selectedRank.id === r.id && "bg-white/20 font-bold"
                            )}
                          >
                            <span>{r.name}</span>
                            {selectedRank.id === r.id && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Accessible fallback select for screen readers and test suites */}
                    <select
                      id="bottom-rank-dropdown"
                      aria-label="Select rank dropdown"
                      value={selectedRank.id}
                      onChange={(e) => setSelectedRankId(e.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                    >
                      {computedRanks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Adjacent value updating dynamically with selected rank's configured value */}
                  <div className="bg-[#1b7a99] text-white font-bold text-xs px-4 py-1.5 text-center min-w-[80px] flex items-center justify-center tabular-nums">
                    {selectedRank.basePrice}
                  </div>
                </div>
                <div className="h-1 bg-[#ea580c] rounded-b-sm w-full mt-[-1px]" />
                <p className="text-[9.5px] text-slate-400 mt-0.5 font-normal">
                  Copyright © 2025 IG Infra developers. All rights reserved
                </p>
              </div>

              {/* Sub-note */}
              <div className="text-right text-[10.5px] text-slate-500">
                <p>3% Gas fee and rank purchasing orderwise.</p>
                <p className="font-semibold text-slate-700">365 days validity (Refer equal/PBA 3)</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: 12 Level Bonus (Compressed) Table */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="h-7 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                12 Level Bonus (Compressed)
              </h2>
            </div>

            {/* Toggle Sort Order Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDescendingOrder((prev) => !prev)}
              className="h-6 px-1.5 text-[10.5px] text-slate-600 hover:text-slate-900 border border-slate-200 shrink-0"
              title="Toggle level order (L-12 to L-1 or L-1 to L-12)"
            >
              <ArrowUpDown className="w-3 h-3 mr-1 text-slate-500" />
              {descendingOrder ? 'L-12 → L-1' : 'L-1 → L-12'}
            </Button>
          </div>

          {/* 12 Level Bonus Presentation Card */}
          <div className="mt-1 overflow-hidden rounded-[8px] border border-slate-300/90 shadow-2xs bg-white">
            {/* Brown Header Bar matching the height and style of the left table header */}
            <div className="bg-[#854d0e] text-white px-3 font-bold text-xs tracking-wide text-center h-7 flex items-center justify-center">
              12 Level Bonus (Compressed)
            </div>

            {/* Table */}
            <div className="overflow-x-auto twelve-ranks-table-scroll">
              <table className="w-full border-collapse text-left text-xs min-w-full font-['Inter',system-ui,sans-serif]">
                <tbody className="divide-y divide-slate-100">
                  {bonusCalculation.rows.map((row) => {
                    const isDirect = row.isDirectReferral;
                    return (
                      <tr
                        key={row.level}
                        className="h-[20px] sm:h-[21px] odd:bg-[#e0f2fe]/60 even:bg-white hover:bg-blue-100/40 transition-colors"
                      >
                        {/* Level Label (e.g. L-12, L-1) */}
                        <td className="py-0 px-2.5 font-semibold text-slate-700 text-center w-16 text-[11px]">
                          {row.label}
                        </td>

                        {/* Percentage (e.g. 2%, 5%, 25%) */}
                        <td className="py-0 px-2.5 text-center font-bold text-slate-800 w-16 text-[11px]">
                          {formatPercent(row.percentage)}
                        </td>

                        {/* Dollar Amount */}
                        <td className="py-0 px-2.5 text-right font-bold text-slate-900 text-[11.5px] tabular-nums">
                          {formatUSD(row.bonusAmountUSD)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom "You" and "Ref." indicator row matching screenshot */}
            <div className="border-t border-slate-200 bg-slate-50/70 p-1.5 sm:p-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-start leading-none text-slate-700 font-semibold text-[10.5px]">
                    <span className="text-emerald-700 font-bold">You</span>
                    <div className="flex items-center gap-0.5 mt-0.5 text-slate-600">
                      <span>Ref.</span>
                      <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                    </div>
                  </div>
                  <div className="bg-[#dcfce7] border border-[#86efac] text-[#166534] px-2 py-0.5 rounded text-[10px] font-semibold shadow-2xs">
                    L-1 Direct Sponsor: 25% ({formatUSD(selectedRank ? selectedRank.basePrice * 0.25 : 0)})
                  </div>
                </div>

                {/* Total Payout */}
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                    TOTAL (50%)
                  </span>
                  <span className="text-xs sm:text-[12px] font-bold text-emerald-800 tabular-nums">
                    {formatUSD(bonusCalculation.totalBonusUSD)}
                  </span>
                </div>
              </div>

              {/* Note matching exact text in screenshot */}
              <div className="pt-0.5 border-t border-slate-200/80">
                <p className="text-[10.5px] font-semibold text-[#b91c1c] leading-tight">
                  Note: You have to be either equal level or one step ahead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
