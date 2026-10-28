import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HomeTab } from '../components/home-tab';

describe('Home Page - Removal of Transparent Real Estate Ecosystem Banner', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const setViewport = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
    vi.restoreAllMocks();
  });

  describe('1. Banner Removal Verification', () => {
    it('completely removes "TRANSPARENT REAL ESTATE BUSINESS ECOSYSTEM" and "INFORMED DECISIONS FIRST"', () => {
      const { container } = render(<HomeTab userEmail="user@example.com" />);

      // Must NOT find the banner text anywhere on the Home page
      expect(screen.queryByText(/TRANSPARENT REAL ESTATE BUSINESS ECOSYSTEM/i)).toBeNull();
      expect(screen.queryByText(/INFORMED DECISIONS FIRST/i)).toBeNull();

      // Check textContent of slide 1
      const slide0 = container.querySelector('[data-testid="hero-slide-0"]');
      expect(slide0).not.toBeNull();
      expect(slide0?.textContent).not.toContain('TRANSPARENT REAL ESTATE BUSINESS ECOSYSTEM');
      expect(slide0?.textContent).not.toContain('INFORMED DECISIONS FIRST');

      // Check that no elements with teal ecosystem pill styles exist in hero
      const tealPill = slide0?.querySelector('.bg-\\[\\#071F2C\\]\\/80');
      expect(tealPill).toBeNull();
    });

    it('preserves the "Earn as soon as possible" badge above the headline', () => {
      const { container } = render(<HomeTab userEmail="user@example.com" />);

      const slide0 = container.querySelector('[data-testid="hero-slide-0"]');
      expect(slide0).not.toBeNull();

      // Badge must exist with text
      const earnBadge = screen.getAllByText(/Earn as soon as possible/i);
      expect(earnBadge.length).toBeGreaterThan(0);

      // Verify it's within slide 0
      expect(slide0?.textContent).toContain('Earn as soon as possible');

      // Verify the badge has its icon and rounded-full pill styling
      const pill = slide0?.querySelector('.rounded-full.bg-white\\/95');
      expect(pill).not.toBeNull();
      expect(pill?.querySelector('svg')).not.toBeNull();
      expect(pill?.textContent).toContain('Earn as soon as possible');
    });

    it('ensures clean vertical spacing between the Earn badge and the headline without empty gap', () => {
      const { container } = render(<HomeTab userEmail="user@example.com" />);

      const slide0 = container.querySelector('[data-testid="hero-slide-0"]');
      const earnBadge = slide0?.querySelector('.rounded-full.bg-white\\/95');
      const headline = slide0?.querySelector('h1');

      expect(earnBadge).not.toBeNull();
      expect(headline).not.toBeNull();

      // The badge has mb-2.5 and sits immediately before the headline h1
      expect(earnBadge?.classList.contains('mb-2.5')).toBe(true);
      expect(headline?.classList.contains('mb-2')).toBe(true);
    });
  });

  describe('2. Responsive Layout Verification', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Laptop', width: 1024, height: 768 },
      { name: 'Desktop', width: 1440, height: 900 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`renders Hero Slide 1 cleanly on ${name} (${width}x${height})`, () => {
        setViewport(width, height);
        const { container } = render(<HomeTab userEmail="user@example.com" />);

        const slide0 = container.querySelector('[data-testid="hero-slide-0"]');
        expect(slide0).not.toBeNull();

        // Banner remains absent
        expect(slide0?.textContent).not.toContain('TRANSPARENT REAL ESTATE BUSINESS ECOSYSTEM');
        expect(slide0?.textContent).not.toContain('INFORMED DECISIONS FIRST');

        // Earn badge is visible
        expect(slide0?.textContent).toContain('Earn as soon as possible');

        // Main action buttons exist
        expect(slide0?.querySelector('button')).not.toBeNull();

        // Image container is present
        const img = slide0?.querySelector('img');
        expect(img).not.toBeNull();
      });
    });
  });
});
