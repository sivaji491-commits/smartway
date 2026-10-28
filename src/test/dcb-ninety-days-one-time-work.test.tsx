import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DcbNinetyDaysView } from '../components/dcb-bonus/DcbNinetyDaysView';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('DCB (90 Days) Page ONE TIME WORK Animated Highlight', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
    window.localStorage.clear();
  });

  it('renders the ONE TIME WORK highlight at the top-left of DcbNinetyDaysView', () => {
    render(<DcbNinetyDaysView isAdmin={false} userEmail="user@example.com" />);

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

    // Existing DCB (90 days) header & content are intact
    expect(screen.getByRole('heading', { name: /DCB \(90 days\)/i })).toBeDefined();
    expect(screen.getByText('Double Connect Bonus 30%')).toBeDefined();
    expect(screen.getByText('DOUBLE CONNECT BONUS (DCB 30%)')).toBeDefined();
    expect(screen.getByText('S.no')).toBeDefined();
    expect(screen.getByText('Ranks')).toBeDefined();
    expect(screen.getByTestId('dcb-earnings-card-2')).toBeDefined();
    expect(screen.getByTestId('dcb-earnings-card-4')).toBeDefined();
    expect(screen.getByTestId('dcb-earnings-card-6')).toBeDefined();
  });

  it('renders the ONE TIME WORK highlight in Admin mode', () => {
    render(<DcbNinetyDaysView isAdmin={true} userEmail="sivaji491@gmail.com" />);

    expect(screen.getByTestId('key-points-one-time-work')).toBeDefined();
    expect(screen.getByText('ONE TIME WORK')).toBeDefined();
    expect(screen.getByRole('heading', { name: /DCB \(90 days\)/i })).toBeDefined();
  });
});
