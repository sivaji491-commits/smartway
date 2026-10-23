import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HomeTab } from '../components/home-tab';

describe('Real Estate Business Home Page Acceptance Tests', () => {
  it('1. Hero Section: Renders large bold headline, supporting text, and action buttons', () => {
    const onNavigateMock = vi.fn();
    render(<HomeTab userEmail="sivaji491@gmail.com" onNavigateToTab={onNavigateMock} />);

    // Headline
    expect(screen.getByText(/Earn Plot or Flat Within 1 Year\./i)).toBeDefined();
    expect(screen.getByText(/Understand the Possibilities\./i)).toBeDefined();

    // Supporting text
    expect(screen.getByText(/Already working in a job, managing a business, or pursuing another profession\?/i)).toBeDefined();

    // CTA buttons
    const planBtn = screen.getByRole('button', { name: /Explore the Business Plan/i });
    const plotsBtn = screen.getByRole('button', { name: /View Plots & Flats/i });
    expect(planBtn).toBeDefined();
    expect(plotsBtn).toBeDefined();

    // Clicking Explore the Business Plan calls navigation callback
    fireEvent.click(planBtn);
    expect(onNavigateMock).toHaveBeenCalledWith('earning-opportunities');
  });

  it('2. Business Philosophy Section: Renders "Understand First. Decide Confidently." with 3 cards', () => {
    render(<HomeTab userEmail="user@example.com" />);

    // Heading
    expect(screen.getByText(/Understand First\./i)).toBeDefined();
    expect(screen.getByText(/Decide Confidently\./i)).toBeDefined();

    // Card 1 — No Pressure
    expect(screen.getByText('No Pressure')).toBeDefined();
    expect(screen.getByText(/Take your time to understand the business model\. There is no pressure to join immediately\./i)).toBeDefined();

    // Card 2 — Understand the Process
    expect(screen.getByText('Understand the Process')).toBeDefined();
    expect(screen.getByText(/Learn how the plan works, what participation involves, and how the different ranks and prices are structured\./i)).toBeDefined();

    // Card 3 — Make an Informed Decision
    expect(screen.getByText('Make an Informed Decision')).toBeDefined();
    expect(screen.getByText(/Review the relevant details, ask questions, understand the terms, and decide whether the opportunity suits your circumstances\./i)).toBeDefined();

    // Verify Important Transparency Notice is completely removed from the Home page
    expect(screen.queryByText(/Important Transparency Notice/i)).toBeNull();
    expect(screen.queryByText(/We do not describe our business model as completely risk-free/i)).toBeNull();
  });

  it('3. Plots & Flats Galleries: Renders residential plots and modern apartment opportunities', () => {
    render(<HomeTab userEmail="user@example.com" />);

    // Plots Gallery Heading
    expect(screen.getByText('Explore Residential Plot Opportunities')).toBeDefined();
    expect(screen.getByText(/Gated Township Residential Plots/i)).toBeDefined();
    expect(screen.getByText(/Green Landscaped Enclave Plots/i)).toBeDefined();

    // Flats Gallery Heading
    expect(screen.getByText('Discover Modern Living Opportunities')).toBeDefined();
    expect(screen.getByText(/Luxury High-Rise Sky Residences/i)).toBeDefined();
    expect(screen.getByText(/Contemporary Garden Courtyard Flats/i)).toBeDefined();
  });

  it('4. How the Business Plan Works: Renders 5-step process roadmap', () => {
    render(<HomeTab userEmail="user@example.com" />);

    expect(screen.getByText('How the Business Plan Works')).toBeDefined();
    expect(screen.getByText('Step 1: Explore')).toBeDefined();
    expect(screen.getByText('Step 2: Understand')).toBeDefined();
    expect(screen.getByText('Step 3: Review the Ranks')).toBeDefined();
    expect(screen.getByText('Step 4: Evaluate')).toBeDefined();
    expect(screen.getByText('Step 5: Decide')).toBeDefined();
  });

  it('5. Rank & Price Preview: Renders live application ranks and prices with View Details modal', () => {
    render(<HomeTab userEmail="user@example.com" />);

    expect(screen.getByText('Explore Available Ranks')).toBeDefined();

    // Live ranks from calculator engine (e.g. PBA 1, PBA 2, etc.)
    expect(screen.getByText('PBA 1')).toBeDefined();
    expect(screen.getByText('PBA 2')).toBeDefined();

    // View Details buttons
    const viewDetailBtns = screen.getAllByRole('button', { name: /View Details/i });
    expect(viewDetailBtns.length).toBeGreaterThan(0);

    // Clicking View Details opens modal
    fireEvent.click(viewDetailBtns[0]);
    expect(screen.getByText(/Live Rank Specification/i)).toBeDefined();
    expect(screen.getByText(/Reviewing this rank or viewing cost breakdowns does not commit you to joining/i)).toBeDefined();

    // Closing modal
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Live Rank Specification/i)).toBeNull();
  });

  it('6. Final Call-to-Action: Renders "Before You Decide, Understand the Plan." and buttons', () => {
    const onNavigateMock = vi.fn();
    render(<HomeTab userEmail="user@example.com" onNavigateToTab={onNavigateMock} />);

    expect(screen.getByText(/Before You Decide,/i)).toBeDefined();
    expect(screen.getByText(/Understand the Plan\./i)).toBeDefined();
    expect(screen.getByText(/Take the first step by learning how the business model works/i)).toBeDefined();

    const understandBtn = screen.getByRole('button', { name: /Understand the Business Plan/i });
    expect(understandBtn).toBeDefined();

    fireEvent.click(understandBtn);
    expect(onNavigateMock).toHaveBeenCalledWith('earning-opportunities');
  });

  describe('7. Scrolling Marquee Text Feature', () => {
    it('Renders the required continuous scrolling marquee text on Home Page', () => {
      render(<HomeTab userEmail="user@example.com" />);

      // Verify the required message is rendered
      const messages = screen.getAllByText("It's like ONE TIME SMART WORK FOR ASSET EARNING, FIRST UNDERSTAND THE BUSINESS PLAN");
      expect(messages.length).toBeGreaterThanOrEqual(1);

      // Verify marquee announcement region is present
      const marqueeRegion = screen.getByRole('region', { name: /Important Announcement Marquee/i });
      expect(marqueeRegion).toBeDefined();
    });

    it('Pauses animation on mouse hover and resumes when mouse moves away', () => {
      render(<HomeTab userEmail="user@example.com" />);

      const marqueeRegion = screen.getByRole('region', { name: /Important Announcement Marquee/i });
      const marqueeTrack = marqueeRegion.querySelector('.home-marquee-track') as HTMLElement;
      expect(marqueeTrack).toBeDefined();

      // Initially running
      expect(marqueeTrack.style.animationPlayState).toBe('running');

      // Mouse enter pauses animation
      fireEvent.mouseEnter(marqueeRegion);
      expect(marqueeTrack.style.animationPlayState).toBe('paused');
      expect(marqueeTrack.classList.contains('paused')).toBe(true);

      // Mouse leave resumes animation
      fireEvent.mouseLeave(marqueeRegion);
      expect(marqueeTrack.style.animationPlayState).toBe('running');
      expect(marqueeTrack.classList.contains('paused')).toBe(false);
    });

    it('Supports touch events on mobile devices and click toggle to pause/resume', () => {
      render(<HomeTab userEmail="user@example.com" />);

      const marqueeRegion = screen.getByRole('region', { name: /Important Announcement Marquee/i });
      const marqueeTrack = marqueeRegion.querySelector('.home-marquee-track') as HTMLElement;

      // 1. Touch start on scrolling text area pauses immediately
      fireEvent.touchStart(marqueeTrack);
      expect(marqueeTrack.style.animationPlayState).toBe('paused');
      expect(marqueeTrack.classList.contains('paused')).toBe(true);

      // 2. Touch end (lifting finger) automatically resumes scrolling
      fireEvent.touchEnd(marqueeTrack);
      expect(marqueeTrack.style.animationPlayState).toBe('running');
      expect(marqueeTrack.classList.contains('paused')).toBe(false);

      // 3. Touch cancel also automatically resumes scrolling safely
      fireEvent.touchStart(marqueeRegion);
      expect(marqueeTrack.style.animationPlayState).toBe('paused');
      fireEvent.touchCancel(marqueeRegion);
      expect(marqueeTrack.style.animationPlayState).toBe('running');

      // 4. Click toggle button pauses and resumes
      const pauseBtn = screen.getByRole('button', { name: /Pause scrolling/i });
      fireEvent.click(pauseBtn);
      expect(marqueeTrack.style.animationPlayState).toBe('paused');

      const resumeBtn = screen.getByRole('button', { name: /Resume scrolling/i });
      fireEvent.click(resumeBtn);
      expect(marqueeTrack.style.animationPlayState).toBe('running');
    });
  });
});

