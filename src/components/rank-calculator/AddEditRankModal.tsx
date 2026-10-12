import { useState, useEffect } from 'react';
import { X, Award, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RankItem } from '@/types/rank-calculator';

interface AddEditRankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rankData: Omit<RankItem, 'id' | 'order'>, rankId?: string) => void;
  rankToEdit?: RankItem | null;
  suggestedName?: string;
  defaultFeePercent?: number;
}

export function AddEditRankModal({
  isOpen,
  onClose,
  onSave,
  rankToEdit,
  suggestedName = 'PBA 8',
  defaultFeePercent = 3,
}: AddEditRankModalProps) {
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [networkFeePercent, setNetworkFeePercent] = useState('3');
  const [error, setError] = useState('');

  useEffect(() => {
    if (rankToEdit) {
      setName(rankToEdit.name);
      setBasePrice(String(rankToEdit.basePrice));
      setNetworkFeePercent(String(rankToEdit.networkFeePercent));
    } else {
      setName(suggestedName);
      setBasePrice('1000');
      setNetworkFeePercent(String(defaultFeePercent));
    }
    setError('');
  }, [rankToEdit, suggestedName, defaultFeePercent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Rank name cannot be empty.');
      return;
    }

    const priceNum = parseFloat(basePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Base price must be a positive number greater than 0.');
      return;
    }

    const feeNum = parseFloat(networkFeePercent);
    if (isNaN(feeNum) || feeNum < 0) {
      setError('Network fee percentage cannot be negative.');
      return;
    }

    onSave(
      {
        name: trimmedName,
        basePrice: Math.round(priceNum * 100) / 100,
        networkFeePercent: Math.round(feeNum * 100) / 100,
      },
      rankToEdit?.id
    );
    onClose();
  };

  const calculatedFeeUSD = (parseFloat(basePrice) || 0) * ((parseFloat(networkFeePercent) || 0) / 100);
  const calculatedTotalUSD = (parseFloat(basePrice) || 0) + calculatedFeeUSD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header (Pinned) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/30 rounded-lg text-blue-300">
              <Award className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-snug">
                {rankToEdit ? 'Edit Rank' : 'Add New Rank'}
              </h3>
              <p className="text-xs text-slate-300">
                {rankToEdit ? `Update properties for ${rankToEdit.name}` : 'Configure network rank price and fee'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Pinned Action Buttons */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-5 sm:p-6 space-y-3.5 sm:space-y-4 flex-1 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Rank Name */}
            <div>
              <label htmlFor="rank-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5 cursor-pointer">
                Rank Name
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  id="rank-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PBA 8"
                  className="pl-9 h-10 text-sm font-medium border-slate-300 focus-visible:ring-blue-900"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Descriptive name for the achievement tier
              </p>
            </div>

            {/* Base Price (USD) */}
            <div>
              <label htmlFor="rank-base-price-input" className="block text-xs font-semibold text-slate-700 mb-1.5 cursor-pointer">
                Base Price (USD)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  id="rank-base-price-input"
                  type="number"
                  step="any"
                  min="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="1000.00"
                  className="pl-9 h-10 text-sm font-mono border-slate-300 focus-visible:ring-blue-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Base investment cost in US Dollars
              </p>
            </div>

            {/* Network Fee (%) */}
            <div>
              <label htmlFor="rank-fee-percent-input" className="block text-xs font-semibold text-slate-700 mb-1.5 cursor-pointer">
                Network Fee Percentage (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  id="rank-fee-percent-input"
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={networkFeePercent}
                  onChange={(e) => setNetworkFeePercent(e.target.value)}
                  placeholder="3"
                  className="pl-9 h-10 text-sm font-mono border-slate-300 focus-visible:ring-blue-900"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-500">Quick Fee:</span>
                {[1, 2, 3, 5].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setNetworkFeePercent(String(fee))}
                    className={`px-2 py-0.5 text-[11px] rounded border cursor-pointer ${
                      networkFeePercent === String(fee)
                        ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {fee}%
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Calculation Preview
              </span>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Network Fee ({networkFeePercent || 0}%):</span>
                <span className="font-mono font-semibold text-slate-800">
                  ${calculatedFeeUSD.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-900 font-semibold pt-1 border-t border-slate-200">
                <span>Total Rank Cost:</span>
                <span className="font-mono text-blue-900 font-bold">
                  ${calculatedTotalUSD.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Pinned to Footer) */}
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-900 hover:bg-blue-950 text-white font-medium cursor-pointer"
            >
              {rankToEdit ? 'Save Changes' : 'Add Rank'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
