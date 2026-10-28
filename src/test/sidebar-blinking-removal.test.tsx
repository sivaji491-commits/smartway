import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route as MaintenanceRoute } from '../routes/_authenticated/maintenance';
import { getRegisteredNavigationFields } from '../lib/permissions';
import { OneTimeWorkHighlight } from '../components/common/OneTimeWorkHighlight';
import fs from 'fs';
import path from 'path';

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouter: () => ({ invalidate: vi.fn() }),
  };
});

describe('Sidebar Blinking Message Removal Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.spyOn(MaintenanceRoute, 'useRouteContext').mockReturnValue({
      user: { id: 'admin-id', email: 'sivaji491@gmail.com' } as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 1 & 2: Complete removal of sidebar blinking text, animation, and styles', () => {
    it('does not render "One Time Work in entire life" or .sidebar-blinking-msg anywhere in the maintenance sidebar', () => {
      const Component = MaintenanceRoute.options.component!;
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      const sidebar = container.querySelector('.app-sidebar');
      expect(sidebar).not.toBeNull();

      // Check for blinking element class
      expect(sidebar?.querySelector('.sidebar-blinking-msg')).toBeNull();
      expect(container.querySelector('.sidebar-blinking-msg')).toBeNull();

      // Check for any text matching 'one time work in entire life'
      const sidebarText = sidebar?.textContent || '';
      expect(sidebarText.toLowerCase()).not.toContain('one time work in entire life');
      expect(sidebar?.querySelectorAll('.has-submessage').length).toBe(0);
      expect(sidebar?.querySelectorAll('.sidebar-nav-label-container').length).toBe(0);
    });

    it('confirms styles.css no longer contains @keyframes sidebar-blinking-pulse or .sidebar-blinking-msg', () => {
      const cssPath = path.resolve(__dirname, '../styles.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).not.toContain('sidebar-blinking-pulse');
      expect(cssContent).not.toContain('.sidebar-blinking-msg');
      expect(cssContent).not.toContain('.sidebar-nav-btn.has-submessage');
      expect(cssContent).not.toContain('.sidebar-nav-label-container');
    });
  });

  describe('Requirement 3 & 4: Sidebar spacing, layout, and nav items preservation', () => {
    it('preserves all sidebar menu items, labels, icons, and drag handles', () => {
      const Component = MaintenanceRoute.options.component!;
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      const sidebar = container.querySelector('.app-sidebar');
      const navButtons = container.querySelectorAll('.sidebar-nav-btn');
      expect(navButtons.length).toBeGreaterThan(0);

      // Verify each button has an icon, label, and drag handle
      navButtons.forEach((btn) => {
        expect(btn.querySelector('svg')).not.toBeNull();
        expect(btn.querySelector('.sidebar-drag-handle')).not.toBeNull();
        expect(btn.getAttribute('draggable')).toBe('true');
      });

      // Verify known items exist in sidebar
      expect(sidebar?.querySelector('[data-item-id="home"]')).not.toBeNull();
      expect(sidebar?.querySelector('[data-item-id="key-points"]')).not.toBeNull();
      expect(sidebar?.querySelector('[data-item-id="potentiality"]')).not.toBeNull();
      expect(sidebar?.querySelector('[data-item-id="users"]')).not.toBeNull();
    });

    it('supports tab switching, active states, and hover effects without errors', () => {
      const Component = MaintenanceRoute.options.component!;
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <Component />
        </QueryClientProvider>
      );

      const keyPointsBtn = Array.from(container.querySelectorAll('.sidebar-nav-btn')).find(
        (btn) => btn.textContent?.includes('Key Points')
      ) as HTMLButtonElement;

      expect(keyPointsBtn).toBeDefined();

      // Hover
      fireEvent.mouseEnter(keyPointsBtn);
      fireEvent.mouseLeave(keyPointsBtn);

      // Click to switch tab
      fireEvent.click(keyPointsBtn);
      expect(keyPointsBtn.classList.contains('active')).toBe(true);
    });
  });

  describe('Requirement 5: Preservation of on-page ONE TIME WORK badge and two-star animation', () => {
    it('ensures on-page OneTimeWorkHighlight badge still renders with two rotating stars and golden text', () => {
      render(<OneTimeWorkHighlight />);

      const badge = screen.getByTestId('key-points-one-time-work');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toContain('ONE TIME WORK');

      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');
      expect(star1).not.toBeNull();
      expect(star2).not.toBeNull();
    });
  });
});
