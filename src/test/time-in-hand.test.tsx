import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { 
  DEFAULT_TIME_IN_HAND_CONFIG, 
  REFERENCE_IMAGE_PRESET 
} from '../types/time-in-hand';
import { 
  calculateTimeInHandRow, 
  calculateAllTimeInHandRows, 
  calculateTimeInHandSummary,
  calculateInteractiveAnnualDays 
} from '../lib/time-in-hand-engine';
import { 
  loadTimeInHandConfig, 
  saveTimeInHandAdmin, 
  resetTimeInHandDefaults, 
  saveTimeInHandLocal, 
  TIME_IN_HAND_STORAGE_KEY, 
  TIME_IN_HAND_UPDATED_EVENT 
} from '../lib/time-in-hand-storage';
import { 
  DEFAULT_NAVIGATION_FIELDS, 
  getRegisteredNavigationFields, 
  getOrderedNavigationFields,
  getUserAllowedTabs,
  isUserAdminOrOwner 
} from '../lib/permissions';
import { TimeInHandView } from '../components/time-in-hand/TimeInHandView';

describe('Time-In Hand / In-hand Time Feature Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // -------------------------------------------------------------
  // 1. Calculation Engine Accuracy
  // -------------------------------------------------------------
  describe('1. Calculation Logic & Formula Accuracy', () => {
    it('accurately computes 10-year row matching user prompt example (30 days/month)', () => {
      const config = {
        hoursPerDay: 8,
        daysPerMonth: 30,
        monthsPerYear: 12,
        hoursInDay: 24,
        daysInYear: 365,
      };

      const row = { id: 'test-1', age: 40, upTo60: '20 Y', yearsInHand: 10 };
      const calculated = calculateTimeInHandRow(row, config);

      expect(calculated.hoursPerMonth).toBe(240); // 8 * 30
      expect(calculated.hoursPerYear).toBe(2880); // 240 * 12
      expect(calculated.hoursInHand).toBe(28800); // 10 * 2880
      expect(calculated.daysInHand).toBe(1200); // 28800 / 24
      expect(calculated.yearsInHandEquivalent).toBeCloseTo(3.28767, 4); // ~3.288 years
      expect(calculated.yearsInHandFormatted.startsWith('3.28767')).toBe(true);
    });

    it('accurately computes rows matching uploaded reference image (26 days/month, 5 years)', () => {
      const config = {
        hoursPerDay: 8,
        daysPerMonth: 26,
        monthsPerYear: 12,
        hoursInDay: 24,
        daysInYear: 365,
      };

      const row = { id: 'img-1', age: 50, upTo60: '10 Y', yearsInHand: 5 };
      const calculated = calculateTimeInHandRow(row, config);

      expect(calculated.hoursPerMonth).toBe(208); // 8 * 26
      expect(calculated.hoursPerYear).toBe(2496); // 208 * 12
      expect(calculated.hoursInHand).toBe(12480); // 5 * 2496
      expect(calculated.daysInHand).toBe(520); // 12480 / 24
      // In reference image: 1.424657534
      expect(calculated.yearsInHandEquivalent).toBeCloseTo(1.424657534, 6);
      expect(calculated.yearsInHandFormatted.startsWith('1.424657534')).toBe(true);
    });

    it('calculates interactive Annual Days accurately using formula: Annual Working Hours × Selected Year In-hand', () => {
      // Prompt example: 2,880 × 3.2877 = approximately 9,468.58 days
      const result = calculateInteractiveAnnualDays(2880, 3.2877);
      expect(result.annualDays).toBeCloseTo(9468.576, 2);
      expect(result.annualDaysFormatted).toBe('9,468.58');
    });

    it('computes summary metrics across all table rows including interactive annual days', () => {
      const summary = calculateTimeInHandSummary(DEFAULT_TIME_IN_HAND_CONFIG);
      expect(summary.hoursPerDay).toBe(8);
      expect(summary.daysPerMonth).toBe(30);
      expect(summary.hoursPerMonth).toBe(240);
      expect(summary.hoursPerYear).toBe(2880);
      expect(summary.annualDays).toBe(120); // backward compatibility 2880 / 24 = 120
      expect(summary.interactiveAnnualDays).toBeCloseTo(9468.576, 2);
      expect(summary.interactiveAnnualDaysFormatted).toBe('9,468.58');
      expect(summary.totalRows).toBe(DEFAULT_TIME_IN_HAND_CONFIG.rows.length);
    });

    it('dynamically recalculates annualDays when parameters change (e.g. 26 days/month = 104 days/year)', () => {
      const customConfig = {
        ...DEFAULT_TIME_IN_HAND_CONFIG,
        daysPerMonth: 26,
      };
      const summary = calculateTimeInHandSummary(customConfig);
      expect(summary.hoursPerMonth).toBe(208); // 8 * 26
      expect(summary.hoursPerYear).toBe(2496); // 208 * 12
      expect(summary.annualDays).toBe(104); // 2496 / 24 = 104 days/year
    });
  });

  // -------------------------------------------------------------
  // 2. Sidebar Navigation Placement
  // -------------------------------------------------------------
  describe('2. Sidebar Menu & Navigation Placement', () => {
    it('positions "Time-In hand" immediately above "Settings" in DEFAULT_NAVIGATION_FIELDS', () => {
      const fields = DEFAULT_NAVIGATION_FIELDS;
      const settingsIndex = fields.findIndex((f) => f.id === 'settings');
      expect(settingsIndex).toBeGreaterThan(0);

      const timeInHandIndex = fields.findIndex((f) => f.id === 'time-in-hand');
      expect(timeInHandIndex).toBe(settingsIndex - 1);
      expect(fields[timeInHandIndex].label).toBe('Time-In hand');
    });

    it('orders "Time-In hand" immediately before "Settings" in getOrderedNavigationFields()', () => {
      const ordered = getOrderedNavigationFields();
      const settingsIdx = ordered.findIndex((f) => f.id === 'settings');
      expect(settingsIdx).toBeGreaterThan(0);

      const timeInHandIdx = ordered.findIndex((f) => f.id === 'time-in-hand');
      expect(timeInHandIdx).toBe(settingsIdx - 1);
    });
  });

  // -------------------------------------------------------------
  // 3. Admin Security & Role Access Enforcement
  // -------------------------------------------------------------
  describe('3. Admin Security & Access Control', () => {
    it('allows Admin to save updated parameters permanently', async () => {
      const customConfig = {
        ...DEFAULT_TIME_IN_HAND_CONFIG,
        daysPerMonth: 25,
      };

      const result = await saveTimeInHandAdmin(customConfig, 'sivaji491@gmail.com');
      expect(result.success).toBe(true);
      expect(result.data?.daysPerMonth).toBe(25);

      const loaded = loadTimeInHandConfig();
      expect(loaded.daysPerMonth).toBe(25);
    });

    it('strictly rejects non-admin users attempting to save configuration', async () => {
      const customConfig = {
        ...DEFAULT_TIME_IN_HAND_CONFIG,
        daysPerMonth: 25,
      };

      const result = await saveTimeInHandAdmin(customConfig, 'regularuser@example.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('rejects invalid inputs such as 0 hours per day or negative days', async () => {
      const invalidConfig = {
        ...DEFAULT_TIME_IN_HAND_CONFIG,
        hoursPerDay: 0,
      };

      const result = await saveTimeInHandAdmin(invalidConfig, 'sivaji491@gmail.com');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Hours per day must be a number between 1 and 24');
    });

    it('allows Admin to restore default parameters', async () => {
      // Modify first
      await saveTimeInHandAdmin({ ...DEFAULT_TIME_IN_HAND_CONFIG, daysPerMonth: 22 }, 'sivaji491@gmail.com');
      expect(loadTimeInHandConfig().daysPerMonth).toBe(22);

      // Restore
      const reset = await resetTimeInHandDefaults('sivaji491@gmail.com');
      expect(reset.success).toBe(true);
      expect(loadTimeInHandConfig().daysPerMonth).toBe(30);
    });
  });

  // -------------------------------------------------------------
  // 4. UI Rendering: Regular User (View-Only) vs Admin
  // -------------------------------------------------------------
  describe('4. UI Rendering & Responsive Table Structure', () => {
    it('renders all 10 columns, Days Only and Time In-hand summary cards with sensible defaults, and motivational slogans', () => {
      render(<TimeInHandView isAdmin={false} userEmail="member@example.com" />);

      // Title & Key Metrics
      expect(screen.getByText('In-hand time')).toBeDefined();
      expect(screen.getByText('Working Hours Model')).toBeDefined();
      expect(screen.getByText('Daily Hours')).toBeDefined();
      expect(screen.getByText('Days / Month')).toBeDefined();
      expect(screen.getByText('Monthly Hours')).toBeDefined();
      expect(screen.getByText('Annual Working Hours')).toBeDefined();
      expect(screen.getByText('Days Only')).toBeDefined();
      expect(screen.getByText('Time In-hand')).toBeDefined();
      expect(screen.getByText('Interactive')).toBeDefined();

      // Sensible default values (10-year row: 2,880 × 3.2877 = 9,468.58)
      expect(screen.getByText('9,468.58')).toBeDefined();
      expect(screen.getByText(/days\/year/)).toBeDefined();
      expect(screen.getByText(/2,880 hrs × 3.2877 yrs/)).toBeDefined();

      // New Time In-hand card: exact 3.2877 value with unit "years"
      expect(screen.getByText('3.2877')).toBeDefined();
      expect(screen.getByText('years')).toBeDefined();

      // All 10 table headers
      expect(screen.getByRole('columnheader', { name: /Age/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Up to 60 Years In-hand/i })).toBeDefined();
      expect(screen.getAllByRole('columnheader', { name: /Years In-hand/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('columnheader', { name: /Hours per Day/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Days per Month/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Hours per Month/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Hours per Year/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Hours In-hand/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Days In-hand/i })).toBeDefined();

      // Motivational slogans
      expect(screen.getByText(/Just give 2 perfect referrals/i)).toBeDefined();
      expect(screen.getByText(/Invest your idea and leisure time on the right platform, not money/i)).toBeDefined();
      expect(screen.getByText(/Everything is smart nowadays, so why shouldn't earning also be smart/i)).toBeDefined();

      // Regular user MUST NOT see any admin edit controls
      expect(screen.queryByRole('button', { name: /Edit Settings/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Add Row/i })).toBeNull();
      expect(screen.queryByRole('columnheader', { name: /Actions/i })).toBeNull();
    });

    it('interactively updates Days Only and Time In-hand cards when user clicks different Year In-hand values', () => {
      render(<TimeInHandView isAdmin={false} userEmail="member@example.com" />);

      // Starts at default 10-year row: 9,468.58 days, 3.2877 years
      expect(screen.getByText('9,468.58')).toBeDefined();
      expect(screen.getByText('3.2877')).toBeDefined();

      // Select 5-year row (row-1: 5 years, equivalent = 1.6438)
      // Days Only: 2,880 * 1.6438 = 4,734.14
      // Time In-hand: 1.6438 years
      const row5YearsButton = screen.getByRole('button', { name: /Select row with 5 years in-hand/i });
      fireEvent.click(row5YearsButton);

      expect(screen.getByText('4,734.14')).toBeDefined();
      expect(screen.getByText(/2,880 hrs × 1.6438 yrs/)).toBeDefined();
      expect(screen.getByText('1.6438')).toBeDefined();

      // Select 20-year row (matching user screenshot: 18,936.86 days, 6.5753 years)
      const row20YearsButton = screen.getByRole('button', { name: /Select row with 20 years in-hand/i });
      fireEvent.click(row20YearsButton);

      expect(screen.getByText('18,936.86')).toBeDefined();
      expect(screen.getByText(/2,880 hrs × 6.5753 yrs/)).toBeDefined();
      expect(screen.getByText('6.5753')).toBeDefined();

      // Select 15-year row (row-3: 15 years, equivalent = 4.9315)
      // Days Only: 2,880 * 4.9315 = 14,202.72
      // Time In-hand: 4.9315 years
      const row15YearsButton = screen.getByRole('button', { name: /Select row with 15 years in-hand/i });
      fireEvent.click(row15YearsButton);

      expect(screen.getByText('14,202.72')).toBeDefined();
      expect(screen.getByText(/2,880 hrs × 4.9315 yrs/)).toBeDefined();
      expect(screen.getByText('4.9315')).toBeDefined();

      // Select 10-year row via Column 10 equivalent years cell
      const row10EquivalentCell = screen.getByRole('button', { name: /Select 3.287671233 years in-hand/i });
      fireEvent.click(row10EquivalentCell);

      expect(screen.getByText('9,468.58')).toBeDefined();
      expect(screen.getByText(/2,880 hrs × 3.2877 yrs/)).toBeDefined();
      expect(screen.getByText('3.2877')).toBeDefined();
    });

    it('supports keyboard navigation (Enter key) to select Year In-hand cells', () => {
      render(<TimeInHandView isAdmin={false} userEmail="member@example.com" />);

      const row5YearsButton = screen.getByRole('button', { name: /Select row with 5 years in-hand/i });
      fireEvent.keyDown(row5YearsButton, { key: 'Enter', code: 'Enter' });

      expect(screen.getByText('4,734.14')).toBeDefined();
      expect(screen.getByText('1.6438')).toBeDefined();
    });

    it('renders full Admin management controls for authorized administrators', () => {
      render(<TimeInHandView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Admin badge and buttons must be present
      expect(screen.getByText('Admin Editable')).toBeDefined();
      expect(screen.getByRole('button', { name: /Edit First 4 Columns/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Edit Settings/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Add Row/i })).toBeDefined();
      expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeDefined();
    });

    it('Admin can enter edit mode for first 4 columns, change values, and save persistently', async () => {
      render(<TimeInHandView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Verify "Edit First 4 Columns" button is present
      const editColumnsButton = screen.getByRole('button', { name: /Edit First 4 Columns/i });
      expect(editColumnsButton).toBeDefined();

      // Click to enter table editing mode
      await act(async () => {
        fireEvent.click(editColumnsButton);
      });

      // Verify Admin Editing Mode banner is displayed
      expect(screen.getByText(/Admin Editing Mode:/i)).toBeDefined();

      // Verify inputs are rendered for first 4 columns of Row 1
      const ageInput = screen.getByLabelText(/Age for row 1/i);
      const upTo60Input = screen.getByLabelText(/Up to 60 for row 1/i);
      const yihInput = screen.getByLabelText(/Years in hand for row 1/i);
      const hpdInput = screen.getByLabelText(/Hours per day for row 1/i);

      expect(ageInput).toBeDefined();
      expect(upTo60Input).toBeDefined();
      expect(yihInput).toBeDefined();
      expect(hpdInput).toBeDefined();

      // Change Age to 52, Up to 60 to '8 Y', Years In-hand to 6, Hours per Day to 10
      await act(async () => {
        fireEvent.change(ageInput, { target: { value: '52' } });
        fireEvent.change(upTo60Input, { target: { value: '8 Y' } });
        fireEvent.change(yihInput, { target: { value: '6' } });
        fireEvent.change(hpdInput, { target: { value: '10' } });
      });

      // Save changes
      const saveButtons = screen.getAllByRole('button', { name: /Save Values/i });
      await act(async () => {
        fireEvent.click(saveButtons[0]);
      });

      // Check persistence in storage
      const loaded = loadTimeInHandConfig();
      expect(loaded.rows[0].age).toBe(52);
      expect(loaded.rows[0].upTo60).toBe('8 Y');
      expect(loaded.rows[0].yearsInHand).toBe(6);
      expect(loaded.rows[0].hoursPerDay).toBe(10);
    });

    it('Regular user has no editing controls, no inputs, and sees only read-only text', () => {
      render(<TimeInHandView isAdmin={false} userEmail="regularuser@example.com" />);

      // Cannot see "Edit First 4 Columns", "Save Values", or "Cancel"
      expect(screen.queryByRole('button', { name: /Edit First 4 Columns/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Save Values/i })).toBeNull();
      expect(screen.queryByText(/Admin Editing Mode:/i)).toBeNull();

      // No inputs rendered in table
      expect(screen.queryByLabelText(/Age for row 1/i)).toBeNull();
      expect(screen.queryByLabelText(/Up to 60 for row 1/i)).toBeNull();
      expect(screen.queryByLabelText(/Years in hand for row 1/i)).toBeNull();
      expect(screen.queryByLabelText(/Hours per day for row 1/i)).toBeNull();
    });

    it('Validation prevents invalid or empty values in first 4 columns when saving', async () => {
      render(<TimeInHandView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const editColumnsButton = screen.getByRole('button', { name: /Edit First 4 Columns/i });
      await act(async () => {
        fireEvent.click(editColumnsButton);
      });

      const ageInput = screen.getByLabelText(/Age for row 1/i);
      await act(async () => {
        fireEvent.change(ageInput, { target: { value: '0' } }); // invalid age
      });

      const saveButtons = screen.getAllByRole('button', { name: /Save Values/i });
      await act(async () => {
        fireEvent.click(saveButtons[0]);
      });

      expect(screen.getByText(/Row #1: Age must be a valid number between 1 and 120/i)).toBeDefined();
    });
  });
});
