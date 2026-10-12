import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { 
  DEFAULT_NAVIGATION_FIELDS, 
  getRegisteredNavigationFields,
  isUserAdminOrOwner
} from '../lib/permissions';
import { 
  loadEarningOpportunities,
  saveEarningOpportunitiesAdmin,
  validateEarningOpportunities,
  EARNING_OPPORTUNITIES_STORAGE_KEY
} from '../lib/earning-opportunities-storage';
import { 
  getEarningOpportunitiesServerState, 
  validateAndUpdateEarningOpportunitiesServer 
} from '../server/earning-opportunities-service';
import { EarningOpportunitiesView } from '../components/earning-opportunities/EarningOpportunitiesView';
import { DEFAULT_EARNING_OPPORTUNITIES } from '../types/earning-opportunities';

describe('Earning Opportunities & Source Structure Acceptance Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('1. Navigation Order: Earning Opportunities appears immediately after User Management', () => {
    const fields = getRegisteredNavigationFields();
    const usersIndex = fields.findIndex((f) => f.id === 'users');
    const earningIndex = fields.findIndex((f) => f.id === 'earning-opportunities');

    expect(usersIndex).toBeGreaterThanOrEqual(0);
    expect(earningIndex).toBe(usersIndex + 1);
    expect(fields[earningIndex].label).toBe('Earning Opportunities');
  });

  it('2. Default Content: Renders Source Structure heading, subtitle, and 5 bonus concepts', () => {
    render(<EarningOpportunitiesView isAdmin={false} userEmail="user@example.com" />);

    // Heading and Subtitle
    expect(screen.getByText('Source Structure')).toBeDefined();
    expect(screen.getByText(/IG Infra rewards your efforts/i)).toBeDefined();

    // 5 Earning Opportunities (rendered in both desktop and mobile views)
    expect(screen.getAllByText(/12 Level Bonus/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Double Connect Bonus \(DCB\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Token Appreciation Bonus/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Monthly Bonanza/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Global Pool Income/i).length).toBeGreaterThan(0);

    // Regular users do NOT see Edit controls
    expect(screen.queryByText(/Edit Structure/i)).toBeNull();
    expect(screen.queryByText(/Save Changes/i)).toBeNull();
  });

  it('3. Read-Only Enforcement: Regular users cannot see or access editing controls', () => {
    const { queryByText, queryByPlaceholderText } = render(
      <EarningOpportunitiesView isAdmin={false} userEmail="regular.user@nexora.io" />
    );

    // No edit toggle button
    expect(queryByText('Edit Structure')).toBeNull();
    // No edit inputs
    expect(queryByPlaceholderText('Source Structure')).toBeNull();
    expect(queryByText('Add Opportunity')).toBeNull();
    expect(queryByText('Save Changes')).toBeNull();
  });

  it('4. Admin Editing: Administrator can edit heading, subtitle, items, and save changes', async () => {
    render(<EarningOpportunitiesView isAdmin={true} userEmail="sivaji491@gmail.com" />);

    // Admin sees the Edit Structure button
    const editBtn = screen.getByText('Edit Structure');
    expect(editBtn).toBeDefined();

    // Click Edit Structure
    fireEvent.click(editBtn);

    // Edit form inputs should be present
    const headingInput = screen.getByPlaceholderText('Source Structure');
    expect(headingInput).toBeDefined();

    // Change heading
    fireEvent.change(headingInput, { target: { value: 'Source Structure Pro' } });

    // Save changes (top or bottom button)
    const saveButtons = screen.getAllByText('Save Changes');
    expect(saveButtons.length).toBeGreaterThan(0);
    fireEvent.click(saveButtons[0]);

    // Verify saved heading is displayed
    await waitFor(() => {
      expect(screen.getByText('Source Structure Pro')).toBeDefined();
    });

    // Verify persistent storage
    const stored = loadEarningOpportunities();
    expect(stored.heading).toBe('Source Structure Pro');
  });

  it('5. Persistence Across Reload: Stored updates reload accurately from storage/backend', () => {
    // Save modified data via admin action
    const modified = {
      ...DEFAULT_EARNING_OPPORTUNITIES,
      heading: 'Source Structure Tier 2',
      subtitle: 'Customized compensation model for leadership.',
    };

    saveEarningOpportunitiesAdmin(modified, 'sivaji491@gmail.com');

    // Load in a fresh render as a regular user
    render(<EarningOpportunitiesView isAdmin={false} userEmail="member@example.com" />);

    expect(screen.getByText('Source Structure Tier 2')).toBeDefined();
    expect(screen.getByText('Customized compensation model for leadership.')).toBeDefined();
  });

  it('6. Server Security Enforcement: Rejects unauthorized non-admin save requests', () => {
    const maliciousPayload = {
      ...DEFAULT_EARNING_OPPORTUNITIES,
      heading: 'Hacked Structure',
    };

    // Non-admin attempt via server validation
    const serverResult = validateAndUpdateEarningOpportunitiesServer('unauthorized_user', maliciousPayload);
    expect(serverResult.success).toBe(false);
    expect(serverResult.error).toContain('Unauthorized');

    // Storage remains intact
    const current = loadEarningOpportunities();
    expect(current.heading).not.toBe('Hacked Structure');
  });

  it('7. Validation Rules: Prevents saving empty headings or empty item titles', async () => {
    // Empty heading validation
    const invalidHeading = {
      ...DEFAULT_EARNING_OPPORTUNITIES,
      heading: '   ',
    };
    const headingValidation = validateEarningOpportunities(invalidHeading);
    expect(headingValidation.valid).toBe(false);
    expect(headingValidation.error).toContain('heading is required');

    // Empty item title validation
    const invalidItems = {
      ...DEFAULT_EARNING_OPPORTUNITIES,
      items: [
        {
          ...DEFAULT_EARNING_OPPORTUNITIES.items[0],
          title: '',
        },
      ],
    };
    const itemValidation = validateEarningOpportunities(invalidItems);
    expect(itemValidation.valid).toBe(false);
    expect(itemValidation.error).toContain('cannot be empty');
  });

  it('8. Circular Diagram Components: Renders SVG segments and icons cleanly', () => {
    const { container } = render(
      <EarningOpportunitiesView isAdmin={false} userEmail="user@example.com" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    // Checks path segments
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThanOrEqual(5);
  });

  it('9. Enterprise Fintech Grid Layout: 5 opportunity cards in responsive grid with card numbers, breadcrumb, and clean hierarchy', () => {
    const { container } = render(
      <EarningOpportunitiesView isAdmin={false} userEmail="user@example.com" />
    );

    // Root page container with fintech background
    const pageContainer = container.querySelector('.source-structure-page');
    expect(pageContainer).toBeDefined();

    // Breadcrumb navigation
    expect(screen.getByText('Business Plan')).toBeDefined();
    expect(screen.getByText('Source Structure')).toBeDefined();

    // 5 Opportunity Cards Grid
    const cardGrid = container.querySelector('.grid.grid-cols-1');
    expect(cardGrid).toBeDefined();

    // Verify all 5 card numbers (01, 02, 03, 04, 05)
    expect(screen.getByText('01')).toBeDefined();
    expect(screen.getByText('02')).toBeDefined();
    expect(screen.getByText('03')).toBeDefined();
    expect(screen.getByText('04')).toBeDefined();
    expect(screen.getByText('05')).toBeDefined();

    // Verify opportunity titles
    expect(screen.getByText('12 Level Bonus')).toBeDefined();
    expect(screen.getByText('Double Connect Bonus (DCB)')).toBeDefined();
    expect(screen.getByText('Token Appreciation Bonus')).toBeDefined();
    expect(screen.getByText('Monthly Bonanza')).toBeDefined();
    expect(screen.getByText('Global Pool Income')).toBeDefined();

    // Verify active tier indicator
    const activeIndicators = screen.getAllByText('Active Tier');
    expect(activeIndicators.length).toBe(5);
  });

  it('10. Continuous Slow Wheel Rotation & Hover Pause: Wheel rotates continuously and pauses on mouse hover', () => {
    const { container } = render(
      <EarningOpportunitiesView isAdmin={false} userEmail="user@example.com" />
    );

    // Locate the wheel wrapper and rotating SVG wheel
    const wheelWrapper = container.querySelector('.earning-opportunities-wheel-wrapper') as HTMLElement;
    const wheelSvg = container.querySelector('.earning-opportunities-wheel') as SVGElement;

    expect(wheelWrapper).toBeDefined();
    expect(wheelSvg).toBeDefined();

    // Initially running
    expect(wheelSvg.style.animationPlayState).toBe('running');
    expect(wheelSvg.classList.contains('paused')).toBe(false);

    // Mouse enter pauses the rotation
    fireEvent.mouseEnter(wheelWrapper);
    expect(wheelSvg.style.animationPlayState).toBe('paused');
    expect(wheelSvg.classList.contains('paused')).toBe(true);

    // Mouse leave resumes the rotation
    fireEvent.mouseLeave(wheelWrapper);
    expect(wheelSvg.style.animationPlayState).toBe('running');
    expect(wheelSvg.classList.contains('paused')).toBe(false);

    // Touch events on mobile
    fireEvent.touchStart(wheelWrapper);
    expect(wheelSvg.style.animationPlayState).toBe('paused');

    fireEvent.touchEnd(wheelWrapper);
    expect(wheelSvg.style.animationPlayState).toBe('running');
  });
});

