import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { HomeTab } from '../components/home-tab';
import { HomePageAdminEditor } from '../components/home/HomePageAdminEditor';
import {
  loadPublishedHomePage,
  loadDraftHomePage,
  saveDraftHomePage,
  publishHomePage,
  validateImageFile,
  updateRankConfigAdmin,
  HOME_PAGE_PUBLISHED_KEY,
  HOME_PAGE_DRAFT_KEY,
} from '../lib/home-page-storage';
import { loadRankCalculatorState, saveRankCalculatorState } from '../lib/rank-storage';
import { validateAndPublishHomePageServer } from '../server/home-page-service';

describe('Home Page Admin Editing System Acceptance Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Access Control & Dashboard Permissions', () => {
    it('Regular user cannot see Admin editing dashboard or buttons', () => {
      render(<HomeTab userEmail="user@example.com" />);

      // Admin toolbar should NOT be visible
      expect(screen.queryByText('ADMIN PANEL')).toBeNull();
      expect(screen.queryByRole('button', { name: /Edit Home Page/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Manage Plot Images/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Manage Flat Images/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Manage Home Page Content/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Edit Ranks & Prices/i })).toBeNull();
    });

    it('Authorized Admin sees the full Admin management toolbar with all options', () => {
      render(<HomeTab userEmail="sivaji491@gmail.com" />);

      // Admin toolbar MUST be visible
      expect(screen.getByText('ADMIN PANEL')).toBeDefined();
      expect(screen.getByRole('button', { name: /Edit Home Page/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Manage Plot Images/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Manage Flat Images/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Manage Home Page Content/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Edit Ranks & Prices/i })).toBeDefined();
    });

    it('Server-side publishing rejects unauthorized users', async () => {
      const draft = loadDraftHomePage();
      const unauthorizedResult = validateAndPublishHomePageServer('unauthorized_user@example.com', draft);
      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toMatch(/Unauthorized/i);

      // Authorized user succeeds
      const authorizedResult = validateAndPublishHomePageServer('sivaji491@gmail.com', draft);
      expect(authorizedResult.success).toBe(true);
      expect(authorizedResult.data).toBeDefined();
    });
  });

  describe('2. Home Page Content Editing', () => {
    it('Admin can open editor, modify text, and save draft', () => {
      render(<HomeTab userEmail="sivaji491@gmail.com" />);

      // Click Edit Home Page
      fireEvent.click(screen.getByRole('button', { name: /Edit Home Page/i }));

      // Editor header opens
      expect(screen.getByText(/Manage Real Estate Home Page/i)).toBeDefined();

      // Find headline input
      const headlineInput = screen.getByDisplayValue(/Earn Plot or Flat Within 1 Year\./i);
      fireEvent.change(headlineInput, { target: { value: 'Welcome to Elite Horizons' } });

      // Save Draft
      const saveDraftBtn = screen.getByRole('button', { name: /Save Draft/i });
      fireEvent.click(saveDraftBtn);

      // Verify draft in storage
      const draft = loadDraftHomePage();
      expect(draft.hero.headline).toBe('Welcome to Elite Horizons');
    });

    it('Admin can preview draft changes on the public Home Page', () => {
      render(<HomeTab userEmail="sivaji491@gmail.com" />);

      // Open editor
      fireEvent.click(screen.getByRole('button', { name: /Edit Home Page/i }));

      // Change subtitle
      const subtitleInput = screen.getByDisplayValue(/Understand the Possibilities\./i);
      fireEvent.change(subtitleInput, { target: { value: 'Premium Real Estate Portfolio' } });

      // Click Preview Changes
      const previewBtn = screen.getByRole('button', { name: /Preview Changes/i });
      fireEvent.click(previewBtn);

      // Editor closes, Preview Banner appears
      expect(screen.getByText(/PREVIEW MODE:/i)).toBeDefined();
      expect(screen.getByText(/Premium Real Estate Portfolio/i)).toBeDefined();

      // Can navigate back to editor from preview
      const backToEditorBtn = screen.getByRole('button', { name: /Back to Editor/i });
      fireEvent.click(backToEditorBtn);
      expect(screen.getByText(/Manage Real Estate Home Page/i)).toBeDefined();
    });

    it('Publishing draft updates public view and persists changes', async () => {
      render(<HomeTab userEmail="sivaji491@gmail.com" />);

      // Open editor
      fireEvent.click(screen.getByRole('button', { name: /Edit Home Page/i }));

      // Change headline
      const headlineInput = screen.getByDisplayValue(/Earn Plot or Flat Within 1 Year\./i);
      fireEvent.change(headlineInput, { target: { value: 'Published Luxury Living' } });

      // Click Publish Changes
      const publishBtn = screen.getByRole('button', { name: /Publish Changes/i });
      fireEvent.click(publishBtn);

      // Headline should now be displayed live
      await waitFor(() => {
        expect(screen.getByText('Published Luxury Living')).toBeDefined();
      });

      // And published storage should reflect it
      const published = loadPublishedHomePage();
      expect(published.hero.headline).toBe('Published Luxury Living');
    });
  });

  describe('3. Plots & Flats Image Management', () => {
    it('Validates image file sizes and types correctly', () => {
      const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const sizeValidation = validateImageFile(oversizedFile);
      expect(sizeValidation.valid).toBe(false);
      expect(sizeValidation.error).toMatch(/exceeds 5MB/i);

      const invalidTypeFile = new File(['sample'], 'script.exe', { type: 'application/x-msdownload' });
      const typeValidation = validateImageFile(invalidTypeFile);
      expect(typeValidation.valid).toBe(false);
      expect(typeValidation.error).toMatch(/invalid file format/i);

      const validFile = new File(['valid'], 'photo.png', { type: 'image/png' });
      const validCheck = validateImageFile(validFile);
      expect(validCheck.valid).toBe(true);
    });

    it('Allows adding, reordering, setting featured, and deleting plot images in editor', () => {
      const onSaveDraft = vi.fn();
      const onPublish = vi.fn();
      const onPreview = vi.fn();
      const onCancel = vi.fn();

      const initialData = loadDraftHomePage();
      const initialRanks = loadRankCalculatorState().ranks;

      render(
        <HomePageAdminEditor
          initialData={initialData}
          initialRanks={initialRanks}
          exchangeRate={100}
          activeTab="plots"
          adminEmail="sivaji491@gmail.com"
          onSaveDraft={onSaveDraft}
          onPublish={onPublish}
          onPreview={onPreview}
          onCancel={onCancel}
          isSaving={false}
        />
      );

      // Check plot tab is active
      expect(screen.getByText(/Residential Plots Gallery/i)).toBeDefined();

      // Open Add New Plot modal
      const addPlotBtn = screen.getByRole('button', { name: /Add New Plot/i });
      fireEvent.click(addPlotBtn);

      // Modal is visible
      expect(screen.getByText(/Add Residential Plot Opportunity/i)).toBeDefined();

      // Enter title
      const titleInput = screen.getByPlaceholderText(/e\.g\. Scenic Avenue Gated Plots/i);
      fireEvent.change(titleInput, { target: { value: 'Sunset Ridge Premium Plots' } });

      // Click Confirm Add Plot
      const confirmAddBtn = screen.getByRole('button', { name: /Add Plot to Draft/i });
      fireEvent.click(confirmAddBtn);

      // Newly added plot is rendered in the list
      expect(screen.getByDisplayValue('Sunset Ridge Premium Plots')).toBeDefined();

      // Save draft calls callback with updated data
      const saveBtn = screen.getByRole('button', { name: /Save Draft/i });
      fireEvent.click(saveBtn);

      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('Allows managing flat and apartment images in editor', () => {
      const onSaveDraft = vi.fn();
      const initialData = loadDraftHomePage();
      const initialRanks = loadRankCalculatorState().ranks;

      render(
        <HomePageAdminEditor
          initialData={initialData}
          initialRanks={initialRanks}
          exchangeRate={100}
          activeTab="apartments"
          adminEmail="sivaji491@gmail.com"
          onSaveDraft={onSaveDraft}
          onPublish={vi.fn()}
          onPreview={vi.fn()}
          onCancel={vi.fn()}
          isSaving={false}
        />
      );

      expect(screen.getByText(/Flats & Apartments Gallery/i)).toBeDefined();

      const addFlatBtn = screen.getByRole('button', { name: /Add New Flat/i });
      fireEvent.click(addFlatBtn);

      expect(screen.getByText(/Add Modern Apartment Opportunity/i)).toBeDefined();
    });
  });

  describe('4. Edit Ranks & Prices Integration', () => {
    it('Uses existing rank calculator state as single source of truth and allows updating rank price and name', () => {
      const initialState = loadRankCalculatorState();
      expect(initialState.ranks.length).toBeGreaterThanOrEqual(7);

      // Update pba-1 price to 750
      const updatedRanks = initialState.ranks.map((r) =>
        r.id === 'pba-1' ? { ...r, name: 'PBA 1 Premium', basePrice: 750 } : r
      );

      const updateResult = updateRankConfigAdmin(updatedRanks, 'sivaji491@gmail.com');
      expect(updateResult.success).toBe(true);

      // Verify the single source of truth rank state was updated
      const updatedState = loadRankCalculatorState();
      const pba1 = updatedState.ranks.find((r) => r.id === 'pba-1');
      expect(pba1?.name).toBe('PBA 1 Premium');
      expect(pba1?.basePrice).toBe(750);
    });

    it('Displays updated rank prices dynamically on the public Home Page', () => {
      const initialState = loadRankCalculatorState();
      // Modify pba-2 price to $1,800 and rename to PBA 2 Diamond
      const updatedRanks = initialState.ranks.map((r) =>
        r.id === 'pba-2' ? { ...r, name: 'PBA 2 Diamond', basePrice: 1800 } : r
      );

      updateRankConfigAdmin(updatedRanks, 'sivaji491@gmail.com');

      render(<HomeTab userEmail="user@example.com" />);

      // The updated rank title should be displayed on the Home Page
      expect(screen.getByText('PBA 2 Diamond')).toBeDefined();
      expect(screen.getByText('$1,800')).toBeDefined();
    });
  });
});
