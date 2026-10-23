import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HomeTab } from '../components/home-tab';
import { DEFAULT_HOME_PAGE_DATA } from '../types/home-page';
import { loadPublishedHomePage, loadDraftHomePage } from '../lib/home-page-storage';

describe('Home Page Headline Update & Responsive Support Tests', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('1. Renders the exact updated headline "Earn Plot or Flat Within 1 Year."', () => {
    render(<HomeTab userEmail="user@example.com" />);

    // Exact headline must exist in the document
    const headline = screen.getByText(/Earn Plot or Flat Within 1 Year\./i);
    expect(headline).toBeDefined();

    // Previous headline must NOT exist anywhere
    expect(screen.queryByText(/Your Future\. Your Opportunity\./i)).toBeNull();
  });

  it('2. Headline includes full responsive classes across mobile, tablet, laptop, and desktop', () => {
    const { container } = render(<HomeTab userEmail="user@example.com" />);
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();

    // Verify responsive Tailwind breakpoints
    expect(h1?.className).toContain('text-2xl');
    expect(h1?.className).toContain('sm:text-4xl');
    expect(h1?.className).toContain('md:text-5xl');
    expect(h1?.className).toContain('lg:text-6xl');
    expect(h1?.className).toContain('max-w-5xl');
    expect(h1?.className).toContain('font-extrabold');
  });

  it('3. Default data object in types has the exact updated headline', () => {
    expect(DEFAULT_HOME_PAGE_DATA.hero.headline).toBe('Earn Plot or Flat Within 1 Year.');
  });

  it('4. Automatically migrates legacy cached localStorage headline to the new headline', () => {
    // Simulate legacy user localStorage with old headline
    const legacyData = {
      ...DEFAULT_HOME_PAGE_DATA,
      hero: {
        ...DEFAULT_HOME_PAGE_DATA.hero,
        headline: 'Your Future. Your Opportunity.',
      },
    };
    window.localStorage.setItem('smartway_home_page_published_v1', JSON.stringify(legacyData));

    // Loading published page should migrate to new headline
    const migratedPublished = loadPublishedHomePage();
    expect(migratedPublished.hero.headline).toBe('Earn Plot or Flat Within 1 Year.');

    // And draft loading should also reflect the new headline
    window.localStorage.setItem('smartway_home_page_draft_v1', JSON.stringify(legacyData));
    const migratedDraft = loadDraftHomePage();
    expect(migratedDraft.hero.headline).toBe('Earn Plot or Flat Within 1 Year.');
  });

  it('5. Applies the hero-golden-headline class for subtle golden glow and occasional light sweep', () => {
    const { container } = render(<HomeTab userEmail="user@example.com" />);
    const goldenSpan = container.querySelector('.hero-golden-headline');
    expect(goldenSpan).not.toBeNull();
    expect(goldenSpan?.textContent).toBe('Earn Plot or Flat Within 1 Year.');
  });
});
