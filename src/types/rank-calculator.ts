export interface RankItem {
  id: string;
  name: string;
  basePrice: number;
  networkFeePercent: number; // default 3
  order: number;
}

export interface ComputedRankItem extends RankItem {
  serialNumber: number;
  networkFeeUSD: number;
  totalRankCostUSD: number;
  cumulativeTotalUSD: number;
  cumulativeTotalINR: number;
}

export interface CurrencySettings {
  exchangeRateUSDToINR: number; // default 100
  lastUpdated: string;
}

export interface RankCalculatorState {
  ranks: RankItem[];
  currency: CurrencySettings;
  note: string;
  secondaryNote?: string | undefined;
}

export interface GrandTotals {
  totalRanks: number;
  totalBasePriceUSD: number;
  totalNetworkFeeUSD: number;
  totalInvestmentUSD: number;
  totalInvestmentINR: number;
  exchangeRate: number;
}

export interface BackupData {
  schemaVersion: string;
  exportTimestamp: string;
  currency: CurrencySettings;
  ranks: RankItem[];
  note: string;
  secondaryNote?: string | undefined;
  preferences?: Record<string, unknown> | undefined;
}

export type ActiveTab = 'dashboard' | 'ranks' | 'currency' | 'configuration';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
