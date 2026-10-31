import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WhyView } from '@/components/why/WhyView';
import { Route as MaintenanceRoute } from '@/routes/_authenticated/maintenance';
import {
  DEFAULT_NAVIGATION_FIELDS,
  getRegisteredNavigationFields,
  getOrderedNavigationFields,
  getUserAllowedTabs
} from '@/lib/permissions';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouter: () => ({ invalidate: vi.fn() }),
  };
});

describe('Why Menu Item & Why Presentation Page Acceptance Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Sidebar Menu Registration & Placement', () => {
    it('registers Why with Lightbulb icon in DEFAULT_NAVIGATION_FIELDS right after Home', () => {
      const homeIdx = DEFAULT_NAVIGATION_FIELDS.findIndex((f) => f.id === 'home');
      const whyIdx = DEFAULT_NAVIGATION_FIELDS.findIndex((f) => f.id === 'why');

      expect(whyIdx).toBeGreaterThanOrEqual(0);
      expect(whyIdx).toBe(homeIdx + 1);

      const whyField = DEFAULT_NAVIGATION_FIELDS[whyIdx];
      expect(whyField.label).toBe('Why');
      expect(whyField.iconName).toBe('Lightbulb');
    });

    it('getRegisteredNavigationFields includes Why', () => {
      const registered = getRegisteredNavigationFields();
      const whyField = registered.find((f) => f.id === 'why');

      expect(whyField).toBeDefined();
      expect(whyField?.label).toBe('Why');
      expect(whyField?.iconName).toBe('Lightbulb');
    });

    it('getOrderedNavigationFields returns Why right after Home in default configuration', () => {
      const ordered = getOrderedNavigationFields();
      const homeIndex = ordered.findIndex((f) => f.id === 'home');
      const whyIndex = ordered.findIndex((f) => f.id === 'why');

      expect(whyIndex).toBe(homeIndex + 1);
      expect(ordered[whyIndex].id).toBe('why');
    });

    it('safely includes Why when custom order is present', () => {
      localStorage.setItem('nexora_sidebar_nav_order', JSON.stringify(['ranks', 'home', 'users']));

      const ordered = getOrderedNavigationFields();
      expect(ordered.some((f) => f.id === 'why')).toBe(true);
    });

    it('grants Why access to administrator account', () => {
      const adminTabs = getUserAllowedTabs('sivaji491@gmail.com');
      expect(adminTabs).toContain('why');
    });
  });

  describe('2. WhyView Component & Approved Promotional Image Rendering', () => {
    it('renders the Why page with header, title, and One Time Work component', () => {
      render(<WhyView isAdmin={true} />);

      expect(screen.getByTestId('why-view-container')).toBeInTheDocument();
      expect(screen.getByText('Why Smartway')).toBeInTheDocument();
      expect(screen.getByText('Land Bank Vision')).toBeInTheDocument();
      expect(screen.getByText(/Think Beyond Money\.\.\. Think Property Ownership/i)).toBeInTheDocument();
    });

    it('renders the exact approved promotional image with full alt text containing all message pillars', () => {
      render(<WhyView isAdmin={false} />);

      const image = screen.getByTestId('why-main-img');
      expect(image).toBeInTheDocument();
      expect(image.tagName.toLowerCase()).toBe('img');

      // Verifies the exact required message elements in the image alt attribute
      const altText = image.getAttribute('alt') || '';
      expect(altText).toContain('Land is a Gift of God');
      expect(altText).toContain('Build Your Own Land Bank');
      expect(altText).toContain('Think Beyond Money... Think Property Ownership');
      expect(altText).toContain('Just 2 Referrals in Your Life');
      expect(altText).toContain('A House + A Land');
      expect(altText).toContain('Secure Your Future');
    });

    it('renders visual effect elements: light rays and glowing land aura', () => {
      render(<WhyView isAdmin={false} />);

      const card = screen.getByTestId('why-image-card');
      expect(card).toBeInTheDocument();

      const rays = card.querySelector('.why-light-rays-effect');
      const coreGlow = card.querySelector('.why-land-glow-core');

      expect(rays).toBeInTheDocument();
      expect(coreGlow).toBeInTheDocument();
    });

    it('renders the three bottom core value cards with quick navigation triggers', () => {
      const handleNavigate = vi.fn();
      render(<WhyView isAdmin={false} onNavigateToTab={handleNavigate} />);

      const referralsBadge = screen.getByTestId('why-badge-referrals');
      const propertyBadge = screen.getByTestId('why-badge-property');
      const futureBadge = screen.getByTestId('why-badge-future');

      expect(referralsBadge).toBeInTheDocument();
      expect(propertyBadge).toBeInTheDocument();
      expect(futureBadge).toBeInTheDocument();

      expect(screen.getByText('Just 2 Referrals')).toBeInTheDocument();
      expect(screen.getByText('A House + A Land')).toBeInTheDocument();
      expect(screen.getByText('Secure Your Future')).toBeInTheDocument();

      // Clicking badges triggers navigation
      fireEvent.click(referralsBadge);
      expect(handleNavigate).toHaveBeenCalledWith('route-map');

      fireEvent.click(propertyBadge);
      expect(handleNavigate).toHaveBeenCalledWith('customer-view');

      fireEvent.click(futureBadge);
      expect(handleNavigate).toHaveBeenCalledWith('earning-opportunities');
    });
  });

  describe('3. Full-Resolution Modal & Responsive Zoom Controls', () => {
    it('opens full-resolution modal when clicking Full View button and closes on X or backdrop', async () => {
      render(<WhyView isAdmin={false} />);

      expect(screen.queryByTestId('why-zoom-modal')).not.toBeInTheDocument();

      const zoomBtn = screen.getByTestId('why-zoom-btn');
      fireEvent.click(zoomBtn);

      await waitFor(() => {
        expect(screen.getByTestId('why-zoom-modal')).toBeInTheDocument();
      });

      const closeBtn = screen.getByTestId('close-zoom-modal');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('why-zoom-modal')).not.toBeInTheDocument();
      });
    });

    it('also opens modal via the corner expand trigger on image card and closes on Escape', async () => {
      render(<WhyView isAdmin={false} />);

      const expandTrigger = screen.getByTestId('why-expand-trigger');
      fireEvent.click(expandTrigger);

      await waitFor(() => {
        expect(screen.getByTestId('why-zoom-modal')).toBeInTheDocument();
      });

      // Press Escape to close
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('why-zoom-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('4. Layout Verification: No Duplicate Horizontal Menu & Edge-to-Edge Container', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.history.replaceState({}, '', '/maintenance?tab=why');

      vi.spyOn(MaintenanceRoute, 'useRouteContext').mockReturnValue({
        user: { id: 'admin-id', email: 'sivaji491@gmail.com' } as any,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      window.localStorage.clear();
      window.history.replaceState({}, '', '/maintenance');
    });

    it('suppresses duplicate horizontal menu (.topbar-nav-tabs) across all pages while keeping left sidebar and header intact', () => {
      const Component = MaintenanceRoute.options.component!;
      expect(Component).toBeDefined();

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      // Verify main application shell, sidebar, and header are fully rendered and functional
      expect(container.querySelector('.app-shell')).not.toBeNull();
      expect(container.querySelector('.app-sidebar')).not.toBeNull();
      expect(container.querySelector('.app-topbar')).not.toBeNull();

      // Verify the duplicate horizontal menu is completely suppressed for Why tab
      expect(container.querySelector('.topbar-nav-tabs')).toBeNull();

      // Verify Why body class and edge-to-edge container are applied
      expect(container.querySelector('.app-tab-body.why-tab-body')).not.toBeNull();
      expect(container.querySelector('.home-main-container.why-container')).not.toBeNull();

      // Verify the Why presentation card and image are present in the DOM
      expect(screen.getByTestId('why-image-card')).toBeInTheDocument();
      expect(screen.getByTestId('why-main-img')).toBeInTheDocument();
    });

    it('consistently removes duplicate horizontal menu across all pages (e.g. users, ranks, home, dcb)', () => {
      const tabsToTest = ['users', 'ranks', 'home', 'dcb-90-days'];

      for (const tab of tabsToTest) {
        window.history.replaceState({}, '', `/maintenance?tab=${tab}`);
        const Component = MaintenanceRoute.options.component!;

        const { container, unmount } = render(
          <QueryClientProvider client={queryClient}>
            <Component />
          </QueryClientProvider>
        );

        // Verify duplicate horizontal menu is NOT rendered on any page
        expect(container.querySelector('.topbar-nav-tabs')).toBeNull();

        // Verify the primary left sidebar navigation remains present and functional
        expect(container.querySelector('.app-sidebar')).not.toBeNull();
        expect(container.querySelector('.sidebar-nav')).not.toBeNull();

        unmount();
      }
    });
  });
});
