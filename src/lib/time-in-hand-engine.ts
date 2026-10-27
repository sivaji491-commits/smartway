import { 
  TimeInHandConfig, 
  TimeInHandRow, 
  CalculatedTimeInHandRow, 
  DEFAULT_TIME_IN_HAND_CONFIG 
} from '@/types/time-in-hand';

/**
 * Calculates a single row using dynamic mathematical formulas:
 * - Hours per month = Hours per day × Days per month
 * - Hours per year = Hours per month × 12
 * - Hours in-hand = Years in-hand × Hours per year
 * - Days in-hand = Hours in-hand ÷ 24
 * - Years in-hand (equivalent) = Hours in-hand ÷ (24 × 365)
 */
export function calculateTimeInHandRow(
  row: TimeInHandRow,
  config: Pick<TimeInHandConfig, 'hoursPerDay' | 'daysPerMonth' | 'monthsPerYear' | 'hoursInDay' | 'daysInYear'>
): CalculatedTimeInHandRow {
  const hoursPerDay = Math.max(0, Number(row.hoursPerDay !== undefined && !isNaN(Number(row.hoursPerDay)) ? row.hoursPerDay : config.hoursPerDay) || 8);
  const daysPerMonth = Math.max(0, Number(config.daysPerMonth) || 30);
  const monthsPerYear = Math.max(1, Number(config.monthsPerYear) || 12);
  const hoursInDay = Math.max(1, Number(config.hoursInDay) || 24);
  const daysInYear = Math.max(1, Number(config.daysInYear) || 365);

  const yearsInHand = Math.max(0, Number(row.yearsInHand) || 0);

  const hoursPerMonth = hoursPerDay * daysPerMonth;
  const hoursPerYear = hoursPerMonth * monthsPerYear;
  const annualDays = hoursInDay > 0 ? hoursPerYear / hoursInDay : 0;
  const hoursInHand = yearsInHand * hoursPerYear;
  const daysInHand = hoursInDay > 0 ? hoursInHand / hoursInDay : 0;
  
  const totalAnnualHours = hoursInDay * daysInYear; // 24 * 365 = 8760
  const yearsInHandEquivalent = totalAnnualHours > 0 ? hoursInHand / totalAnnualHours : 0;

  // Format equivalent years up to 9 decimal places as in the reference screenshot
  // (e.g. 1.424657534 or 3.287671233)
  let yearsInHandFormatted = '';
  if (yearsInHandEquivalent === 0) {
    yearsInHandFormatted = '0';
  } else if (Number.isInteger(yearsInHandEquivalent)) {
    yearsInHandFormatted = yearsInHandEquivalent.toString();
  } else {
    // 9 decimal places matches reference screenshot precision
    yearsInHandFormatted = yearsInHandEquivalent.toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
  }

  return {
    ...row,
    hoursPerDay,
    daysPerMonth,
    hoursPerMonth,
    hoursPerYear,
    annualDays,
    hoursInHand,
    daysInHand,
    yearsInHandEquivalent,
    yearsInHandFormatted,
  };
}

/**
 * Computes all table rows based on the given configuration.
 */
export function calculateAllTimeInHandRows(config: TimeInHandConfig): CalculatedTimeInHandRow[] {
  if (!config || !Array.isArray(config.rows)) {
    return [];
  }
  return config.rows.map((row) => calculateTimeInHandRow(row, config));
}

/**
 * Summary aggregates for the header badges and summary metrics.
 */
export function calculateTimeInHandSummary(config: TimeInHandConfig, selectedYearInHand?: number) {
  const hoursPerDay = Number(config.hoursPerDay) || 8;
  const daysPerMonth = Number(config.daysPerMonth) || 30;
  const monthsPerYear = Number(config.monthsPerYear) || 12;
  const hoursInDay = Number(config.hoursInDay) || 24;
  const daysInYear = Number(config.daysInYear) || 365;

  const hoursPerMonth = hoursPerDay * daysPerMonth;
  const hoursPerYear = hoursPerMonth * monthsPerYear;
  const annualDays = hoursInDay > 0 ? hoursPerYear / hoursInDay : 0;
  const rows = calculateAllTimeInHandRows(config);

  const defaultRow = rows.find((r) => r.yearsInHand === 10) || rows[0];
  const effectiveYearInHand = selectedYearInHand !== undefined
    ? Number(selectedYearInHand)
    : (defaultRow ? Number(defaultRow.yearsInHandEquivalent.toFixed(4)) : 0);
  const interactiveResult = calculateInteractiveAnnualDays(hoursPerYear, effectiveYearInHand);

  const maxHoursInHand = rows.reduce((max, r) => Math.max(max, r.hoursInHand), 0);
  const maxDaysInHand = rows.reduce((max, r) => Math.max(max, r.daysInHand), 0);
  const maxYearsInHand = rows.reduce((max, r) => Math.max(max, r.yearsInHandEquivalent), 0);

  return {
    hoursPerDay,
    daysPerMonth,
    monthsPerYear,
    hoursInDay,
    daysInYear,
    hoursPerMonth,
    hoursPerYear,
    annualDays,
    interactiveAnnualDays: interactiveResult.annualDays,
    interactiveAnnualDaysFormatted: interactiveResult.annualDaysFormatted,
    selectedYearInHand: effectiveYearInHand,
    totalRows: rows.length,
    maxHoursInHand,
    maxDaysInHand,
    maxYearsInHand,
  };
}

/**
 * Interactive Annual Days Calculation:
 * Formula: Annual Days = Annual Working Hours × Selected Year In-hand Value
 * 
 * Example from user specification:
 * - Annual Working Hours = 2,880
 * - Selected Year In-hand value = 3.2877
 * Annual Days = 2,880 × 3.2877 = approximately 9,468.58 days
 */
export function calculateInteractiveAnnualDays(
  hoursPerYear: number,
  selectedYearInHand: number
): {
  annualDays: number;
  annualDaysFormatted: string;
} {
  const annualHours = Math.max(0, Number(hoursPerYear) || 0);
  const yearInHand = Math.max(0, Number(selectedYearInHand) || 0);
  const annualDays = annualHours * yearInHand;
  const annualDaysFormatted = annualDays.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    annualDays,
    annualDaysFormatted,
  };
}
