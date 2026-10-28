import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route as MaintenanceRoute } from '@/routes/_authenticated/maintenance';
import { TimeInHandView } from '@/components/time-in-hand/TimeInHandView';
import { HomeScrollingMarquee } from '@/components/home/HomeScrollingMarquee';
import { 
  getRegisteredNavigationFields, 
  getUserAllowedTabs, 
  getAllNavigationFieldIds 
} from '@/lib/permissions';

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouter: () => ({ invalidate: vi.fn() }),
  };
});

describe('Antigravity Responsiveness & Layout Verification (October 21, 2026 Changes)', () => {
  let queryClient: QueryClient;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const setViewport = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
  };

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.spyOn(MaintenanceRoute, 'useRouteContext').mockReturnValue({
      user: { id: 'admin-id', email: 'sivaji491@gmail.com' } as any,
    });
  });

  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  describe('1. Mobile Viewports (320px, 375px, 390px, 430px)', () => {
    const mobileWidths = [320, 375, 390, 430];

    mobileWidths.forEach((width) => {
      it(`renders Maintenance topbar and TimeInHandView cleanly at ${width}px`, () => {
        setViewport(width, 667);

        // 1. Render TimeInHandView
        const { container: timeContainer } = render(
          <TimeInHandView isAdmin={false} userEmail="user@example.com" />
        );

        // Verify summary grid is rendered
        const grid = timeContainer.querySelector('.time-in-hand-summary-grid');
        expect(grid).not.toBeNull();

        // Verify Time In-hand card exists
        expect(screen.getByText('Time In-hand')).toBeDefined();
        expect(timeContainer.querySelector('.time-in-hand-animated-border')).not.toBeNull();

        // Verify 10-column table exists with touch scrollable container
        const table = timeContainer.querySelector('table');
        expect(table).not.toBeNull();
        expect(table?.parentElement?.classList.contains('overflow-x-auto')).toBe(true);

        // Verify quotes container has break-words
        const quotesContainer = timeContainer.querySelector('.break-words');
        expect(quotesContainer).not.toBeNull();
      });

      it(`displays Access Valid For indicator cleanly on regular user topbar at ${width}px`, () => {
        setViewport(width, 667);
        vi.spyOn(MaintenanceRoute, 'useRouteContext').mockReturnValue({
          user: { id: 'regular-user-id', email: 'regular@example.com' } as any,
        });
        window.localStorage.setItem('nexora-user-email', 'regular@example.com');
        window.localStorage.setItem('user_permissions_regular@example.com', JSON.stringify(['home', 'ranks']));

        const Component = MaintenanceRoute.options.component!;
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <Component />
          </QueryClientProvider>
        );

        // Topbar should have regular-user-topbar class
        const topbar = container.querySelector('.app-topbar.regular-user-topbar');
        expect(topbar).not.toBeNull();

        // Session timer badge is rendered with Access Valid For
        const badge = container.querySelector('[data-testid="session-timer-badge"]');
        expect(badge).not.toBeNull();
        expect(badge?.textContent).toContain('Access Valid For:');

        // Mobile hamburger toggle is present
        expect(container.querySelector('.sidebar-mobile-toggle')).not.toBeNull();
      });
    });
  });

  describe('2. Tablet Viewport (768px)', () => {
    it('renders responsive layouts and allows mobile drawer toggle at 768px', () => {
      setViewport(768, 1024);

      const Component = MaintenanceRoute.options.component!;
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      const toggleBtn = container.querySelector('.sidebar-mobile-toggle') as HTMLElement;
      expect(toggleBtn).not.toBeNull();

      // Click toggle to open sidebar
      fireEvent.click(toggleBtn);
      expect(container.querySelector('.app-sidebar')?.classList.contains('mobile-open')).toBe(true);

      // Backdrop appears and clicking it closes sidebar
      const backdrop = container.querySelector('.sidebar-mobile-backdrop') as HTMLElement;
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop);
      expect(container.querySelector('.app-sidebar')?.classList.contains('mobile-open')).toBe(false);
    });
  });

  describe('3. Laptop & Desktop Viewports (1024px, 1366px, 1440px, 1920px)', () => {
    const desktopWidths = [1024, 1366, 1440, 1920];

    desktopWidths.forEach((width) => {
      it(`renders fixed desktop sidebar and topbar at ${width}px`, () => {
        setViewport(width, 900);

        const Component = MaintenanceRoute.options.component!;
        const { container } = render(
          <QueryClientProvider client={queryClient}>
            <Component />
          </QueryClientProvider>
        );

        expect(container.querySelector('.app-sidebar')).not.toBeNull();
        expect(container.querySelector('.app-topbar')).not.toBeNull();
        expect(container.querySelector('.app-main-content')).not.toBeNull();
      });
    });
  });

  describe('4. Animations & Hover Consistency', () => {
    it('verifies sidebar navigation renders cleanly without blinking messages and supports hover', () => {
      const Component = MaintenanceRoute.options.component!;
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      const blinkingMsg = container.querySelector('.sidebar-blinking-msg');
      expect(blinkingMsg).toBeNull();
      expect(container.querySelector('.app-sidebar')?.textContent).not.toContain('One Time Work in entire life');

      // Verify buttons exist and support hover without error
      const navBtn = container.querySelector('.sidebar-nav-btn') as HTMLElement;
      expect(navBtn).not.toBeNull();

      fireEvent.mouseEnter(navBtn);
      fireEvent.mouseLeave(navBtn);
    });

    it('pauses HomeScrollingMarquee on touch/mouse enter and resumes seamlessly on leave/finger lift', () => {
      const { container } = render(
        <HomeScrollingMarquee text="It's like ONE TIME SMART WORK FOR ASSET EARNING, FIRST UNDERSTAND THE BUSINESS PLAN" />
      );

      const marqueeTrack = container.querySelector('.home-marquee-track') as HTMLElement;
      expect(marqueeTrack).not.toBeNull();
      expect(marqueeTrack.style.animationPlayState).toBe('running');

      const marqueeContainer = container.querySelector('.home-marquee-container') as HTMLElement;

      // Mouse enter pauses
      fireEvent.mouseEnter(marqueeContainer);
      expect(marqueeTrack.style.animationPlayState).toBe('paused');

      // Mouse leave resumes
      fireEvent.mouseLeave(marqueeContainer);
      expect(marqueeTrack.style.animationPlayState).toBe('running');

      // Touch start pauses
      fireEvent.touchStart(marqueeContainer);
      expect(marqueeTrack.style.animationPlayState).toBe('paused');

      // Touch end resumes
      fireEvent.touchEnd(marqueeContainer);
      expect(marqueeTrack.style.animationPlayState).toBe('running');
    });

    it('renders Time In-hand animated border continuously with hardware acceleration', () => {
      const { container } = render(
        <TimeInHandView isAdmin={true} userEmail="sivaji491@gmail.com" />
      );

      const beam = container.querySelector('.time-in-hand-animated-border');
      expect(beam).not.toBeNull();
    });
  });

  describe('5. User Permissions Synchronization Across Viewports', () => {
    it('reflects assigned sidebar permissions for regular users without duplication or omission', () => {
      const regularEmail = 'employee@smartway.example';
      window.localStorage.setItem('nexora-user-email', regularEmail);
      window.localStorage.setItem(
        'nexora_workspace_users',
        JSON.stringify([
          {
            id: 'emp-id',
            username: 'employee',
            email: regularEmail,
            status: 'ACTIVE',
            permissions: ['home', 'ranks', 'customer-view'],
          },
        ])
      );

      const allowed = getUserAllowedTabs(regularEmail);
      expect(allowed).toEqual(['home', 'ranks', 'customer-view']);

      vi.spyOn(MaintenanceRoute, 'useRouteContext').mockReturnValue({
        user: { id: 'emp-id', email: regularEmail } as any,
      });

      const Component = MaintenanceRoute.options.component!;
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      // Verify permitted tabs appear in sidebar
      expect(container.querySelector('[data-item-id="home"]')).not.toBeNull();
      expect(container.querySelector('[data-item-id="ranks"]')).not.toBeNull();
      expect(container.querySelector('[data-item-id="customer-view"]')).not.toBeNull();

      // Verify unpermitted tabs do NOT appear in sidebar
      expect(container.querySelector('[data-item-id="users"]')).toBeNull();
      expect(container.querySelector('[data-item-id="settings"]')).toBeNull();
    });
  });
});
