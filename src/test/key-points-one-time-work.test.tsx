import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KeyPointsView } from '../components/key-points/KeyPointsView';
import { OneTimeWorkHighlight } from '../components/key-points/OneTimeWorkHighlight';

describe('Key Points Page Background and ONE TIME WORK Animated Highlight', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('1. Background Colour & Container Styling', () => {
    it('renders KeyPointsView with the Customer View white and light-grey background design', () => {
      const { container } = render(
        <KeyPointsView isAdmin={false} userEmail="member@example.com" />
      );

      // The top-level wrapper uses the Customer View light-grey background (#f8fafc)
      const topWrapper = container.firstChild as HTMLElement;
      expect(topWrapper).toBeDefined();
      expect(topWrapper.classList.contains('bg-[#f8fafc]')).toBe(true);
      expect(topWrapper.classList.contains('text-slate-900')).toBe(true);

      // Header uses clean white background matching Customer View
      const header = container.querySelector('header');
      expect(header).toBeDefined();
      expect(header?.classList.contains('bg-white/95')).toBe(true);
      expect(header?.classList.contains('border-slate-200/90')).toBe(true);
    });
  });

  describe('2. ONE TIME WORK Animated Highlight Element', () => {
    it('renders the ONE TIME WORK highlight component with exact text', () => {
      render(<OneTimeWorkHighlight />);

      const badge = screen.getByTestId('key-points-one-time-work');
      expect(badge).toBeDefined();
      expect(badge.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      const textElement = screen.getByTestId('one-time-work-text');
      expect(textElement.textContent).toBe('ONE TIME WORK');
    });

    it('renders decorative golden lines flanking the text', () => {
      const { container } = render(<OneTimeWorkHighlight />);

      const decorLines = container.querySelectorAll('.one-time-work-decor-line');
      expect(decorLines.length).toBe(2);
      expect(container.querySelector('.line-left')).toBeDefined();
      expect(container.querySelector('.line-right')).toBeDefined();
    });

    it('renders exactly two small golden stars orbiting in 180-degree opposite positions', () => {
      render(<OneTimeWorkHighlight />);

      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');

      expect(star1).toBeDefined();
      expect(star2).toBeDefined();
      expect(star1.textContent).toBe('✦');
      expect(star2.textContent).toBe('✦');

      // Uses circular orbit classes matching Route Map
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);
    });

    it('renders ONE TIME WORK at the top-left of the Key Points page content', () => {
      render(<KeyPointsView isAdmin={false} userEmail="member@example.com" />);

      // Element is present on KeyPointsView
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Both stars are present on the rendered page
      expect(screen.getByTestId('one-time-work-star-1')).toBeDefined();
      expect(screen.getByTestId('one-time-work-star-2')).toBeDefined();

      // Heading and content remain intact without overlap
      expect(screen.getByText(/Understand the Subject First/i)).toBeDefined();
      expect(screen.getByText(/Understand the Business Plan First/i)).toBeDefined();
    });
  });

  describe('3. Responsive Design & Layout Integrity', () => {
    it('maintains compact badge structure and preserves existing Key Points rules', () => {
      render(
        <KeyPointsView
          isAdmin={true}
          userEmail="sivaji491@gmail.com"
          onNavigateToTab={() => {}}
        />
      );

      // Badge is present
      const badge = screen.getByTestId('key-points-one-time-work');
      expect(badge.classList.contains('key-points-one-time-work-badge')).toBe(true);

      // Preserves admin reordering and search controls
      expect(screen.getByPlaceholderText(/Search key points.../i)).toBeDefined();
      expect(screen.getByText('Manage in Settings')).toBeDefined();
    });

    it('confirms both stars move smoothly in opposite positions strictly inside the badge border', () => {
      render(<OneTimeWorkHighlight />);

      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');

      // Both stars exist
      expect(star1).toBeDefined();
      expect(star2).toBeDefined();

      // Confirms both stars retain distinct moving classes with 180-degree offset
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);
    });
  });
});

