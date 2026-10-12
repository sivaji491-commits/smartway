import { useState } from 'react';
import {
  Layers,
  Coins,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Download,
  Sliders,
  ChevronDown,
  LogIn,
  UserCheck
} from 'lucide-react';
import { ActiveTab, SaveStatus, ComputedRankItem } from '@/types/rank-calculator';
import { Button } from '@/components/ui/button';
import { ConfigurationDropdown } from './ConfigurationDropdown';

interface NavigationHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  saveStatus: SaveStatus;
  exchangeRate: number;
  totalRanks: number;
  onDownloadBackup: () => void;
  computedRanks?: ComputedRankItem[] | undefined;
  onUpdateExchangeRate?: ((rate: number) => void) | undefined;
  onUpdateFeePercent?: ((feePercent: number) => void) | undefined;
  onUpdateRankName?: ((rankId: string, newName: string) => void) | undefined;
  onOpenResetModal?: (() => void) | undefined;
  isConfigOpen?: boolean | undefined;
  onToggleConfig?: (() => void) | undefined;
  isAdmin?: boolean;
  embedded?: boolean;
  allowedTabs?: string[] | undefined;
}

export function NavigationHeader({
  activeTab,
  onTabChange,
  saveStatus,
  exchangeRate,
  totalRanks,
  onDownloadBackup,
  computedRanks = [],
  onUpdateExchangeRate,
  onUpdateFeePercent,
  onUpdateRankName,
  onOpenResetModal,
  isConfigOpen,
  onToggleConfig,
  isAdmin = true,
  embedded = false,
  allowedTabs,
}: NavigationHeaderProps) {
  // When embedded in workspace layout (/maintenance), this duplicate header strip is removed
  if (embedded) {
    return null;
  }

  const [internalConfigOpen, setInternalConfigOpen] = useState(false);
  const isDropdownOpen = isConfigOpen !== undefined ? isConfigOpen : internalConfigOpen;

  const canAccessRanks = !allowedTabs || allowedTabs.includes('ranks');
  const canAccessCurrency = !allowedTabs || allowedTabs.includes('currency');
  const canAccessConfig = isAdmin && (!allowedTabs || allowedTabs.includes('configuration'));

  const handleToggle = () => {
    if (onToggleConfig) {
      onToggleConfig();
    } else {
      setInternalConfigOpen((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (onToggleConfig) {
      if (isDropdownOpen) onToggleConfig();
    } else {
      setInternalConfigOpen(false);
    }
  };

  return (
    <header className={embedded ? "relative bg-white border border-slate-200/80 rounded-xl shadow-2xs mb-2" : "sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs"}>
      <div className={embedded ? "w-full px-3 sm:px-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        <div className={`flex items-center justify-between ${embedded ? "h-11 sm:h-12" : "h-16"}`}>
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`${embedded ? "w-7 h-7 rounded-lg" : "w-10 h-10 rounded-xl"} bg-[#0b1e36] text-white flex items-center justify-center shadow-xs shrink-0`}>
              <Layers className={`${embedded ? "w-3.5 h-3.5" : "w-5 h-5"} text-emerald-400`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`font-bold ${embedded ? "text-xs sm:text-sm" : "text-base"} text-slate-900 tracking-tight`}>
                  Business Plan
                </span>
                <span className={`${embedded ? "text-[9px] px-1.5 py-0" : "text-[10px] px-2 py-0.5"} font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200`}>
                  Calculator
                </span>
              </div>
              {!embedded && (
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Rank Price & Multi-Tier Accumulation Model
                </p>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Ranks, Currency Settings, Configuration Settings) */}
          <nav className={`flex items-center gap-1 bg-slate-100/90 ${embedded ? "p-0.5 rounded-lg" : "p-1 rounded-xl"} border border-slate-200/80`} aria-label="Tabs">
            {canAccessRanks && (
              <button
                type="button"
                onClick={() => onTabChange('ranks')}
                className={`flex items-center gap-1.5 ${embedded ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs"} rounded-lg font-semibold transition-all relative ${activeTab === 'ranks'
                    ? 'bg-[#10b981] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                <Layers className="w-4 h-4" />
                <span>Ranks</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'ranks' ? 'bg-[#047857] text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                  {totalRanks}
                </span>
              </button>
            )}

            {canAccessCurrency && (
              <button
                type="button"
                onClick={() => onTabChange('currency')}
                className={`flex items-center gap-1.5 ${embedded ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs"} rounded-lg font-semibold transition-all ${activeTab === 'currency'
                    ? 'bg-[#10b981] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
              >
                <Coins className={embedded ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span>Currency Settings</span>
              </button>
            )}

            {/* Configuration Settings Nav Field with Dropdown (Admin Only) */}
            {canAccessConfig && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleToggle}
                  className={`flex items-center gap-1.5 ${embedded ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"} rounded-lg font-semibold transition-all relative ${isDropdownOpen || activeTab === 'configuration'
                      ? 'bg-[#10b981] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  aria-expanded={isDropdownOpen}
                  title="Configuration Settings"
                >
                  <Sliders className={`${embedded ? "w-3.5 h-3.5" : "w-4 h-4"} ${isDropdownOpen || activeTab === 'configuration' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Configuration Settings</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                </button>

                <ConfigurationDropdown
                  isOpen={isDropdownOpen}
                  onClose={handleClose}
                  computedRanks={computedRanks}
                  exchangeRate={exchangeRate}
                  onUpdateExchangeRate={onUpdateExchangeRate}
                  onUpdateFeePercent={onUpdateFeePercent}
                  onUpdateRankName={onUpdateRankName}
                  onOpenResetModal={onOpenResetModal}
                  dropdownAlign="right"
                />
              </div>
            )}
          </nav>

          {/* Right Header Status & Actions */}
          <div className={`flex items-center ${embedded ? "gap-2" : "gap-3"}`}>
            {/* Live Exchange Rate Pill */}
            {canAccessCurrency && (
              <div
                onClick={() => onTabChange('currency')}
                className={`hidden md:flex items-center gap-1.5 ${embedded ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"} rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-900 font-semibold cursor-pointer hover:bg-emerald-100 transition`}
                title="Click to configure exchange rate"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-normal text-emerald-800">1 USD =</span>
                <span className="font-mono font-bold text-emerald-950">₹{exchangeRate.toFixed(2)}</span>
              </div>
            )}

            {/* Auto-Save Status Badge (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center">
                {saveStatus === 'saving' && (
                  <div className={`flex items-center gap-1.5 text-xs font-medium text-slate-500 ${embedded ? "px-1.5 py-0.5" : "px-2 py-1"} rounded-md bg-slate-50 border border-slate-200`}>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className={`flex items-center gap-1.5 text-xs font-medium text-emerald-700 ${embedded ? "px-1.5 py-0.5" : "px-2 py-1"} rounded-md bg-emerald-50 border border-emerald-200`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">All changes saved</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className={`flex items-center gap-1.5 text-xs font-medium text-red-700 ${embedded ? "px-1.5 py-0.5" : "px-2 py-1"} rounded-md bg-red-50 border border-red-200`}>
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="hidden sm:inline">Save failed</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Backup Download button (Admin Only) */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadBackup}
                title="Download Full JSON Backup"
                className={`hidden lg:flex items-center gap-1.5 ${embedded ? "h-7 text-xs px-2" : "h-8 text-xs px-2.5"} border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100`}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Backup</span>
              </Button>
            )}

            {/* User Login / Workspace Access Link (Standalone Mode) */}
            {!embedded && (
              <a
                href={typeof window !== 'undefined' && (window.localStorage.getItem('nexora-user-email') || window.localStorage.getItem('nexora-preview-user-email')) ? "/maintenance" : "/auth"}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                title={typeof window !== 'undefined' && (window.localStorage.getItem('nexora-user-email') || window.localStorage.getItem('nexora-preview-user-email')) ? "Workspace Dashboard" : "Sign in with User Login"}
              >
                {typeof window !== 'undefined' && (window.localStorage.getItem('nexora-user-email') || window.localStorage.getItem('nexora-preview-user-email')) ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Workspace</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-slate-600" />
                    <span>User Login</span>
                  </>
                )}
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
