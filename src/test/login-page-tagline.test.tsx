import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LoginPage } from '@/components/login-page';

// Mock Tanstack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('LoginPage Hero Tagline & Responsive Viewport Fitting', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Think Bigger. Grow Faster. Build Your Future." in the login hero panel', () => {
    const { container } = render(<LoginPage />);

    // 1. Verify exact new text is in .panel-message p
    const taglineElement = container.querySelector('.panel-message p');
    expect(taglineElement).not.toBeNull();
    expect(taglineElement?.textContent).toBe('Think Bigger. Grow Faster. Build Your Future.');

    // 2. Verify old text is completely removed from the entire page
    expect(container.textContent).not.toContain('One connected workspace. Clearer decisions.');
    expect(container.textContent).not.toContain('More possibilities for your team');

    // 3. Verify hero structure and other branding remain intact
    expect(container.querySelector('.eyebrow')?.textContent).toContain("BUILT FOR WHAT'S NEXT");
    const h1 = container.querySelector('.panel-message h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toContain('A smarter way');
    expect(h1?.textContent).toContain('here.');

    // 4. Verify login form and controls are intact
    expect(screen.getByPlaceholderText(/username or email/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('maintains a proper 2-panel layout on desktop/laptop viewports without hardcoded overflowing heights', () => {
    // Simulate desktop window dimensions (e.g. 1366x768 laptop)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1366 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });

    const { container } = render(<LoginPage />);

    const layout = container.querySelector('.login-layout');
    expect(layout).not.toBeNull();

    const visualPanel = container.querySelector('.visual-panel');
    expect(visualPanel).not.toBeNull();

    const formPanel = container.querySelector('.form-panel');
    expect(formPanel).not.toBeNull();

    // Verify both panels contain their necessary children
    expect(visualPanel?.querySelector('.panel-content')).not.toBeNull();
    expect(visualPanel?.querySelector('.panel-message p')?.textContent).toBe('Think Bigger. Grow Faster. Build Your Future.');
    expect(visualPanel?.querySelector('.panel-bottom')).not.toBeNull();

    expect(formPanel?.querySelector('.login-form')).not.toBeNull();
    expect(formPanel?.querySelector('.form-center')).not.toBeNull();
    expect(formPanel?.querySelector('.form-footer')).not.toBeNull();
  });

  it('renders all essential elements across mobile viewports (320px, 375px, 768px)', () => {
    const mobileWidths = [320, 375, 390, 430, 768];

    for (const width of mobileWidths) {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });

      const { container, unmount } = render(<LoginPage />);

      expect(container.querySelector('.login-layout')).not.toBeNull();
      expect(container.querySelector('.visual-panel')).not.toBeNull();
      expect(container.querySelector('.panel-message p')?.textContent).toBe('Think Bigger. Grow Faster. Build Your Future.');
      expect(container.querySelector('.form-panel')).not.toBeNull();

      unmount();
    }
  });
});
