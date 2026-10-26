import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  DEFAULT_ROUTE_MAP_CONTENT
} from '../types/route-map';
import {
  loadRouteMapContent,
  saveRouteMapContentLocal,
  saveRouteMapContentAdmin,
  resetRouteMapContentAdmin,
  validateRouteMapContent,
  ROUTE_MAP_STORAGE_KEY,
  ROUTE_MAP_UPDATED_EVENT
} from '../lib/route-map-storage';
import {
  DEFAULT_NAVIGATION_FIELDS,
  getRegisteredNavigationFields,
  getOrderedNavigationFields,
  getUserAllowedTabs,
  isUserAdminOrOwner,
  STORAGE_KEY as USERS_STORAGE_KEY
} from '../lib/permissions';
import { RouteMapView } from '../components/route-map/RouteMapView';

describe('Route Map Feature & Responsive Page Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------
  // 1. Sidebar & Permission Structure
  // -------------------------------------------------------------
  describe('1. Sidebar Registration & Role-based Permissions', () => {
    it('registers "route-map" in DEFAULT_NAVIGATION_FIELDS with Route icon', () => {
      const field = DEFAULT_NAVIGATION_FIELDS.find((f) => f.id === 'route-map');
      expect(field).toBeDefined();
      expect(field?.label).toBe('Route Map');
      expect(field?.iconName).toBe('Route');
      expect(field?.description).toContain('roadmap');
    });

    it('positions "route-map" adjacent to potentiality/customer-view in ordered fields', () => {
      const ordered = getOrderedNavigationFields();
      const routeMapIdx = ordered.findIndex((f) => f.id === 'route-map');
      const potentialityIdx = ordered.findIndex((f) => f.id === 'potentiality');
      expect(routeMapIdx).toBeGreaterThan(-1);
      expect(potentialityIdx).toBeGreaterThan(-1);
      // Route map is positioned immediately after potentiality
      expect(routeMapIdx).toBe(potentialityIdx + 1);
    });

    it('grants access to administrator sivaji491@gmail.com by default', () => {
      const allowed = getUserAllowedTabs('sivaji491@gmail.com');
      expect(allowed).toContain('route-map');
      expect(isUserAdminOrOwner('sivaji491@gmail.com')).toBe(true);
    });

    it('denies access to unconfigured normal users by default (least privilege)', () => {
      const allowed = getUserAllowedTabs('random_user@example.com');
      expect(allowed).not.toContain('route-map');
      expect(isUserAdminOrOwner('random_user@example.com')).toBe(false);
    });

    it('grants view access to normal user when explicitly added to permissions list', () => {
      const mockUsers = [
        {
          id: 'user-001',
          email: 'agent_user@example.com',
          name: 'Agent User',
          status: 'ACTIVE',
          permissions: ['home', 'route-map', 'earning-opportunities'],
        },
      ];
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));

      const allowed = getUserAllowedTabs('agent_user@example.com');
      expect(allowed).toContain('route-map');
      expect(isUserAdminOrOwner('agent_user@example.com')).toBe(false);
    });

    it('denies access when normal user account is disabled or expired', () => {
      const mockUsers = [
        {
          id: 'user-002',
          email: 'disabled_user@example.com',
          status: 'DISABLED',
          permissions: ['home', 'route-map'],
        },
      ];
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));

      const allowed = getUserAllowedTabs('disabled_user@example.com');
      expect(allowed).toHaveLength(0);
      expect(allowed).not.toContain('route-map');
    });
  });

  // -------------------------------------------------------------
  // 2. Storage & Content Management Mechanism
  // -------------------------------------------------------------
  describe('2. Content Management & Storage Mechanism', () => {
    it('returns default content ("One Time Work") when no saved data exists', () => {
      const content = loadRouteMapContent();
      expect(content.headlineText).toBe('One Time Work');
      expect(content.badgeText).toBe('LIFETIME ROADMAP');
    });

    it('validates empty and short input strings correctly', () => {
      expect(validateRouteMapContent('').isValid).toBe(false);
      expect(validateRouteMapContent('   ').isValid).toBe(false);
      expect(validateRouteMapContent('a').isValid).toBe(false);
      expect(validateRouteMapContent('One Time Work').isValid).toBe(true);
      expect(validateRouteMapContent('Lifetime Milestone').isValid).toBe(true);
    });

    it('allows authorized admin to save new headline text persistently', async () => {
      const res = await saveRouteMapContentAdmin('ONE TIME WORK & LIFETIME GAINS', 'sivaji491@gmail.com');
      expect(res.success).toBe(true);
      expect(res.content?.headlineText).toBe('ONE TIME WORK & LIFETIME GAINS');

      const loaded = loadRouteMapContent();
      expect(loaded.headlineText).toBe('ONE TIME WORK & LIFETIME GAINS');
    });

    it('blocks non-admin user from saving content', async () => {
      const res = await saveRouteMapContentAdmin('Hacked Content', 'unauthorized_user@example.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');

      // Preserves original content
      const loaded = loadRouteMapContent();
      expect(loaded.headlineText).toBe('One Time Work');
    });

    it('resets content back to default "One Time Work" via admin reset', async () => {
      // First save custom text
      await saveRouteMapContentAdmin('Custom Business Roadmap', 'sivaji491@gmail.com');
      expect(loadRouteMapContent().headlineText).toBe('Custom Business Roadmap');

      // Then reset
      const resetRes = await resetRouteMapContentAdmin('sivaji491@gmail.com');
      expect(resetRes.success).toBe(true);
      expect(resetRes.content?.headlineText).toBe('One Time Work');
      expect(loadRouteMapContent().headlineText).toBe('One Time Work');
    });
  });

  // -------------------------------------------------------------
  // 3. UI Component View & Permissions Rendering
  // -------------------------------------------------------------
  describe('3. RouteMapView Presentation & Role Views', () => {
    it('renders the supplied image and "One Time Work" text in normal user view', () => {
      render(<RouteMapView isAdmin={false} userEmail="member@example.com" />);

      // Hero image is present
      const img = screen.getByTestId('route-map-hero-img') as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.alt).toContain('Just 2 Referrals in Entire Life');

      // Headline "One Time Work" is visible
      const headline = screen.getByTestId('route-map-headline');
      expect(headline.textContent).toBe('One Time Work');

      // Milestone cards are rendered
      expect(screen.getByText('Just 2 Referrals in Entire Life')).toBeDefined();
      expect(screen.getByText('One Time Smart Work')).toBeDefined();
      expect(screen.getByText('Earn Plot or Flat Within 1 Year')).toBeDefined();
      expect(screen.getByText("Don't Take")).toBeDefined();
      expect(screen.getByText("Don't take even ₹1 from your own pocket. We are here to earn.")).toBeDefined();

      // Normal users CANNOT see edit or reset controls
      expect(screen.queryByTestId('edit-route-map-btn')).toBeNull();
      expect(screen.queryByTestId('reset-route-map-btn')).toBeNull();
      expect(screen.queryByTestId('route-map-edit-form')).toBeNull();
    });

    it('renders admin controls when isAdmin={true}', () => {
      render(<RouteMapView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const editBtn = screen.getByTestId('edit-route-map-btn');
      expect(editBtn).toBeDefined();
      expect(screen.getByTestId('reset-route-map-btn')).toBeDefined();
    });

    it('allows admin to open inline edit form, edit text, and save changes', async () => {
      render(<RouteMapView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      // Click Edit Text
      const editBtn = screen.getByTestId('edit-route-map-btn');
      fireEvent.click(editBtn);

      // Form appears
      const input = screen.getByTestId('route-map-input') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe('One Time Work');

      // Change input to new text
      fireEvent.change(input, { target: { value: 'One Time Work - Lifetime Assets' } });
      expect(input.value).toBe('One Time Work - Lifetime Assets');

      // Save changes
      const saveBtn = screen.getByTestId('save-route-map-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('route-map-edit-form')).toBeNull();
        expect(screen.getByTestId('route-map-headline').textContent).toBe('One Time Work - Lifetime Assets');
      }, { timeout: 4000 });
    });

    it('shows validation error when admin attempts to save empty text', async () => {
      render(<RouteMapView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      fireEvent.click(screen.getByTestId('edit-route-map-btn'));
      const input = screen.getByTestId('route-map-input');

      // Clear input
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(screen.getByTestId('save-route-map-btn'));

      // Error message is displayed and form remains open
      expect(screen.getByText(/Text cannot be empty/i)).toBeDefined();
      expect(screen.getByTestId('route-map-edit-form')).toBeDefined();
    });

    it('cancels edit mode without modifying text when Cancel is clicked', () => {
      render(<RouteMapView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      fireEvent.click(screen.getByTestId('edit-route-map-btn'));
      const input = screen.getByTestId('route-map-input');
      fireEvent.change(input, { target: { value: 'Discarded change' } });

      fireEvent.click(screen.getByTestId('cancel-form-btn'));

      // Form closes and original headline remains
      expect(screen.queryByTestId('route-map-edit-form')).toBeNull();
      expect(screen.getByTestId('route-map-headline').textContent).toBe('One Time Work');
    });

    it('opens and closes image expand modal', () => {
      render(<RouteMapView isAdmin={false} userEmail="member@example.com" />);

      // Modal is closed initially
      expect(screen.queryByAltText('IG Infra Route Map Full View')).toBeNull();

      // Click Expand View
      fireEvent.click(screen.getByText('Expand View'));

      // Full view modal is opened
      const fullImg = screen.getByAltText('IG Infra Route Map Full View');
      expect(fullImg).toBeDefined();

      // Close modal
      const closeBtn = screen.getByTitle('Close image view');
      fireEvent.click(closeBtn);

      expect(screen.queryByAltText('IG Infra Route Map Full View')).toBeNull();
    });

    it('triggers tab navigation callback when quick links are clicked', () => {
      const onNavigateMock = vi.fn();
      render(
        <RouteMapView
          isAdmin={false}
          userEmail="member@example.com"
          onNavigateToTab={onNavigateMock}
        />
      );

      fireEvent.click(screen.getByText('Potentiality'));
      expect(onNavigateMock).toHaveBeenCalledWith('potentiality');

      fireEvent.click(screen.getByText('Earning Opportunities'));
      expect(onNavigateMock).toHaveBeenCalledWith('earning-opportunities');
    });

    it('completely removes the separate "ONE TIME WORK & LIFETIME GAINS" card while preserving the main image card', () => {
      render(<RouteMapView isAdmin={false} userEmail="member@example.com" />);

      // Verify the separate headline card is completely removed
      expect(screen.queryByLabelText('One Time Work highlight')).toBeNull();
      expect(document.querySelector('.route-map-headline-card')).toBeNull();
      expect(screen.queryByText('Without taking this small step, you may keep working throughout life.')).toBeNull();

      // Main image card is present and intact
      const imageCard = screen.getByTestId('route-map-image-card');
      expect(imageCard).toBeDefined();
      expect(imageCard.getAttribute('aria-label')).toBe('Route map reference visual');
      expect(imageCard.querySelector('[data-testid="route-map-hero-img"]')).toBeDefined();
    });

    it('renders exactly ONE top-right Expand View button and two moving golden stars in the image card', () => {
      render(<RouteMapView isAdmin={false} userEmail="member@example.com" />);

      // Exactly ONE Expand View button rendered in the DOM
      const expandButtons = screen.getAllByRole('button', { name: /expand view/i });
      expect(expandButtons.length).toBe(1);

      const expandBtn = screen.getByTestId('expand-view-btn');
      expect(expandBtn).toBeDefined();
      expect(expandBtn.classList.contains('route-map-zoom-trigger')).toBe(true);

      // Two moving golden stars are present
      expect(screen.getByTestId('route-map-moving-star-1')).toBeDefined();
      expect(screen.getByTestId('route-map-moving-star-2')).toBeDefined();

      // Clicking the single Expand View button opens the modal
      fireEvent.click(expandBtn);
      expect(screen.getByAltText('IG Infra Route Map Full View')).toBeDefined();
    });

    it('maintains the main image card container structure and hero image attributes', () => {
      render(<RouteMapView isAdmin={false} userEmail="member@example.com" />);

      const imageCard = screen.getByTestId('route-map-image-card');
      expect(imageCard).toBeDefined();

      const imgContainer = imageCard.querySelector('.route-map-img-container');
      expect(imgContainer).toBeDefined();

      const heroImg = screen.getByTestId('route-map-hero-img') as HTMLImageElement;
      expect(heroImg).toBeDefined();
      expect(heroImg.classList.contains('route-map-hero-image')).toBe(true);
      expect(heroImg.getAttribute('loading')).toBe('eager');
      expect(heroImg.getAttribute('fetchPriority')).toBe('high');
      expect(heroImg.alt).toContain('Just 2 Referrals in Entire Life');

      // Verify stars overlay is within the image card and contains both orbiting stars
      const starsOverlay = imageCard.querySelector('[data-testid="route-map-stars-overlay"]');
      expect(starsOverlay).toBeDefined();
      expect(starsOverlay?.querySelector('[data-testid="route-map-moving-star-1"]')).toBeDefined();
      expect(starsOverlay?.querySelector('[data-testid="route-map-moving-star-2"]')).toBeDefined();

      // Verify exactly one expand view button is present
      const expandBtn = imageCard.querySelector('[data-testid="expand-view-btn"]');
      expect(expandBtn).toBeDefined();
    });
  });
});


