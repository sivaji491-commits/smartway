import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseRanksFromCSV, CSVParseResult } from '@/lib/rank-calculator-engine';
import { RankItem } from '@/types/rank-calculator';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportConfirm: (ranks: RankItem[]) => void;
  currentRankCount: number;
}

export function CsvImportModal({
  isOpen,
  onClose,
  onImportConfirm,
  currentRankCount,
}: CsvImportModalProps) {
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [confirmedReplace, setConfirmedReplace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseRanksFromCSV(content);
      setParseResult(res);
      setConfirmedReplace(false);
    };
    reader.readAsText(file);
  };

  const handleProceed = () => {
    if (!parseResult || !parseResult.ranks || parseResult.ranks.length === 0) return;
    onImportConfirm(parseResult.ranks);
    onClose();
  };

  const handleReset = () => {
    setParseResult(null);
    setFileName('');
    setConfirmedReplace(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/30 rounded-lg text-blue-300">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-snug">Import Ranks from CSV</h3>
              <p className="text-xs text-slate-300">
                Load custom rank configurations from a CSV spreadsheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File Picker Zone */}
          {!parseResult ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-700 bg-slate-50 hover:bg-blue-50/40 rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
              >
                <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 text-blue-900">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drop CSV file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts standard CSV files with columns: Rank Name, Base Price, Network Fee
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Expected CSV Columns:</p>
                <code className="block p-1.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700">
                  Rank Name, Base Price (USD), Network Fee (%)
                </code>
                <p className="text-[11px] text-slate-500 pt-1">
                  Example: <span className="font-mono">PBA 1, 100, 3</span> or exported CSV from this calculator.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File details */}
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <FileText className="w-4 h-4 text-blue-900" />
                  <span className="truncate max-w-[280px]">{fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-blue-900 hover:underline font-semibold"
                >
                  Choose another file
                </button>
              </div>

              {/* Errors if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1.5 text-red-800">
                  <div className="flex items-center gap-1.5 font-semibold text-red-900">
                    <AlertCircle className="w-4 h-4" />
                    <span>CSV Validation Errors ({parseResult.errors.length}):</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-32 overflow-y-auto">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Preview */}
              {parseResult.ranks && parseResult.ranks.length > 0 && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Found <strong>{parseResult.ranks.length}</strong> valid ranks ready for import.
                      </span>
                    </div>
                  </div>

                  {/* Sample preview table */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 sticky top-0 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Rank Name</th>
                          <th className="py-2 px-3 text-right">Base Price</th>
                          <th className="py-2 px-3 text-right">Fee %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.ranks.slice(0, 5).map((r, i) => (
                          <tr key={r.id}>
                            <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-800">{r.name}</td>
                            <td className="py-1.5 px-3 text-right font-mono">${r.basePrice.toFixed(2)}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{r.networkFeePercent}%</td>
                          </tr>
                        ))}
                        {parseResult.ranks.length > 5 && (
                          <tr>
                            <td colSpan={4} className="py-1.5 px-3 text-center text-[11px] text-slate-500 italic bg-slate-50">
                              + {parseResult.ranks.length - 5} more rows...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Warning & Confirmation Checkbox */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice:</strong> Importing this file will replace your current {currentRankCount} ranks. All cumulative totals and INR values will recalculate automatically.
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmedReplace}
                        onChange={(e) => setConfirmedReplace(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
                      />
                      <span>I confirm replacing existing ranks with this CSV data</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
            {parseResult && parseResult.ranks && parseResult.ranks.length > 0 && (
              <Button
                type="button"
                onClick={handleProceed}
                disabled={!confirmedReplace}
                className="bg-blue-900 hover:bg-blue-950 text-white disabled:opacity-50"
              >
                Import & Replace Ranks
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
