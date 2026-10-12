import { useState, useEffect } from 'react';
import { 
  Coins, 
  TrendingUp, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencySettings } from '@/types/rank-calculator';
import { formatLastUpdated } from '@/lib/rank-calculator-engine';

interface CurrencySettingsViewProps {
  currency: CurrencySettings;
  note: string;
  secondaryNote?: string | undefined;
  onUpdateExchangeRate: (newRate: number) => void;
  onUpdateNotes: (note: string, secondaryNote?: string | undefined) => void;
  onDownloadBackup?: (() => void) | undefined;
  onOpenRestoreModal: () => void;
  onOpenResetModal: () => void;
  isAdmin?: boolean;
}

export function CurrencySettingsView({
  currency,
  note,
  secondaryNote = '',
  onUpdateExchangeRate,
  onUpdateNotes,
  onDownloadBackup,
  onOpenRestoreModal,
  onOpenResetModal,
  isAdmin = true,
}: CurrencySettingsViewProps) {
  const [rateInput, setRateInput] = useState(String(currency.exchangeRateUSDToINR));
  const [primaryNote, setPrimaryNote] = useState(note);
  const [secNote, setSecNote] = useState(secondaryNote);
  const [rateError, setRateError] = useState('');
  const [rateSavedToast, setRateSavedToast] = useState(false);
  const [notesSavedToast, setNotesSavedToast] = useState(false);
  const [showResetRateDialog, setShowResetRateDialog] = useState(false);

  useEffect(() => {
    setRateInput(String(currency.exchangeRateUSDToINR));
  }, [currency.exchangeRateUSDToINR]);

  useEffect(() => {
    setPrimaryNote(note);
    setSecNote(secondaryNote);
  }, [note, secondaryNote]);

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      setRateError('Exchange rate must be a valid positive number greater than 0.');
      return;
    }

    setRateError('');
    onUpdateExchangeRate(Math.round(val * 100) / 100);
    setRateSavedToast(true);
    setTimeout(() => setRateSavedToast(false), 3000);
  };

  const handleNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNotes(primaryNote.trim(), secNote.trim());
    setNotesSavedToast(true);
    setTimeout(() => setNotesSavedToast(false), 3000);
  };

  const handleResetRateConfirm = () => {
    onUpdateExchangeRate(100);
    setRateInput('100');
    setRateError('');
    setShowResetRateDialog(false);
    setRateSavedToast(true);
    setTimeout(() => setRateSavedToast(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-900 rounded-lg text-white">
            <Coins className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Currency & Application Settings</h1>
            <p className="text-xs text-slate-500">
              Manage USD to INR conversion rate, calculation notices, and full system backup
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Exchange Rate Configuration */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">USD-to-INR Exchange Rate</h2>
            <p className="text-xs text-slate-500">
              Manual exchange rate acts as the authoritative source of truth
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {formatLastUpdated(currency.lastUpdated)}</span>
          </div>
        </div>

        {rateSavedToast && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Exchange rate successfully updated! All INR cumulative values recalculated.</span>
          </div>
        )}

        {rateError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{rateError}</span>
          </div>
        )}

        <form onSubmit={handleRateSubmit} className="space-y-4">
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1 US Dollar (USD) = Indian Rupee (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-sm text-slate-500">
                ₹
              </span>
              <Input
                type="number"
                step="any"
                min="0.01"
                value={rateInput}
                onChange={(e) => {
                  setRateInput(e.target.value);
                  setRateError('');
                }}
                className="pl-8 h-10 font-mono text-base font-bold text-slate-900 border-slate-300 focus-visible:ring-blue-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sample default rate: 100.00
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Quick Presets:</span>
            {[80, 85, 90, 95, 100, 105].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setRateInput(String(preset));
                  setRateError('');
                }}
                className={`px-2.5 py-1 text-xs rounded-md border font-mono transition ${
                  parseFloat(rateInput) === preset
                    ? 'bg-blue-900 text-white border-blue-900 font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              className="bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs h-9 px-4"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>Save & Apply Exchange Rate</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetRateDialog(true)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-9 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Reset Rate to 100</span>
            </Button>
          </div>
        </form>

        {/* Confirmation modal for Reset Rate */}
        {showResetRateDialog && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Confirm Rate Reset:</strong> Resetting the exchange rate back to ₹100.00 will immediately recalculate all INR values.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleResetRateConfirm}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              >
                Confirm Reset to ₹100
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowResetRateDialog(false)}
                className="text-xs h-8 border-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Behavior Guarantee:</p>
          <p>
            Modifying the exchange rate strictly updates <strong>INR cumulative totals</strong> and dashboard investment figures. It will <strong>never alter</strong> any USD base prices, fees, or USD cumulative amounts.
          </p>
        </div>
      </section>

      {/* Section 2: Editable Notes Configuration */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">Table Notes & Disclaimer</h2>
          </div>
          <p className="text-xs text-slate-500">
            Customize the explanatory notes displayed beneath the Ranks Table
          </p>
        </div>

        {notesSavedToast && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Table notes saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleNotesSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Calculation Note
            </label>
            <Textarea
              value={primaryNote}
              onChange={(e) => setPrimaryNote(e.target.value)}
              rows={2}
              className="text-xs border-slate-300 focus-visible:ring-blue-900 font-sans"
              placeholder="Enter calculation note displayed below the table..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Secondary Validity / Policy Note
            </label>
            <Input
              type="text"
              value={secNote}
              onChange={(e) => setSecNote(e.target.value)}
              className="text-xs border-slate-300 focus-visible:ring-blue-900 font-sans"
              placeholder="e.g. 365 days validity (no need to purchase it again, Refer equal/PBA 3)"
            />
          </div>

          <Button
            type="submit"
            className="bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs h-9 px-4"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            <span>Save Table Notes</span>
          </Button>
        </form>
      </section>

      {/* Section 3: Full JSON Backup & Restore + Factory Reset */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">Full System Backup & Restore</h2>
          </div>
          <p className="text-xs text-slate-500">
            Export or restore full JSON archives including all ranks, order, prices, fees, currency settings, and notes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download Full Backup Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div>
              <span className="font-semibold text-sm text-slate-900 block">Download Full Backup</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates a timestamped JSON file with all rank data and settings.
              </p>
            </div>
            <Button
              onClick={onDownloadBackup}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 font-medium"
            >
              <Download className="w-4 h-4 mr-2 text-blue-400" />
              <span>Download Backup (.json)</span>
            </Button>
          </div>

          {/* Restore from Backup Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div>
              <span className="font-semibold text-sm text-slate-900 block">Restore from Backup</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Atomically restores a previously saved JSON backup after validation and preview.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onOpenRestoreModal}
              className="w-full border-slate-300 text-slate-700 hover:bg-white text-xs h-9 font-medium"
            >
              <Upload className="w-4 h-4 mr-2 text-slate-600" />
              <span>Select File & Restore</span>
            </Button>
          </div>
        </div>

        {/* Factory Reset Option */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Factory Reset</span>
            <span className="text-[11px] text-slate-500">
              Restore the initial 7 sample ranks (PBA 1–7) and exchange rate 100.
            </span>
          </div>
          <Button
            variant="outline"
            onClick={onOpenResetModal}
            className="border-red-200 text-red-700 hover:bg-red-50 text-xs h-8 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-red-500" />
            <span>Reset to Default</span>
          </Button>
        </div>

        {/* Local Storage documentation */}
        <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs text-blue-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Device Storage Note:</strong> All settings and rank customizations are preserved locally in this browser. They are not synchronized across devices. Use the Download Backup button to keep an offline copy.
          </p>
        </div>
      </section>
    </div>
  );
}
