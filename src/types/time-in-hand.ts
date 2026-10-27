export interface TimeInHandRow {
  id: string;
  age: number;
  upTo60: string; // e.g. "10 Y", "15 Y", "20 Y", "25 Y", "30 Y", "35 Y"
  yearsInHand: number; // e.g. 5, 10, 15, 20, 25, 30
  hoursPerDay?: number; // e.g. 8 (Admin-editable column 4)
}

export interface TimeInHandConfig {
  // Page titles
  title: string;
  subtitle: string;

  // Calculation parameters
  hoursPerDay: number; // default: 8
  daysPerMonth: number; // default: 30 (can be 26 as in image)
  monthsPerYear: number; // default: 12
  hoursInDay: number; // default: 24
  daysInYear: number; // default: 365

  // Column header labels (admin editable)
  colAge: string;
  colUpTo60: string;
  colYearsInHand: string;
  colHoursPerDay: string;
  colDaysPerMonth: string;
  colHoursPerMonth: string;
  colHoursPerYear: string;
  colHoursInHand: string;
  colDaysInHand: string;
  colEquivalentYears: string;

  // Footer inspirational quotes / slogans (matching screenshot)
  quote1: string;
  quote2: string;
  quote3: string;

  // Table rows
  rows: TimeInHandRow[];

  updatedAt?: string;
  updatedBy?: string;
}

export interface CalculatedTimeInHandRow extends TimeInHandRow {
  hoursPerDay: number;
  daysPerMonth: number;
  hoursPerMonth: number;
  hoursPerYear: number;
  annualDays: number;
  hoursInHand: number;
  daysInHand: number;
  yearsInHandEquivalent: number;
  yearsInHandFormatted: string;
}

/**
 * Canonical default configuration adhering to the user's specification:
 * - Hours per day = 8
 * - Days per month = 30
 * - Hours per month = 240
 * - Hours per year = 2,880
 * - Display rows for 5, 10, 15, 20, 25, and 30 years with age progression from reference image
 */
export const DEFAULT_TIME_IN_HAND_CONFIG: TimeInHandConfig = {
  title: 'In-hand time',
  subtitle: 'Working hours accumulation and equivalent in-hand time comparison model',
  hoursPerDay: 8,
  daysPerMonth: 30,
  monthsPerYear: 12,
  hoursInDay: 24,
  daysInYear: 365,

  colAge: 'Age',
  colUpTo60: 'Up to 60 Years In-hand',
  colYearsInHand: 'Years In-hand',
  colHoursPerDay: 'Hours per Day',
  colDaysPerMonth: 'Days per Month',
  colHoursPerMonth: 'Hours per Month',
  colHoursPerYear: 'Hours per Year',
  colHoursInHand: 'Hours In-hand',
  colDaysInHand: 'Days In-hand',
  colEquivalentYears: 'Years In-hand',

  quote1: 'Just give 2 perfect referrals, your life will be settled financially.',
  quote2: 'Invest your idea and leisure time on the right platform, not money. 👈',
  quote3: 'Everything is smart nowadays, so why shouldn\'t earning also be smart?',

  rows: [
    { id: 'row-1', age: 50, upTo60: '10 Y', yearsInHand: 5 },
    { id: 'row-2', age: 45, upTo60: '15 Y', yearsInHand: 10 },
    { id: 'row-3', age: 40, upTo60: '20 Y', yearsInHand: 15 },
    { id: 'row-4', age: 35, upTo60: '25 Y', yearsInHand: 20 },
    { id: 'row-5', age: 30, upTo60: '30 Y', yearsInHand: 25 },
    { id: 'row-6', age: 25, upTo60: '35 Y', yearsInHand: 30 },
  ],
};

/**
 * Alternate reference image preset (26 days per month, 5, 8, 10, 13, 15, 18 years in-hand)
 */
export const REFERENCE_IMAGE_PRESET: Partial<TimeInHandConfig> = {
  daysPerMonth: 26,
  rows: [
    { id: 'img-1', age: 50, upTo60: '10 Y', yearsInHand: 5 },
    { id: 'img-2', age: 45, upTo60: '15 Y', yearsInHand: 8 },
    { id: 'img-3', age: 40, upTo60: '20 Y', yearsInHand: 10 },
    { id: 'img-4', age: 35, upTo60: '25 Y', yearsInHand: 13 },
    { id: 'img-5', age: 30, upTo60: '30 Y', yearsInHand: 15 },
    { id: 'img-6', age: 25, upTo60: '35 Y', yearsInHand: 18 },
  ],
};
