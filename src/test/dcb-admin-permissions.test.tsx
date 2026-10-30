import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DcbNinetyDaysView } from '@/components/dcb-bonus/DcbNinetyDaysView';
import {
  loadDcbConfig,
  saveDcbConfigAdmin,
  saveDcbConfigLocal,
  resetDcbConfigAdmin,
  DEFAULT_DCB_CONFIG,
  DCB_CONFIG_STORAGE_KEY,
  DCB_CONFIG_UPDATED_EVENT
} from '@/lib/dcb-storage';
import {
  updateDcbConfigServer,
  getDcbServerConfig,
  resetDcbConfigServer,
  updateDcbConfigFn
} from '@/server/dcb-service';

describe('DCB (90 Days) Admin-Only Editing & Access Control', () => {
  beforeEach(() => {
    window.localStorage.clear();
    saveDcbConfigLocal(DEFAULT_DCB_CONFIG);
  });

  // Scenario 1: Admin clicks Edit, changes fields, clicks Cancel -> fields revert
  it('Scenario 1: Admin edits fields and clicks Cancel -> draft changes revert to published values', async () => {
    render(<DcbNinetyDaysView isAdmin={true} userEmail="sivaji491@gmail.com" />);

    // Admin edit button should be visible
    const editBtn = screen.getByTestId('dcb-admin-edit-btn');
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    // Editing panel opens
    expect(screen.getByTestId('dcb-admin-editing-panel')).toBeInTheDocument();

    const ref1Input = screen.getByTestId('dcb-input-ref1-percent');
    expect(ref1Input).toHaveValue(25);

    // Modify Ref 1 percentage to 35%
    fireEvent.change(ref1Input, { target: { value: '35' } });
    expect(ref1Input).toHaveValue(35);

    // Modify eligibility days to 120
    const daysInput = screen.getByTestId('dcb-input-eligibility-days');
    fireEvent.change(daysInput, { target: { value: '120' } });
    expect(daysInput).toHaveValue(120);

    // Click Cancel
    const cancelBtn = screen.getByTestId('dcb-admin-cancel-btn');
    fireEvent.click(cancelBtn);

    // Editing panel should close
    expect(screen.queryByTestId('dcb-admin-editing-panel')).not.toBeInTheDocument();

    // Verify localStorage was NOT modified
    const stored = loadDcbConfig();
    expect(stored.ref1Percentage).toBe(25);
    expect(stored.eligibilityPeriodDays).toBe(90);

    // Reopen edit mode and ensure values are back to original
    fireEvent.click(screen.getByTestId('dcb-admin-edit-btn'));
    expect(screen.getByTestId('dcb-input-ref1-percent')).toHaveValue(25);
    expect(screen.getByTestId('dcb-input-eligibility-days')).toHaveValue(90);
  });

  // Scenario 2: Admin edits fields and clicks Save -> saves to backend, shows success message, calculations update
  it('Scenario 2: Admin edits fields and clicks Save -> saves successfully with success feedback and live calculations update', async () => {
    render(<DcbNinetyDaysView isAdmin={true} userEmail="sivaji491@gmail.com" />);

    // Click Edit
    fireEvent.click(screen.getByTestId('dcb-admin-edit-btn'));

    // Update DCB release percentage from 30% to 40%
    const releaseInput = screen.getByTestId('dcb-input-release-percent');
    fireEvent.change(releaseInput, { target: { value: '40' } });

    // Update Withdrawal Fee from 10% to 15%
    const feeInput = screen.getByTestId('dcb-input-fee-percent');
    fireEvent.change(feeInput, { target: { value: '15' } });

    // Update Eligibility days from 90 to 60
    const daysInput = screen.getByTestId('dcb-input-eligibility-days');
    fireEvent.change(daysInput, { target: { value: '60' } });

    // Click Save
    const saveBtn = screen.getByTestId('dcb-admin-save-btn');
    fireEvent.click(saveBtn);

    // Success feedback appears
    await waitFor(() => {
      expect(screen.getByTestId('dcb-feedback-success')).toBeInTheDocument();
      expect(screen.getByText(/configuration updated and saved successfully/i)).toBeInTheDocument();
    });

    // Panel closes after successful save
    expect(screen.queryByTestId('dcb-admin-editing-panel')).not.toBeInTheDocument();

    // Storage is updated
    const savedConfig = loadDcbConfig();
    expect(savedConfig.dcbReleasePercentage).toBe(40);
    expect(savedConfig.withdrawalFeePercentage).toBe(15);
    expect(savedConfig.eligibilityPeriodDays).toBe(60);

    // UI displays updated values
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('40%');
    expect(screen.getByText(/60-Day Eligibility Cycle Active/i)).toBeInTheDocument();
    expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('40% DCB');
    expect(screen.getByTestId('dcb-card-net')).toHaveTextContent('Net (15% fee)');
  });

  // Scenario 3: Real-time synchronization without page reload
  it('Scenario 3: When Admin saves new values, active User screens update immediately without page reload', async () => {
    // Render normal User screen
    render(<DcbNinetyDaysView isAdmin={false} userEmail="user@nexora.example" />);

    // Initially displays 30% DCB Benefit and 90-day cycle
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('30%');
    expect(screen.getByText(/90-Day Eligibility Cycle Active/i)).toBeInTheDocument();
    expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('30% DCB');

    // Simulate Admin saving new values from another component or tab (e.g. 50% DCB and 45 days)
    const updatedByAdmin = {
      ...DEFAULT_DCB_CONFIG,
      dcbReleasePercentage: 50,
      eligibilityPeriodDays: 45,
    };
    act(() => {
      saveDcbConfigLocal(updatedByAdmin);
    });

    // The User view must update immediately via event listener without reloading the page
    await waitFor(() => {
      expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('50%');
      expect(screen.getByText(/45-Day Eligibility Cycle Active/i)).toBeInTheDocument();
      expect(screen.getByTestId('dcb-card-30-dcb')).toHaveTextContent('50% DCB');
    });
  });

  // Scenario 4: User logs in or refreshes -> displays latest Admin-saved values
  it('Scenario 4: When a new User mounts or logs in, it loads the latest Admin-saved values', () => {
    // Admin previously saved custom configuration
    saveDcbConfigLocal({
      ...DEFAULT_DCB_CONFIG,
      ref1Percentage: 30,
      ref2Percentage: 30,
      dcbReleasePercentage: 35,
      withdrawalFeePercentage: 12,
      eligibilityPeriodDays: 100,
    });

    // Fresh user logs in
    render(<DcbNinetyDaysView isAdmin={false} userEmail="newuser@example.com" />);

    // View displays the saved values immediately
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('35%');
    expect(screen.getByTestId('dcb-card-ref-1')).toHaveTextContent('30%');
    expect(screen.getByTestId('dcb-card-ref-2')).toHaveTextContent('30%');
    expect(screen.getByTestId('dcb-card-net')).toHaveTextContent('Net (12% fee)');
    expect(screen.getByText(/100-Day Eligibility Cycle Active/i)).toBeInTheDocument();
  });

  // Scenario 5: User screen -> no Edit/Save/Cancel buttons visible, and API/backend rejects non-admin edits
  it('Scenario 5: Regular user view completely hides all administrative controls and API rejects non-admin edits', async () => {
    render(<DcbNinetyDaysView isAdmin={false} userEmail="regularuser@example.com" />);

    // Ensure all admin editing controls are completely hidden
    expect(screen.queryByTestId('dcb-admin-controls-container')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dcb-admin-edit-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dcb-admin-save-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dcb-admin-cancel-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dcb-admin-reset-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dcb-admin-editing-panel')).not.toBeInTheDocument();

    // Verify storage-level admin protection rejects non-admin
    const saveAttempt = await saveDcbConfigAdmin(
      { ...DEFAULT_DCB_CONFIG, dcbReleasePercentage: 99 },
      'regularuser@example.com'
    );
    expect(saveAttempt.success).toBe(false);
    expect(saveAttempt.error).toMatch(/unauthorized/i);

    // Verify server-side backend API rejects non-admin
    const serverAttempt = updateDcbConfigServer('regularuser@example.com', {
      ...DEFAULT_DCB_CONFIG,
      dcbReleasePercentage: 99,
    });
    expect(serverAttempt.success).toBe(false);
    expect(serverAttempt.error).toMatch(/unauthorized/i);

    // Verify reset attempt by non-admin is also rejected
    const resetAttempt = await resetDcbConfigAdmin('regularuser@example.com');
    expect(resetAttempt.success).toBe(false);
    expect(resetAttempt.error).toMatch(/unauthorized/i);

    const serverResetAttempt = resetDcbConfigServer('regularuser@example.com');
    expect(serverResetAttempt.success).toBe(false);
    expect(serverResetAttempt.error).toMatch(/unauthorized/i);
  });

  // Scenario 6: Log out Admin and User, log back in -> values persist
  it('Scenario 6: Values persist across user/admin sessions and re-logins', async () => {
    // Admin saves new settings
    const adminSave = await saveDcbConfigAdmin(
      {
        ...DEFAULT_DCB_CONFIG,
        ref1Percentage: 28,
        ref2Percentage: 28,
        dcbReleasePercentage: 42,
        withdrawalFeePercentage: 8,
        eligibilityPeriodDays: 75,
      },
      'sivaji491@gmail.com'
    );
    expect(adminSave.success).toBe(true);

    // Simulate session unmount (logout)
    // Log back in as Admin
    const { unmount: unmountAdmin } = render(<DcbNinetyDaysView isAdmin={true} userEmail="sivaji491@gmail.com" />);
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('42%');
    expect(screen.getByTestId('dcb-card-ref-1')).toHaveTextContent('28%');
    expect(screen.getByTestId('dcb-card-net')).toHaveTextContent('Net (8% fee)');
    expect(screen.getByText(/75-Day Eligibility Cycle Active/i)).toBeInTheDocument();
    unmountAdmin();

    // Log back in as regular User
    render(<DcbNinetyDaysView isAdmin={false} userEmail="member@nexora.example" />);
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('42%');
    expect(screen.getByTestId('dcb-card-ref-1')).toHaveTextContent('28%');
    expect(screen.getByTestId('dcb-card-net')).toHaveTextContent('Net (8% fee)');
    expect(screen.getByText(/75-Day Eligibility Cycle Active/i)).toBeInTheDocument();
  });

  // Validation tests: Invalid inputs must be caught and return descriptive error messages
  it('validates DCB inputs and prevents invalid values', async () => {
    render(<DcbNinetyDaysView isAdmin={true} userEmail="sivaji491@gmail.com" />);

    fireEvent.click(screen.getByTestId('dcb-admin-edit-btn'));

    // Attempt invalid percentage > 100
    const releaseInput = screen.getByTestId('dcb-input-release-percent');
    fireEvent.change(releaseInput, { target: { value: '150' } });

    fireEvent.click(screen.getByTestId('dcb-admin-save-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('dcb-feedback-error')).toBeInTheDocument();
      expect(screen.getByText(/must be a valid number between 0% and 100%/i)).toBeInTheDocument();
    });

    // Panel remains open so admin can fix error
    expect(screen.getByTestId('dcb-admin-editing-panel')).toBeInTheDocument();
  });

  // Reset to Defaults functionality
  it('allows Admin to reset DCB configuration to factory defaults', async () => {
    // Save non-default configuration first
    await saveDcbConfigAdmin(
      {
        ...DEFAULT_DCB_CONFIG,
        dcbReleasePercentage: 55,
        eligibilityPeriodDays: 180,
      },
      'sivaji491@gmail.com'
    );

    render(<DcbNinetyDaysView isAdmin={true} userEmail="sivaji491@gmail.com" />);
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('55%');

    fireEvent.click(screen.getByTestId('dcb-admin-edit-btn'));
    fireEvent.click(screen.getByTestId('dcb-admin-reset-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('dcb-feedback-success')).toBeInTheDocument();
      expect(screen.getByText(/reset to factory defaults successfully/i)).toBeInTheDocument();
    });

    // Values reverted to 30% and 90 days
    expect(screen.getByTestId('dcb-benefit-box')).toHaveTextContent('30%');
    expect(screen.getByText(/90-Day Eligibility Cycle Active/i)).toBeInTheDocument();
  });
});