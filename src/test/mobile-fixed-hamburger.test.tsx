import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route as MaintenanceRoute } from '@/routes/_authenticated/maintenance';

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouter: () => ({ invalidate: vi.fn() }),
  };
});

describe('Mobile Fixed Hamburger Menu & Styling Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.spyOn(MaintenanceRoute, 'useRouteContext').mockReturnValue({
      user: { id: 'admin-id', email: 'sivaji491@gmail.com' } as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders the 4-line hamburger icon (☰) within the fixed toggle button', () => {
    const Component = MaintenanceRoute.options.component!;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    const toggleBtn = container.querySelector('.sidebar-mobile-toggle');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.getAttribute('aria-label')).toBe('Toggle navigation menu');

    // Verify 4 SVG lines exist representing the 4-line hamburger menu
    const svgLines = toggleBtn?.querySelectorAll('line');
    expect(svgLines).toHaveLength(4);
  });

  it('toggles sidebar state on click and updates icon to close (X)', () => {
    const Component = MaintenanceRoute.options.component!;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    const toggleBtn = container.querySelector('.sidebar-mobile-toggle') as HTMLElement;
    const sidebar = container.querySelector('.app-sidebar');

    expect(sidebar?.classList.contains('mobile-open')).toBe(false);

    // Click to open
    fireEvent.click(toggleBtn);
    expect(sidebar?.classList.contains('mobile-open')).toBe(true);

    // Now it should render X icon (lucide-x)
    expect(toggleBtn.querySelector('.lucide-x')).not.toBeNull();

    // Click backdrop to close
    const backdrop = container.querySelector('.sidebar-mobile-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(sidebar?.classList.contains('mobile-open')).toBe(false);

    // Once closed, 4 lines return
    const svgLines = toggleBtn.querySelectorAll('line');
    expect(svgLines).toHaveLength(4);
  });

  it('renders correctly for regular non-admin users with proper topbar structure', () => {
    window.localStorage.setItem('nexora-user-email', 'regular@example.com');
    window.localStorage.setItem('user_permissions_regular@example.com', JSON.stringify(['home', 'ranks']));

    const Component = MaintenanceRoute.options.component!;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    const toggleBtn = container.querySelector('.sidebar-mobile-toggle');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn?.querySelectorAll('line')).toHaveLength(4);

    const topbar = container.querySelector('.app-topbar.regular-user-topbar');
    expect(topbar).not.toBeNull();
  });

  it('renders Access Valid For countdown timer badge with red bold countdown digits and clear label', () => {
    window.localStorage.setItem('nexora-user-email', 'regular@example.com');
    window.localStorage.setItem('user_permissions_regular@example.com', JSON.stringify(['home', 'ranks']));

    const Component = MaintenanceRoute.options.component!;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    const timerBadge = container.querySelector('[data-testid="session-timer-badge"]');
    expect(timerBadge).not.toBeNull();

    // Verify label text
    const label = timerBadge?.querySelector('.timer-label');
    expect(label).not.toBeNull();
    expect(label?.textContent).toContain('Access Valid For:');

    // Verify countdown text and red bold styling
    const countdown = timerBadge?.querySelector('.timer-countdown');
    expect(countdown).not.toBeNull();
    expect(countdown?.classList.contains('text-[#DC2626]')).toBe(true);
    expect(countdown?.classList.contains('font-bold')).toBe(true);
  });
});
