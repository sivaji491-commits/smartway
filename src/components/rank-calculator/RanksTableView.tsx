import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Download, 
  Upload, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Search, 
  RotateCcw,
  Trophy,
  Pencil,
  ChevronDown,
  Layers,
  Info,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComputedRankItem, GrandTotals, RankItem } from '@/types/rank-calculator';
import { formatUSD, formatINR } from '@/lib/rank-calculator-engine';
import { OneTimeWorkHighlight } from '@/components/key-points/OneTimeWorkHighlight';

export interface RanksTableViewProps {
  computedRanks: ComputedRankItem[];
  grandTotals: GrandTotals;
  exchangeRate: number;
  note: string;
  secondaryNote?: string | undefined;
  isAdmin?: boolean;
  onAddRank: () => void;
  onEditRank: (rank: RankItem) => void;
  onDeleteRank: (rank: RankItem) => void;
  onMoveRank: (rankId: string, direction: 'up' | 'down') => void;
  onExportCSV: () => void;
  onOpenImportCSVModal: () => void;
  onOpenResetModal: () => void;
  onNavigateToCurrency: () => void;
  onUpdateExchangeRate?: ((rate: number) => void) | undefined;
  onUpdateFeePercent?: ((feePercent: number) => void) | undefined;
  onUpdateRankName?: ((rankId: string, newName: string) => void) | undefined;
  onUpdateRankBasePrice?: ((rankId: string, newPrice: number) => void) | undefined;
  onOpenConfigDropdown?: (() => void) | undefined;
}

/**
 * Exact color palette for Ranks 1 through 7 from the design reference:
 * Row 1: Sky Blue
 * Row 2: Mint/Light Green
 * Row 3: Amber/Gold
 * Row 4: Lavender/Purple
 * Row 5: Cyan/Teal
 * Row 6: Pink/Rose
 * Row 7: Indigo/Periwinkle
 */
export const RANK_PILL_STYLES = [
  {
    bg: 'bg-[#e0f2fe]',
    text: 'text-[#0284c7]',
    border: 'border-[#bae6fd]',
  },
  {
    bg: 'bg-[#dcfce7]',
    text: 'text-[#16a34a]',
    border: 'border-[#bbf7d0]',
  },
  {
    bg: 'bg-[#fef3c7]',
    text: 'text-[#d97706]',
    border: 'border-[#fde68a]',
  },
  {
    bg: 'bg-[#f3e8ff]',
    text: 'text-[#9333ea]',
    border: 'border-[#e9d5ff]',
  },
  {
    bg: 'bg-[#cffafe]',
    text: 'text-[#0891b2]',
    border: 'border-[#a5f3fc]',
  },
  {
    bg: 'bg-[#fce7f3]',
    text: 'text-[#db2777]',
    border: 'border-[#fbcfe8]',
  },
  {
    bg: 'bg-[#e0e7ff]',
    text: 'text-[#4f46e5]',
    border: 'border-[#c7d2fe]',
  },
];

export function RanksTableView({
  computedRanks,
  grandTotals,
  exchangeRate,
  note,
  secondaryNote,
  isAdmin = false,
  onAddRank,
  onEditRank,
  onDeleteRank,
  onMoveRank,
  onExportCSV,
  onOpenImportCSVModal,
  onOpenResetModal,
  onNavigateToCurrency,
  onUpdateExchangeRate,
  onUpdateFeePercent,
  onUpdateRankName,
  onUpdateRankBasePrice,
  onOpenConfigDropdown,
}: RanksTableViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, string>>({});
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);

  // Controlled input states for quick controls and right panel
  const [rateInput, setRateInput] = useState<string>(String(exchangeRate));
  useEffect(() => {
    setRateInput(String(exchangeRate));
  }, [exchangeRate]);

  const currentFeePercent = useMemo(() => {
    return computedRanks.length > 0 ? (computedRanks[0]?.networkFeePercent ?? 3) : 3;
  }, [computedRanks]);

  const [feePercentInput, setFeePercentInput] = useState<string>(String(currentFeePercent));
  useEffect(() => {
    setFeePercentInput(String(currentFeePercent));
  }, [currentFeePercent]);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRateInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onUpdateExchangeRate?.(num);
    }
  };

  const handleFeePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFeePercentInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      onUpdateFeePercent?.(num);
    }
  };

  const filteredRanks = computedRanks.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 space-y-2 sm:space-y-2.5 w-full max-w-[880px] mx-auto animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]">
      {/* Top-Left Animated "ONE TIME WORK" Highlight */}
      <div className="flex items-center justify-start self-start pb-0.5">
        <OneTimeWorkHighlight />
      </div>

      {/* 1. Page Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-[36px] h-[36px] rounded-[8px] bg-[#142D50] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-[17px] sm:text-[18px] font-bold text-[#0f2942] tracking-tight leading-snug">
              Rank Price & Accumulation Calculator
            </h1>
            <p className="text-[11.5px] sm:text-[12px] text-slate-500 font-normal leading-normal mt-0.5">
              View the cost and accumulation details for all {computedRanks.length} ranks. The values automatically update based on your settings and currency rate.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Settings Controls & Actions Toolbar (Admin Only - Hidden for User Login) */}
      {isAdmin && (
        <div className="flex flex-wrap items-end justify-between gap-2.5 pt-0.5">
          {/* Left Side: Network Fee % and USD to INR Rate */}
          <div className="flex flex-wrap items-end gap-2.5 sm:gap-3.5">
            {/* Network Fee Percentage Selector */}
            <div className="w-36 sm:w-44">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Network Fee Percentage
              </label>
              <div className="relative">
                <select
                  value={currentFeePercent}
                  onChange={(e) => onUpdateFeePercent?.(Number(e.target.value))}
                  className="w-full h-8 px-2.5 pr-7 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer transition"
                >
                  <option value={1}>1%</option>
                  <option value={2}>2%</option>
                  <option value={3}>3%</option>
                  <option value={4}>4%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* USD to INR Rate */}
            <div className="w-36 sm:w-44">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                USD to INR Rate
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  step="0.1"
                  value={rateInput}
                  onChange={handleRateChange}
                  className="w-full h-8 pl-6 pr-7 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <Pencil className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Right Side Toolbar Buttons: Add Rank, CSV, Config, Search */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="relative w-32 sm:w-36">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs border-slate-200 rounded-md shadow-2xs"
              />
            </div>

            <Button
              onClick={onAddRank}
              className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-xs h-8 px-3 rounded-md shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>+ Add Rank</span>
            </Button>

            <Button
              variant="outline"
              onClick={onExportCSV}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 px-2.5 rounded-md shadow-2xs"
              title="Export ranks as CSV"
            >
              <Download className="w-3 h-3 mr-1 text-slate-500" />
              <span>Export</span>
            </Button>

            <Button
              variant="outline"
              onClick={onOpenImportCSVModal}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 px-2.5 rounded-md shadow-2xs"
              title="Import ranks from CSV"
            >
              <Upload className="w-3 h-3 mr-1 text-slate-500" />
              <span>Import</span>
            </Button>

            {onOpenConfigDropdown && (
              <Button
                variant="outline"
                onClick={onOpenConfigDropdown}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 px-2.5 rounded-md shadow-2xs"
                title="Open Configuration Settings"
              >
                <Sliders className="w-3 h-3 mr-1 text-slate-500" />
                <span>Config</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. 7-Rank Presentation Data Table */}
      <div className="overflow-hidden rounded-[10px] border border-slate-200 shadow-2xs w-full">
        <div className="overflow-x-auto relative w-full scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs font-['Inter',system-ui,sans-serif] table-fixed min-w-[680px] sm:min-w-full">
            <colgroup>
              <col className={isAdmin ? "w-[46px]" : "w-[50px]"} />
              <col className={isAdmin ? "w-[90px]" : "w-[96px]"} />
              <col className={isAdmin ? "w-[120px]" : "w-[128px]"} />
              <col className={isAdmin ? "w-[114px]" : "w-[120px]"} />
              <col className={isAdmin ? "w-[104px]" : "w-[110px]"} />
              <col className={isAdmin ? "w-[128px]" : "w-[136px]"} />
              <col className={isAdmin ? "w-[118px]" : "w-[124px]"} />
              {isAdmin && <col className="w-[82px]" />}
            </colgroup>

            {/* Navy Blue Table Header with Professional Stacked Labels */}
            <thead className="bg-[#142D50] text-white select-none">
              <tr>
                <th className="py-2.5 px-2 text-center font-semibold text-[12px] text-slate-100">
                  S.No
                </th>
                <th className="py-2.5 px-3 text-left font-semibold text-[12px] text-white">
                  Rank Name
                </th>
                <th className="py-2 px-2 text-center font-semibold text-[12px] text-slate-100">
                  <span className="inline-flex flex-col items-center justify-center leading-tight">
                    <span className="sr-only">Rank Price (USD)</span>
                    <span aria-hidden="true" className="font-semibold text-[12px] text-white">Rank Price</span>
                    <span aria-hidden="true" className="text-[10px] sm:text-[10.5px] font-normal text-slate-300 tracking-normal">(USD)</span>
                  </span>
                </th>
                <th className="py-2 px-2.5 sm:px-3 text-right font-semibold text-[12px] text-slate-100">
                  <span className="inline-flex flex-col items-end justify-center leading-tight ml-auto">
                    <span className="sr-only">Network Fee ({currentFeePercent}%) (USD)</span>
                    <span aria-hidden="true" className="font-semibold text-[12px] text-white whitespace-nowrap">Network Fee ({currentFeePercent}%)</span>
                    <span aria-hidden="true" className="text-[10px] sm:text-[10.5px] font-normal text-slate-300 tracking-normal">(USD)</span>
                  </span>
                </th>
                <th className="py-2 px-2.5 sm:px-3 text-right font-semibold text-[12px] text-slate-100">
                  <span className="inline-flex flex-col items-end justify-center leading-tight ml-auto">
                    <span className="sr-only">Total (USD)</span>
                    <span aria-hidden="true" className="font-semibold text-[12px] text-white">Total</span>
                    <span aria-hidden="true" className="text-[10px] sm:text-[10.5px] font-normal text-slate-300 tracking-normal">(USD)</span>
                  </span>
                </th>
                <th className="py-2 px-2.5 sm:px-3 text-right font-semibold text-[12px] text-slate-100">
                  <span className="inline-flex flex-col items-end justify-center leading-tight ml-auto">
                    <span className="sr-only">Accumulated Total (USD)</span>
                    <span aria-hidden="true" className="font-semibold text-[12px] text-white whitespace-nowrap">Accumulated Total</span>
                    <span aria-hidden="true" className="text-[10px] sm:text-[10.5px] font-normal text-slate-300 tracking-normal">(USD)</span>
                  </span>
                </th>
                <th className="py-2 px-2.5 sm:px-3 text-right font-semibold text-[12px] text-slate-100">
                  <span className="inline-flex flex-col items-end justify-center leading-tight ml-auto">
                    <span className="sr-only">INR Value (₹)</span>
                    <span aria-hidden="true" className="font-semibold text-[12px] text-white whitespace-nowrap">INR Value</span>
                    <span aria-hidden="true" className="text-[10px] sm:text-[10.5px] font-normal text-slate-300 tracking-normal">(₹)</span>
                  </span>
                </th>
                {isAdmin && (
                  <th className="py-2.5 px-2 text-center font-semibold text-[12px] text-slate-200">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredRanks.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500">
                    <Layers className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="font-semibold text-xs text-slate-700">No ranks found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting or adding a new rank.</p>
                  </td>
                </tr>
              ) : (
                filteredRanks.map((rank, index) => {
                  const isFirst = index === 0;
                  const isLast = index === filteredRanks.length - 1;
                  const pillStyle = RANK_PILL_STYLES[index % RANK_PILL_STYLES.length] ?? {
                    bg: 'bg-[#e0f2fe]',
                    text: 'text-[#0284c7]',
                    border: 'border-[#bae6fd]',
                  };

                  return (
                    <tr 
                      key={rank.id} 
                      className="h-[38px] sm:h-[40px] even:bg-[#f8fafc] odd:bg-white hover:bg-blue-50/25 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {/* S.No */}
                      <td className="py-1.5 px-2 text-center font-['Inter',system-ui,sans-serif] font-medium text-slate-500 text-[13px] tabular-nums">
                        {rank.serialNumber}
                      </td>

                      {/* Rank Name with Exact Pill Badge Colors */}
                      <td className="py-1.5 px-3 whitespace-nowrap text-left">
                        <span 
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-[5px] text-[12px] font-medium border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border}`}
                        >
                          {rank.name}
                        </span>
                      </td>

                      {/* Rank Price (USD) - Editable input for Admin, Read-only text for regular users */}
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        {isAdmin ? (
                          <input
                            type="text"
                            value={activeEditingId === rank.id ? (editingPriceMap[rank.id] ?? String(rank.basePrice)) : formatUSD(rank.basePrice)}
                            onChange={(e) => {
                              setEditingPriceMap((prev) => ({ ...prev, [rank.id]: e.target.value }));
                            }}
                            onFocus={(e) => {
                              setActiveEditingId(rank.id);
                              setEditingPriceMap((prev) => ({ ...prev, [rank.id]: String(rank.basePrice) }));
                              e.target.select();
                            }}
                            onBlur={() => {
                              if (activeEditingId === rank.id) {
                                const raw = editingPriceMap[rank.id];
                                if (raw !== undefined) {
                                  const clean = parseFloat(raw.replace(/[^0-9.]/g, ''));
                                  if (!isNaN(clean) && clean >= 0) {
                                    onUpdateRankBasePrice?.(rank.id, clean);
                                  }
                                }
                                setActiveEditingId(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="h-[31px] w-[102px] mx-auto block px-2.5 bg-white border border-[#D6DFEA] rounded-[5px] text-[13px] font-medium text-slate-800 text-center font-['Inter',system-ui,sans-serif] tabular-nums tracking-tight shadow-none transition-colors duration-150 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 hover:border-slate-300"
                            aria-label={`${rank.name} Price in USD`}
                          />
                        ) : (
                          <span className="font-['Inter',system-ui,sans-serif] font-medium text-slate-800 text-[13px] tabular-nums">
                            {formatUSD(rank.basePrice)}
                          </span>
                        )}
                      </td>

                      {/* Network Fee (USD) */}
                      <td className="py-1.5 px-2.5 sm:px-3 text-right font-['Inter',system-ui,sans-serif] font-normal text-slate-600 whitespace-nowrap text-[13px] sm:text-[13.5px] tabular-nums">
                        {formatUSD(rank.networkFeeUSD)}
                      </td>

                      {/* Total (USD) */}
                      <td className="py-1.5 px-2.5 sm:px-3 text-right font-['Inter',system-ui,sans-serif] font-medium text-slate-800 whitespace-nowrap text-[13px] sm:text-[13.5px] tabular-nums">
                        {formatUSD(rank.totalRankCostUSD)}
                      </td>

                      {/* Accumulated Total (USD) */}
                      <td className="py-1.5 px-2.5 sm:px-3 text-right font-['Inter',system-ui,sans-serif] font-semibold text-slate-900 whitespace-nowrap text-[13px] sm:text-[13.5px] tabular-nums">
                        {formatUSD(rank.cumulativeTotalUSD)}
                      </td>

                      {/* INR Value (₹) */}
                      <td className="py-1.5 px-2.5 sm:px-3 text-right font-['Inter',system-ui,sans-serif] font-semibold text-slate-900 whitespace-nowrap text-[13px] sm:text-[13.5px] tabular-nums">
                        {formatINR(rank.cumulativeTotalINR)}
                      </td>

                      {/* Actions - Only shown for Admin */}
                      {isAdmin && (
                        <td className="py-1 px-2 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onMoveRank(rank.id, 'up')}
                              disabled={isFirst}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed transition"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveRank(rank.id, 'down')}
                              disabled={isLast}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed transition"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditRank(rank)}
                              className="p-0.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="Edit rank"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRank(rank)}
                              className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Delete rank"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Final Rank Cost Summary Card */}
      <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[10px] p-2.5 sm:py-2.5 sm:px-4 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 w-full">
        {/* Left Side: Trophy Icon & Description */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[13px] sm:text-[14px] font-semibold text-[#064E3B] leading-tight">
              Final Rank Cost
            </h2>
            <p className="text-[11px] sm:text-[11.5px] text-[#047857]/85 leading-tight mt-0.5">
              Total accumulated value of all {computedRanks.length} ranks (including {currentFeePercent}% network fee)
            </p>
          </div>
        </div>

        {/* Right Side: Total USD & Total INR Stat Badges */}
        <div className="flex items-center gap-3.5 sm:gap-6 flex-wrap sm:flex-nowrap shrink-0">
          {/* Total (USD) */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">
                TOTAL (USD)
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  $
                </span>
                <span className="text-[15px] sm:text-[17px] font-bold text-[#064E3B] font-['Inter',system-ui,sans-serif] tabular-nums leading-none whitespace-nowrap">
                  {formatUSD(grandTotals.totalInvestmentUSD)}
                </span>
              </div>
            </div>
          </div>

          {/* Total (INR) */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">
                TOTAL (INR)
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-3.5 h-3.5 rounded-full bg-[#f97316] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  ₹
                </span>
                <span className="text-[15px] sm:text-[17px] font-bold text-[#047857] font-['Inter',system-ui,sans-serif] tabular-nums leading-none whitespace-nowrap">
                  {formatINR(grandTotals.totalInvestmentINR)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Subtext / Notes */}
      {(note || secondaryNote) && (
        <div className="bg-[#F8FAFC] rounded-[10px] border border-slate-200/80 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-[11.5px] text-slate-600 w-full shadow-2xs font-['Inter',system-ui,sans-serif]">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              {note && <p className="font-normal text-slate-700">{note}</p>}
              {secondaryNote && <p className="text-slate-500 font-normal">{secondaryNote}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
