import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Target, 
  Coins, 
  ChevronDown, 
  Sparkles, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Plus, 
  Check, 
  Info, 
  TrendingUp, 
  Layers, 
  X, 
  Save, 
  Sliders,
  DollarSign,
  AlertCircle,
  Award,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OneTimeWorkHighlight } from '@/components/key-points/OneTimeWorkHighlight';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { loadRankCalculatorState } from '@/lib/rank-storage';
import { RankItem } from '@/types/rank-calculator';
import { formatUSD, formatINR } from '@/lib/rank-calculator-engine';
import { RANK_PILL_STYLES } from '@/components/rank-calculator/RanksTableView';
import { 
  computePotentialityTable, 
  DEFAULT_POTENTIALITY_ROWS, 
  DEFAULT_POTENTIALITY_MESSAGES,
  DEFAULT_POTENTIALITY_TIME_PERIODS,
  DEFAULT_JUST_REFER_OPTIONS,
  DEFAULT_PERIOD_CONFIGS,
  generateRowsForPeriodType,
  MAIN_TIME_DROPDOWN_OPTIONS,
  MainTimeDropdownOption,
  PERIOD_TYPE_TO_MAIN_OPTION,
  vlookupPotentialityPeriod,
  autoPopulateTimeColumn
} from '@/lib/potentiality-engine';
import { 
  loadPotentialityState, 
  savePotentialityState, 
  resetPotentialityState 
} from '@/lib/potentiality-storage';
import { 
  PotentialityRowConfig, 
  PotentialityComputedRow, 
  PotentialityMessages,
  TimePeriodType,
  TimePeriodTypeConfig
} from '@/types/potentiality';

export const PERIOD_TYPES: { id: TimePeriodType; label: string }[] = [
  { id: 'days', label: 'Days' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'interval-weeks', label: 'Interval Weeks' },
  { id: 'monthly', label: 'Monthly' },
];

export const REFERRAL_OPTIONS: number[] = [2, 4, 6, 8, 10];

export interface PotentialityViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
}

export function PotentialityView({ isAdmin = false }: PotentialityViewProps) {
  // 1. Single Source of Truth: Rank Calculator State (ranks & exchange rate)
  const [rankState, setRankState] = useState(() => loadRankCalculatorState());
  const [selectedRankId, setSelectedRankId] = useState<string>(() => {
    const initial = loadRankCalculatorState();
    return initial.ranks?.[0]?.id || 'pba-1';
  });

  const handleSelectRank = useCallback((rankId: string) => {
    setSelectedRankId(rankId);
  }, []);

  // 2. Potentiality Persisted State (rows, messages, settings)
  const [potentialityState, setPotentialityState] = useState(() => loadPotentialityState());
  const [justReferGlobal, setJustReferGlobal] = useState<number>(() => potentialityState.justReferGlobal || 2);

  // Sync listener: auto-update when admin edits ranks, prices, gas fees, or exchange rate
  const syncRankData = useCallback(() => {
    try {
      const latest = loadRankCalculatorState();
      setRankState(latest);
    } catch {}
  }, []);

  const syncPotentialityData = useCallback(() => {
    try {
      const latest = loadPotentialityState();
      setPotentialityState(latest);
      setJustReferGlobal(latest.justReferGlobal || 2);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', syncRankData);
    window.addEventListener('nexora_ranks_updated', syncRankData);
    window.addEventListener('smartway_potentiality_updated', syncPotentialityData);

    return () => {
      window.removeEventListener('storage', syncRankData);
      window.removeEventListener('nexora_ranks_updated', syncRankData);
      window.removeEventListener('smartway_potentiality_updated', syncPotentialityData);
    };
  }, [syncRankData, syncPotentialityData]);

  // Available ranks from storage
  const availableRanks: RankItem[] = useMemo(() => {
    return rankState.ranks && rankState.ranks.length > 0 ? rankState.ranks : [];
  }, [rankState.ranks]);

  // Set default selected rank to first rank (e.g. PBA 1)
  useEffect(() => {
    if (availableRanks.length > 0) {
      if (!selectedRankId || !availableRanks.some((r) => r.id === selectedRankId)) {
        setSelectedRankId(availableRanks[0].id);
      }
    }
  }, [availableRanks, selectedRankId]);

  const selectedRank: RankItem = useMemo(() => {
    const found = availableRanks.find((r) => r.id === selectedRankId);
    return found || availableRanks[0] || {
      id: 'pba-1',
      name: 'PBA 1',
      basePrice: 100,
      networkFeePercent: 3,
      order: 1,
    };
  }, [availableRanks, selectedRankId]);

  const exchangeRate = rankState.currency?.exchangeRateUSDToINR || 100;

  // Selected rank index for pill styling
  const rankIndex = useMemo(() => {
    return Math.max(0, availableRanks.findIndex((r) => r.id === selectedRank.id));
  }, [availableRanks, selectedRank]);

  const pillStyle = RANK_PILL_STYLES[rankIndex % RANK_PILL_STYLES.length] || RANK_PILL_STYLES[0];

  // 3. Calculation Engine
  const summary = useMemo(() => {
    return computePotentialityTable(
      selectedRank,
      justReferGlobal,
      potentialityState.rowsConfig,
      potentialityState.transactionFeePercent,
      exchangeRate
    );
  }, [selectedRank, justReferGlobal, potentialityState.rowsConfig, potentialityState.transactionFeePercent, exchangeRate]);

  // Handler for changing global referral count
  const handleJustReferChange = (newCount: number) => {
    setJustReferGlobal(newCount);
    const updated = {
      ...potentialityState,
      justReferGlobal: newCount,
    };
    setPotentialityState(updated);
    savePotentialityState(updated);
  };

  // Selected table row index for interactive highlighting
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);

  // Active period configuration
  const currentPeriodConfig: TimePeriodTypeConfig = useMemo(() => {
    const pType = potentialityState.activePeriodType || 'weekly';
    return (
      potentialityState.periodConfigs?.[pType] ||
      DEFAULT_PERIOD_CONFIGS[pType] ||
      DEFAULT_PERIOD_CONFIGS.weekly
    );
  }, [potentialityState.activePeriodType, potentialityState.periodConfigs]);

  // Current active main dropdown option (1st 5 Days | 1st Week | 2 Weeks | 1st Month)
  const activeMainOption: MainTimeDropdownOption = useMemo(() => {
    return PERIOD_TYPE_TO_MAIN_OPTION[potentialityState.activePeriodType] || '1st Week';
  }, [potentialityState.activePeriodType]);

  // Excel VLOOKUP Auto-Population Handler: =VLOOKUP(TRIM(C8), A53:B115, 2, FALSE)
  const handleSelectMainTimeOption = (searchKey: string) => {
    const { rows, vlookupResult } = autoPopulateTimeColumn(searchKey, potentialityState.periodConfigs);
    const updated: PotentialityState = {
      ...potentialityState,
      activePeriodType: vlookupResult.periodType,
      rowsConfig: rows,
      availableTimePeriods: vlookupResult.periods,
    };
    setSelectedRowIndex(0);
    setPotentialityState(updated);
    savePotentialityState(updated);
  };

  // Handler for changing period type
  const handlePeriodTypeChange = (type: TimePeriodType) => {
    const mainOpt = PERIOD_TYPE_TO_MAIN_OPTION[type] || '1st Week';
    handleSelectMainTimeOption(mainOpt);
  };

  // Handler for changing time period on an individual row
  const handleRowTimeChange = (rowId: string, newTime: string) => {
    const updatedRows = potentialityState.rowsConfig.map((r) => {
      if (r.id === rowId) {
        return {
          ...r,
          timeLabel: newTime,
          durationLabel: newTime,
        };
      }
      return r;
    });
    const updated: PotentialityState = {
      ...potentialityState,
      rowsConfig: updatedRows,
    };
    setPotentialityState(updated);
    savePotentialityState(updated);
  };

  // 4. Admin Modals & State
  const [isPeriodConfigModalOpen, setIsPeriodConfigModalOpen] = useState(false);
  const [editingPeriodType, setEditingPeriodType] = useState<TimePeriodType>('days');
  const [editingPeriodConfig, setEditingPeriodConfig] = useState<TimePeriodTypeConfig>(() => ({
    ...DEFAULT_PERIOD_CONFIGS.days,
  }));

  const handleOpenPeriodConfig = () => {
    if (!isAdmin) return;
    const activeType = potentialityState.activePeriodType || 'weekly';
    setEditingPeriodType(activeType);
    const cfg = potentialityState.periodConfigs?.[activeType] || DEFAULT_PERIOD_CONFIGS[activeType];
    setEditingPeriodConfig(JSON.parse(JSON.stringify(cfg)));
    setIsPeriodConfigModalOpen(true);
  };

  const handleSelectModalTab = (type: TimePeriodType) => {
    setEditingPeriodType(type);
    const cfg = potentialityState.periodConfigs?.[type] || DEFAULT_PERIOD_CONFIGS[type];
    setEditingPeriodConfig(JSON.parse(JSON.stringify(cfg)));
  };

  const handleUpdateOption = (index: number, val: string) => {
    const nextOpts = [...editingPeriodConfig.options];
    nextOpts[index] = val;
    setEditingPeriodConfig({
      ...editingPeriodConfig,
      options: nextOpts,
    });
  };

  const handleSavePeriodConfig = () => {
    if (!isAdmin) return;
    const updatedPeriodConfigs = {
      ...potentialityState.periodConfigs,
      [editingPeriodType]: editingPeriodConfig,
    };

    let updatedRows = potentialityState.rowsConfig;
    if (editingPeriodType === potentialityState.activePeriodType) {
      updatedRows = potentialityState.rowsConfig.map((row, idx) => {
        const newOpt = editingPeriodConfig.options[idx] || row.timeLabel;
        return {
          ...row,
          timeLabel: newOpt,
          durationLabel: newOpt,
        };
      });
    }

    const updated: PotentialityState = {
      ...potentialityState,
      periodConfigs: updatedPeriodConfigs,
      rowsConfig: updatedRows,
      availableTimePeriods: updatedPeriodConfigs[potentialityState.activePeriodType]?.options || [],
    };

    setPotentialityState(updated);
    savePotentialityState(updated);
    setIsPeriodConfigModalOpen(false);
  };

  const handleResetPeriodConfigToDefault = () => {
    if (!isAdmin) return;
    const def = DEFAULT_PERIOD_CONFIGS[editingPeriodType];
    setEditingPeriodConfig(JSON.parse(JSON.stringify(def)));
  };

  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [editingMessages, setEditingMessages] = useState<PotentialityMessages>(potentialityState.messages);

  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PotentialityRowConfig | null>(null);

  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Partial<PotentialityRowConfig>>({
    timeLabel: `${potentialityState.rowsConfig.length + 1}th Week`,
    referralPercentage: 2,
    dcbPercentage: 0,
    durationLabel: `${potentialityState.rowsConfig.length + 1}th Week`,
  });

  const [rowToDelete, setRowToDelete] = useState<PotentialityRowConfig | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Admin: Save Messages
  const handleSaveMessages = () => {
    if (!isAdmin) return;
    const updated = {
      ...potentialityState,
      messages: editingMessages,
    };
    setPotentialityState(updated);
    savePotentialityState(updated);
    setIsMessagesModalOpen(false);
  };

  // Admin: Reset Messages to Default
  const handleResetMessages = () => {
    if (!isAdmin) return;
    setEditingMessages(DEFAULT_POTENTIALITY_MESSAGES);
  };

  // Admin: Save Edited Row
  const handleSaveEditedRow = () => {
    if (!isAdmin || !editingRow) return;
    const updatedRows = potentialityState.rowsConfig.map((r) => 
      r.id === editingRow.id ? editingRow : r
    );
    const updated = {
      ...potentialityState,
      rowsConfig: updatedRows,
    };
    setPotentialityState(updated);
    savePotentialityState(updated);
    setIsRowModalOpen(false);
    setEditingRow(null);
  };

  // Admin: Add Row
  const handleAddRow = () => {
    if (!isAdmin) return;
    const nextLevel = potentialityState.rowsConfig.length + 1;
    const newRow: PotentialityRowConfig = {
      id: `pot-row-${Date.now()}`,
      level: nextLevel,
      timeLabel: newRowData.timeLabel || `${nextLevel}th Week`,
      referralPercentage: Math.max(0, Number(newRowData.referralPercentage) || 2),
      dcbPercentage: Math.max(0, Number(newRowData.dcbPercentage) || 0),
      durationLabel: newRowData.durationLabel || `${nextLevel}th Week`,
    };
    const updated = {
      ...potentialityState,
      rowsConfig: [...potentialityState.rowsConfig, newRow],
    };
    setPotentialityState(updated);
    savePotentialityState(updated);
    setIsAddRowModalOpen(false);
    setNewRowData({
      timeLabel: `${nextLevel + 1}th Week`,
      referralPercentage: 2,
      dcbPercentage: 0,
      durationLabel: `${nextLevel + 1}th Week`,
    });
  };

  // Admin: Delete Row
  const handleConfirmDeleteRow = () => {
    if (!isAdmin || !rowToDelete) return;
    const updatedRows = potentialityState.rowsConfig
      .filter((r) => r.id !== rowToDelete.id)
      .map((r, idx) => ({ ...r, level: idx + 1 })); // Re-index levels
    const updated = {
      ...potentialityState,
      rowsConfig: updatedRows,
    };
    setPotentialityState(updated);
    savePotentialityState(updated);
    setRowToDelete(null);
  };

  // Admin: Full Reset
  const handleConfirmReset = () => {
    if (!isAdmin) return;
    const defaultState = resetPotentialityState();
    setPotentialityState(defaultState);
    setJustReferGlobal(defaultState.justReferGlobal);
    setIsResetConfirmOpen(false);
  };

  const msgs = potentialityState.messages;

  return (
    <div className="w-full max-w-[940px] mx-auto space-y-2 animate-in fade-in duration-300">
      {/* Top-Left Animated "ONE TIME WORK" Highlight (Identical to Key Points) */}
      <div className="flex items-center justify-start self-start">
        <OneTimeWorkHighlight />
      </div>

      <div className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs ${isAdmin ? 'p-2 sm:p-3 md:p-3.5 space-y-2 sm:space-y-2.5' : 'p-2 sm:p-2.5 space-y-1.5 sm:space-y-2'} w-full font-['Inter',system-ui,sans-serif]`}>
      {/* Top Admin Control Panel: Header Toolbar with Title, Badges, Admin Selectors & Time Period Type Bar (Authorized Admins Only) */}
      {isAdmin && (
        <>
          {/* 1. Header Toolbar with Dynamic Rank Selection, Top Stat Summary & Admin Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-[36px] h-[36px] rounded-[8px] bg-[#142D50] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[17px] sm:text-[18px] font-bold text-[#0f2942] tracking-tight leading-snug">
                Potentiality
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                12-Week Matrix Projection
              </span>
            </div>
            <p className="text-[11.5px] sm:text-[12px] text-slate-500 font-normal leading-normal mt-0.5">
              Multi-tiered referral potentiality model, DCB distribution, and team earnings calculation.
            </p>
          </div>
        </div>

        {/* Top Right: Dynamic Rank Selector Dropdown & Admin Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Dynamic Rank Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Rank:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  data-testid="top-rank-dropdown-btn"
                  className="h-8 px-2.5 border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 rounded-md shadow-2xs flex items-center gap-1.5 min-w-[105px] justify-between cursor-pointer"
                  aria-label="Select Rank"
                >
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border}`}>
                    {selectedRank.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1 bg-white shadow-lg border border-slate-200 rounded-lg z-50">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Active Rank
                </div>
                {availableRanks.map((rank, index) => {
                  const pStyle = RANK_PILL_STYLES[index % RANK_PILL_STYLES.length] || RANK_PILL_STYLES[0];
                  return (
                    <DropdownMenuItem
                      key={rank.id}
                      onSelect={() => handleSelectRank(rank.id)}
                      onClick={() => handleSelectRank(rank.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer ${
                        selectedRank.id === rank.id ? 'bg-blue-50 font-bold text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                          {rank.name}
                        </span>
                        <span className="text-slate-600 font-medium tabular-nums">
                          {formatUSD(rank.basePrice)}
                        </span>
                      </div>
                      {selectedRank.id === rank.id && (
                        <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden native select for accessibility and automated testing */}
            <select
              aria-label="Select Rank Native"
              data-testid="potentiality-rank-native-select"
              value={selectedRank.id}
              onChange={(e) => handleSelectRank(e.target.value)}
              className="sr-only"
              tabIndex={-1}
            >
              {availableRanks.map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Just Refer Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Referrals:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="top-referral-dropdown-btn"
                  className="h-8 px-2 border-slate-200 bg-white font-bold text-slate-800 hover:bg-slate-50 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer"
                  aria-label="Select Referrals"
                >
                  <span className="w-4 h-4 rounded bg-orange-500 text-white flex items-center justify-center text-[10.5px] font-bold">
                    {justReferGlobal}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 p-1 bg-white shadow-lg border border-slate-200 rounded-lg z-50">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Referrals / Person
                </div>
                {REFERRAL_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    onClick={() => handleJustReferChange(opt)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer ${
                      justReferGlobal === opt ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt} Referrals</span>
                    {justReferGlobal === opt && <Check className="w-3.5 h-3.5 text-orange-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden native select for accessibility and automated testing */}
            <select
              aria-label="Select Top Referrals Native"
              data-testid="potentiality-top-referral-native-select"
              value={justReferGlobal}
              onChange={(e) => handleJustReferChange(Number(e.target.value))}
              className="sr-only"
              tabIndex={-1}
            >
              {REFERRAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} Referrals
                </option>
              ))}
            </select>
          </div>

          {/* Admin Toolbar Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPeriodConfig}
                className="h-8 px-2 text-xs border-slate-200 text-blue-700 hover:bg-blue-50 rounded-md shadow-2xs"
                title="Configure Time Period Options and Summaries"
              >
                <Sliders className="w-3 h-3 mr-1 text-blue-600" />
                <span>Periods</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingMessages(potentialityState.messages);
                  setIsMessagesModalOpen(true);
                }}
                className="h-8 px-2 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md shadow-2xs"
                title="Customize page banners and text"
              >
                <Edit3 className="w-3 h-3 mr-1 text-slate-500" />
                <span>Text</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddRowModalOpen(true)}
                className="h-8 px-2 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md shadow-2xs"
                title="Add Level Row"
              >
                <Plus className="w-3 h-3 mr-1 text-emerald-600" />
                <span>Row</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                className="h-8 px-2 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md shadow-2xs"
                title="Reset to default settings"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Compact Professional Time Period Type Selector Bar with Main Time Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-gradient-to-r from-slate-50 via-slate-50/90 to-blue-50/20 p-2 sm:p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Time Selection Indicator */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider pl-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Time:</span>
            </span>
            <span className="h-7 px-2.5 bg-[#ea580c] text-white font-bold text-xs rounded-md shadow-2xs flex items-center">
              {activeMainOption}
            </span>
          </div>

          <div 
            role="tablist"
            aria-label="Time Period Types"
            className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 border border-slate-300/60 shadow-inner max-w-full overflow-x-auto"
          >
            {PERIOD_TYPES.map((type) => {
              const isActive = potentialityState.activePeriodType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handlePeriodTypeChange(type.id)}
                  className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#142D50] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Period Quick Summary & Recommendation Status */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500">Summary:</span>
          <span className="font-extrabold text-[#ea580c] bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded text-[11px] shadow-2xs">
            {currentPeriodConfig.summary}
          </span>
          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded border shadow-2xs ${
            currentPeriodConfig.status === 'Recommended'
              ? 'bg-red-50 text-red-600 border-red-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {currentPeriodConfig.status}
          </span>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPeriodConfig}
              className="h-6 px-2 text-[10.5px] border-slate-200 text-blue-700 hover:bg-blue-50 hover:text-blue-900 rounded shadow-2xs ml-0.5"
              title="Configure Period Options and Summaries"
            >
              <Sliders className="w-3 h-3 mr-1 text-blue-600" />
              Config
            </Button>
          )}
        </div>
      </div>
        </>
      )}

      {/* 2. Selected Rank Top Summary Strip (Matching Exact Specification & Reference Image) */}
      <div 
        data-testid="potentiality-selected-rank-summary"
        className="bg-slate-50/90 rounded-lg border border-slate-200/90 p-2 sm:p-2.5 flex flex-col gap-2 shadow-2xs"
      >
        {/* Row 1: Selected Rank Selector, Prices, Network Fee, and Exchange Rate */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Selected Rank Dropdown - Synchronized with Top-Right Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                SELECTED RANK:
              </span>
              <div className="relative inline-flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="summary-selected-rank-dropdown-btn"
                      className={`h-7 px-2 border transition-all rounded-[5px] flex items-center gap-1 cursor-pointer font-bold shadow-2xs hover:opacity-95 ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border}`}
                      aria-label="Select Selected Rank"
                    >
                      <span 
                        data-testid="summary-selected-rank-badge" 
                        className="text-[12px] font-bold"
                      >
                        {selectedRank.name}
                      </span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1 bg-white shadow-lg border border-slate-200 rounded-lg z-50">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Select Active Rank
                    </div>
                    {availableRanks.map((rank, index) => {
                      const pStyle = RANK_PILL_STYLES[index % RANK_PILL_STYLES.length] || RANK_PILL_STYLES[0];
                      return (
                        <DropdownMenuItem
                          key={rank.id}
                          onSelect={() => handleSelectRank(rank.id)}
                          onClick={() => handleSelectRank(rank.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer ${
                            selectedRank.id === rank.id ? 'bg-blue-50 font-bold text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                              {rank.name}
                            </span>
                            <span className="text-slate-600 font-medium tabular-nums">
                              {formatUSD(rank.basePrice)}
                            </span>
                          </div>
                          {selectedRank.id === rank.id && (
                            <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Hidden native select for accessibility and automated testing */}
                <select
                  aria-label="Select Summary Rank Native"
                  data-testid="potentiality-summary-rank-native-select"
                  value={selectedRank.id}
                  onChange={(e) => handleSelectRank(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                >
                  {availableRanks.map((rank) => (
                    <option key={rank.id} value={rank.id}>
                      {rank.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Original Rank Price (USD) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                Rank Price:
              </span>
              <span className="text-[13px] font-bold text-slate-800 tabular-nums">
                {formatUSD(summary.rankPriceUSD)}
              </span>
            </div>

            {/* Network Fee (USD) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                Network Fee ({selectedRank.networkFeePercent || 3}%):
              </span>
              <span className="text-[13px] font-bold text-amber-700 tabular-nums">
                {formatUSD(summary.networkFeeUSD)}
              </span>
            </div>

            {/* Total with 3% Fee (USD) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                With 3% Fee:
              </span>
              <span className="text-[13px] font-bold text-blue-700 tabular-nums">
                {formatUSD(summary.totalWithFeeUSD)}
              </span>
            </div>

            {/* Rank Price (INR) Excludes Network Fee as requested */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                Rank Price (INR):
              </span>
              <span className="text-[13px] font-bold text-emerald-700 tabular-nums">
                {formatINR(summary.rankPriceINR)}
              </span>
              <span className="text-[9.5px] text-slate-400 font-normal">
                (Excl. fee)
              </span>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
            <Coins className="w-3 h-3 text-amber-500" />
            <span>₹{exchangeRate.toFixed(2)}/USD</span>
          </div>
        </div>

        {/* Row 2: Note: Including 3% Network fee on left, DCB 30% & Referral Dropdown on right */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-red-600 bg-red-50/90 border border-red-200/70 px-2.5 py-0.5 rounded">
              {msgs.topNote}
            </span>
          </div>

          {/* Right section: DCB 30% immediately to the LEFT of the Referrals selector */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 ml-auto flex-wrap sm:flex-nowrap">
            {/* DCB 30% Label and Dynamically Calculated Value */}
            <div className="flex items-center gap-1.5" data-testid="summary-dcb-container">
              <span className="text-xs font-semibold text-slate-600">DCB 30%:</span>
              <span 
                data-testid="summary-dcb-value"
                className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded shadow-2xs tabular-nums"
              >
                {formatUSD(summary.computedRows.find((r) => r.level === 1)?.dcbAmountUSD ?? summary.computedRows[0]?.dcbAmountUSD ?? round2(summary.rankPriceUSD * 0.30))}
              </span>
            </div>

            {/* Referral Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Referrals:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="summary-referral-dropdown-btn"
                    className="h-7 sm:h-8 px-2 border-slate-200 bg-white font-bold text-slate-800 hover:bg-slate-50 rounded-md shadow-2xs flex items-center gap-1 cursor-pointer"
                    aria-label="Select Referrals"
                  >
                    <span className="w-4 h-4 rounded bg-orange-500 text-white flex items-center justify-center text-[10.5px] font-bold">
                      {justReferGlobal}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 p-1 bg-white shadow-lg border border-slate-200 rounded-lg z-50">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Referrals / Person
                  </div>
                  {REFERRAL_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt}
                      onClick={() => handleJustReferChange(opt)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer ${
                        justReferGlobal === opt ? 'bg-orange-50 font-bold text-orange-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt} Referrals</span>
                      {justReferGlobal === opt && <Check className="w-3.5 h-3.5 text-orange-600" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Hidden native select for accessibility and automated testing */}
              <select
                aria-label="Select Summary Referrals Native"
                data-testid="potentiality-summary-referral-native-select"
                value={justReferGlobal}
                onChange={(e) => handleJustReferChange(Number(e.target.value))}
                className="sr-only"
                tabIndex={-1}
              >
                {REFERRAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} Referrals
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Potentiality Calculation Table */}
      <div className="overflow-hidden rounded-[8px] border border-slate-200 shadow-2xs w-full bg-white">
        <div className="overflow-x-auto relative w-full scrollbar-none sm:overflow-x-visible">
          <table className="w-full border-collapse text-left font-['Inter',system-ui,sans-serif]">
            {/* Proportional Percentage Column Width Distribution (9 columns for users, 10 for admin) */}
            {isAdmin ? (
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[7%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[17%]" />
                <col className="w-[7%]" />
              </colgroup>
            ) : (
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
                <col className="w-[17%]" />
              </colgroup>
            )}

            {/* Dark Navy Blue Table Header */}
            <thead className="bg-[#142D50] text-white select-none">
              <tr className="h-8 sm:h-8.5">
                <th className="py-1.5 px-1 sm:px-1.5 text-center font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-nowrap">
                  Time
                </th>
                <th className="py-1.5 px-1 sm:px-1.5 text-center font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-nowrap">
                  Rank
                </th>
                <th className="py-1.5 px-0.5 sm:px-1 text-center font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-nowrap">
                  Level
                </th>
                <th className="py-1.5 px-1 sm:px-1.5 text-center font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-normal leading-tight">
                  Just refer
                </th>
                <th className="py-1.5 px-1 sm:px-1.5 text-center font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-normal leading-tight">
                  Ref. %
                </th>
                <th className="py-1.5 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-normal leading-tight">
                  Earn Each Referral
                </th>
                <th className="py-1.5 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-normal leading-tight">
                  Ref. amount
                </th>
                <th className="py-1.5 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-nowrap">
                  Total
                </th>
                <th className="py-1.5 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-[10px] sm:text-[10.5px] md:text-[11px] text-white whitespace-nowrap">
                  Profit
                </th>
                {isAdmin && (
                  <th className="py-1.5 px-1 text-center font-bold text-[10px] sm:text-[11px] text-slate-200 whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 relative">
              {summary.computedRows.map((row, index) => {
                const isFirstRow = index === 0;
                const isSelectedRow = index === selectedRowIndex;

                return (
                  <tr 
                    key={row.id}
                    onClick={() => setSelectedRowIndex(index)}
                    className={`h-[28px] sm:h-[30px] md:h-[31px] transition-colors cursor-pointer select-none ${
                      isSelectedRow 
                        ? 'bg-blue-50/70 hover:bg-blue-100/50 font-medium' 
                        : 'even:bg-[#f8fafc] odd:bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Time Column: Row 1 has Interactive Dropdown in Professional Blue; Rows Underneath are Plain Centered Text with Left Blue Accent on Selected Row */}
                    <td className={`py-0.5 px-1 sm:px-1.5 text-center whitespace-nowrap ${
                      isSelectedRow ? 'border-l-[3.5px] border-blue-600 pl-0.5 sm:pl-1' : ''
                    }`}>
                      {isFirstRow ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Main Time Selection Dropdown (Time period for level ${row.level}, currently ${row.timeLabel})`}
                              className="inline-flex items-center justify-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-[4px] text-[10px] sm:text-[10.5px] font-bold cursor-pointer transition-colors shadow-2xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white select-none h-6 border border-blue-500/40"
                            >
                              <span>{row.timeLabel}</span>
                              <ChevronDown className="w-3 h-3 text-white/90 shrink-0" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56 p-1 bg-white shadow-xl border border-slate-200 rounded-lg z-50">
                            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Select Time Category
                            </div>
                            {MAIN_TIME_DROPDOWN_OPTIONS.map((opt) => {
                              const isSelected = activeMainOption === opt;
                              const lookup = vlookupPotentialityPeriod(opt, potentialityState.periodConfigs);
                              return (
                                <DropdownMenuItem
                                  key={opt}
                                  onClick={() => handleSelectMainTimeOption(opt)}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer ${
                                    isSelected ? 'bg-blue-50 font-bold text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold">{opt}</span>
                                    <span className="text-[10px] text-slate-500">{lookup.summary} • {lookup.status}</span>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-2" />}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[10.5px] tracking-tight">
                          {row.timeLabel}
                        </span>
                      )}
                    </td>

                    {/* Rank Column (Dependent on Selected Rank) */}
                    <td className="py-0.5 px-1 sm:px-1.5 text-center whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[9.5px] sm:text-[10px] font-semibold border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border}`}>
                        {row.rankName}
                      </span>
                    </td>

                    {/* Level Column */}
                    <td className="py-0.5 px-0.5 sm:px-1 text-center whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold ${
                        isFirstRow ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.levelLabel}
                      </span>
                    </td>

                    {/* Just Refer Column */}
                    <td className="py-0.5 px-1 sm:px-1.5 text-center whitespace-nowrap">
                      {isFirstRow ? (
                        <span className="inline-flex items-center justify-center w-5 h-4 sm:w-5.5 sm:h-4.5 rounded bg-orange-500 text-white font-bold text-[10px] sm:text-[10.5px] shadow-2xs">
                          {row.justRefer}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700 tabular-nums text-[10px] sm:text-[10.5px]">
                          {row.justRefer}
                        </span>
                      )}
                    </td>

                    {/* Ref. % Column */}
                    <td className="py-0.5 px-1 sm:px-1.5 text-center font-semibold text-slate-800 tabular-nums text-[10px] sm:text-[10.5px] whitespace-nowrap">
                      {row.referralPercentage}%
                    </td>

                    {/* Earn Each Referral */}
                    <td className="py-0.5 pl-1 pr-1.5 sm:pr-2 text-right font-medium text-slate-700 tabular-nums text-[10px] sm:text-[10.5px] whitespace-nowrap">
                      {formatUSD(row.earnEachReferralUSD)}
                    </td>

                    {/* Ref. amount */}
                    <td className="py-0.5 pl-1 pr-1.5 sm:pr-2 text-right font-semibold text-slate-900 tabular-nums text-[10px] sm:text-[10.5px] whitespace-nowrap">
                      {formatUSD(row.refAmountUSD)}
                    </td>

                    {/* Total Column */}
                    <td className="py-0.5 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-slate-900 tabular-nums text-[10px] sm:text-[10.5px] whitespace-nowrap">
                      {formatUSD(row.totalUSD)}
                    </td>

                    {/* Profit Column (Net with 10% fee deduction) - Special Subtle Green Highlight */}
                    <td className={`py-0.5 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-[#15803d] tabular-nums text-[10px] sm:text-[10.5px] whitespace-nowrap ${
                      isSelectedRow ? 'bg-emerald-100/50' : 'bg-[#f0fdf4]/80'
                    }`}>
                      {formatUSD(row.profitUSD)}
                    </td>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <td className="py-0.5 px-1 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const found = potentialityState.rowsConfig.find((r) => r.id === row.id);
                              if (found) {
                                setEditingRow(found);
                                setIsRowModalOpen(true);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit row"
                          >
                            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          {potentialityState.rowsConfig.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const found = potentialityState.rowsConfig.find((r) => r.id === row.id);
                                if (found) setRowToDelete(found);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Delete row"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Row 13: Recommended / Not Recommended Row Aligned with Columns (Compact & Professional) */}
              <tr className="h-[29px] sm:h-[31px] md:h-[32px] bg-slate-50/80 border-t border-slate-200">
                {/* Cell 1: Under Time Column - Clean, distinct recommendation status section */}
                <td className="py-1 px-1 text-center whitespace-nowrap bg-white border-r border-slate-200">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold tracking-tight uppercase ${
                    currentPeriodConfig.status === 'Not Recommended' ? 'text-rose-600 bg-rose-50/80 border border-rose-200/60' : 'text-emerald-700 bg-emerald-50/80 border border-emerald-200/60'
                  }`}>
                    {currentPeriodConfig.status || msgs.recommendedBadge}
                  </span>
                </td>

                {/* Cell 2-6: Spanning Motivation Banner across Rank, Level, Just refer, Ref. %, Earn Each Referral */}
                <td colSpan={5} className="py-0.5 px-1 sm:px-1.5 text-center bg-[#ecfccb]/70 border-r border-slate-200">
                  <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-[#365314] tracking-tight uppercase leading-tight line-clamp-1 block">
                    {msgs.bannerHeader}
                  </span>
                </td>

                {/* Cell 7: Total Label inside Deep Navy-Blue Summary Panel */}
                <td className="py-1 pl-1 pr-1.5 sm:pr-2 text-right font-bold text-slate-200 text-[10px] sm:text-[10.5px] whitespace-nowrap bg-[#142D50] border-l border-slate-700/50">
                  Total
                </td>

                {/* Cell 8-9: Total Profit Amount inside Deep Navy-Blue Summary Panel */}
                <td colSpan={2} className="py-1 pl-1 pr-1.5 sm:pr-2 text-right font-black text-white text-[10.5px] sm:text-[11.5px] tabular-nums whitespace-nowrap bg-[#142D50] shadow-xs">
                  <span>{formatUSD(summary.totalProfitUSD)}</span>
                  <span className="inline text-[9px] sm:text-[10px] font-medium text-slate-300 tabular-nums ml-1 sm:ml-1.5">
                    ({formatINR(summary.totalProfitINR)})
                  </span>
                </td>

                {isAdmin && <td className="py-1 px-1 text-center bg-[#142D50]" />}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Unobtrusive Financial Projection Disclaimer */}
        <div className="bg-slate-50/80 border-t border-slate-200/80 px-2.5 py-0.5 flex items-center justify-end">
          <span className="text-[9.5px] sm:text-[10px] text-slate-400 italic font-medium">
            * Illustrative Projection — Actual Results May Vary.
          </span>
        </div>
      </div>

      {/* 4. Bottom Presentation Cards & Motivational Banners (Matching Exact Reference Screenshot) */}
      <div className="space-y-2 pt-1 font-['Inter',system-ui,sans-serif]">
        {/* Banner Layer: Navy/Royal Blue Period Summary + Teal/Emerald Smart Work Banner + Floating Success Ratio */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-stretch">
          {/* Card 1: Left Deep Navy into Royal Blue Gradient Card with Subtle Highlights */}
          <div className="potentiality-zoom-card md:col-span-3 bg-gradient-to-br from-[#0c1e3d] via-[#112d58] to-[#1e40af] border border-blue-400/25 text-white rounded-[8px] p-2 sm:p-2.5 text-center flex flex-col justify-center items-center shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-300/15 via-transparent to-transparent pointer-events-none rounded-[8px]" />
            <span className="relative z-1 text-[12px] sm:text-[13px] font-extrabold tracking-wide uppercase text-blue-100">
              {currentPeriodConfig.summary || msgs.monthsBadge}
            </span>
            <span className="relative z-1 text-[16px] sm:text-[18px] font-black tracking-tight mt-0.5 text-white drop-shadow-xs">
              {summary.selectedRankName}
            </span>
          </div>

          {/* Card 2: Center Deep Teal & Emerald Green Gradient Card */}
          <div className="potentiality-zoom-card md:col-span-6 bg-gradient-to-br from-[#042f2e] via-[#064e3b] to-[#047857] border border-emerald-400/30 text-white rounded-[8px] p-2 sm:p-2.5 text-center flex flex-col justify-center items-center shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-300/15 via-transparent to-transparent pointer-events-none rounded-[8px]" />
            <span className="relative z-1 text-[13px] sm:text-[15px] font-black tracking-wider uppercase text-emerald-50 drop-shadow-xs">
              {msgs.bannerTitle}
            </span>
            <span className="relative z-1 text-[11px] sm:text-[12px] font-medium text-emerald-100/90 tracking-normal mt-0.5">
              {msgs.bannerSubtitle}
            </span>
            <div className="relative z-1 inline-flex items-center gap-1.5 mt-1 bg-emerald-950/40 border border-emerald-300/30 px-2.5 py-0.5 rounded text-[11px] sm:text-[11.5px] font-bold text-white shadow-xs">
              <span>{msgs.bannerTarget}</span>
            </div>
          </div>

          {/* Card 3: Right Success Ratio Card with Special Floating Pulse Effect & Soft Border Glow */}
          <div className="potentiality-zoom-card potentiality-floating-card md:col-span-3 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 border border-slate-200/90 rounded-[8px] p-2 sm:p-2.5 flex flex-col justify-center items-center text-center shadow-xs">
            <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              {msgs.successRatioTitle}
            </span>
            <span className="text-[17px] sm:text-[19px] font-black text-[#F97316] tracking-tight mt-0.5">
              {msgs.successRatioValue}
            </span>
          </div>
        </div>

        {/* Banner Layer 3: Bottom Guidance & Reinvestment Note */}
        <div className="bg-[#fffbeb] border border-[#fef08a] rounded-[8px] p-2.5 sm:p-3 text-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-bold shrink-0">
                ↓
              </span>
              <p className="text-[11.5px] sm:text-[12px] font-semibold text-slate-800">
                {msgs.bottomReinvestNote}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-500 shrink-0 self-end sm:self-auto">
            <span className="bg-white/80 border border-slate-200/80 px-2 py-0.5 rounded">
              {msgs.bottomTranFeeNote}
            </span>
            <span className="bg-white/80 border border-slate-200/80 px-2 py-0.5 rounded">
              {msgs.bottomAprxNote}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. Admin Dialogs & Controls */}
      {/* ========================================================================= */}

      {/* Admin Modal: Customize Messages */}
      {isAdmin && isMessagesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-sm sm:text-base text-slate-800">
                  Customize Potentiality Messages
                </h3>
              </div>
              <button 
                onClick={() => setIsMessagesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Top Note</label>
                <Input
                  value={editingMessages.topNote}
                  onChange={(e) => setEditingMessages({ ...editingMessages, topNote: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Banner Header</label>
                <Input
                  value={editingMessages.bannerHeader}
                  onChange={(e) => setEditingMessages({ ...editingMessages, bannerHeader: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Main Banner Title</label>
                <Input
                  value={editingMessages.bannerTitle}
                  onChange={(e) => setEditingMessages({ ...editingMessages, bannerTitle: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Main Banner Subtitle</label>
                <Input
                  value={editingMessages.bannerSubtitle}
                  onChange={(e) => setEditingMessages({ ...editingMessages, bannerSubtitle: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Statement</label>
                <Input
                  value={editingMessages.bannerTarget}
                  onChange={(e) => setEditingMessages({ ...editingMessages, bannerTarget: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Success Ratio Label</label>
                  <Input
                    value={editingMessages.successRatioTitle}
                    onChange={(e) => setEditingMessages({ ...editingMessages, successRatioTitle: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Success Ratio Value</label>
                  <Input
                    value={editingMessages.successRatioValue}
                    onChange={(e) => setEditingMessages({ ...editingMessages, successRatioValue: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reinvestment Note</label>
                <textarea
                  value={editingMessages.bottomReinvestNote}
                  onChange={(e) => setEditingMessages({ ...editingMessages, bottomReinvestNote: e.target.value })}
                  rows={2}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetMessages}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Restore Defaults
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMessagesModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveMessages}
                  className="text-xs bg-[#142D50] text-white hover:bg-[#0f2942]"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Configure Time Period Types & Options in 2 Columns */}
      {isAdmin && isPeriodConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#142D50]" />
                <h3 className="font-bold text-sm sm:text-base text-slate-800">
                  Configure Time Periods & Options
                </h3>
              </div>
              <button 
                onClick={() => setIsPeriodConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs to select which Period Type to configure */}
            <div className="flex items-center gap-1.5 pt-3 pb-2 border-b border-slate-100 overflow-x-auto">
              {PERIOD_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectModalTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    editingPeriodType === t.id
                      ? 'bg-[#142D50] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-3 text-xs">
              {/* Period Summary & Status Section */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {editingPeriodConfig.label} Summary Settings
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Configured for {editingPeriodConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Summary Message (e.g. Just 2 Months, Just 3 Months)
                    </label>
                    <Input
                      value={editingPeriodConfig.summary}
                      onChange={(e) => setEditingPeriodConfig({ ...editingPeriodConfig, summary: e.target.value })}
                      className="h-8 text-xs bg-white"
                      placeholder="e.g. Just 3 Months"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Recommendation Status
                    </label>
                    <select
                      value={editingPeriodConfig.status}
                      onChange={(e) => setEditingPeriodConfig({ ...editingPeriodConfig, status: e.target.value })}
                      className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
                    >
                      <option value="Recommended">Recommended</option>
                      <option value="Not Recommended">Not Recommended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2-Column Options Grid (As shown in Reference Configuration Screenshots) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-[11.5px] font-bold text-slate-800">
                      12 Chronological Period Options
                    </h4>
                    <p className="text-[10.5px] text-slate-500">
                      Arranged in 2 columns: Options 1–6 (Col 1), Options 7–12 (Col 2).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/80">
                  {/* Column 1: Indices 0 to 5 */}
                  <div className="space-y-2">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                      Column 1 (Options 1 – 6)
                    </span>
                    {editingPeriodConfig.options.slice(0, 6).map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold text-slate-400 w-5 tabular-nums text-right">
                          #{idx + 1}
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => handleUpdateOption(idx, e.target.value)}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Column 2: Indices 6 to 11 */}
                  <div className="space-y-2">
                    <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                      Column 2 (Options 7 – 12)
                    </span>
                    {editingPeriodConfig.options.slice(6, 12).map((opt, idx) => (
                      <div key={idx + 6} className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold text-slate-400 w-5 tabular-nums text-right">
                          #{idx + 7}
                        </span>
                        <Input
                          value={opt}
                          onChange={(e) => handleUpdateOption(idx + 6, e.target.value)}
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetPeriodConfigToDefault}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Restore Defaults for {editingPeriodConfig.label}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPeriodConfigModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePeriodConfig}
                  className="text-xs bg-[#142D50] text-white hover:bg-[#0f2942]"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Edit Row */}
      {isAdmin && isRowModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Edit Level {editingRow.level}
              </h3>
              <button 
                onClick={() => {
                  setIsRowModalOpen(false);
                  setEditingRow(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Label</label>
                <Input
                  value={editingRow.timeLabel}
                  onChange={(e) => setEditingRow({ ...editingRow, timeLabel: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Referral Percentage (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={editingRow.referralPercentage}
                  onChange={(e) => setEditingRow({ ...editingRow, referralPercentage: Number(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">DCB Percentage (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={editingRow.dcbPercentage}
                  onChange={(e) => setEditingRow({ ...editingRow, dcbPercentage: Number(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duration Label</label>
                <Input
                  value={editingRow.durationLabel}
                  onChange={(e) => setEditingRow({ ...editingRow, durationLabel: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRowModalOpen(false);
                  setEditingRow(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditedRow}
                className="text-xs bg-[#142D50] text-white hover:bg-[#0f2942]"
              >
                Save Row
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Add Row */}
      {isAdmin && isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Add Tier Level {potentialityState.rowsConfig.length + 1}
              </h3>
              <button 
                onClick={() => setIsAddRowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Label</label>
                <Input
                  value={newRowData.timeLabel}
                  onChange={(e) => setNewRowData({ ...newRowData, timeLabel: e.target.value })}
                  placeholder="e.g. 13th Week"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Referral Percentage (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={newRowData.referralPercentage}
                  onChange={(e) => setNewRowData({ ...newRowData, referralPercentage: Number(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">DCB Percentage (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={newRowData.dcbPercentage}
                  onChange={(e) => setNewRowData({ ...newRowData, dcbPercentage: Number(e.target.value) || 0 })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddRowModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddRow}
                className="text-xs bg-[#142D50] text-white hover:bg-[#0f2942]"
              >
                Add Row
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Confirm Delete Row */}
      {isAdmin && rowToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-sm text-slate-800">
              Delete Level {rowToDelete.level}?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              Are you sure you want to remove the row for {rowToDelete.timeLabel}? Calculations will automatically re-index.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowToDelete(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmDeleteRow}
                className="text-xs"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Confirm Reset */}
      {isAdmin && isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-sm text-slate-800">
              Reset Potentiality to Defaults?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              This will restore the original 12-week configuration, referral percentages, and default reference banners.
            </p>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmReset}
                className="text-xs"
              >
                Reset Everything
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
