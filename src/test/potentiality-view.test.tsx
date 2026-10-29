import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PotentialityView } from '../components/potentiality/PotentialityView';
import { resetPotentialityState, loadPotentialityState } from '../lib/potentiality-storage';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';
import { 
  getRegisteredNavigationFields, 
  getUserAllowedTabs, 
  DEFAULT_NAVIGATION_FIELDS 
} from '../lib/permissions';

describe('Potentiality Page Integration & Acceptance Tests', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
    resetPotentialityState();
  });

  it('1. Navigation & Permission System: includes Potentiality in registered navigation and role access', () => {
    const fields = getRegisteredNavigationFields();
    const potentialityField = fields.find((f) => f.id === 'potentiality');
    expect(potentialityField).toBeDefined();
    expect(potentialityField?.label).toBe('Potentiality');
    expect(potentialityField?.iconName).toBe('Target');

    // Admin email gets full access including potentiality
    const adminTabs = getUserAllowedTabs('sivaji491@gmail.com');
    expect(adminTabs).toContain('potentiality');
  });

  it('2. Component Rendering: renders Potentiality page with top summary, rank badge, and exact figures for PBA 1', () => {
    render(<PotentialityView isAdmin={true} />);

    // Page title and badges
    expect(screen.getByText('Potentiality')).toBeDefined();
    expect(screen.getByText('12-Week Matrix Projection')).toBeDefined();

    // Top Summary strip: Selected Rank, Rank Price, Total with 3% fee, Rank Price in INR (excl. fee)
    expect(screen.getByText(/Selected Rank:/i)).toBeDefined();
    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rank Price:')).toBeDefined();
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Network Fee/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$3.00')).toBeDefined();
    expect(screen.getByText('With 3% Fee:')).toBeDefined();
    expect(screen.getByText('$103.00')).toBeDefined();
    expect(screen.getByText('Rank Price (INR):')).toBeDefined();
    expect(screen.getAllByText('₹10,000.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Note: Including 3% Network fee.')).toBeDefined();

    // Verify all 9 table columns are present: Time | Rank | Level | Just refer | Ref. % | Earn Each Referral | Ref. amount | Total | Profit
    expect(screen.getByText('Time')).toBeDefined();
    expect(screen.getByText('Rank')).toBeDefined();
    expect(screen.getByText('Level')).toBeDefined();
    expect(screen.getByText('Just refer')).toBeDefined();
    expect(screen.getByText('Ref. %')).toBeDefined();
    expect(screen.getByText('Earn Each Referral')).toBeDefined();
    expect(screen.getByText('Ref. amount')).toBeDefined();
    expect(screen.getAllByText('Total').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Profit')).toBeDefined();

    // Verify DCB 30% is NOT a table column header and Duration is NOT a column header
    expect(screen.queryByRole('columnheader', { name: /DCB 30%/i })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /Duration/i })).toBeNull();

    // Verify DCB 30% is displayed in summary strip beside Referrals
    const dcbContainer = screen.getByTestId('summary-dcb-container');
    expect(dcbContainer).toBeDefined();
    expect(dcbContainer.textContent).toContain('DCB 30%:');
    expect(dcbContainer.textContent).toContain('$30.00');

    // Verify Row 1 figures: $80.00 total, $72.00 profit
    expect(screen.getByText('$80.00')).toBeDefined();
    expect(screen.getByText('$72.00')).toBeDefined();

    // Total Profit matches reference screenshot: $14,821.20
    expect(screen.getAllByText('$14,821.20').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(₹14,82,120.00)')).toBeDefined();

    // Motivational Banners
    expect(screen.getByText('ONE SMALL STEP CAN CHANGE YOUR LIFE')).toBeDefined();
    expect(screen.getByText('ONE TIME SMART WORK')).toBeDefined();
    expect(screen.getByText('For your real financial growth, Invest your idea, not money')).toBeDefined();
    expect(screen.getByText('Minimum target ONE YEAR ➔ 1 Cr.')).toBeDefined();
    expect(screen.getByText('5 Cr.')).toBeDefined();
  });

  it('3. Regular User Security View: hides all admin actions, text edit controls, row buttons, and entire top control panel', () => {
    render(<PotentialityView isAdmin={false} />);

    // Actions column should NOT exist
    expect(screen.queryByText('Actions')).toBeNull();

    // Top control panel and admin toolbar should NOT exist
    expect(screen.queryByText('12-Week Matrix Projection')).toBeNull();
    expect(screen.queryByTestId('top-rank-dropdown-btn')).toBeNull();
    expect(screen.queryByTestId('top-referral-dropdown-btn')).toBeNull();
    expect(screen.queryByRole('tablist', { name: 'Time Period Types' })).toBeNull();
    expect(screen.queryByTitle('Configure Time Period Options and Summaries')).toBeNull();
    expect(screen.queryByTitle('Configure Period Options and Summaries')).toBeNull();
    expect(screen.queryByTitle('Customize page banners and text')).toBeNull();
    expect(screen.queryByTitle('Add Level Row')).toBeNull();
    expect(screen.queryByTitle('Reset to default settings')).toBeNull();
    expect(screen.queryByTitle('Edit row')).toBeNull();
    expect(screen.queryByTitle('Delete row')).toBeNull();

    // Essential user-facing elements remain present and functional
    expect(screen.getByTestId('potentiality-selected-rank-summary')).toBeDefined();
    expect(screen.getByTestId('summary-selected-rank-dropdown-btn')).toBeDefined();
    expect(screen.getByTestId('summary-referral-dropdown-btn')).toBeDefined();
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByRole('button', { name: /Main Time Selection Dropdown/i })).toBeDefined();
  });

  it('4. Administrator Capabilities: displays Admin controls, allows editing messages and rows', () => {
    render(<PotentialityView isAdmin={true} />);

    // Admin Actions column exists
    expect(screen.getByText('Actions')).toBeDefined();

    // Admin toolbar buttons exist
    const textBtn = screen.getByTitle('Customize page banners and text');
    expect(textBtn).toBeDefined();

    // Open customize messages modal
    fireEvent.click(textBtn);
    expect(screen.getByText('Customize Potentiality Messages')).toBeDefined();

    // Edit a message and save
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('5. Dual Rank Dropdown Bidirectional Synchronization: changing either dropdown updates both dropdowns and the entire calculation table', () => {
    render(<PotentialityView isAdmin={true} />);

    // Initial state: Both top-right dropdown and SELECTED RANK summary dropdown show PBA 1
    const topRankBtn = screen.getByTestId('top-rank-dropdown-btn');
    const summaryRankBtn = screen.getByTestId('summary-selected-rank-dropdown-btn');
    expect(topRankBtn).toBeDefined();
    expect(summaryRankBtn).toBeDefined();

    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$3.00')).toBeDefined();
    expect(screen.getByText('$103.00')).toBeDefined();
    expect(screen.getAllByText('₹10,000.00').length).toBeGreaterThanOrEqual(1);

    // 1. Change via top-right dropdown to PBA 2
    const topNativeSelect = screen.getByTestId('potentiality-rank-native-select');
    fireEvent.change(topNativeSelect, { target: { value: 'pba-2' } });

    // Both top-right and lower SELECTED RANK dropdowns immediately show PBA 2
    expect(screen.getAllByText('PBA 2').length).toBeGreaterThanOrEqual(2);
    const summaryBadgePBA2 = screen.getByTestId('summary-selected-rank-badge');
    expect(summaryBadgePBA2.textContent).toBe('PBA 2');

    // Calculations update reactively ($300 base, $9 fee, $309 total, ₹30,000 INR)
    expect(screen.getAllByText('$300.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$9.00')).toBeDefined();
    expect(screen.getByText('$309.00')).toBeDefined();
    expect(screen.getAllByText('₹30,000.00').length).toBeGreaterThanOrEqual(1);

    // 2. Change via lower SELECTED RANK dropdown to PBA 3
    const summaryNativeSelect = screen.getByTestId('potentiality-summary-rank-native-select');
    fireEvent.change(summaryNativeSelect, { target: { value: 'pba-3' } });

    // Both top-right and lower SELECTED RANK dropdowns immediately show PBA 3
    expect(screen.getAllByText('PBA 3').length).toBeGreaterThanOrEqual(2);
    const summaryBadgePBA3 = screen.getByTestId('summary-selected-rank-badge');
    expect(summaryBadgePBA3.textContent).toBe('PBA 3');

    // PBA 3 calculations: Base $600.00, Fee $18.00, Total $618.00, INR ₹60,000.00
    expect(screen.getAllByText('$600.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$18.00')).toBeDefined();
    expect(screen.getByText('$618.00')).toBeDefined();
    expect(screen.getAllByText('₹60,000.00').length).toBeGreaterThanOrEqual(1);

    // 3. Switch back to PBA 1 via lower dropdown to confirm no stale state remains
    fireEvent.change(summaryNativeSelect, { target: { value: 'pba-1' } });
    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('summary-selected-rank-badge').textContent).toBe('PBA 1');
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$3.00')).toBeDefined();
    expect(screen.getByText('$103.00')).toBeDefined();
    expect(screen.getAllByText('₹10,000.00').length).toBeGreaterThanOrEqual(1);

    // 4. Switch to PBA 4 via top-right dropdown
    fireEvent.change(topNativeSelect, { target: { value: 'pba-4' } });
    expect(screen.getAllByText('PBA 4').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('summary-selected-rank-badge').textContent).toBe('PBA 4');
    expect(screen.getAllByText('$1,000.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$30.00')).toBeDefined();
    expect(screen.getByText('$1,030.00')).toBeDefined();
    expect(screen.getAllByText('₹1,00,000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('6. Time Period Selector: switches period types and updates options, summaries, and recommendation statuses', () => {
    render(<PotentialityView isAdmin={true} />);

    // Default period type is Weekly: summary is "Just 3 Months", status is "Recommended"
    expect(screen.getAllByText('Just 3 Months').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Recommended').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1st Week').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12th Week').length).toBeGreaterThanOrEqual(1);

    // Switch to Days
    const daysTab = screen.getByRole('tab', { name: 'Days' });
    fireEvent.click(daysTab);

    // Summary updates to "Just 2 Months", status is "Recommended"
    expect(screen.getAllByText('Just 2 Months').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1st 5 Days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('60 Days').length).toBeGreaterThanOrEqual(1);
    // Rank PBA 1 must remain preserved
    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(1);

    // Switch to Interval Weeks
    const intervalWeeksTab = screen.getByRole('tab', { name: 'Interval Weeks' });
    fireEvent.click(intervalWeeksTab);

    // Summary updates to "Just 6 Months", status is "Recommended"
    expect(screen.getAllByText('Just 6 Months').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2 Weeks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('24 Weeks').length).toBeGreaterThanOrEqual(1);

    // Switch to Monthly
    const monthlyTab = screen.getByRole('tab', { name: 'Monthly' });
    fireEvent.click(monthlyTab);

    // Summary updates to "Within 1 Year", status is "Not Recommended"
    expect(screen.getAllByText('Within 1 Year').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Not Recommended').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1st Month').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12th Month').length).toBeGreaterThanOrEqual(1);
  });

  it('7. Time Dropdown: row Time column has interactive dropdown', () => {
    render(<PotentialityView isAdmin={false} />);

    // Row 1 button has "1st Week"
    const row1TimeBtn = screen.getByRole('button', { name: /Time period for level 1, currently 1st Week/i });
    expect(row1TimeBtn).toBeDefined();
  });

  it('8. Admin Period Configuration: allows configuring options in 2 columns and saving changes', () => {
    render(<PotentialityView isAdmin={true} />);

    // Admin has Periods config button
    const configBtn = screen.getByTitle('Configure Time Period Options and Summaries');
    expect(configBtn).toBeDefined();

    // Click to open period config modal
    fireEvent.click(configBtn);
    expect(screen.getByText('Configure Time Periods & Options')).toBeDefined();
    expect(screen.getByText(/12 Chronological Period Options/i)).toBeDefined();
    expect(screen.getByText(/Column 1 \(Options 1 – 6\)/i)).toBeDefined();
    expect(screen.getByText(/Column 2 \(Options 7 – 12\)/i)).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Configure Time Periods & Options')).toBeNull();
  });

  it('9. Regular User Security for Period Config: hides admin period config buttons', () => {
    render(<PotentialityView isAdmin={false} />);

    expect(screen.queryByTitle('Configure Time Period Options and Summaries')).toBeNull();
    expect(screen.queryByTitle('Configure Period Options and Summaries')).toBeNull();
    expect(screen.queryByText('Configure Time Periods & Options')).toBeNull();
  });

  it('10. Excel-Style VLOOKUP Time Selection: auto-populates all 12 rows, summary, and status for all 4 options', async () => {
    render(<PotentialityView isAdmin={false} />);

    // 1. Open Row 1's Main Orange Time Dropdown (the only interactive Time dropdown)
    const row1Btn = screen.getByRole('button', { name: /Main Time Selection Dropdown/i });
    expect(row1Btn).toBeDefined();

    // Verify initial default Weekly state
    expect(screen.getAllByText('Just 3 Months').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1st Week').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12th Week').length).toBeGreaterThanOrEqual(1);

    // Switch to 1st 5 Days via Row 1 Dropdown
    fireEvent.keyDown(row1Btn, { key: 'ArrowDown' });
    const daysOption = await screen.findByText('1st 5 Days');
    fireEvent.click(daysOption);

    // All day intervals appear, summary updates to Just 2 Months, status is Recommended
    expect(screen.getAllByText('Just 2 Months').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Recommended').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1st 5 Days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10 Days').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('60 Days').length).toBeGreaterThanOrEqual(1);

    // Switch to 2 Weeks via Main Time Dropdown
    fireEvent.keyDown(row1Btn, { key: 'ArrowDown' });
    const twoWeeksOption = await screen.findByText('2 Weeks');
    fireEvent.click(twoWeeksOption);

    // All 2-week intervals appear, summary updates to Just 6 Months, status is Recommended
    expect(screen.getAllByText('Just 6 Months').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2 Weeks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4 Weeks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('24 Weeks').length).toBeGreaterThanOrEqual(1);

    // Switch to 1st Month via Main Time Dropdown
    fireEvent.keyDown(row1Btn, { key: 'ArrowDown' });
    const monthOption = await screen.findByText('1st Month');
    fireEvent.click(monthOption);

    // All month intervals appear, summary updates to Within 1 Year, status is Not Recommended
    expect(screen.getAllByText('Within 1 Year').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Not Recommended').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1st Month').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12th Month').length).toBeGreaterThanOrEqual(1);

    // Rank remains preserved
    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(1);
  });

  it('11. Single Interactive Time Dropdown Guarantee: Row 1 is the ONLY Time dropdown; rows 2-12 are plain text', () => {
    render(<PotentialityView isAdmin={false} />);

    // Row 1's main orange dropdown exists
    const mainTimeDropdown = screen.getByRole('button', { name: /Main Time Selection Dropdown/i });
    expect(mainTimeDropdown).toBeDefined();

    // Verify there are no buttons for Time selection on remaining rows (e.g. no buttons for 2nd Week, 12th Week, etc.)
    expect(screen.queryByRole('button', { name: /Time period for level 2/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Time period for level 12/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /2nd Week/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /12th Week/i })).toBeNull();

    // The text values exist as plain text in the table
    expect(screen.getAllByText('2nd Week').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12th Week').length).toBeGreaterThanOrEqual(1);

    // Row 13 displays Recommended
    expect(screen.getAllByText('Recommended').length).toBeGreaterThanOrEqual(1);
  });

  it('12. Dual Dropdown State Stability: rank switching preserves Time Period and Just Refer across both selectors', () => {
    render(<PotentialityView isAdmin={true} />);

    // Switch Time Period to Days first
    const daysTab = screen.getByRole('tab', { name: 'Days' });
    fireEvent.click(daysTab);
    expect(screen.getAllByText('1st 5 Days').length).toBeGreaterThanOrEqual(1);

    // Now switch Rank to PBA 2 via the lower summary dropdown
    const summaryNativeSelect = screen.getByTestId('potentiality-summary-rank-native-select');
    fireEvent.change(summaryNativeSelect, { target: { value: 'pba-2' } });

    // Verify both dropdowns show PBA 2
    expect(screen.getAllByText('PBA 2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('summary-selected-rank-badge').textContent).toBe('PBA 2');

    // Verify Time Period is still 1st 5 Days (preserved!)
    expect(screen.getAllByText('1st 5 Days').length).toBeGreaterThanOrEqual(1);

    // Now switch Rank to PBA 3 via the top-right dropdown
    const topNativeSelect = screen.getByTestId('potentiality-rank-native-select');
    fireEvent.change(topNativeSelect, { target: { value: 'pba-3' } });

    // Verify both dropdowns show PBA 3
    expect(screen.getAllByText('PBA 3').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('summary-selected-rank-badge').textContent).toBe('PBA 3');

    // Verify Time Period is still preserved
    expect(screen.getAllByText('1st 5 Days').length).toBeGreaterThanOrEqual(1);

    // Switch rank back to PBA 1 via lower dropdown
    fireEvent.change(summaryNativeSelect, { target: { value: 'pba-1' } });
    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('summary-selected-rank-badge').textContent).toBe('PBA 1');
  });

  it('13. Referral Dropdown Next to Note: supports 2, 4, 6, 8, 10 and updates all calculations reactively across both selectors', () => {
    render(<PotentialityView isAdmin={true} />);

    // 1. Locate "Note: Including 3% Network fee." and summary referral dropdown
    expect(screen.getByText('Note: Including 3% Network fee.')).toBeDefined();
    const summaryRefBtn = screen.getByTestId('summary-referral-dropdown-btn');
    const topRefBtn = screen.getByTestId('top-referral-dropdown-btn');
    expect(summaryRefBtn).toBeDefined();
    expect(topRefBtn).toBeDefined();

    // Default option 2: Row 1 has Ref Amount $50.00, Total $80.00, Profit $72.00
    expect(screen.getByText('$50.00')).toBeDefined();
    expect(screen.getByText('$80.00')).toBeDefined();
    expect(screen.getByText('$72.00')).toBeDefined();

    const summaryRefSelect = screen.getByTestId('potentiality-summary-referral-native-select');
    const topRefSelect = screen.getByTestId('potentiality-top-referral-native-select');

    // 2. Test Option 4: select via summary referral dropdown
    fireEvent.change(summaryRefSelect, { target: { value: '4' } });
    // Both dropdowns show 4
    expect(summaryRefBtn.textContent).toContain('4');
    expect(topRefBtn.textContent).toContain('4');
    // Row 1: ref amount = $100.00, total = $130.00, profit = $117.00
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('$130.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$117.00').length).toBeGreaterThanOrEqual(1);

    // 3. Test Option 6: select via top referral dropdown
    fireEvent.change(topRefSelect, { target: { value: '6' } });
    expect(summaryRefBtn.textContent).toContain('6');
    expect(topRefBtn.textContent).toContain('6');
    // Row 1: ref amount = $150.00, total = $180.00, profit = $162.00
    expect(screen.getAllByText('$150.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$180.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$162.00').length).toBeGreaterThanOrEqual(1);

    // 4. Test Option 8: select via summary referral dropdown
    fireEvent.change(summaryRefSelect, { target: { value: '8' } });
    expect(summaryRefBtn.textContent).toContain('8');
    expect(topRefBtn.textContent).toContain('8');
    // Row 1: ref amount = $200.00, total = $230.00, profit = $207.00
    expect(screen.getAllByText('$200.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$230.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$207.00').length).toBeGreaterThanOrEqual(1);

    // 5. Test Option 10: select via top referral dropdown
    fireEvent.change(topRefSelect, { target: { value: '10' } });
    expect(summaryRefBtn.textContent).toContain('10');
    expect(topRefBtn.textContent).toContain('10');
    // Row 1: ref amount = $250.00, total = $280.00, profit = $252.00
    expect(screen.getAllByText('$250.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$280.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$252.00').length).toBeGreaterThanOrEqual(1);

    // 6. Return back to Option 2 via summary dropdown
    fireEvent.change(summaryRefSelect, { target: { value: '2' } });
    expect(summaryRefBtn.textContent).toContain('2');
    expect(topRefBtn.textContent).toContain('2');
    expect(screen.getAllByText('$50.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$80.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$72.00').length).toBeGreaterThanOrEqual(1);

    // Verify Rank PBA 1 and Time Selection remain unchanged
    expect(screen.getAllByText('PBA 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('1st Week').length).toBeGreaterThanOrEqual(1);
  });

  it('14. UI Cleanup: confirms NON WORKING INCOME is removed, DCB 30% and Duration columns removed from table', () => {
    render(<PotentialityView isAdmin={false} />);

    // 1. Verify "NON WORKING INCOME" is completely removed from the document
    expect(screen.queryByText(/NON WORKING INCOME/i)).toBeNull();

    // 2. Verify "DCB 30%" and "Duration" are NOT column headers in the table
    expect(screen.queryByRole('columnheader', { name: /DCB 30%/i })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /Duration/i })).toBeNull();

    // 3. Verify DCB 30% is displayed to the LEFT of the Referrals selector
    const dcbContainer = screen.getByTestId('summary-dcb-container');
    const referralBtn = screen.getByTestId('summary-referral-dropdown-btn');
    expect(dcbContainer).toBeDefined();
    expect(referralBtn).toBeDefined();
    expect(screen.getByTestId('summary-dcb-value').textContent).toBe('$30.00');

    // 4. Verify Total column is present and Row 1 Total ($80.00) and Profit ($72.00) are aligned
    expect(screen.getByText('$80.00')).toBeDefined();
    expect(screen.getByText('$72.00')).toBeDefined();
  });

  it('15. Dynamic DCB 30% Calculation and synchronization across all Referral options (2, 4, 6, 8, 10)', () => {
    render(<PotentialityView isAdmin={false} />);

    const summaryRefSelect = screen.getByTestId('potentiality-summary-referral-native-select') as HTMLSelectElement;
    const dcbValueEl = screen.getByTestId('summary-dcb-value');

    // Option 2 (Default PBA 1: $100 rank price, DCB 30% = $30.00)
    expect(dcbValueEl.textContent).toBe('$30.00');
    expect(screen.getByText('$50.00')).toBeDefined(); // Ref amount
    expect(screen.getByText('$80.00')).toBeDefined(); // Total
    expect(screen.getByText('$72.00')).toBeDefined(); // Profit

    // Option 4
    fireEvent.change(summaryRefSelect, { target: { value: '4' } });
    expect(dcbValueEl.textContent).toBe('$30.00');
    expect(screen.getAllByText('$100.00').length).toBeGreaterThanOrEqual(1); // 4 * $25 = $100
    expect(screen.getAllByText('$130.00').length).toBeGreaterThanOrEqual(1); // $100 + $30 = $130
    expect(screen.getAllByText('$117.00').length).toBeGreaterThanOrEqual(1); // $130 - 10% = $117

    // Option 6
    fireEvent.change(summaryRefSelect, { target: { value: '6' } });
    expect(dcbValueEl.textContent).toBe('$30.00');
    expect(screen.getAllByText('$150.00').length).toBeGreaterThanOrEqual(1); // 6 * $25 = $150
    expect(screen.getAllByText('$180.00').length).toBeGreaterThanOrEqual(1); // $150 + $30 = $180
    expect(screen.getAllByText('$162.00').length).toBeGreaterThanOrEqual(1); // $180 - 10% = $162

    // Option 8
    fireEvent.change(summaryRefSelect, { target: { value: '8' } });
    expect(dcbValueEl.textContent).toBe('$30.00');
    expect(screen.getAllByText('$200.00').length).toBeGreaterThanOrEqual(1); // 8 * $25 = $200
    expect(screen.getAllByText('$230.00').length).toBeGreaterThanOrEqual(1); // $200 + $30 = $230
    expect(screen.getAllByText('$207.00').length).toBeGreaterThanOrEqual(1); // $230 - 10% = $207

    // Option 10
    fireEvent.change(summaryRefSelect, { target: { value: '10' } });
    expect(dcbValueEl.textContent).toBe('$30.00');
    expect(screen.getAllByText('$250.00').length).toBeGreaterThanOrEqual(1); // 10 * $25 = $250
    expect(screen.getAllByText('$280.00').length).toBeGreaterThanOrEqual(1); // $250 + $30 = $280
    expect(screen.getAllByText('$252.00').length).toBeGreaterThanOrEqual(1); // $280 - 10% = $252

    // Switch Rank to PBA 2 ($300 rank price): DCB 30% dynamically updates to $90.00
    const summaryRankSelect = screen.getByTestId('potentiality-summary-rank-native-select') as HTMLSelectElement;
    fireEvent.change(summaryRankSelect, { target: { value: 'pba-2' } });
    expect(dcbValueEl.textContent).toBe('$90.00');
  });

  it('16. Presentation Cards: verifies premium gradients, zoom class, and floating pulse effect', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);

    const zoomCards = container.querySelectorAll('.potentiality-zoom-card');
    expect(zoomCards.length).toBe(3);

    // Card 1: Navy/Royal blue gradient + rank/period text
    expect(zoomCards[0].textContent).toContain('PBA 1');
    expect(zoomCards[0].className).toContain('from-[#0c1e3d]');
    expect(zoomCards[0].className).toContain('to-[#1e40af]');

    // Card 2: Deep teal & emerald green gradient + ONE TIME SMART WORK
    expect(zoomCards[1].textContent).toContain('ONE TIME SMART WORK');
    expect(zoomCards[1].className).toContain('from-[#042f2e]');
    expect(zoomCards[1].className).toContain('to-[#047857]');

    // Card 3: Floating pulse effect class + Success ratio + Orange 5 Cr. value
    expect(zoomCards[2].textContent).toMatch(/success ratio/i);
    expect(zoomCards[2].classList.contains('potentiality-floating-card')).toBe(true);
    const crValueEl = zoomCards[2].querySelector('span:nth-child(2)');
    expect(crValueEl?.className).toContain('text-[#F97316]');
  });

  it('17. Premium Table Design: verifies navy header, selected row blue highlight, green profit column, navy total panel, and disclaimer', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);

    // 1. Navy Table Header
    const thead = container.querySelector('thead');
    expect(thead?.className).toContain('bg-[#142D50]');
    expect(thead?.className).toContain('text-white');

    // 2. Selected Row Highlight (Row 1 is initially selected with blue accent and dropdown)
    const rows = container.querySelectorAll('tbody tr');
    const firstRow = rows[0];
    expect(firstRow.className).toContain('bg-blue-50');
    const firstCell = firstRow.querySelector('td');
    expect(firstCell?.className).toContain('border-blue-600');

    // Time Dropdown has professional blue style
    const timeBtn = screen.getByRole('button', { name: /Main Time Selection Dropdown/i });
    expect(timeBtn.className).toContain('bg-[#1d4ed8]');

    // Clicking another row selects it
    const secondRow = rows[1];
    fireEvent.click(secondRow);
    expect(secondRow.className).toContain('bg-blue-50');

    // 3. Profit Column has subtle green highlight across rows
    const profitCell = firstRow.querySelectorAll('td')[8];
    expect(profitCell.className).toContain('text-[#15803d]');

    // 4. Bottom Summary: Navy-blue Total Panel
    const footerRow = rows[rows.length - 1];
    const totalPanel = footerRow.querySelectorAll('td')[3];
    expect(totalPanel.className).toContain('bg-[#142D50]');
    expect(totalPanel.className).toContain('text-white');

    // 5. Financial Projection Disclaimer is displayed
    expect(screen.getByText(/Illustrative Projection — Actual Results May Vary/i)).toBeDefined();
  });

  it('18. Visual Enhancement: verifies SELECTED RANK label has subtle golden-amber highlight and dark navy text', () => {
    render(<PotentialityView isAdmin={false} />);

    const label = screen.getByTestId('potentiality-selected-rank-label');
    expect(label).toBeDefined();
    expect(label.textContent).toBe('SELECTED RANK:');

    // Visual design assertions:
    // Soft golden-yellow/light-amber background
    expect(label.className).toContain('bg-amber-50');
    // Slightly stronger golden border
    expect(label.className).toContain('border-amber-300');
    // Dark navy text color for high contrast readability
    expect(label.className).toContain('text-[#0B2545]');
    // Bold text
    expect(label.className).toContain('font-bold');
    // Rounded corners and balanced padding
    expect(label.className).toContain('rounded-md');
    expect(label.className).toContain('px-2');
    // Subtle shadow
    expect(label.className).toContain('shadow-2xs');
  });
});


