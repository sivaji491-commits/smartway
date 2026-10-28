import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PotentialityView } from '../components/potentiality/PotentialityView';
import { resetPotentialityState } from '../lib/potentiality-storage';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('Potentiality Page ONE TIME WORK Animated Highlight', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
    resetPotentialityState();
  });

  describe('1. ONE TIME WORK Highlight Rendering & Placement', () => {
    it('renders the ONE TIME WORK animated element at top-left for regular users', () => {
      render(<PotentialityView isAdmin={false} userEmail="member@example.com" />);

      // Element is present on the page
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(highlight.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      // Exact text: ONE TIME WORK
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Exactly two moving stars
      expect(screen.getByTestId('one-time-work-star-1')).toBeDefined();
      expect(screen.getByTestId('one-time-work-star-2')).toBeDefined();

      // Decorative lines present
      expect(highlight.querySelectorAll('.one-time-work-decor-line').length).toBe(2);
      expect(highlight.querySelectorAll('.one-time-work-frame-line').length).toBe(2);
    });

    it('renders the ONE TIME WORK animated element at top-left for admins', () => {
      render(<PotentialityView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Both stars are present
      expect(screen.getByTestId('one-time-work-star-1')).toBeDefined();
      expect(screen.getByTestId('one-time-work-star-2')).toBeDefined();
    });
  });

  describe('2. Star Animation & Opposition', () => {
    it('confirms both stars use 180-degree opposite orbit classes', () => {
      render(<PotentialityView isAdmin={false} />);

      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');

      expect(star1.textContent).toBe('✦');
      expect(star2.textContent).toBe('✦');
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);
    });
  });

  describe('3. Preservation of Existing Content & Calculation Functionality', () => {
    it('preserves all Potentiality tables, rank selectors, and calculation components', () => {
      const { container } = render(<PotentialityView isAdmin={true} />);

      // Existing table is present and intact
      expect(container.querySelector('table')).not.toBeNull();

      // Existing rank selectors are present
      expect(screen.getByTestId('top-rank-dropdown-btn')).toBeDefined();
      expect(screen.getByTestId('summary-selected-rank-dropdown-btn')).toBeDefined();

      // Calculation figures and columns are intact
      expect(screen.getByText('Rank Price:')).toBeDefined();
      expect(screen.getByText('Profit')).toBeDefined();
    });
  });
});
