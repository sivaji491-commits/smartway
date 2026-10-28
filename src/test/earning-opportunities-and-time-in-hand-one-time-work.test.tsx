import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EarningOpportunitiesView } from '../components/earning-opportunities/EarningOpportunitiesView';
import { TimeInHandView } from '../components/time-in-hand/TimeInHandView';

describe('Earning Opportunities and Time In-hand Pages ONE TIME WORK Animated Highlight', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('1. Earning Opportunities Page ONE TIME WORK Highlight', () => {
    it('renders the ONE TIME WORK highlight at the top-left of EarningOpportunitiesView', () => {
      render(<EarningOpportunitiesView isAdmin={false} userEmail="user@example.com" />);

      // Highlight badge is present
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(highlight.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      // Exact text
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Exactly two moving stars
      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');
      expect(star1).toBeDefined();
      expect(star2).toBeDefined();
      expect(star1.textContent).toBe('✦');
      expect(star2.textContent).toBe('✦');
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);

      // Existing Earning Opportunities header & content are intact
      expect(screen.getByText('Source Structure')).toBeDefined();
      expect(screen.getAllByText('5 Earning Opportunities').length).toBeGreaterThan(0);
    });

    it('renders the ONE TIME WORK highlight in Admin mode', () => {
      render(<EarningOpportunitiesView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByTestId('key-points-one-time-work')).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();
      expect(screen.getByText('Edit Structure')).toBeDefined();
    });
  });

  describe('2. Time In-hand Page ONE TIME WORK Highlight', () => {
    it('renders the ONE TIME WORK highlight at the top-left of TimeInHandView', () => {
      render(<TimeInHandView isAdmin={false} userEmail="user@example.com" />);

      // Highlight badge is present
      const highlight = screen.getByTestId('key-points-one-time-work');
      expect(highlight).toBeDefined();
      expect(highlight.getAttribute('aria-label')).toBe('ONE TIME WORK highlight');

      // Exact text
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();

      // Exactly two moving stars with 180-degree offset classes
      const star1 = screen.getByTestId('one-time-work-star-1');
      const star2 = screen.getByTestId('one-time-work-star-2');
      expect(star1.textContent).toBe('✦');
      expect(star2.textContent).toBe('✦');
      expect(star1.classList.contains('route-map-moving-star-1')).toBe(true);
      expect(star2.classList.contains('route-map-moving-star-2')).toBe(true);

      // Existing Time In-hand header & table are intact
      expect(screen.getByText('In-hand time')).toBeDefined();
      expect(screen.getByText('Working Hours Model')).toBeDefined();
      expect(screen.getByText('Age')).toBeDefined();
      expect(screen.getByText('Up to 60 Years In-hand')).toBeDefined();
    });

    it('renders the ONE TIME WORK highlight in Admin mode', () => {
      render(<TimeInHandView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByTestId('key-points-one-time-work')).toBeDefined();
      expect(screen.getByText('ONE TIME WORK')).toBeDefined();
      expect(screen.getByText('Admin Editable')).toBeDefined();
    });
  });
});
