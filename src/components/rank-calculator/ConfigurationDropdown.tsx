import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Pencil, 
  X, 
  Check,
  Percent,
  Coins
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ComputedRankItem } from '@/types/rank-calculator';

export interface ConfigurationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  computedRanks: ComputedRankItem[];
  exchangeRate: number;
  onUpdateExchangeRate?: ((rate: number) => void) | undefined;
  onUpdateFeePercent?: ((feePercent: number) => void) | undefined;
  onUpdateRankName?: ((rankId: string, newName: string) => void) | undefined;
  onOpenResetModal?: (() => void) | undefined;
  dropdownAlign?: 'left' | 'right' | undefined;
}

export function ConfigurationDropdown({
  isOpen,
  onClose,
  computedRanks,
  exchangeRate,
  onUpdateExchangeRate,
  onUpdateFeePercent,
  onUpdateRankName,
  onOpenResetModal,
  dropdownAlign = 'right',
}: ConfigurationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Controlled input states
  const [rateInput, setRateInput] = useState<string>(String(exchangeRate));
  useEffect(() => {
    setRateInput(String(exchangeRate));
  }, [exchangeRate]);

  const currentFeePercent = computedRanks.length > 0 
    ? (computedRanks[0]?.networkFeePercent ?? 3) 
    : 3;

  const [feePercentInput, setFeePercentInput] = useState<string>(String(currentFeePercent));
  useEffect(() => {
    setFeePercentInput(String(currentFeePercent));
  }, [currentFeePercent]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  const handleApplyPresetFee = (pct: number) => {
    setFeePercentInput(String(pct));
    onUpdateFeePercent?.(pct);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`configuration-panel absolute top-full mt-2 z-50 w-[350px] sm:w-[385px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-120px)] flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-3.5 sm:p-4 text-slate-800 box-border overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
        dropdownAlign === 'left' ? 'left-0' : 'right-0'
      }`}
      role="dialog"
      aria-label="Configuration Settings"
    >
      {/* Dropdown Header (Pinned) */}
      <div className="flex items-start justify-between gap-3 pb-2.5 sm:pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs">
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#132c4a] tracking-tight leading-tight">
              Configuration Settings
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
              Update the values below to recalculate all results.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
          title="Close configuration"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Content with flexible flex-col distribution */}
      <div className="flex flex-col flex-1 min-h-0 space-y-3 pt-2.5 overflow-hidden">
        {/* 1. Network Fee Percentage (Pinned) */}
        <div className="shrink-0 space-y-1">
          <div className="flex items-center justify-between mb-0.5">
            <label htmlFor="config-fee-percent-input" className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
              <Percent className="w-3 h-3 text-slate-400" />
              <span>Network Fee Percentage</span>
            </label>
            <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {currentFeePercent}% Active
            </span>
          </div>

          <div className="relative">
            <Input
              id="config-fee-percent-input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={feePercentInput}
              onChange={handleFeePercentChange}
              className="h-8 text-xs pr-7 border-slate-200 bg-white focus-visible:ring-blue-600 font-medium"
              placeholder="e.g. 3"
            />
            <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-semibold">%</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-slate-400 mr-0.5">Presets:</span>
            {[1, 2, 3, 4, 5, 10].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleApplyPresetFee(pct)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition border cursor-pointer ${
                  currentFeePercent === pct
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* 2. USD to INR Rate (Pinned) */}
        <div className="shrink-0 space-y-1">
          <div className="flex items-center justify-between mb-0.5">
            <label htmlFor="config-exchange-rate-input" className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
              <Coins className="w-3 h-3 text-slate-400" />
              <span>USD to INR Rate</span>
            </label>
            <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ₹{exchangeRate.toFixed(2)}
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">₹</span>
            <Input
              id="config-exchange-rate-input"
              type="number"
              min="1"
              step="0.1"
              value={rateInput}
              onChange={handleRateChange}
              className="h-8 text-xs pl-6 pr-7 border-slate-200 bg-white focus-visible:ring-blue-600 font-medium"
              placeholder="100.00"
            />
            <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Quick Rate Presets */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-slate-400 mr-0.5">Quick:</span>
            {[83.5, 85, 90, 100].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  setRateInput(String(rate));
                  onUpdateExchangeRate?.(rate);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition border cursor-pointer ${
                  Math.abs(exchangeRate - rate) < 0.01
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                ₹{rate}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Rank Names List with Internal Scrolling */}
        <div className="flex flex-col flex-1 min-h-0 pt-0.5">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <label className="text-[11px] font-bold text-slate-800">
              Rank Names ({computedRanks.length})
            </label>
            <span className="text-[10px] text-slate-400">Inline editable</span>
          </div>

          <div className="space-y-1 flex-1 min-h-[60px] overflow-y-auto pr-1 border border-slate-100 rounded-xl p-1.5 bg-slate-50/60 overscroll-contain">
            {computedRanks.map((rank, idx) => (
              <div key={rank.id} className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 w-5 font-mono text-right shrink-0">
                  {idx + 1}.
                </span>
                <Input
                  type="text"
                  value={rank.name}
                  onChange={(e) => onUpdateRankName?.(rank.id, e.target.value)}
                  className="h-7 text-xs px-2.5 border-slate-200 bg-white hover:border-slate-300 focus:border-blue-600 rounded-lg transition"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 4. Reset to Default Button (Pinned to Bottom) */}
        <div className="pt-2 border-t border-slate-100 shrink-0">
          <Button
            type="button"
            onClick={() => {
              onClose();
              onOpenResetModal?.();
            }}
            className="w-full bg-[#1e60f2] hover:bg-[#1a54d8] text-white text-xs font-semibold h-8.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>Reset to Default</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
