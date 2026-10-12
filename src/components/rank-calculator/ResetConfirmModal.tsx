import { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
  onDownloadSafetyBackup: () => void;
}

export function ResetConfirmModal({
  isOpen,
  onClose,
  onConfirmReset,
  onDownloadSafetyBackup,
}: ResetConfirmModalProps) {
  const [downloadedBackup, setDownloadedBackup] = useState(false);

  if (!isOpen) return null;

  const handleDownloadClick = () => {
    onDownloadSafetyBackup();
    setDownloadedBackup(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-600/30 rounded-lg text-red-300">
              <RotateCcw className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Reset to Default Ranks</h3>
              <p className="text-xs text-slate-300">Restore factory sample configuration</p>
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
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Are you sure?</strong> This will reset your database back to the original 7 sample ranks (PBA 1 – PBA 7, base prices $100 to $1,000, 3% fee) and reset the exchange rate to 100.
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold text-blue-900 block">Recommended</span>
              <span className="text-blue-700 text-[11px]">Download a backup first so you never lose custom data.</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownloadClick}
              className="text-xs h-8 border-blue-300 text-blue-900 hover:bg-blue-100 shrink-0"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              {downloadedBackup ? 'Backed Up ✓' : 'Download Backup'}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirmReset();
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Yes, Reset Everything
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
