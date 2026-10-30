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
  DollarSign,
  Pencil,
  Save,
  X,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle
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
import {
  loadDcbConfig,
  saveDcbConfigAdmin,
  resetDcbConfigAdmin,
  DCB_CONFIG_STORAGE_KEY,
  DCB_CONFIG_UPDATED_EVENT,
  DEFAULT_DCB_CONFIG
} from '@/lib/dcb-storage';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { OneTimeWorkHighlight } from '@/components/key-points/OneTimeWorkHighlight';
import { DcbRankRow, DcbConfig } from '@/types/dcb-bonus';

export type DcbCalculationMode = 'cumulative' | 'individual';

export interface DcbNinetyDaysViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
  isMobile?: boolean;
  initialMode?: DcbCalculationMode;
}

function useIsMobileView(customIsMobile?: boolean): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (customIsMobile !== undefined) return customIsMobile;
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    if (customIsMobile !== undefined) {
      setIsMobile(customIsMobile);
      return;
    }
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [customIsMobile]);

  return customIsMobile !== undefined ? customIsMobile : isMobile;
}

export function DcbNinetyDaysView({
  isAdmin = false,
  userEmail,
  isMobile: propIsMobile,
  initialMode = 'cumulative',
}: DcbNinetyDaysViewProps) {
  // Authoritative admin verification
  const isUserAdmin = Boolean(isAdmin || isUserAdminOrOwner(userEmail, 'sivaji491@gmail.com'));

  // Responsive mobile vs desktop view check (breakpoint: 768px)
  const isMobile = useIsMobileView(propIsMobile);

  // Calculation mode: 'cumulative' (default) vs 'individual'
  const [calcMode, setCalcMode] = useState<DcbCalculationMode>(initialMode);

  // 1. Data synchronization with single source of truth in Rank Calculator state
  const [state, setState] = useState(() => loadRankCalculatorState());
  const [selectedRankId, setSelectedRankId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 2. DCB Configuration state (Admin editable, User read-only)
  const [dcbConfig, setDcbConfig] = useState<DcbConfig>(() => loadDcbConfig());
  const [isEditing, setIsEditing] = useState(false);
  const [draftConfig, setDraftConfig] = useState<DcbConfig>(() => loadDcbConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Real-time listener: syncs DCB configuration across components, tabs, and remote sessions immediately
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleConfigEvent = (e: any) => {
      const updated = e?.detail || loadDcbConfig();
      setDcbConfig(updated);
      setDraftConfig((prev) => (isEditing ? prev : updated));
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === DCB_CONFIG_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDcbConfig(parsed);
          setDraftConfig((prev) => (isEditing ? prev : parsed));
        } catch { }
      }
    };

    window.addEventListener(DCB_CONFIG_UPDATED_EVENT, handleConfigEvent);
    window.addEventListener('storage', handleStorageEvent);

    // Supabase Real-time Channel for remote multi-client synchronizations
    let channel: any = null;
    try {
      if ((supabase as any)?.channel) {
        channel = (supabase as any)
          .channel('dcb_config_realtime_channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'dcb_config' },
            (payload: any) => {
              if (payload?.new?.config) {
                setDcbConfig(payload.new.config);
                setDraftConfig((prev) => (isEditing ? prev : payload.new.config));
              }
            }
          )
          .subscribe();
      }
    } catch (err) {
      console.warn('DCB realtime subscription note:', err);
    }

    return () => {
      window.removeEventListener(DCB_CONFIG_UPDATED_EVENT, handleConfigEvent);
      window.removeEventListener('storage', handleStorageEvent);
      if (channel && typeof channel.unsubscribe === 'function') {
        try {
          channel.unsubscribe();
        } catch { }
      }
    };
  }, [isEditing]);

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

  // Active settings: when admin is actively editing, live preview uses draftConfig; otherwise published dcbConfig
  const activeSettings = isUserAdmin && isEditing ? draftConfig : dcbConfig;

  // Target rank value based on calculation mode:
  // - Cumulative: multiRanksUSD (cumulative sum of base prices up to selected rank)
  // - Individual: basePrice (standalone base price of selected rank only)
  const targetRankValueUSD = useMemo(() => {
    if (!selectedRank) return 100;
    return calcMode === 'cumulative' ? selectedRank.multiRanksUSD : selectedRank.basePrice;
  }, [selectedRank, calcMode]);

  // Calculate DCB for active rank dynamically using targetRankValueUSD and active settings
  const dcbResult = useMemo(() => {
    if (!selectedRank) {
      return calculateDcbBonus('PBA 1', '', 100, exchangeRate, activeSettings);
    }
    return calculateDcbBonus(
      selectedRank.name,
      selectedRank.id,
      targetRankValueUSD,
      exchangeRate,
      activeSettings
    );
  }, [selectedRank, targetRankValueUSD, exchangeRate, activeSettings]);

// Admin action handlers
const handleStartEdit = () => {
  if (!isUserAdmin) return;
  setDraftConfig(dcbConfig);
  setIsEditing(true);
  setFeedback(null);
};

const handleCancel = () => {
  setDraftConfig(dcbConfig);
  setIsEditing(false);
  setFeedback(null);
};

const handleSave = async () => {
  if (!isUserAdmin) {
    setFeedback({
      type: 'error',
      message: 'Unauthorized: Only administrators have permission to edit the DCB configuration.',
    });
    return;
  }

  setIsSaving(true);
  setFeedback(null);

  const adminId = userEmail || 'sivaji491@gmail.com';
  const res = await saveDcbConfigAdmin(draftConfig, adminId);
  setIsSaving(false);

  if (res.success && res.data) {
    setDcbConfig(res.data);
    setDraftConfig(res.data);
    setIsEditing(false);
    setFeedback({
      type: 'success',
      message: 'DCB (90 days) configuration updated and saved successfully!',
    });
  } else {
    setFeedback({
      type: 'error',
      message: res.error || 'Failed to save DCB configuration.',
    });
  }
};

const handleResetDefaults = async () => {
  if (!isUserAdmin) return;
  setIsSaving(true);
  setFeedback(null);

  const adminId = userEmail || 'sivaji491@gmail.com';
  const res = await resetDcbConfigAdmin(adminId);
  setIsSaving(false);

  if (res.success && res.data) {
    setDcbConfig(res.data);
    setDraftConfig(res.data);
    setIsEditing(false);
    setFeedback({
      type: 'success',
      message: 'DCB settings reset to factory defaults successfully!',
    });
  } else {
    setFeedback({
      type: 'error',
      message: res.error || 'Failed to reset DCB configuration.',
    });
  }
};

return (
  <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 lg:p-3.5 space-y-2.5 w-full animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]">
    {/* Top-Left Animated "ONE TIME WORK" Highlight */}
    <div className="flex items-center justify-start self-start pb-0.5">
      <OneTimeWorkHighlight />
    </div>

    {/* 1. Header Toolbar with Page Title, Dynamic Rank Dropdown, and Admin Controls */}
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
                Double Connect Bonus {activeSettings.dcbReleasePercentage}%
              </span>
            </h1>
            <p className="text-xs text-slate-500 leading-tight">
              {activeSettings.subtitle || `Every 2 direct active referrals earn ${activeSettings.dcbReleasePercentage}% DCB release within ${activeSettings.eligibilityPeriodDays}-day qualification window.`}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Rank Dropdown, Currency Chip & Admin Controls */}
      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
        {/* Admin Edit Controls (Strictly hidden for regular users) */}
        {isUserAdmin && (
          <div className="flex items-center gap-1.5" data-testid="dcb-admin-controls-container">
            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                data-testid="dcb-admin-edit-btn"
                className="h-8 px-2.5 text-xs text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100 font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Edit DCB percentages, cycle days, and important points"
              >
                <Pencil className="w-3.5 h-3.5 mr-1 text-amber-700" />
                Edit DCB
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-lg border border-amber-200 shadow-2xs">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  data-testid="dcb-admin-save-btn"
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  data-testid="dcb-admin-cancel-btn"
                  className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 border-slate-300 bg-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDefaults}
                  disabled={isSaving}
                  data-testid="dcb-admin-reset-btn"
                  className="h-7 px-2 text-xs text-amber-800 hover:bg-amber-100/70 border-amber-300 bg-white cursor-pointer"
                  title="Reset to factory defaults"
                >
                  <RotateCcw className="w-3 h-3 mr-1 text-amber-700" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        )}

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
                      ? `${selectedRank.name} — ${formatUSD(calcMode === 'cumulative' ? selectedRank.multiRanksUSD : selectedRank.basePrice)}`
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
                    onSelect={() => setSelectedRankId(r.id)}
                    onClick={() => setSelectedRankId(r.id)}
                    className={cn(
                      "cursor-pointer text-xs px-2.5 py-1.5 rounded hover:bg-slate-100 focus:bg-slate-100 transition-colors flex items-center justify-between",
                      selectedRank?.id === r.id && "bg-amber-50 font-bold text-amber-800"
                    )}
                  >
                    <span className="truncate">
                      {r.name} — {formatUSD(calcMode === 'cumulative' ? r.multiRanksUSD : r.basePrice)} (With Gas: {formatUSD(r.totalWithGasUSD)})
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
                    {r.name} — {formatUSD(calcMode === 'cumulative' ? r.multiRanksUSD : r.basePrice)}
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

    {/* Feedback Banner (Success / Error notification) */}
    {feedback && (
      <div
        data-testid={feedback.type === 'success' ? 'dcb-feedback-success' : 'dcb-feedback-error'}
        role={feedback.type === 'success' ? 'status' : 'alert'}
        className={cn(
          "p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in transition-all",
          feedback.type === 'success'
            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
            : "bg-rose-50 border-rose-300 text-rose-900"
        )}
      >
        <div className="flex items-center gap-2">
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
        <button
          type="button"
          onClick={() => setFeedback(null)}
          aria-label="Dismiss feedback"
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )}

    {/* Admin Inline Editor Drawer/Panel (Visible only when Admin enters Edit mode) */}
    {isUserAdmin && isEditing && (
      <div
        data-testid="dcb-admin-editing-panel"
        className="p-3 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-amber-50/80 rounded-xl border border-amber-300/80 shadow-xs space-y-3 animate-in fade-in duration-200"
      >
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-800" />
            <h3 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wide">
              Edit DCB (90 Days) Configuration & Formulas
            </h3>
          </div>
          <span className="text-[11px] font-medium text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
            Admin Editing Mode
          </span>
        </div>

        {/* Form Grid for Percentages & Eligibility Window */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Ref 1 % */}
          <div className="space-y-1">
            <label htmlFor="dcb-input-ref1-percent" className="font-semibold text-slate-700 block text-[11px]">
              Ref 1 Bonus (%)
            </label>
            <div className="relative">
              <input
                id="dcb-input-ref1-percent"
                data-testid="dcb-input-ref1-percent"
                type="number"
                min="0"
                max="100"
                step="any"
                value={draftConfig.ref1Percentage}
                onChange={(e) => setDraftConfig({ ...draftConfig, ref1Percentage: Number(e.target.value) })}
                className="w-full h-8 px-2.5 pr-6 rounded-md border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="absolute right-2 top-2 text-slate-400 font-bold pointer-events-none">%</span>
            </div>
          </div>

          {/* Ref 2 % */}
          <div className="space-y-1">
            <label htmlFor="dcb-input-ref2-percent" className="font-semibold text-slate-700 block text-[11px]">
              Ref 2 Bonus (%)
            </label>
            <div className="relative">
              <input
                id="dcb-input-ref2-percent"
                data-testid="dcb-input-ref2-percent"
                type="number"
                min="0"
                max="100"
                step="any"
                value={draftConfig.ref2Percentage}
                onChange={(e) => setDraftConfig({ ...draftConfig, ref2Percentage: Number(e.target.value) })}
                className="w-full h-8 px-2.5 pr-6 rounded-md border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="absolute right-2 top-2 text-slate-400 font-bold pointer-events-none">%</span>
            </div>
          </div>

          {/* DCB Release % */}
          <div className="space-y-1">
            <label htmlFor="dcb-input-release-percent" className="font-semibold text-slate-700 block text-[11px]">
              DCB Release (%)
            </label>
            <div className="relative">
              <input
                id="dcb-input-release-percent"
                data-testid="dcb-input-release-percent"
                type="number"
                min="0"
                max="100"
                step="any"
                value={draftConfig.dcbReleasePercentage}
                onChange={(e) => setDraftConfig({ ...draftConfig, dcbReleasePercentage: Number(e.target.value) })}
                className="w-full h-8 px-2.5 pr-6 rounded-md border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="absolute right-2 top-2 text-slate-400 font-bold pointer-events-none">%</span>
            </div>
          </div>

          {/* Withdrawal Fee % */}
          <div className="space-y-1">
            <label htmlFor="dcb-input-fee-percent" className="font-semibold text-slate-700 block text-[11px]">
              Withdrawal Fee (%)
            </label>
            <div className="relative">
              <input
                id="dcb-input-fee-percent"
                data-testid="dcb-input-fee-percent"
                type="number"
                min="0"
                max="100"
                step="any"
                value={draftConfig.withdrawalFeePercentage}
                onChange={(e) => setDraftConfig({ ...draftConfig, withdrawalFeePercentage: Number(e.target.value) })}
                className="w-full h-8 px-2.5 pr-6 rounded-md border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="absolute right-2 top-2 text-slate-400 font-bold pointer-events-none">%</span>
            </div>
          </div>

          {/* Eligibility Period Days */}
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label htmlFor="dcb-input-eligibility-days" className="font-semibold text-slate-700 block text-[11px]">
              Cycle Window (Days)
            </label>
            <div className="relative">
              <input
                id="dcb-input-eligibility-days"
                data-testid="dcb-input-eligibility-days"
                type="number"
                min="1"
                max="3650"
                step="1"
                value={draftConfig.eligibilityPeriodDays}
                onChange={(e) => setDraftConfig({ ...draftConfig, eligibilityPeriodDays: Number(e.target.value) })}
                className="w-full h-8 px-2.5 pr-12 rounded-md border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="absolute right-2 top-2 text-slate-400 font-bold text-[10px] pointer-events-none">days</span>
            </div>
          </div>
        </div>

        {/* Important Points Editing */}
        <div className="space-y-1.5 pt-1">
          <label className="font-semibold text-slate-700 block text-[11px]">
            Important Points (Numbered List)
          </label>
          <div className="space-y-1.5">
            {(draftConfig.importantPoints || []).map((pt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-xs w-5 text-right shrink-0">{idx + 1})</span>
                <input
                  data-testid={`dcb-input-point-${idx + 1}`}
                  type="text"
                  value={pt}
                  onChange={(e) => {
                    const updated = [...(draftConfig.importantPoints || [])];
                    updated[idx] = e.target.value;
                    setDraftConfig({ ...draftConfig, importantPoints: updated });
                  }}
                  className="flex-1 h-8 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/70">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            data-testid="dcb-admin-cancel-bottom-btn"
            className="h-7 px-3 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            data-testid="dcb-admin-save-bottom-btn"
            className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-2xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    )}

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
          <span className="text-[9.5px] text-blue-600">
            {calcMode === 'cumulative' ? 'Multi ranks cumulative' : 'Individual rank base'}
          </span>
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

        {/* DCB Release */}
        <div className="bg-emerald-50/60 rounded-lg p-2 border border-emerald-200/70">
          <span className="block text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">
            DCB Release ({dcbResult.dcbPercentage}%)
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-emerald-900 mt-0.5 block tabular-nums">
            {formatUSD(dcbResult.dcbAmountUSD)}
          </span>
          <span className="text-[9.5px] text-emerald-600">Every 2 referrals</span>
        </div>

        {/* Gross Total */}
        <div className="bg-purple-50/60 rounded-lg p-2 border border-purple-200/70">
          <span className="block text-[9.5px] font-bold text-purple-700 uppercase tracking-wider">
            Gross Total ({dcbResult.ref1Percentage + dcbResult.ref2Percentage + dcbResult.dcbPercentage}%)
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-purple-900 mt-0.5 block tabular-nums">
            {formatUSD(dcbResult.grossAmountUSD)}
          </span>
          <span className="text-[9.5px] text-purple-600">Ref1 + Ref2 + DCB</span>
        </div>

        {/* Net Total (After Fee) */}
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

    {/* 3. Main Two-Column Layout (Side-by-Side Ranks Structure & DCB Panels) */}
    <div
      data-testid="dcb-main-sections-container"
      className="flex flex-col md:flex-row gap-2.5 sm:gap-3 lg:gap-3.5 items-stretch"
    >
      {/* Left Side: RANKS STRUCTURE Panel (Desktop & Tablet only) */}
      {!isMobile && (
        <div
          data-testid="dcb-ranks-structure-panel"
          className="hidden md:flex md:w-[210px] lg:w-[225px] xl:w-[240px] shrink-0 flex-col"
        >
          <div className="overflow-hidden rounded-[8px] border border-slate-300 shadow-2xs bg-white flex flex-col h-full">
            {/* Header Bar matching right side header height and alignment - clean CLICK ON RANK heading */}
            <div className="bg-[#854d0e] text-white py-1.5 sm:py-2 px-3 sm:px-4 shadow-inner shrink-0 flex items-center gap-2 min-h-[38px] sm:min-h-[42px]">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200 shrink-0" />
              <h2 className="text-xs sm:text-[13px] md:text-sm font-bold tracking-wide uppercase text-white truncate">
                CLICK ON RANK
              </h2>
            </div>

            {/* Table Area: Fills available height naturally with balanced row distribution */}
            <div className="flex-1 flex flex-col justify-between overflow-x-auto dcb-ranks-table-scroll bg-white">
              <table className="w-full border-collapse text-left text-xs font-['Inter',system-ui,sans-serif]">
                {/* Column Header */}
                <thead className="bg-[#78350f]/10 text-amber-950 font-bold border-b border-amber-900/15 select-none">
                  <tr className="h-7 sm:h-8">
                    <th className="py-1.5 px-3 w-14 sm:w-16 text-center font-bold text-[10.5px] sm:text-[11px] text-amber-950 align-middle">
                      <span className="sr-only">S.no</span>
                      <span>S.No</span>
                    </th>
                    <th className="py-1.5 px-3 sm:px-4 font-bold text-[10.5px] sm:text-[11px] text-amber-950 align-middle">
                      Ranks
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {computedRanks.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500">
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
                          className={`h-[33px] sm:h-[36px] cursor-pointer transition-colors duration-150 border-b border-slate-100 last:border-b-0 ${isSelected
                              ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-400/50 font-medium'
                              : 'even:bg-[#f8fafc] odd:bg-white hover:bg-slate-50'
                            }`}
                        >
                          {/* S.No */}
                          <td className="py-1 px-3 text-center font-medium text-slate-500 text-[11px] sm:text-[11.5px] tabular-nums w-14 sm:w-16">
                            {rank.serialNumber}
                          </td>

                          {/* Ranks with pill styling */}
                          <td className="py-1 px-3 sm:px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-medium border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border} ${isSelected ? 'ring-1 ring-amber-400 font-bold' : ''
                                }`}
                            >
                              {rank.name}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Quick Navigation Hint pinned directly at bottom of panel */}
              <div className="mt-auto px-3 py-2 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-[10.5px] sm:text-[11px] text-slate-500">
                <span className="font-medium text-slate-600">{activeSettings.eligibilityPeriodDays}-Day Eligibility Cycle Active</span>
                <span className="font-medium text-slate-500">
                  Selected: <strong className="text-slate-800 font-semibold">{selectedRank?.name}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Side: DOUBLE CONNECT BONUS Panel */}
      <div
        data-testid="dcb-bonus-panel"
        className="flex-1 min-w-0 w-full flex flex-col overflow-hidden rounded-[8px] border border-slate-300 shadow-2xs bg-white"
      >
        {/* Header Bar matching left side header height and alignment */}
        <div className="bg-[#415328] text-white text-center py-1.5 sm:py-2 px-3 sm:px-4 shadow-inner shrink-0 flex items-center justify-center min-h-[38px] sm:min-h-[42px]">
          <h2 className="text-xs sm:text-[13px] md:text-sm font-bold tracking-wide uppercase">
            DOUBLE CONNECT BONUS (DCB {activeSettings.dcbReleasePercentage}%)
          </h2>
        </div>

        <div className="p-2 sm:p-2.5 md:p-3 bg-[#fbfdf9] flex-1 flex flex-col justify-between space-y-2 sm:space-y-2.5">
          {/* Top Subtitle & Highlighted DCB Benefit Component with Far-Right Mode Switch */}
          <div className="flex flex-col items-center justify-center w-full">
            <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 mb-1 tracking-wide">
              (Automatically)
            </span>

            {/* Container spanning full width: 30% card centered directly above Card 3, mode switch at far right */}
            <div className="relative w-full flex items-center justify-center">
              {/* 1. Centered 30% DCB BENEFIT card directly above the 3rd card in the 5-card row */}
              <div
                className="dcb-benefit-box"
                data-testid="dcb-benefit-box"
                title={`${activeSettings.dcbReleasePercentage}% Double Connect Bonus Benefit`}
              >
                <div className="dcb-benefit-value">
                  {activeSettings.dcbReleasePercentage}%
                </div>
                <div className="dcb-benefit-label">
                  DCB BENEFIT
                </div>
              </div>

              {/* 2. Cumulative / Individual mode switch aligned completely to the FAR RIGHT of the entire section */}
              <div
                className="dcb-calculation-mode-switch absolute right-0 top-1/2 -translate-y-1/2"
                role="radiogroup"
                aria-label="DCB Calculation Mode Switch"
                data-testid="dcb-calculation-mode-switch"
              >
                <button
                  type="button"
                  data-testid="dcb-mode-cumulative-btn"
                  role="radio"
                  aria-checked={calcMode === 'cumulative'}
                  onClick={() => setCalcMode('cumulative')}
                  className={cn(
                    "dcb-mode-btn",
                    calcMode === 'cumulative'
                      ? "dcb-mode-btn-active font-bold text-emerald-800"
                      : "dcb-mode-btn-inactive"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                      calcMode === 'cumulative' ? "bg-emerald-600" : "bg-transparent opacity-0"
                    )}
                  />
                  <span>Cumulative</span>
                </button>
                <button
                  type="button"
                  data-testid="dcb-mode-individual-btn"
                  role="radio"
                  aria-checked={calcMode === 'individual'}
                  onClick={() => setCalcMode('individual')}
                  className={cn(
                    "dcb-mode-btn",
                    calcMode === 'individual'
                      ? "dcb-mode-btn-active font-bold text-emerald-800"
                      : "dcb-mode-btn-inactive"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                      calcMode === 'individual' ? "bg-emerald-600" : "bg-transparent opacity-0"
                    )}
                  />
                  <span>Individual</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bonus Breakdown Flow Row - 5 Premium Summary Cards with Smooth Zoom Animation */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 lg:gap-2.5 items-stretch text-center py-1 px-0.5">
            {/* Card 1: Ref 1 */}
            <div
              className="dcb-summary-card dcb-summary-card-ref"
              data-testid="dcb-card-ref-1"
              title="Direct Referral 1 Bonus"
            >
              <div className="dcb-card-amount text-slate-900">
                {formatUSD(dcbResult.ref1AmountUSD)}
              </div>
              <div className="dcb-card-badge bg-emerald-100/90 text-emerald-800 border border-emerald-300/70">
                {dcbResult.ref1Percentage}%
              </div>
              <div className="dcb-card-caption text-slate-600">
                Ref. 1
              </div>
            </div>

            {/* Card 2: Ref 2 */}
            <div
              className="dcb-summary-card dcb-summary-card-ref"
              data-testid="dcb-card-ref-2"
              title="Direct Referral 2 Bonus"
            >
              <div className="dcb-card-amount text-slate-900">
                {formatUSD(dcbResult.ref2AmountUSD)}
              </div>
              <div className="dcb-card-badge bg-emerald-100/90 text-emerald-800 border border-emerald-300/70">
                {dcbResult.ref2Percentage}%
              </div>
              <div className="dcb-card-caption text-slate-600">
                Ref. 2
              </div>
            </div>

            {/* Card 3: DCB Centerpiece Featured Card */}
            <div
              className="dcb-summary-card dcb-summary-card-center"
              data-testid="dcb-card-30-dcb"
              title={`${dcbResult.dcbPercentage}% Double Connect Bonus`}
            >
              <div className="dcb-card-amount text-amber-950">
                {formatUSD(dcbResult.dcbAmountUSD)}
              </div>
              <div className="dcb-card-badge bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black shadow-2xs border border-amber-600/40">
                {dcbResult.dcbPercentage}%
              </div>
              <div className="dcb-card-caption text-amber-900 font-extrabold">
                {dcbResult.dcbPercentage}% DCB
              </div>
            </div>

            {/* Card 4: Gross Total */}
            <div
              className="dcb-summary-card dcb-summary-card-gross"
              data-testid="dcb-card-gross"
              title="Gross Total Bonus Before Fee"
            >
              <div className="dcb-card-amount text-slate-900">
                {formatUSD(dcbResult.grossAmountUSD)}
              </div>
              <div className="dcb-card-badge bg-slate-200/80 text-slate-700 border border-slate-300/70">
                Gross ({dcbResult.ref1Percentage + dcbResult.ref2Percentage + dcbResult.dcbPercentage}%)
              </div>
              <div className="dcb-card-caption text-slate-500 font-semibold normal-case">
                Before fee
              </div>
            </div>

            {/* Card 5: Total / Net (Fee) */}
            <div
              className="dcb-summary-card dcb-summary-card-net"
              data-testid="dcb-card-net"
              title={`Net Payout Total After ${dcbResult.withdrawalFeePercent}% Fee`}
            >
              <div className="dcb-card-amount text-emerald-950">
                {formatUSD(dcbResult.netTotalUSD)}
              </div>
              <div className="dcb-card-badge bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black shadow-2xs border border-emerald-700/40">
                Total
              </div>
              <div className="dcb-card-caption text-emerald-700 font-bold normal-case">
                Net ({dcbResult.withdrawalFeePercent}% fee)
              </div>
            </div>
          </div>

          {/* Milestones Row matching screenshot */}
          <div className="pt-1.5 sm:pt-2 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
              <div className="font-bold text-[10.5px] sm:text-xs text-slate-800 whitespace-nowrap self-start sm:self-center">
                Unlimited ref..
              </div>

              {/* Milestone Cards Grid */}
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 lg:gap-2 w-full sm:w-auto flex-1 max-w-xl">
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

          {/* Mobile-Only Horizontal Ranks Selector (Immediately below 3 Earnings Cards) */}
          {isMobile && (
            <div
              data-testid="dcb-mobile-horizontal-ranks-container"
              className="md:hidden pt-2 border-t border-slate-200/80 space-y-1.5"
            >
              {/* Horizontal Scrollable Row for Ranks (PBA 1 to PBA 7) */}
              <div 
                data-testid="dcb-mobile-ranks-row"
                className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-thin [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {computedRanks.map((rank, index) => {
                  const isSelected = selectedRank?.id === rank.id;
                  const pillStyle = RANK_PILL_STYLES[index % RANK_PILL_STYLES.length] ?? {
                    bg: 'bg-[#e0f2fe]',
                    text: 'text-[#0284c7]',
                    border: 'border-[#bae6fd]',
                  };

                  return (
                    <button
                      key={rank.id}
                      type="button"
                      data-testid={`dcb-mobile-rank-chip-${rank.id}`}
                      aria-label={`Select ${rank.name}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedRankId(rank.id)}
                      className={cn(
                        "h-8 px-3 rounded-[6px] text-xs font-semibold border transition-all shrink-0 cursor-pointer flex items-center justify-center select-none active:scale-95",
                        pillStyle.bg,
                        pillStyle.text,
                        isSelected
                          ? "ring-2 ring-amber-400 border-amber-400 font-black shadow-xs bg-amber-50"
                          : `${pillStyle.border} hover:opacity-90`
                      )}
                    >
                      {rank.name}
                    </button>
                  );
                })}
              </div>

              {/* Mobile-Only Eligibility Cycle & Selected Rank Hint directly beneath horizontal ranks */}
              <div 
                data-testid="dcb-mobile-eligibility-hint"
                className="px-2.5 py-1.5 bg-slate-50/90 rounded-[6px] border border-slate-200/80 flex items-center justify-between text-[10.5px] text-slate-500"
              >
                <span className="font-medium text-slate-600">
                  {activeSettings.eligibilityPeriodDays}-Day Eligibility Cycle Active
                </span>
                <span className="font-medium text-slate-500">
                  Selected: <strong className="text-slate-800 font-semibold">{selectedRank?.name}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Important Points Section: Brown Header Banner */}
          <div className="mt-1.5 sm:mt-2 overflow-hidden rounded-[6px] border border-amber-900/30">
            <div className="bg-[#854d0e] text-white py-1 px-2.5 text-center">
              <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wide uppercase">
                Important Points
              </span>
            </div>
            <div className="bg-white p-2 sm:p-2.5 text-[10px] sm:text-[10.5px] lg:text-[11px] text-slate-700 space-y-1 leading-normal font-medium">
              {(activeSettings.importantPoints || []).map((pointText, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="font-bold text-slate-900 shrink-0">{idx + 1})</span>
                  {idx === 0 && pointText.includes('Unlimited ref.') ? (
                    <span>
                      {pointText.replace('Unlimited ref.', '').trim()}{' '}
                      <strong className="text-rose-600 font-bold">Unlimited ref.</strong>
                    </span>
                  ) : idx === 1 ? (
                    <span>
                      {pointText}{' '}
                      <ArrowUp className="inline-block w-3.5 h-3.5 text-slate-700 -mt-0.5" />
                    </span>
                  ) : (
                    <span>{pointText}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
