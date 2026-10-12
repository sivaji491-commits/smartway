import { useState, useRef } from 'react';
import { X, RefreshCw, FileCode, AlertTriangle, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateBackupData, BackupValidationResult } from '@/lib/rank-calculator-engine';
import { BackupData } from '@/types/rank-calculator';

interface JsonRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreConfirm: (backupData: BackupData) => void;
  onDownloadSafetyBackup: () => void;
  currentRankCount: number;
}

export function JsonRestoreModal({
  isOpen,
  onClose,
  onRestoreConfirm,
  onDownloadSafetyBackup,
  currentRankCount,
}: JsonRestoreModalProps) {
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [safetyDownloaded, setSafetyDownloaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = validateBackupData(json);
        setValidationResult(res);
        setConfirmed(false);
      } catch (err: any) {
        setValidationResult({
          valid: false,
          error: `Malformed JSON file: ${err?.message || 'Invalid syntax'}`,
        });
        setConfirmed(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSafetyDownloadClick = () => {
    onDownloadSafetyBackup();
    setSafetyDownloaded(true);
  };

  const handleApplyRestore = () => {
    if (!validationResult || !validationResult.valid || !validationResult.backupData) return;
    onRestoreConfirm(validationResult.backupData);
    onClose();
  };

  const handleResetFile = () => {
    setValidationResult(null);
    setFileName('');
    setConfirmed(false);
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
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-snug">Restore from JSON Backup</h3>
              <p className="text-xs text-slate-300">
                Safely restore full rank database, rates, and notes from backup
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
          {!validationResult ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-700 bg-slate-50 hover:bg-blue-50/40 rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3"
              >
                <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 text-blue-900">
                  <FileCode className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to select JSON backup file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a previously exported .json backup file
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Atomic Restoration:</span> The backup will be strictly validated before any change is made. If the file is invalid or corrupted, your existing data remains completely untouched.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <FileCode className="w-4 h-4 text-blue-900" />
                  <span className="truncate max-w-[280px]">{fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="text-blue-900 hover:underline font-semibold"
                >
                  Choose another file
                </button>
              </div>

              {/* Validation Failure */}
              {!validationResult.valid && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-red-900">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Backup Validation Failed</span>
                  </div>
                  <p className="text-[11px] text-red-700">{validationResult.error}</p>
                  <p className="text-[11px] text-slate-600 pt-1">
                    Your current ranks ({currentRankCount} ranks) were NOT changed.
                  </p>
                </div>
              )}

              {/* Validation Success & Preview */}
              {validationResult.valid && validationResult.preview && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Valid backup archive detected! Ready to preview and restore.</span>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Ranks Count:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {validationResult.preview.rankCount} Ranks
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">USD to INR Rate:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        ₹{validationResult.preview.exchangeRate.toFixed(2)}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200">
                      <span className="text-[11px] text-slate-500 block">Export Date:</span>
                      <span className="text-slate-700 font-mono text-[11px]">
                        {new Date(validationResult.preview.exportTimestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] text-slate-500 block">Sample Ranks:</span>
                      <span className="text-slate-700 text-xs">
                        {validationResult.preview.sampleNames.join(', ')}...
                      </span>
                    </div>
                  </div>

                  {/* Safety backup offer */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">Safety Pre-Backup</p>
                      <p className="text-[11px] text-blue-700">Download a snapshot of your current data before replacing.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSafetyDownloadClick}
                      className="text-xs h-8 border-blue-300 text-blue-900 hover:bg-blue-100 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      {safetyDownloaded ? 'Downloaded ✓' : 'Download Backup'}
                    </Button>
                  </div>

                  {/* Confirmation Checkbox */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-start gap-2 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Restoring will replace all currently active ranks with the {validationResult.preview.rankCount} ranks from this backup.
                      </span>
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-slate-800 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
                      />
                      <span>I confirm restoring this backup</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
            {validationResult?.valid && (
              <Button
                type="button"
                onClick={handleApplyRestore}
                disabled={!confirmed}
                className="bg-blue-900 hover:bg-blue-950 text-white disabled:opacity-50"
              >
                Apply Restore
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
