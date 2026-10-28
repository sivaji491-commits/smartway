import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Clock, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Save, 
  X, 
  ShieldCheck, 
  Calendar, 
  CalendarDays,
  Layers, 
  Sparkles,
  Info,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TimeInHandConfig, 
  TimeInHandRow, 
  DEFAULT_TIME_IN_HAND_CONFIG, 
  REFERENCE_IMAGE_PRESET 
} from '@/types/time-in-hand';
import { 
  calculateAllTimeInHandRows, 
  calculateTimeInHandSummary,
  calculateTimeInHandRow 
} from '@/lib/time-in-hand-engine';
import { 
  loadTimeInHandConfig, 
  saveTimeInHandAdmin, 
  resetTimeInHandDefaults, 
  TIME_IN_HAND_UPDATED_EVENT 
} from '@/lib/time-in-hand-storage';
import { OneTimeWorkHighlight } from '@/components/key-points/OneTimeWorkHighlight';

export interface TimeInHandViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export const TimeInHandView: React.FC<TimeInHandViewProps> = ({
  isAdmin = false,
  userEmail,
  onNavigateToTab
}) => {
  const [config, setConfig] = useState<TimeInHandConfig>(() => loadTimeInHandConfig());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TimeInHandRow | null>(null);

  // Form states for Admin Settings Modal
  const [modalHoursPerDay, setModalHoursPerDay] = useState<number>(config.hoursPerDay);
  const [modalDaysPerMonth, setModalDaysPerMonth] = useState<number>(config.daysPerMonth);
  const [modalMonthsPerYear, setModalMonthsPerYear] = useState<number>(config.monthsPerYear);
  const [modalHoursInDay, setModalHoursInDay] = useState<number>(config.hoursInDay);
  const [modalDaysInYear, setModalDaysInYear] = useState<number>(config.daysInYear);
  const [modalTitle, setModalTitle] = useState<string>(config.title);
  const [modalSubtitle, setModalSubtitle] = useState<string>(config.subtitle);

  // Column header editing in Admin Settings
  const [modalColAge, setModalColAge] = useState<string>(config.colAge);
  const [modalColUpTo60, setModalColUpTo60] = useState<string>(config.colUpTo60);
  const [modalColYearsInHand, setModalColYearsInHand] = useState<string>(config.colYearsInHand);
  const [modalColHoursPerDay, setModalColHoursPerDay] = useState<string>(config.colHoursPerDay);
  const [modalColDaysPerMonth, setModalColDaysPerMonth] = useState<string>(config.colDaysPerMonth);
  const [modalColHoursPerMonth, setModalColHoursPerMonth] = useState<string>(config.colHoursPerMonth);
  const [modalColHoursPerYear, setModalColHoursPerYear] = useState<string>(config.colHoursPerYear);
  const [modalColHoursInHand, setModalColHoursInHand] = useState<string>(config.colHoursInHand);
  const [modalColDaysInHand, setModalColDaysInHand] = useState<string>(config.colDaysInHand);
  const [modalColEquivalentYears, setModalColEquivalentYears] = useState<string>(config.colEquivalentYears);

  // Form states for Add/Edit Row Modal
  const [rowAge, setRowAge] = useState<number>(30);
  const [rowUpTo60, setRowUpTo60] = useState<string>('30 Y');
  const [rowYearsInHand, setRowYearsInHand] = useState<number>(10);
  const [rowHoursPerDay, setRowHoursPerDay] = useState<number>(config.hoursPerDay || 8);

  // Table inline editing state for first 4 columns (Admin only)
  const [isEditingTable, setIsEditingTable] = useState<boolean>(false);
  const [tableDraftRows, setTableDraftRows] = useState<TimeInHandRow[]>([]);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Real-time synchronization
  const syncFromStorage = useCallback(() => {
    setConfig(loadTimeInHandConfig());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener(TIME_IN_HAND_UPDATED_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(TIME_IN_HAND_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, [syncFromStorage]);

  // Active configuration: reflects live draft values while admin edits first 4 columns
  const activeConfig = useMemo(() => {
    if (isAdmin && isEditingTable && tableDraftRows.length > 0) {
      return { ...config, rows: tableDraftRows };
    }
    return config;
  }, [config, isAdmin, isEditingTable, tableDraftRows]);

  // Calculated rows (live recalculation for remaining columns when editing first 4 columns)
  const calculatedRows = useMemo(() => {
    return calculateAllTimeInHandRows(activeConfig);
  }, [activeConfig]);

  // Selected row state for interactive Annual Days calculation
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Active selected row (defaults sensibly to the row with 10 years in-hand, e.g. 3.2877)
  const activeRow = useMemo(() => {
    if (!calculatedRows.length) return null;
    if (selectedRowId) {
      const found = calculatedRows.find((r) => r.id === selectedRowId);
      if (found) return found;
    }
    // Sensible default: row with 10 years in-hand
    return calculatedRows.find((r) => r.yearsInHand === 10) || calculatedRows[0];
  }, [calculatedRows, selectedRowId]);

  // Selected Year In-hand numeric value from the active row (single source of truth)
  const selectedYearInHand = useMemo(() => {
    if (!activeRow) return 0;
    return Number(activeRow.yearsInHandEquivalent.toFixed(4));
  }, [activeRow]);

  const summary = useMemo(() => {
    return calculateTimeInHandSummary(config, selectedYearInHand);
  }, [config, selectedYearInHand]);

  // Interactive Annual Days = Annual Working Hours × Selected Year In-hand Value
  const interactiveAnnualDays = useMemo(() => {
    const annualHours = Number(summary.hoursPerYear) || 2880;
    return annualHours * selectedYearInHand;
  }, [summary.hoursPerYear, selectedYearInHand]);

  const interactiveAnnualDaysFormatted = useMemo(() => {
    return interactiveAnnualDays.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [interactiveAnnualDays]);

  // Open Settings Modal
  const openSettingsModal = () => {
    setModalHoursPerDay(config.hoursPerDay);
    setModalDaysPerMonth(config.daysPerMonth);
    setModalMonthsPerYear(config.monthsPerYear);
    setModalHoursInDay(config.hoursInDay);
    setModalDaysInYear(config.daysInYear);
    setModalTitle(config.title);
    setModalSubtitle(config.subtitle);

    setModalColAge(config.colAge);
    setModalColUpTo60(config.colUpTo60);
    setModalColYearsInHand(config.colYearsInHand);
    setModalColHoursPerDay(config.colHoursPerDay);
    setModalColDaysPerMonth(config.colDaysPerMonth);
    setModalColHoursPerMonth(config.colHoursPerMonth);
    setModalColHoursPerYear(config.colHoursPerYear);
    setModalColHoursInHand(config.colHoursInHand);
    setModalColDaysInHand(config.colDaysInHand);
    setModalColEquivalentYears(config.colEquivalentYears);

    setFeedback(null);
    setIsEditModalOpen(true);
  };

  // Save Settings Modal
  const handleSaveSettings = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setFeedback(null);

    const updatedConfig: TimeInHandConfig = {
      ...config,
      title: modalTitle.trim() || 'In-hand time',
      subtitle: modalSubtitle.trim() || 'Working hours accumulation and equivalent in-hand time comparison model',
      hoursPerDay: Number(modalHoursPerDay) || 8,
      daysPerMonth: Number(modalDaysPerMonth) || 30,
      monthsPerYear: Number(modalMonthsPerYear) || 12,
      hoursInDay: Number(modalHoursInDay) || 24,
      daysInYear: Number(modalDaysInYear) || 365,

      colAge: modalColAge.trim() || 'Age',
      colUpTo60: modalColUpTo60.trim() || 'Up to 60 Years In-hand',
      colYearsInHand: modalColYearsInHand.trim() || 'Years In-hand',
      colHoursPerDay: modalColHoursPerDay.trim() || 'Hours per Day',
      colDaysPerMonth: modalColDaysPerMonth.trim() || 'Days per Month',
      colHoursPerMonth: modalColHoursPerMonth.trim() || 'Hours per Month',
      colHoursPerYear: modalColHoursPerYear.trim() || 'Hours per Year',
      colHoursInHand: modalColHoursInHand.trim() || 'Hours In-hand',
      colDaysInHand: modalColDaysInHand.trim() || 'Days In-hand',
      colEquivalentYears: modalColEquivalentYears.trim() || 'Years In-hand',
    };

    const res = await saveTimeInHandAdmin(updatedConfig, userEmail || 'sivaji491@gmail.com');
    setIsSaving(false);
    if (res.success && res.data) {
      setConfig(res.data);
      setIsEditModalOpen(false);
      setFeedback({ type: 'success', message: 'In-hand time parameters saved and updated successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save configuration.' });
    }
  };

  // --- Table Inline Editing Handlers (Admin Only - Columns 1 to 4) ---
  const handleStartEditingTable = () => {
    if (!isAdmin) return;
    setTableDraftRows(
      config.rows.map((r) => ({
        ...r,
        hoursPerDay: r.hoursPerDay !== undefined && !isNaN(Number(r.hoursPerDay)) 
          ? Number(r.hoursPerDay) 
          : (Number(config.hoursPerDay) || 8),
      }))
    );
    setIsEditingTable(true);
    setFeedback(null);
  };

  const handleCancelEditingTable = () => {
    setIsEditingTable(false);
    setTableDraftRows([]);
  };

  const handleDraftCellChange = (
    rowId: string, 
    field: 'age' | 'upTo60' | 'yearsInHand' | 'hoursPerDay', 
    val: string | number
  ) => {
    setTableDraftRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          [field]: val,
        };
      })
    );
  };

  const handleSaveTableDraft = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setFeedback(null);

    // Validate inputs for the first 4 columns across all draft rows
    for (let i = 0; i < tableDraftRows.length; i++) {
      const r = tableDraftRows[i];
      const ageNum = Number(r.age);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setFeedback({ type: 'error', message: `Row #${i + 1}: Age must be a valid number between 1 and 120.` });
        setIsSaving(false);
        return;
      }
      if (!r.upTo60 || typeof r.upTo60 !== 'string' || !r.upTo60.trim()) {
        setFeedback({ type: 'error', message: `Row #${i + 1}: 'Up to 60 Years In-hand' cannot be empty.` });
        setIsSaving(false);
        return;
      }
      const yihNum = Number(r.yearsInHand);
      if (isNaN(yihNum) || yihNum < 0) {
        setFeedback({ type: 'error', message: `Row #${i + 1}: Years In-hand must be a non-negative number.` });
        setIsSaving(false);
        return;
      }
      const hpdNum = Number(r.hoursPerDay);
      if (isNaN(hpdNum) || hpdNum <= 0 || hpdNum > 24) {
        setFeedback({ type: 'error', message: `Row #${i + 1}: Hours per Day must be a number between 1 and 24.` });
        setIsSaving(false);
        return;
      }
    }

    const cleanedRows: TimeInHandRow[] = tableDraftRows.map((r) => ({
      ...r,
      age: Number(r.age),
      upTo60: String(r.upTo60).trim(),
      yearsInHand: Number(r.yearsInHand),
      hoursPerDay: Number(r.hoursPerDay),
    }));

    const updatedConfig: TimeInHandConfig = {
      ...config,
      rows: cleanedRows,
    };

    const res = await saveTimeInHandAdmin(updatedConfig, userEmail || 'sivaji491@gmail.com');
    setIsSaving(false);
    if (res.success && res.data) {
      setConfig(res.data);
      setIsEditingTable(false);
      setTableDraftRows([]);
      setFeedback({ 
        type: 'success', 
        message: 'Updated values for the first 4 columns (Age, Up to 60, Years In-hand, Hours/Day) saved successfully.' 
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save table changes.' });
    }
  };

  // Open Add/Edit Row Modal
  const openAddRowModal = () => {
    setEditingRow(null);
    setRowAge(30);
    setRowUpTo60('30 Y');
    setRowYearsInHand(10);
    setRowHoursPerDay(config.hoursPerDay || 8);
    setFeedback(null);
    setIsAddRowModalOpen(true);
  };

  const openEditRowModal = (row: TimeInHandRow) => {
    setEditingRow(row);
    setRowAge(row.age);
    setRowUpTo60(row.upTo60);
    setRowYearsInHand(row.yearsInHand);
    setRowHoursPerDay(row.hoursPerDay !== undefined && !isNaN(Number(row.hoursPerDay)) ? Number(row.hoursPerDay) : (config.hoursPerDay || 8));
    setFeedback(null);
    setIsAddRowModalOpen(true);
  };

  // Save Row
  const handleSaveRow = async () => {
    if (!isAdmin) return;
    if (rowAge <= 0 || rowAge > 120) {
      setFeedback({ type: 'error', message: 'Age must be between 1 and 120.' });
      return;
    }
    if (!rowUpTo60 || !rowUpTo60.trim()) {
      setFeedback({ type: 'error', message: 'Up to 60 Years In-hand cannot be empty.' });
      return;
    }
    if (rowYearsInHand < 0) {
      setFeedback({ type: 'error', message: 'Years in-hand cannot be negative.' });
      return;
    }
    if (rowHoursPerDay <= 0 || rowHoursPerDay > 24) {
      setFeedback({ type: 'error', message: 'Hours per day must be between 1 and 24.' });
      return;
    }

    let updatedRows: TimeInHandRow[];
    if (editingRow) {
      updatedRows = config.rows.map((r) => 
        r.id === editingRow.id 
          ? { 
              ...r, 
              age: Number(rowAge), 
              upTo60: rowUpTo60.trim() || `${Math.max(0, 60 - rowAge)} Y`, 
              yearsInHand: Number(rowYearsInHand),
              hoursPerDay: Number(rowHoursPerDay),
            }
          : r
      );
    } else {
      const newRow: TimeInHandRow = {
        id: `row-${Date.now()}`,
        age: Number(rowAge),
        upTo60: rowUpTo60.trim() || `${Math.max(0, 60 - rowAge)} Y`,
        yearsInHand: Number(rowYearsInHand),
        hoursPerDay: Number(rowHoursPerDay),
      };
      updatedRows = [...config.rows, newRow];
    }

    const res = await saveTimeInHandAdmin({ ...config, rows: updatedRows }, userEmail || 'sivaji491@gmail.com');
    if (res.success && res.data) {
      setConfig(res.data);
      setIsAddRowModalOpen(false);
      setEditingRow(null);
      setFeedback({ type: 'success', message: editingRow ? 'Row updated successfully.' : 'New row added successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save row.' });
    }
  };

  // Delete Row
  const handleDeleteRow = async (rowId: string) => {
    if (!isAdmin) return;
    if (config.rows.length <= 1) {
      setFeedback({ type: 'error', message: 'The table must contain at least one row.' });
      return;
    }
    const updatedRows = config.rows.filter((r) => r.id !== rowId);
    const res = await saveTimeInHandAdmin({ ...config, rows: updatedRows }, userEmail || 'sivaji491@gmail.com');
    if (res.success && res.data) {
      setConfig(res.data);
      setFeedback({ type: 'success', message: 'Row removed successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to delete row.' });
    }
  };

  // Quick Preset Selection (30 days/month default vs 26 days/month screenshot)
  const applyPreset = async (presetType: 'default' | 'screenshot') => {
    if (!isAdmin) return;
    setIsSaving(true);
    let targetConfig: TimeInHandConfig;
    if (presetType === 'screenshot') {
      targetConfig = {
        ...config,
        daysPerMonth: 26,
        rows: REFERENCE_IMAGE_PRESET.rows || config.rows,
      };
    } else {
      targetConfig = {
        ...config,
        daysPerMonth: 30,
        rows: DEFAULT_TIME_IN_HAND_CONFIG.rows,
      };
    }

    const res = await saveTimeInHandAdmin(targetConfig, userEmail || 'sivaji491@gmail.com');
    setIsSaving(false);
    if (res.success && res.data) {
      setConfig(res.data);
      setFeedback({ 
        type: 'success', 
        message: presetType === 'screenshot' 
          ? 'Reference screenshot preset (26 days/month, 5-18 years) applied successfully.' 
          : 'Standard default preset (30 days/month, 5-30 years) applied successfully.' 
      });
    }
  };

  // Reset to Factory Defaults
  const handleResetDefaults = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to restore factory default calculation values and rows?')) {
      return;
    }
    const res = await resetTimeInHandDefaults(userEmail || 'sivaji491@gmail.com');
    if (res.success && res.data) {
      setConfig(res.data);
      setFeedback({ type: 'success', message: 'Restored original default values successfully.' });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-5 space-y-4 w-full animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]">
      {/* Top-Left Animated "ONE TIME WORK" Highlight */}
      <div className="flex items-center justify-start self-start pb-0.5">
        <OneTimeWorkHighlight />
      </div>

      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {config.title || 'In-hand time'}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Working Hours Model
              </span>
              {isAdmin && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Admin Editable
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {config.subtitle || 'Working hours accumulation and equivalent in-hand time comparison model'}
            </p>
          </div>
        </div>

        {/* Admin Controls Toolbar (Visible ONLY to Admins) */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[11px] font-medium text-slate-500 px-1.5">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('default')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  config.daysPerMonth === 30 
                    ? 'bg-white shadow-xs text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="30 Days/Month (Standard default 2,880 hrs/yr)"
              >
                30 Days/Mo
              </button>
              <button
                type="button"
                onClick={() => applyPreset('screenshot')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  config.daysPerMonth === 26 
                    ? 'bg-white shadow-xs text-teal-700 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="26 Days/Month (Screenshot reference 2,496 hrs/yr)"
              >
                26 Days (Image)
              </button>
            </div>

            {!isEditingTable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEditingTable}
                className="h-8 px-2.5 text-xs text-indigo-700 border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 font-semibold"
                title="Edit the first 4 columns directly in the table (Age, Up to 60, Years In-hand, Hours/Day)"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Edit First 4 Columns
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 bg-indigo-50 p-1 rounded-lg border border-indigo-200">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveTableDraft}
                  disabled={isSaving}
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Values'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditingTable}
                  disabled={isSaving}
                  className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 border-slate-300 bg-white"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddRowModal}
              className="h-8 px-2.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Add Row
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openSettingsModal}
              className="h-8 px-2.5 text-xs text-teal-700 border-teal-300 bg-teal-50/50 hover:bg-teal-50"
            >
              <Settings className="w-3.5 h-3.5 mr-1 text-teal-600" />
              Edit Settings
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
              title="Reset to default values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div 
          className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
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
            className="text-slate-400 hover:text-slate-600"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Key Parameter Summary Cards */}
      <div className="time-in-hand-summary-grid">
        <div className="bg-slate-50/80 rounded-lg p-2.5 sm:p-3 border border-slate-200/80">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Daily Hours</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {summary.hoursPerDay} <span className="text-xs font-normal text-slate-500">hrs/day</span>
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-lg p-2.5 sm:p-3 border border-slate-200/80">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Days / Month</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {summary.daysPerMonth} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-lg p-2.5 sm:p-3 border border-slate-200/80">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Monthly Hours</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {summary.hoursPerMonth.toLocaleString()} <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="bg-teal-50/50 rounded-lg p-2.5 sm:p-3 border border-teal-200/60">
          <div className="text-[11px] text-teal-700 font-semibold flex items-center justify-between">
            <span>Annual Working Hours</span>
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-teal-900 mt-1">
            {summary.hoursPerYear.toLocaleString()} <span className="text-xs font-normal text-teal-700">hrs/yr</span>
          </div>
        </div>

        {/* 5. Days Only (Renamed from Annual Days, preserves interactive calculation) */}
        <div 
          className={`rounded-lg p-2.5 sm:p-3 border transition-all duration-200 ${
            activeRow 
              ? 'bg-teal-50/70 border-teal-300 shadow-xs ring-1 ring-teal-400/30' 
              : 'bg-teal-50/50 border-teal-200/60'
          }`}
        >
          <div className="text-[11px] text-teal-700 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Days Only</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold uppercase tracking-wider border border-teal-300/50">
                Interactive
              </span>
            </span>
            <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-teal-900 mt-1 flex items-baseline gap-1 flex-wrap">
            <span>{interactiveAnnualDaysFormatted}</span>
            <span className="text-xs font-normal text-teal-700">days/year</span>
          </div>
          <div className="text-[10px] text-teal-700/85 mt-1 font-medium flex items-center gap-1 flex-wrap">
            <span className="text-teal-600 font-normal">Formula:</span>
            <span className="font-semibold text-teal-950">
              {summary.hoursPerYear.toLocaleString()} hrs × {selectedYearInHand} yrs
            </span>
          </div>
        </div>

        {/* 6. Time In-hand (Animated Scrolling Border Hero Card with Flowing Conic Gradient Beam) */}
        <div 
          className="relative rounded-xl p-[2px] overflow-hidden shadow-[0_4px_22px_-2px_rgba(249,115,22,0.35)] flex flex-col justify-between transition-all duration-300 group"
        >
          {/* Continuously traveling glowing orange-to-amber-gold gradient border highlight */}
          <div className="time-in-hand-animated-border motion-reduce:animate-none" />

          {/* Clean, readable inner card surface */}
          <div className="relative z-10 w-full h-full rounded-[10px] p-2.5 sm:p-3 bg-gradient-to-br from-amber-50/98 via-orange-50/95 to-amber-100/80 flex flex-col justify-between">
            {/* Header with Title, Icon, and Selected Badge */}
            <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-orange-950">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0 shadow-xs border border-orange-400/20">
                  <Timer className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="truncate tracking-tight font-extrabold text-orange-950">Time In-hand</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-950 font-extrabold uppercase tracking-wider shrink-0 border border-orange-400/40 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 motion-safe:animate-ping motion-reduce:animate-none inline-block shrink-0" />
                Selected
              </span>
            </div>

            {/* Prominent Large Metric Focal Point */}
            <div 
              key={activeRow?.id || 'selected-value'} 
              className="my-1 sm:my-1.5 flex items-baseline gap-1.5 flex-wrap animate-in fade-in duration-300 motion-reduce:animate-none"
            >
              <span className="text-xl sm:text-2xl font-black text-orange-950 tracking-tight leading-none drop-shadow-xs">
                {selectedYearInHand}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-orange-700/95 tracking-wide">
                years
              </span>
            </div>

            {/* Active Row Reference Footer */}
            <div className="pt-1.5 border-t border-orange-200/70 text-[10px] text-orange-900/90 font-medium flex items-center justify-between gap-1 truncate">
              <span className="text-orange-700/80 font-normal shrink-0">Active Row:</span>
              <span className="font-bold text-orange-950 truncate">
                {activeRow ? `${activeRow.age} yrs (${activeRow.upTo60})` : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Inline Editing Status Banner */}
      {isAdmin && isEditingTable && (
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="font-semibold text-indigo-900">Admin Editing Mode:</span>
            <span className="text-indigo-800">
              Columns 1–4 are editable below. Dependent columns (5–10) calculate live. Click <strong>Save Values</strong> to persist.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTableDraft}
              disabled={isSaving}
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {isSaving ? 'Saving...' : 'Save Values'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelEditingTable}
              disabled={isSaving}
              className="h-7 px-2.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* 3. The 10-Column Responsive Table Container */}
      <div className="relative rounded-lg border border-slate-300 overflow-hidden bg-white shadow-xs">
        {/* Horizontal scroll hints on mobile */}
        <div className="sm:hidden px-3 py-1.5 bg-slate-100 text-[11px] text-slate-600 flex items-center justify-between border-b border-slate-200">
          <span>Swipe horizontally to view all 10 columns</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-center border-collapse min-w-[760px] text-xs sm:text-sm">
            {/* Table Header matching the uploaded reference image */}
            <thead>
              <tr className="bg-white text-slate-900 font-semibold border-b border-slate-400 divide-x divide-slate-300">
                <th className={`py-2.5 px-3 whitespace-nowrap text-center font-bold ${isAdmin && isEditingTable ? 'bg-indigo-50/70 text-indigo-950 border-indigo-200' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{config.colAge || 'Age'}</span>
                    {isAdmin && isEditingTable && (
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Edit
                      </span>
                    )}
                  </div>
                </th>
                <th className={`py-2.5 px-3 whitespace-nowrap text-center font-bold ${isAdmin && isEditingTable ? 'bg-indigo-50/70 text-indigo-950 border-indigo-200' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{config.colUpTo60 || 'Up to 60 Years In-hand'}</span>
                    {isAdmin && isEditingTable && (
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Edit
                      </span>
                    )}
                  </div>
                </th>
                <th className={`py-2.5 px-3 whitespace-nowrap text-center font-bold ${isAdmin && isEditingTable ? 'bg-indigo-50/70 text-indigo-950 border-indigo-200' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{config.colYearsInHand || 'Years In-hand'}</span>
                    {isAdmin && isEditingTable && (
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Edit
                      </span>
                    )}
                  </div>
                </th>
                <th className={`py-2.5 px-3 whitespace-nowrap text-center font-bold ${isAdmin && isEditingTable ? 'bg-indigo-50/70 text-indigo-950 border-indigo-200' : ''}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{config.colHoursPerDay || 'Hours per Day'}</span>
                    {isAdmin && isEditingTable && (
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Edit
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center font-bold">
                  {config.colDaysPerMonth || 'Days per Month'}
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center font-bold">
                  {config.colHoursPerMonth || 'Hours per Month'}
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center font-bold">
                  {config.colHoursPerYear || 'Hours per Year'}
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center font-bold bg-[#f3f0fa]/80 text-purple-950">
                  {config.colHoursInHand || 'Hours In-hand'}
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center font-bold bg-[#f3f0fa]/80 text-purple-950">
                  {config.colDaysInHand || 'Days In-hand'}
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center font-bold bg-[#fff4e6] text-amber-950">
                  <div className="flex items-center justify-center gap-1">
                    <span>{config.colEquivalentYears || 'Years In-hand'}</span>
                    <span className="text-[10px] font-normal text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300/60 hidden sm:inline-block">
                      Click to select
                    </span>
                  </div>
                </th>
                {isAdmin && (
                  <th className="py-2.5 px-2 whitespace-nowrap text-center font-semibold text-slate-500 bg-slate-50 w-16">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200">
              {calculatedRows.map((row, idx) => {
                const isSelected = activeRow?.id === row.id;
                const draftRow = isAdmin && isEditingTable 
                  ? tableDraftRows.find((d) => d.id === row.id) || row
                  : null;

                return (
                  <tr 
                    key={row.id} 
                    onClick={() => {
                      if (!isEditingTable) {
                        setSelectedRowId(row.id);
                      }
                    }}
                    className={`transition-colors divide-x divide-slate-200 ${
                      !isEditingTable ? 'cursor-pointer' : ''
                    } ${
                      isSelected 
                        ? 'bg-amber-50/50 text-slate-900 font-medium' 
                        : 'hover:bg-slate-50/70 text-slate-800'
                    }`}
                  >
                    {/* 1. Age (Admin Editable) */}
                    <td className={`py-2 px-2 font-semibold text-slate-900 ${isAdmin && isEditingTable ? 'bg-indigo-50/30' : 'bg-slate-50/40'}`}>
                      {isAdmin && isEditingTable && draftRow ? (
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          value={draftRow.age}
                          onChange={(e) => handleDraftCellChange(row.id, 'age', e.target.value)}
                          className="h-7 w-16 sm:w-20 mx-auto text-center font-bold text-slate-900 bg-white border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-1 py-0.5 text-xs shadow-xs"
                          aria-label={`Age for row ${idx + 1}`}
                        />
                      ) : (
                        row.age
                      )}
                    </td>

                    {/* 2. Up to 60 Years In-hand (Admin Editable) */}
                    <td className={`py-2 px-2 font-medium text-slate-700 ${isAdmin && isEditingTable ? 'bg-indigo-50/30' : ''}`}>
                      {isAdmin && isEditingTable && draftRow ? (
                        <Input
                          type="text"
                          value={draftRow.upTo60}
                          onChange={(e) => handleDraftCellChange(row.id, 'upTo60', e.target.value)}
                          className="h-7 w-20 sm:w-24 mx-auto text-center font-medium text-slate-900 bg-white border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-1 py-0.5 text-xs shadow-xs"
                          aria-label={`Up to 60 for row ${idx + 1}`}
                        />
                      ) : (
                        row.upTo60
                      )}
                    </td>

                    {/* 3. Years In-hand (Admin Editable) */}
                    <td 
                      className={`py-2 px-2 font-semibold transition-colors ${
                        isAdmin && isEditingTable 
                          ? 'bg-indigo-50/30' 
                          : isSelected 
                            ? 'bg-teal-50 text-teal-900 font-bold' 
                            : 'text-slate-900'
                      }`}
                      onClick={(e) => {
                        if (!isEditingTable) {
                          e.stopPropagation();
                          setSelectedRowId(row.id);
                        }
                      }}
                      role={isEditingTable ? undefined : 'button'}
                      tabIndex={isEditingTable ? undefined : 0}
                      aria-pressed={isEditingTable ? undefined : isSelected}
                      aria-label={isEditingTable ? undefined : `Select row with ${row.yearsInHand} years in-hand`}
                      onKeyDown={(e) => {
                        if (!isEditingTable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setSelectedRowId(row.id);
                        }
                      }}
                    >
                      {isAdmin && isEditingTable && draftRow ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={draftRow.yearsInHand}
                          onChange={(e) => handleDraftCellChange(row.id, 'yearsInHand', e.target.value)}
                          className="h-7 w-16 sm:w-20 mx-auto text-center font-bold text-teal-950 bg-white border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-1 py-0.5 text-xs shadow-xs"
                          aria-label={`Years in hand for row ${idx + 1}`}
                        />
                      ) : (
                        row.yearsInHand
                      )}
                    </td>

                    {/* 4. Hours per Day (Admin Editable) */}
                    <td className={`py-2 px-2 text-slate-700 ${isAdmin && isEditingTable ? 'bg-indigo-50/30' : ''}`}>
                      {isAdmin && isEditingTable && draftRow ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="1"
                            max="24"
                            step="0.5"
                            value={draftRow.hoursPerDay}
                            onChange={(e) => handleDraftCellChange(row.id, 'hoursPerDay', e.target.value)}
                            className="h-7 w-14 sm:w-16 text-center font-medium text-slate-900 bg-white border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-1 py-0.5 text-xs shadow-xs"
                            aria-label={`Hours per day for row ${idx + 1}`}
                          />
                          <span className="text-[11px] text-slate-500 font-medium select-none">hrs</span>
                        </div>
                      ) : (
                        `${row.hoursPerDay} hours`
                      )}
                    </td>

                    {/* 5. Days per Month */}
                    <td className="py-2.5 px-3 text-slate-700">
                      {row.daysPerMonth}
                    </td>

                    {/* 6. Hours per Month */}
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {row.hoursPerMonth.toLocaleString()}
                    </td>

                    {/* 7. Hours per Year */}
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {row.hoursPerYear.toLocaleString()}
                    </td>

                    {/* 8. Hours in-hand (Lavender Highlight) */}
                    <td className="py-2.5 px-3 font-semibold bg-[#f3f0fa]/60 text-purple-950">
                      {row.hoursInHand.toLocaleString()}
                    </td>

                    {/* 9. Days In-hand (Lavender Highlight) */}
                    <td 
                      className="py-2.5 px-3 font-semibold bg-[#f3f0fa]/60 text-purple-950"
                      title={`${row.yearsInHand} yrs × ${row.annualDays} annual days = ${Math.round(row.daysInHand)} days`}
                    >
                      {Math.round(row.daysInHand).toLocaleString()}
                    </td>

                    {/* 10. Years in-hand Equivalent (Peach / Orange Highlight with Bold Text) */}
                    <td 
                      className={`py-2.5 px-3 font-bold tracking-tight text-xs sm:text-sm transition-all duration-150 select-none ${
                        isSelected 
                          ? 'bg-amber-200 text-amber-950 font-extrabold ring-2 ring-inset ring-teal-600 shadow-inner' 
                          : 'bg-[#fff4e6] text-slate-950 hover:bg-amber-100/90'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRowId(row.id);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Select ${row.yearsInHandFormatted} years in-hand`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRowId(row.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{row.yearsInHandFormatted}</span>
                        {isSelected && (
                          <span 
                            className="w-2 h-2 rounded-full bg-teal-600 shrink-0 animate-pulse" 
                            title="Active Selection"
                          />
                        )}
                      </div>
                    </td>

                    {/* Admin inline actions */}
                    {isAdmin && (
                      <td className="py-2 px-2 bg-slate-50/80 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditRowModal(row)}
                            className="p-1 text-slate-500 hover:text-teal-600 rounded transition-colors"
                            title="Edit row"
                            aria-label={`Edit row for age ${row.age}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded transition-colors"
                            title="Delete row"
                            aria-label={`Delete row for age ${row.age}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Promotional & Motivational Quotes matching reference screenshot */}
      <div className="pt-2 pb-1 text-center space-y-2 break-words px-2 max-w-full overflow-hidden">
        <p className="text-slate-800 text-xs sm:text-sm md:text-base font-medium break-words">
          {config.quote1 || 'Just give 2 perfect referrals, your life will be settled financially.'}
        </p>

        <p className="text-rose-600 text-xs sm:text-sm md:text-base font-bold flex items-center justify-center gap-1.5 flex-wrap break-words">
          <span>{config.quote2 ? (config.quote2.includes('👈') ? config.quote2.replace('👈', '').trim() : config.quote2.trim()) : ''}</span>
          <span className="text-lg leading-none" role="img" aria-label="point left">👈</span>
        </p>

        <p className="text-slate-900 text-sm sm:text-base md:text-lg font-extrabold tracking-tight break-words">
          {config.quote3 || "Everything is smart nowadays, so why shouldn't earning also be smart?"}
        </p>
      </div>

      {/* 5. Admin Settings Modal */}
      {isAdmin && isEditModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-settings-title"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-600" />
                <h2 id="admin-settings-title" className="text-sm sm:text-base font-bold text-slate-900">
                  Edit In-hand Time Parameters & Labels
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Hours per Day
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={modalHoursPerDay}
                    onChange={(e) => setModalHoursPerDay(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Standard: 8 hours</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Days per Month
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={modalDaysPerMonth}
                    onChange={(e) => setModalDaysPerMonth(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Default: 30 (or 26 in image)</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Months / Year
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={modalMonthsPerYear}
                    onChange={(e) => setModalMonthsPerYear(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Hours / Day Divisor
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={modalHoursInDay}
                    onChange={(e) => setModalHoursInDay(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Days / Year Divisor
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="366"
                    value={modalDaysInYear}
                    onChange={(e) => setModalDaysInYear(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Page Title
                </label>
                <Input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Page Subtitle
                </label>
                <Input
                  type="text"
                  value={modalSubtitle}
                  onChange={(e) => setModalSubtitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-800 block mb-2">Column Header Labels</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">Col 1: Age</label>
                    <Input
                      type="text"
                      value={modalColAge}
                      onChange={(e) => setModalColAge(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Col 2: Up to 60</label>
                    <Input
                      type="text"
                      value={modalColUpTo60}
                      onChange={(e) => setModalColUpTo60(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Col 3: Years In-hand</label>
                    <Input
                      type="text"
                      value={modalColYearsInHand}
                      onChange={(e) => setModalColYearsInHand(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Col 8: Hours In-hand</label>
                    <Input
                      type="text"
                      value={modalColHoursInHand}
                      onChange={(e) => setModalColHoursInHand(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Col 9: Days In-hand</label>
                    <Input
                      type="text"
                      value={modalColDaysInHand}
                      onChange={(e) => setModalColDaysInHand(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Col 10: Equivalent Years</label>
                    <Input
                      type="text"
                      value={modalColEquivalentYears}
                      onChange={(e) => setModalColEquivalentYears(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={handleSaveSettings}
                className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Admin Add / Edit Row Modal */}
      {isAdmin && isAddRowModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-row-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 id="admin-row-modal-title" className="text-sm font-bold text-slate-900">
                {editingRow ? 'Edit Table Row' : 'Add New Table Row'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddRowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Age
                </label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={rowAge}
                  onChange={(e) => {
                    const newAge = Number(e.target.value);
                    setRowAge(newAge);
                    if (newAge > 0 && newAge <= 60) {
                      setRowUpTo60(`${60 - newAge} Y`);
                    }
                  }}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Up to 60 Years In-hand (Label)
                </label>
                <Input
                  type="text"
                  value={rowUpTo60}
                  onChange={(e) => setRowUpTo60(e.target.value)}
                  placeholder="e.g. 20 Y"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Years In-hand (Col 3)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rowYearsInHand}
                  onChange={(e) => setRowYearsInHand(Number(e.target.value))}
                  className="h-8 text-xs"
                />
                <span className="text-[10px] text-slate-500">
                  Number of working years to compute accumulation
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Hours per Day (Col 4)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={rowHoursPerDay}
                  onChange={(e) => setRowHoursPerDay(Number(e.target.value))}
                  className="h-8 text-xs"
                />
                <span className="text-[10px] text-slate-500">
                  Daily working hours for this age group (1–24 hours)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddRowModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveRow}
                className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                {editingRow ? 'Update Row' : 'Add Row'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
