import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DefaultPageLayout, PageContainer } from '../components/common/DefaultPageLayout';
import { OneTimeWorkHighlight } from '../components/common/OneTimeWorkHighlight';
import { NewPageTemplate } from '../templates/NewPageTemplate';

describe('Global Default ONE TIME WORK Animated Component for Future Pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('1. DefaultPageLayout Automatic Highlight', () => {
    it('automatically renders the ONE TIME WORK animated highlight at the top-left by default', () => {
      render(
        <DefaultPageLayout title="Future Test Module" description="Testing default behavior">
          <div data-testid="future-content">Future page body</div>
        </DefaultPageLayout>
      );

      // Highlight badge is present automatically without manual insertion
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(highlight.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      // Exact text
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Exactly two moving stars with 180-degree offset classes
      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');
      expect(star1).toBeDefined();
      expect(star2).toBeDefined();
      expect(star1.textContent).toBe('✦');
      expect(star2.textContent).toBe('✦');
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);

      // Framing lines with center diamond stars
      expect(screen.getByText('Future Test Module')).toBeDefined();
      expect(screen.getByTestId('future-content')).toBeDefined();
    });

    it('PageContainer alias also renders ONE TIME WORK automatically', () => {
      render(
        <PageContainer title="Alias Page">
          <p>Alias body</p>
        </PageContainer>
      );

      expect(screen.getByTestId('key-points-one-time-work')).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();
    });
  });

  describe('2. Deduplication & Single Instance Guarantee', () => {
    it('prevents accidental duplicate highlights if child components also call OneTimeWorkHighlight', () => {
      render(
        <DefaultPageLayout title="Deduplication Test">
          <div>
            <p>Some child content</p>
            {/* Accidental second call by child */}
            <OneTimeWorkHighlight />
          </div>
        </DefaultPageLayout>
      );

      // MUST appear ONLY ONCE per page
      const badges = screen.getAllByTestId('key-points-one-time-work');
      expect(badges.length).toBe(1);

      const texts = screen.getAllByText('ONE TIME WORK');
      expect(texts.length).toBe(1);
    });

    it('allows opting out with showOneTimeWork={false} when a custom page requires it', () => {
      render(
        <DefaultPageLayout title="Opt-out Page" showOneTimeWork={false}>
          <p>No badge here</p>
        </DefaultPageLayout>
      );

      expect(screen.queryByTestId('key-points-one-time-work')).toBeNull();
      expect(screen.queryByText('ONE TIME WORK')).toBeNull();
    });
  });

  describe('3. Standard NewPageTemplate Verification', () => {
    it('NewPageTemplate renders the complete animated element and page card out of the box', () => {
      render(<NewPageTemplate isAdmin={false} userEmail="developer@example.com" />);

      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();
      expect(screen.getByText('New Feature Page')).toBeDefined();
      expect(screen.getByTestId('one-time-work-star-1')).toBeDefined();
      expect(screen.getByTestId('one-time-work-star-2')).toBeDefined();
    });
  });

  describe('4. Reusable Component Export Integrity', () => {
    it('standalone OneTimeWorkHighlight renders with all required styling and DOM elements', () => {
      render(<OneTimeWorkHighlight />);

      const badge = screen.getByTestId('key-points-one-time-work');
      expect(badge.classList.contains('key-points-one-time-work-badge')).toBe(true);
      expect(badge.classList.contains('route-map-one-time-work-lockup')).toBe(true);

      const overlay = screen.getByTestId('route-map-stars-overlay');
      expect(overlay).toBeDefined();

      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);
    });
  });
});
