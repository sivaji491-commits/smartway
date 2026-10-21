import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route } from '@/routes/_authenticated/maintenance';

// Mock Tanstack Router hooks
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useRouter: () => ({ invalidate: vi.fn() }),
  };
});

describe('Maintenance Route Component Render & Preview Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Spy on Route.useRouteContext to provide an authenticated user
    vi.spyOn(Route, 'useRouteContext').mockReturnValue({
      user: { id: 'admin-id', email: 'sivaji491@gmail.com' } as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders Maintenance component cleanly without throwing ReferenceError: previewUserEmail is not defined', () => {
    const Component = Route.options.component!;
    expect(Component).toBeDefined();

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    // Verify main app shell is rendered
    expect(container.querySelector('.app-shell')).not.toBeNull();
    expect(container.querySelector('.app-sidebar')).not.toBeNull();
    expect(container.querySelector('.app-topbar')).not.toBeNull();

    // In normal mode without preview, the preview banner should not be present
    expect(container.querySelector('.preview-active-banner')).toBeNull();
  });

  it('renders preview banner cleanly when nexora-preview-user-email is active and handles exitPreview without error', async () => {
    window.localStorage.setItem('nexora-preview-user-email', 'testuser@example.com');
    const Component = Route.options.component!;

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    // Preview banner should be displayed with preview user email
    const banner = container.querySelector('.preview-active-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('testuser@example.com');

    // Click exit preview button
    const exitBtn = screen.getByRole('button', { name: /Exit Preview & Return to Admin/i });
    expect(exitBtn).toBeDefined();

    fireEvent.click(exitBtn);

    // After exitPreview, the preview email is cleared from localStorage
    expect(window.localStorage.getItem('nexora-preview-user-email')).toBeNull();
  });

  it('renders for regular users with limited permissions without crashing', () => {
    vi.spyOn(Route, 'useRouteContext').mockReturnValue({
      user: { id: 'regular-user-id', email: 'regular@example.com' } as any,
    });
    window.localStorage.setItem('nexora-user-email', 'regular@example.com');
    window.localStorage.setItem('user_permissions_regular@example.com', JSON.stringify(['home', 'ranks']));

    const Component = Route.options.component!;

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    expect(container.querySelector('.app-shell')).not.toBeNull();
    expect(container.querySelector('.app-topbar')).not.toBeNull();
  });
});
