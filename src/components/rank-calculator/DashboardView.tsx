import { 
  Layers, 
  DollarSign, 
  Percent, 
  Coins, 
  TrendingUp, 
  ArrowRight, 
  Download, 
  Upload, 
  RotateCcw,
  ShieldCheck,
  Info,
  Sparkles,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GrandTotals, ComputedRankItem } from '@/types/rank-calculator';
import { formatUSD, formatINR } from '@/lib/rank-calculator-engine';

interface DashboardViewProps {
  grandTotals: GrandTotals;
  computedRanks: ComputedRankItem[];
  onNavigateToRanks: () => void;
  onNavigateToCurrency: () => void;
  onDownloadBackup: () => void;
  onOpenRestoreModal: () => void;
  onOpenResetModal: () => void;
  note: string;
  isAdmin?: boolean;
}

export function DashboardView({
  grandTotals,
  computedRanks,
  onNavigateToRanks,
  onNavigateToCurrency,
  onDownloadBackup,
  onOpenRestoreModal,
  onOpenResetModal,
  note,
  isAdmin = true,
}: DashboardViewProps) {
  const feePercentRatio = grandTotals.totalBasePriceUSD > 0
    ? ((grandTotals.totalNetworkFeeUSD / grandTotals.totalBasePriceUSD) * 100).toFixed(1)
    : '0';

  const avgCostPerRank = grandTotals.totalRanks > 0
    ? grandTotals.totalInvestmentUSD / grandTotals.totalRanks
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Network Business Rank Economics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Network Business Ranks & Investment Overview
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Live calculation engine for multi-tier rank investments. Automatically factors in network gas fees, sequential multi-rank cumulative costs, and real-time USD to INR currency conversions.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Button
              onClick={onNavigateToRanks}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 text-xs h-9 px-4"
            >
              <span>Manage Rank Table</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              onClick={onNavigateToCurrency}
              className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700 text-xs h-9 px-4"
            >
              <Coins className="w-4 h-4 mr-1.5 text-blue-400" />
              <span>Configure Currency Rate</span>
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={onDownloadBackup}
                className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700 text-xs h-9 px-4"
              >
                <Download className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>Download JSON Backup</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 6 Modern Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Total Number of Ranks */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Number of Ranks
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-100">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {grandTotals.totalRanks} <span className="text-sm font-medium text-slate-500">Tiers</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active sequential ranks in structure
            </p>
          </div>
        </div>

        {/* Card 2: Total Base Price (USD) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Base Price (USD)
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {formatUSD(grandTotals.totalBasePriceUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Combined raw base price before fees
            </p>
          </div>
        </div>

        {/* Card 3: Total Network Fees (USD) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Network Fees (USD)
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-900">
              {formatUSD(grandTotals.totalNetworkFeeUSD)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cumulative gas/protocol fees (~{feePercentRatio}%)
            </p>
          </div>
        </div>

        {/* Card 4: Total Investment Including Fees (USD) */}
        <div className="bg-white rounded-xl border-2 border-blue-900/40 p-5 shadow-xs hover:border-blue-900 hover:shadow-md transition bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Total Investment (USD)
            </span>
            <div className="p-2 rounded-lg bg-blue-900 text-white shadow-xs">
              <DollarSign className="w-4 h-4 text-blue-200" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-950">
              {formatUSD(grandTotals.totalInvestmentUSD)}
            </div>
            <p className="text-xs text-blue-700 font-medium mt-1">
              Grand total USD for all ranks
            </p>
          </div>
        </div>

        {/* Card 5: Total Investment Including Fees (INR) */}
        <div className="bg-white rounded-xl border-2 border-emerald-600/40 p-5 shadow-xs hover:border-emerald-600 hover:shadow-md transition bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Total Investment (INR)
            </span>
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Coins className="w-4 h-4 text-emerald-100" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-950">
              {formatINR(grandTotals.totalInvestmentINR)}
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Calculated at rate ₹{grandTotals.exchangeRate.toFixed(2)} / USD
            </p>
          </div>
        </div>

        {/* Card 6: Current USD-to-INR Exchange Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              USD-to-INR Exchange Rate
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              ₹{grandTotals.exchangeRate.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Authoritative manual entry</span>
              <button 
                type="button" 
                onClick={onNavigateToCurrency} 
                className="text-blue-900 font-semibold hover:underline ml-1"
              >
                Change →
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Two Column Section: Quick Tier Breakdown & Backup/Restore Center */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Quick Rank Snapshot Table */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Rank Structure Snapshot</h2>
              <p className="text-xs text-slate-500">Summary progression of active ranks</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToRanks}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:text-slate-900"
            >
              <span>View Full Ranks Table</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3 text-right">Base USD</th>
                  <th className="py-2.5 px-3 text-right">Total USD</th>
                  <th className="py-2.5 px-3 text-right">Cumulative USD</th>
                  <th className="py-2.5 px-3 text-right">Cumulative INR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {computedRanks.slice(0, 7).map((rank) => (
                  <tr key={rank.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      <span className="inline-block w-5 text-slate-400 text-[11px] font-mono">
                        {rank.serialNumber}.
                      </span>
                      {rank.name}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {formatUSD(rank.basePrice)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                      {formatUSD(rank.totalRankCostUSD)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                      {formatUSD(rank.cumulativeTotalUSD)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/20">
                      {formatINR(rank.cumulativeTotalINR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {computedRanks.length > 7 && (
            <div className="text-center pt-1 text-xs text-slate-500">
              Showing first 7 of {computedRanks.length} ranks. Visit the{' '}
              <button 
                type="button" 
                onClick={onNavigateToRanks} 
                className="text-blue-900 font-semibold hover:underline"
              >
                Ranks tab
              </button>{' '}
              to manage all ranks.
            </div>
          )}

          {/* Note Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{note}</p>
          </div>
        </div>

        {/* Right Column (1 Col): Backup, Data Management & Storage Policy (Admin Only) */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-900" />
                <h2 className="text-sm font-bold text-slate-900">Data Management & Backup</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Safeguard and transfer your calculation setup
              </p>
            </div>

            <div className="space-y-2.5">
              <Button
                onClick={onDownloadBackup}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 justify-start"
              >
                <Download className="w-4 h-4 mr-2 text-blue-400" />
                <span>Download Full JSON Backup</span>
              </Button>

              <Button
                variant="outline"
                onClick={onOpenRestoreModal}
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-9 justify-start"
              >
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                <span>Restore from Backup</span>
              </Button>

              <Button
                variant="outline"
                onClick={onOpenResetModal}
                className="w-full border-red-200 text-red-700 hover:bg-red-50 text-xs h-9 justify-start"
              >
                <RotateCcw className="w-4 h-4 mr-2 text-red-500" />
                <span>Reset to Sample Defaults</span>
              </Button>
            </div>

            {/* Local Storage Documentation Notice */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <ShieldCheck className="w-4 h-4 text-blue-800" />
                <span>Browser Persistence Notice</span>
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Your rank configurations, prices, fee percentages, and exchange rates are automatically saved in this browser&apos;s <strong>localStorage</strong>.
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Data is private to your current browser and does not automatically synchronize across different devices. Use the <strong>Download Full Backup</strong> button to transfer data between computers.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Avg Cost / Rank:</span>
                <span className="font-mono font-semibold text-slate-900">{formatUSD(avgCostPerRank)}</span>
              </div>
              <div className="flex justify-between">
                <span>Base vs Fees:</span>
                <span className="font-mono font-semibold text-slate-900">{(100 - parseFloat(feePercentRatio)).toFixed(1)}% / {feePercentRatio}%</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
