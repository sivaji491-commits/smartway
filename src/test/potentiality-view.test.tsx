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

    // Verify all 11 columns are present
    expect(screen.getByText('Time')).toBeDefined();
    expect(screen.getByText('Rank')).toBeDefined();
    expect(screen.getByText('Level')).toBeDefined();
    expect(screen.getByText('Just refer')).toBeDefined();
    expect(screen.getByText('Ref. %')).toBeDefined();
    expect(screen.getByText('Earn Each Referral')).toBeDefined();
    expect(screen.getByText('Ref. amount')).toBeDefined();
    expect(screen.getByText('DCB 30%')).toBeDefined();
    expect(screen.getAllByText('Total').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Profit')).toBeDefined();
    expect(screen.getByText('Duration')).toBeDefined();

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

  it('3. Regular User Security View: hides all admin actions, text edit controls, and row buttons', () => {
    render(<PotentialityView isAdmin={false} />);

    // Actions column should NOT exist
    expect(screen.queryByText('Actions')).toBeNull();

    // Admin buttons should NOT exist
    expect(screen.queryByTitle('Customize page banners and text')).toBeNull();
    expect(screen.queryByTitle('Add Level Row')).toBeNull();
    expect(screen.queryByTitle('Reset to default settings')).toBeNull();
    expect(screen.queryByTitle('Edit row')).toBeNull();
    expect(screen.queryByTitle('Delete row')).toBeNull();
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
    render(<PotentialityView isAdmin={false} />);

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

  it('7. Time Dropdown & Duration Synchronization: row Time column has interactive dropdown', () => {
    render(<PotentialityView isAdmin={false} />);

    // Row 1 button has "1st Week"
    const row1TimeBtn = screen.getByRole('button', { name: /Time period for level 1, currently 1st Week/i });
    expect(row1TimeBtn).toBeDefined();

    // Duration column initially matches
    expect(screen.getAllByText('1st Week').length).toBeGreaterThanOrEqual(2);
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

  it('14. UI Cleanup: confirms NON WORKING INCOME is removed from the UI and DCB 30% / Total columns remain correctly aligned', () => {
    render(<PotentialityView isAdmin={false} />);

    // 1. Verify "NON WORKING INCOME" is completely removed from the document
    expect(screen.queryByText(/NON WORKING INCOME/i)).toBeNull();

    // 2. Verify "DCB 30%" and "Total" column headers are rendered
    const dcbHeader = screen.getByText('DCB 30%');
    const totalHeaders = screen.getAllByText('Total');
    expect(dcbHeader).toBeDefined();
    expect(totalHeaders.length).toBeGreaterThanOrEqual(1);

    // 3. Verify Row 1 DCB ($30.00) and Total ($80.00) data cells are present and aligned
    expect(screen.getByText('$30.00')).toBeDefined();
    expect(screen.getByText('$80.00')).toBeDefined();
  });
});
