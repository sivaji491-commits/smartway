import { 
  RankItem, 
  ComputedRankItem, 
  CurrencySettings, 
  GrandTotals, 
  BackupData 
} from '@/types/rank-calculator';

export const DEFAULT_RANKS: RankItem[] = [
  { id: 'pba-1', name: 'PBA 1', basePrice: 100, networkFeePercent: 3, order: 1 },
  { id: 'pba-2', name: 'PBA 2', basePrice: 300, networkFeePercent: 3, order: 2 },
  { id: 'pba-3', name: 'PBA 3', basePrice: 600, networkFeePercent: 3, order: 3 },
  { id: 'pba-4', name: 'PBA 4', basePrice: 1000, networkFeePercent: 3, order: 4 },
  { id: 'pba-5', name: 'PBA 5', basePrice: 1000, networkFeePercent: 3, order: 5 },
  { id: 'pba-6', name: 'PBA 6', basePrice: 1000, networkFeePercent: 3, order: 6 },
  { id: 'pba-7', name: 'PBA 7', basePrice: 1000, networkFeePercent: 3, order: 7 },
];

export const DEFAULT_CURRENCY: CurrencySettings = {
  exchangeRateUSDToINR: 100,
  lastUpdated: new Date().toISOString(),
};

export const DEFAULT_NOTE = 
  'Network fees are calculated using the configured percentage. Rank costs and cumulative totals are estimates based on the entered prices and exchange rate.';

export const DEFAULT_SECONDARY_NOTE = 
  'Note: 3% Gas fee and rank purchasing is orderwise only · 365 days validity (no need to purchase it again, Refer equal/PBA 3)';

/**
 * High-precision rounding to 2 decimal places to avoid IEEE-754 floating-point drift
 */
export function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates derived rank values and running cumulative totals in sequence
 */
export function computeRankTotals(ranks: RankItem[], exchangeRate: number): ComputedRankItem[] {
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;
  
  // Sort by order ascending
  const sorted = [...ranks].sort((a, b) => a.order - b.order);

  let runningCumulativeUSD = 0;

  return sorted.map((rank, index) => {
    const serialNumber = index + 1;
    const basePrice = Math.max(0, Number(rank.basePrice) || 0);
    const feePercent = Math.max(0, Number(rank.networkFeePercent) || 0);

    const networkFeeUSD = round2(basePrice * (feePercent / 100));
    const totalRankCostUSD = round2(basePrice + networkFeeUSD);
    
    runningCumulativeUSD = round2(runningCumulativeUSD + totalRankCostUSD);
    const cumulativeTotalUSD = runningCumulativeUSD;
    const cumulativeTotalINR = round2(cumulativeTotalUSD * safeRate);

    return {
      ...rank,
      basePrice,
      networkFeePercent: feePercent,
      serialNumber,
      networkFeeUSD,
      totalRankCostUSD,
      cumulativeTotalUSD,
      cumulativeTotalINR,
    };
  });
}

/**
 * Computes dashboard grand totals across all ranks
 */
export function computeGrandTotals(computedRanks: ComputedRankItem[], exchangeRate: number): GrandTotals {
  const safeRate = Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 100;

  if (computedRanks.length === 0) {
    return {
      totalRanks: 0,
      totalBasePriceUSD: 0,
      totalNetworkFeeUSD: 0,
      totalInvestmentUSD: 0,
      totalInvestmentINR: 0,
      exchangeRate: safeRate,
    };
  }

  const totalBasePriceUSD = round2(
    computedRanks.reduce((acc, r) => acc + r.basePrice, 0)
  );
  const totalNetworkFeeUSD = round2(
    computedRanks.reduce((acc, r) => acc + r.networkFeeUSD, 0)
  );
  
  // The grand total matches the cumulative total of the last rank
  const lastRank = computedRanks[computedRanks.length - 1];
  const totalInvestmentUSD = lastRank ? lastRank.cumulativeTotalUSD : 0;
  const totalInvestmentINR = lastRank ? lastRank.cumulativeTotalINR : 0;

  return {
    totalRanks: computedRanks.length,
    totalBasePriceUSD,
    totalNetworkFeeUSD,
    totalInvestmentUSD,
    totalInvestmentINR,
    exchangeRate: safeRate,
  };
}

/**
 * Formats a number as USD currency: $1,000.00
 */
export function formatUSD(val: number): string {
  const safe = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

/**
 * Formats a number as INR with Indian numbering system: ₹1,03,000.00
 */
export function formatINR(val: number): string {
  const safe = Number.isFinite(val) ? val : 0;
  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
    return formatted.replace(/\u00A0/g, ' '); // Clean non-breaking space
  } catch {
    return `₹${safe.toFixed(2)}`;
  }
}

/**
 * Formats a percentage value: 3% or 3.5%
 */
export function formatPercent(val: number): string {
  const safe = Number.isFinite(val) ? val : 0;
  return `${safe % 1 === 0 ? safe : safe.toFixed(1)}%`;
}

/**
 * Generates sensible next rank name based on existing ranks
 */
export function generateNextRankName(existingRanks: RankItem[]): string {
  let maxPbaNum = 0;
  for (const r of existingRanks) {
    const match = r.name.match(/PBA\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1] || '0', 10);
      if (num > maxPbaNum) maxPbaNum = num;
    }
  }

  if (maxPbaNum > 0) {
    return `PBA ${maxPbaNum + 1}`;
  }
  return `Rank ${existingRanks.length + 1}`;
}

/**
 * Formats date to a human readable format: Today at 5:30 PM
 */
export function formatLastUpdated(isoString?: string): string {
  if (!isoString) return 'Recently';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Exports ranks data to CSV string with all calculated USD and INR totals
 */
export function exportRanksToCSV(computedRanks: ComputedRankItem[]): string {
  const headers = [
    'S.No.',
    'Rank Name',
    'Base Price (USD)',
    'Network Fee (%)',
    'Network Fee (USD)',
    'Total Rank Cost (USD)',
    'Cumulative Total (USD)',
    'Cumulative Total (INR)',
  ];

  const escapeCSV = (str: string | number) => {
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = computedRanks.map((r) => [
    r.serialNumber,
    escapeCSV(r.name),
    r.basePrice.toFixed(2),
    `${r.networkFeePercent}%`,
    r.networkFeeUSD.toFixed(2),
    r.totalRankCostUSD.toFixed(2),
    r.cumulativeTotalUSD.toFixed(2),
    r.cumulativeTotalINR.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

export interface CSVParseResult {
  success: boolean;
  ranks?: RankItem[];
  errors: string[];
  warnings: string[];
}

/**
 * Parses and validates CSV string into RankItem array
 */
export function parseRanksFromCSV(csvContent: string): CSVParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      errors: ['CSV file is empty or missing data rows.'],
      warnings,
    };
  }

  // Parse header
  const headerLine = lines[0];
  if (!headerLine) {
    return {
      success: false,
      errors: ['CSV file is missing header row.'],
      warnings,
    };
  }

  const headers = splitCSVRow(headerLine).map((h) => h.toLowerCase().trim());

  // Find column indices
  const nameIdx = headers.findIndex((h) => h.includes('rank') || h.includes('name'));
  const priceIdx = headers.findIndex((h) => h.includes('base') || h.includes('price') || h === '$');
  const feeIdx = headers.findIndex((h) => h.includes('fee') || h.includes('gas') || h.includes('%'));

  if (nameIdx === -1 && priceIdx === -1) {
    return {
      success: false,
      errors: ['Could not detect "Rank Name" or "Base Price" columns in CSV header.'],
      warnings,
    };
  }

  const parsedRanks: RankItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const currentLine = lines[i];
    if (!currentLine) continue;

    const cols = splitCSVRow(currentLine);
    if (cols.length === 0) continue;

    const rawName = nameIdx !== -1 && cols[nameIdx] !== undefined ? cols[nameIdx]!.trim() : `Rank ${i}`;
    const rawPrice = priceIdx !== -1 && cols[priceIdx] !== undefined ? cols[priceIdx]!.replace(/[^0-9.]/g, '') : '';
    const rawFee = feeIdx !== -1 && cols[feeIdx] !== undefined ? cols[feeIdx]!.replace(/[^0-9.]/g, '') : '3';

    if (!rawName) {
      errors.push(`Row ${rowNum}: Missing rank name.`);
      continue;
    }

    const price = parseFloat(rawPrice);
    if (isNaN(price) || price <= 0) {
      errors.push(`Row ${rowNum} ("${rawName}"): Base price must be a positive number.`);
      continue;
    }

    const fee = parseFloat(rawFee);
    const feePercent = isNaN(fee) || fee < 0 ? 3 : fee;

    parsedRanks.push({
      id: `imported-rank-${Date.now()}-${i}`,
      name: rawName,
      basePrice: round2(price),
      networkFeePercent: round2(feePercent),
      order: i,
    });
  }

  if (parsedRanks.length === 0) {
    return {
      success: false,
      errors: errors.length > 0 ? errors : ['No valid rank rows found in the CSV file.'],
      warnings,
    };
  }

  return {
    success: errors.length === 0,
    ranks: parsedRanks,
    errors,
    warnings,
  };
}

/**
 * Splits a CSV line respecting quoted commas
 */
function splitCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string | undefined;
  preview?: {
    rankCount: number;
    exchangeRate: number;
    sampleNames: string[];
    exportTimestamp: string;
    note: string;
  } | undefined;
  backupData?: BackupData | undefined;
}

/**
 * Validates a JSON backup file object before restoration
 */
export function validateBackupData(data: unknown): BackupValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Backup file does not contain a valid JSON object.' };
  }

  const obj = data as Record<string, unknown>;
  const rawRanks = obj['ranks'];

  if (!Array.isArray(rawRanks) || rawRanks.length === 0) {
    return { valid: false, error: 'Backup file is missing ranks data or contains an empty ranks list.' };
  }

  // Validate each rank
  for (let i = 0; i < rawRanks.length; i++) {
    const r = rawRanks[i];
    if (!r || typeof r !== 'object') {
      return { valid: false, error: `Invalid rank entry at index ${i}.` };
    }
    const rank = r as Record<string, unknown>;
    const nameVal = rank['name'];
    if (typeof nameVal !== 'string' || !nameVal.trim()) {
      return { valid: false, error: `Rank at row ${i + 1} has an empty or missing name.` };
    }
    const price = Number(rank['basePrice']);
    if (!Number.isFinite(price) || price < 0) {
      return { valid: false, error: `Rank "${nameVal}" has an invalid base price.` };
    }
  }

  let exchangeRate = 100;
  const rawCurrency = obj['currency'];
  if (rawCurrency && typeof rawCurrency === 'object') {
    const c = rawCurrency as Record<string, unknown>;
    const rate = Number(c['exchangeRateUSDToINR']);
    if (Number.isFinite(rate) && rate > 0) {
      exchangeRate = rate;
    }
  }

  const ranks = (rawRanks as Array<Record<string, unknown>>).map((r, idx) => ({
    id: typeof r['id'] === 'string' && r['id'] ? r['id'] : `rank-restored-${idx + 1}`,
    name: String(r['name']).trim(),
    basePrice: round2(Number(r['basePrice']) || 0),
    networkFeePercent: round2(Number(r['networkFeePercent']) >= 0 ? Number(r['networkFeePercent']) : 3),
    order: Number(r['order']) || idx + 1,
  }));

  const noteVal = obj['note'];
  const note = typeof noteVal === 'string' ? noteVal : DEFAULT_NOTE;
  const secVal = obj['secondaryNote'];
  const secondaryNote = typeof secVal === 'string' ? secVal : DEFAULT_SECONDARY_NOTE;
  const expVal = obj['exportTimestamp'];
  const exportTimestamp = typeof expVal === 'string' ? expVal : new Date().toISOString();
  const schemaVal = obj['schemaVersion'];
  const schemaVersion = typeof schemaVal === 'string' ? schemaVal : '1.0';

  const backupData: BackupData = {
    schemaVersion,
    exportTimestamp,
    currency: {
      exchangeRateUSDToINR: exchangeRate,
      lastUpdated: exportTimestamp,
    },
    ranks,
    note,
    secondaryNote,
  };

  return {
    valid: true,
    preview: {
      rankCount: ranks.length,
      exchangeRate,
      sampleNames: ranks.slice(0, 4).map((r) => r.name),
      exportTimestamp,
      note,
    },
    backupData,
  };
}
