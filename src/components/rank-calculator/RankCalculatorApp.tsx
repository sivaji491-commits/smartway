import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RankCalculatorState,
  RankItem,
  ActiveTab,
  SaveStatus,
  BackupData
} from '@/types/rank-calculator';
import {
  computeRankTotals,
  computeGrandTotals,
  generateNextRankName,
  exportRanksToCSV
} from '@/lib/rank-calculator-engine';
import {
  loadRankCalculatorState,
  saveRankCalculatorState,
  resetRankCalculatorToDefault
} from '@/lib/rank-storage';

import { NavigationHeader } from './NavigationHeader';
import { ConfigurationDropdown } from './ConfigurationDropdown';
import { DashboardView } from './DashboardView';
import { RanksTableView } from './RanksTableView';
import { CurrencySettingsView } from './CurrencySettingsView';
import { AddEditRankModal } from './AddEditRankModal';
import { CsvImportModal } from './CsvImportModal';
import { JsonRestoreModal } from './JsonRestoreModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { DeleteRankConfirmModal } from './DeleteRankConfirmModal';
import { CheckCircle2 } from 'lucide-react';
import { isUserAdminOrOwner, getUserAllowedTabs } from '@/lib/permissions';

export interface RankCalculatorAppProps {
  initialTab?: ActiveTab;
  embedded?: boolean;
  isAdmin?: boolean;
  initialOpenConfig?: boolean;
  allowedTabs?: string[] | undefined;
}

export function RankCalculatorApp({
  initialTab = 'ranks',
  embedded = false,
  isAdmin: propIsAdmin,
  initialOpenConfig = false,
  allowedTabs: propAllowedTabs,
}: RankCalculatorAppProps = {}) {
  const [state, setState] = useState<RankCalculatorState>(() => loadRankCalculatorState());
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab === 'configuration' ? 'ranks' : initialTab);
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(
    initialOpenConfig || initialTab === 'configuration'
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexora_ranks_updated'));
    }
  }, [state.ranks.length]);

  // Compute whether active user is an admin
  const isAdmin = useMemo(() => {
    if (typeof propIsAdmin === 'boolean') {
      return propIsAdmin;
    }
    if (typeof window === 'undefined') {
      return true;
    }
    const previewEmail = window.localStorage.getItem('nexora-preview-user-email');
    const userEmail = window.localStorage.getItem('nexora-user-email');
    const effectiveEmail = previewEmail || userEmail;

    if (effectiveEmail) {
      return isUserAdminOrOwner(effectiveEmail, 'sivaji491@gmail.com');
    }
    const role = window.localStorage.getItem('nexora-user-role');
    if (role && (role.toLowerCase() === 'owner' || role.toLowerCase() === 'admin')) {
      return true;
    }
    return false;
  }, [propIsAdmin]);

  // Derive allowedTabs from active user login session if not explicitly provided as prop
  const allowedTabs = useMemo(() => {
    if (propAllowedTabs) return propAllowedTabs;
    if (typeof window === 'undefined') return undefined;
    const previewEmail = window.localStorage.getItem('nexora-preview-user-email');
    const userEmail = window.localStorage.getItem('nexora-user-email');
    const effectiveEmail = previewEmail || userEmail;
    if (effectiveEmail) {
      return getUserAllowedTabs(effectiveEmail);
    }
    return undefined;
  }, [propAllowedTabs]);

  useEffect(() => {
    if (allowedTabs && allowedTabs.length > 0) {
      if (initialTab && allowedTabs.includes(initialTab)) {
        if (initialTab === 'configuration') {
          setActiveTab('ranks');
          setIsConfigDropdownOpen(true);
        } else {
          setActiveTab(initialTab);
        }
        return;
      }
      if (allowedTabs.includes('ranks')) {
        setActiveTab('ranks');
      } else if (allowedTabs.includes('currency')) {
        setActiveTab('currency');
      }
      return;
    }

    if (initialTab === 'configuration') {
      setActiveTab('ranks');
      setIsConfigDropdownOpen(true);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, allowedTabs]);

  const handleTabChange = (tab: ActiveTab) => {
    if (allowedTabs && allowedTabs.length > 0) {
      if (tab === 'configuration' && !allowedTabs.includes('configuration')) return;
      if (tab === 'currency' && !allowedTabs.includes('currency')) return;
      if (tab === 'ranks' && !allowedTabs.includes('ranks')) return;
    }
    if (tab === 'configuration') {
      setActiveTab('ranks');
      setIsConfigDropdownOpen(true);
    } else {
      setActiveTab(tab);
      if (tab !== 'ranks') {
        setIsConfigDropdownOpen(false);
      }
    }
  };

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [rankToEdit, setRankToEdit] = useState<RankItem | null>(null);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [isRestoreJsonOpen, setIsRestoreJsonOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [rankToDelete, setRankToDelete] = useState<RankItem | null>(null);

  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Auto-Save Effect with Debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const ok = saveRankCalculatorState(state);
      setSaveStatus(ok ? 'saved' : 'error');
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [state]);

  // Derived Computed Ranks and Grand Totals (Single Source of Truth)
  const computedRanks = useMemo(() => {
    return computeRankTotals(state.ranks, state.currency.exchangeRateUSDToINR);
  }, [state.ranks, state.currency.exchangeRateUSDToINR]);

  const grandTotals = useMemo(() => {
    return computeGrandTotals(computedRanks, state.currency.exchangeRateUSDToINR);
  }, [computedRanks, state.currency.exchangeRateUSDToINR]);

  // Suggested next rank name (e.g. PBA 8)
  const suggestedRankName = useMemo(() => {
    return generateNextRankName(state.ranks);
  }, [state.ranks]);

  // Rank CRUD Handlers
  const handleSaveRank = (rankData: Omit<RankItem, 'id' | 'order'>, rankId?: string) => {
    if (rankId) {
      // Edit existing rank
      setState((prev) => ({
        ...prev,
        ranks: prev.ranks.map((r) =>
          r.id === rankId ? { ...r, ...rankData } : r
        ),
      }));
      showToast(`Rank "${rankData.name}" updated successfully.`);
    } else {
      // Add new rank
      const newRank: RankItem = {
        id: `rank-${Date.now()}`,
        name: rankData.name,
        basePrice: rankData.basePrice,
        networkFeePercent: rankData.networkFeePercent,
        order: state.ranks.length + 1,
      };
      setState((prev) => ({
        ...prev,
        ranks: [...prev.ranks, newRank],
      }));
      showToast(`Added rank "${rankData.name}" to structure.`);
    }
  };

  const handleDeleteRankConfirm = (rankId: string) => {
    setState((prev) => {
      const remaining = prev.ranks.filter((r) => r.id !== rankId);
      // Re-normalize order
      const normalized = remaining.map((r, idx) => ({ ...r, order: idx + 1 }));
      return {
        ...prev,
        ranks: normalized,
      };
    });
    showToast('Rank deleted. Cumulative totals recalculated.');
  };

  const handleMoveRank = (rankId: string, direction: 'up' | 'down') => {
    const sorted = [...state.ranks].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((r) => r.id === rankId);
    if (index === -1) return;

    const currentItem = sorted[index];
    if (!currentItem) return;

    if (direction === 'up' && index > 0) {
      const prevItem = sorted[index - 1];
      if (prevItem) {
        const temp = prevItem.order;
        prevItem.order = currentItem.order;
        currentItem.order = temp;
      }
    } else if (direction === 'down' && index < sorted.length - 1) {
      const nextItem = sorted[index + 1];
      if (nextItem) {
        const temp = nextItem.order;
        nextItem.order = currentItem.order;
        currentItem.order = temp;
      }
    }

    // Sort again and normalize order
    sorted.sort((a, b) => a.order - b.order);
    const normalized = sorted.map((r, idx) => ({ ...r, order: idx + 1 }));

    setState((prev) => ({
      ...prev,
      ranks: normalized,
    }));
    showToast('Rank sequence updated. Cumulative order recalculated.');
  };

  // Currency & Fee & Notes Handlers
  const handleUpdateExchangeRate = (newRate: number) => {
    setState((prev) => ({
      ...prev,
      currency: {
        exchangeRateUSDToINR: newRate,
        lastUpdated: new Date().toISOString(),
      },
    }));
    showToast(`Exchange rate set to ₹${newRate.toFixed(2)}/USD. INR totals recalculated.`);
  };

  const handleUpdateFeePercent = (newFeePercent: number) => {
    setState((prev) => ({
      ...prev,
      ranks: prev.ranks.map((r) => ({
        ...r,
        networkFeePercent: newFeePercent,
      })),
    }));
    showToast(`Network fee updated to ${newFeePercent}% across all ranks.`);
  };

  const handleUpdateRankName = (rankId: string, newName: string) => {
    setState((prev) => ({
      ...prev,
      ranks: prev.ranks.map((r) =>
        r.id === rankId ? { ...r, name: newName } : r
      ),
    }));
  };

  const handleUpdateRankBasePrice = (rankId: string, newPrice: number) => {
    setState((prev) => ({
      ...prev,
      ranks: prev.ranks.map((r) =>
        r.id === rankId ? { ...r, basePrice: Math.max(0, newPrice) } : r
      ),
    }));
  };

  const handleUpdateNotes = (newPrimaryNote: string, newSecNote?: string) => {
    setState((prev) => ({
      ...prev,
      note: newPrimaryNote,
      secondaryNote: newSecNote || '',
    }));
    showToast('Table notes saved successfully.');
  };

  // CSV Export & Import Handlers
  const handleExportCSV = () => {
    const csv = exportRanksToCSV(computedRanks);
    const dateStr = new Date().toISOString().split('T')[0];
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rank-calculator-export-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV export downloaded successfully.');
  };

  const handleImportCSVConfirm = (importedRanks: RankItem[]) => {
    setState((prev) => ({
      ...prev,
      ranks: importedRanks.map((r, idx) => ({ ...r, order: idx + 1 })),
    }));
    showToast(`Imported ${importedRanks.length} ranks successfully from CSV!`);
  };

  // JSON Full Backup & Restore Handlers
  const handleDownloadBackup = () => {
    const backup: BackupData = {
      schemaVersion: '1.0',
      exportTimestamp: new Date().toISOString(),
      currency: state.currency,
      ranks: state.ranks,
      note: state.note,
      secondaryNote: state.secondaryNote,
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rank-calculator-backup-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Full JSON backup archive downloaded.');
  };

  const handleRestoreConfirm = (backupData: BackupData) => {
    setState({
      ranks: backupData.ranks,
      currency: backupData.currency,
      note: backupData.note,
      secondaryNote: backupData.secondaryNote ?? '',
    });
    showToast(`Successfully restored ${backupData.ranks.length} ranks from backup archive!`);
  };

  // Reset to default
  const handleResetConfirm = () => {
    const reset = resetRankCalculatorToDefault();
    setState(reset);
    showToast('Application reset to factory sample 7 ranks and ₹100 exchange rate.');
  };

  return (
    <div className={embedded ? "w-full text-slate-900 font-sans flex flex-col" : "min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900"}>
      {/* Top Navigation Bar with Ranks, Currency Settings, and Configuration Settings Dropdown (Standalone Mode only) */}
      {!embedded && (
        <NavigationHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          saveStatus={saveStatus}
          exchangeRate={state.currency.exchangeRateUSDToINR}
          totalRanks={state.ranks.length}
          onDownloadBackup={handleDownloadBackup}
          computedRanks={computedRanks}
          onUpdateExchangeRate={handleUpdateExchangeRate}
          onUpdateFeePercent={handleUpdateFeePercent}
          onUpdateRankName={handleUpdateRankName}
          onOpenResetModal={() => setIsResetOpen(true)}
          isConfigOpen={isConfigDropdownOpen}
          onToggleConfig={() => setIsConfigDropdownOpen((prev) => !prev)}
          isAdmin={isAdmin}
          embedded={embedded}
          allowedTabs={allowedTabs}
        />
      )}

      {/* Embedded Configuration Dropdown Overlay (Admin Config Mode) */}
      {embedded && isConfigDropdownOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-14 bg-black/20 backdrop-blur-2xs">
          <ConfigurationDropdown
            isOpen={isConfigDropdownOpen}
            onClose={() => setIsConfigDropdownOpen(false)}
            computedRanks={computedRanks}
            exchangeRate={state.currency.exchangeRateUSDToINR}
            onUpdateExchangeRate={handleUpdateExchangeRate}
            onUpdateFeePercent={handleUpdateFeePercent}
            onUpdateRankName={handleUpdateRankName}
            onOpenResetModal={() => setIsResetOpen(true)}
            dropdownAlign="right"
          />
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-3 duration-200"
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Tab Content - Full Width Table Display */}
      <main className={embedded ? "flex-1 w-full mx-auto py-0.5 sm:py-1" : "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"}>
        {activeTab === 'dashboard' && (
          <DashboardView
            grandTotals={grandTotals}
            computedRanks={computedRanks}
            onNavigateToRanks={() => setActiveTab('ranks')}
            onNavigateToCurrency={() => setActiveTab('currency')}
            onDownloadBackup={handleDownloadBackup}
            onOpenRestoreModal={() => setIsRestoreJsonOpen(true)}
            onOpenResetModal={() => setIsResetOpen(true)}
            note={state.note}
            isAdmin={isAdmin}
          />
        )}

        {(activeTab === 'ranks' || activeTab === 'configuration') && (
          <RanksTableView
            computedRanks={computedRanks}
            grandTotals={grandTotals}
            exchangeRate={state.currency.exchangeRateUSDToINR}
            note={state.note}
            secondaryNote={state.secondaryNote}
            isAdmin={isAdmin}
            onUpdateExchangeRate={handleUpdateExchangeRate}
            onUpdateFeePercent={handleUpdateFeePercent}
            onUpdateRankName={handleUpdateRankName}
            onUpdateRankBasePrice={handleUpdateRankBasePrice}
            onOpenConfigDropdown={() => setIsConfigDropdownOpen(true)}
            onAddRank={() => {
              setRankToEdit(null);
              setIsAddEditOpen(true);
            }}
            onEditRank={(rank) => {
              setRankToEdit(rank);
              setIsAddEditOpen(true);
            }}
            onDeleteRank={(rank) => {
              setRankToDelete(rank);
            }}
            onMoveRank={handleMoveRank}
            onExportCSV={handleExportCSV}
            onOpenImportCSVModal={() => setIsImportCSVOpen(true)}
            onOpenResetModal={() => setIsResetOpen(true)}
            onNavigateToCurrency={() => setActiveTab('currency')}
          />
        )}

        {activeTab === 'currency' && (
          <CurrencySettingsView
            currency={state.currency}
            note={state.note}
            secondaryNote={state.secondaryNote}
            isAdmin={isAdmin}
            onUpdateExchangeRate={handleUpdateExchangeRate}
            onUpdateNotes={handleUpdateNotes}
            onDownloadBackup={handleDownloadBackup}
            onOpenRestoreModal={() => setIsRestoreJsonOpen(true)}
            onOpenResetModal={() => setIsResetOpen(true)}
          />
        )}
      </main>

      {/* App Footer */}
      {!embedded && (
        <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} RankMaster · Professional Network Rank & Cost Calculator</p>
            <p className="text-[11px] text-slate-400">
              Precision 2-decimal arithmetic · 3% Default Protocol Fee · Indian Rupee Number Formatting
            </p>
          </div>
        </footer>
      )}

      {/* Modals */}
      <AddEditRankModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setRankToEdit(null);
        }}
        onSave={handleSaveRank}
        rankToEdit={rankToEdit}
        suggestedName={suggestedRankName}
        defaultFeePercent={3}
      />

      <CsvImportModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
        onImportConfirm={handleImportCSVConfirm}
        currentRankCount={state.ranks.length}
      />

      <JsonRestoreModal
        isOpen={isRestoreJsonOpen}
        onClose={() => setIsRestoreJsonOpen(false)}
        onRestoreConfirm={handleRestoreConfirm}
        onDownloadSafetyBackup={handleDownloadBackup}
        currentRankCount={state.ranks.length}
      />

      <ResetConfirmModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirmReset={handleResetConfirm}
        onDownloadSafetyBackup={handleDownloadBackup}
      />

      <DeleteRankConfirmModal
        isOpen={!!rankToDelete}
        onClose={() => setRankToDelete(null)}
        onConfirmDelete={handleDeleteRankConfirm}
        rank={rankToDelete}
      />
    </div>
  );
}
