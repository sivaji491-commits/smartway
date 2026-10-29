import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { CustomerView } from '../components/customer-view/CustomerView';
import { AnimatedPlotLocationPin } from '../components/common/AnimatedPlotLocationPin';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('Customer View – Red "HERE" Location Pin Animation', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Pin Rendering and Uniqueness', () => {
    it('renders exactly one "HERE" location pin marker in the customer view hero section', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const heroSection = screen.getByTestId('customer-hero-section');
      expect(heroSection).toBeInTheDocument();

      // Find the location pin marker by aria-label
      const pinMarkers = screen.getAllByRole('img', { name: /featured plot location marker/i });
      expect(pinMarkers).toHaveLength(1);

      const pinMarker = pinMarkers[0];
      expect(heroSection).toContainElement(pinMarker);

      // Verify the text "HERE" is present exactly once
      const hereTexts = screen.getAllByText('HERE');
      expect(hereTexts).toHaveLength(1);
      expect(pinMarker).toContainElement(hereTexts[0]);
    });

    it('displays the real estate plot image matching the home page image', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const heroImage = screen.getByAltText(/developed residential plots and luxury apartments/i) as HTMLImageElement;
      expect(heroImage).toBeInTheDocument();
      expect(heroImage.getAttribute('src')).toBe('/images/customer-view/hero-real-estate.jpg');
      expect(heroImage.className).toContain('object-cover');
      expect(heroImage.className).toContain('object-center');
    });

    it('positions the pin at the exact plot coordinates matching the home page reference', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const pinMarker = screen.getByRole('img', { name: /featured plot location marker/i });
      expect(pinMarker).toHaveStyle({
        left: '55.4%',
        top: '73.5%',
        transform: 'translate(-50%, -97%)',
      });
    });
  });

  describe('2. Pin Animation and Visual Elements', () => {
    it('applies the gentle jump animation class to the pin wrapper', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const pinMarker = screen.getByRole('img', { name: /featured plot location marker/i });
      const animatedContainer = pinMarker.querySelector('.plot-pin-animated');
      expect(animatedContainer).not.toBeNull();
      expect(animatedContainer).toBeInTheDocument();
    });

    it('includes a synchronized ground contact shadow directly beneath the pin', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const heroSection = screen.getByTestId('customer-hero-section');
      const shadowElement = heroSection.querySelector('.plot-pin-shadow');
      expect(shadowElement).not.toBeNull();

      // The shadow wrapper is positioned at the same base coordinate (55.4%, 73.5%)
      const shadowWrapper = shadowElement?.parentElement;
      expect(shadowWrapper).toHaveStyle({
        left: '55.4%',
        top: '73.5%',
        transform: 'translate(-50%, -50%)',
      });
    });

    it('contains the 3D red pin SVG with gradients and bold white "HERE" text', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const pinMarker = screen.getByRole('img', { name: /featured plot location marker/i });
      const svg = pinMarker.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 100 136');

      // Check text element properties
      const textElement = svg?.querySelector('text');
      expect(textElement).not.toBeNull();
      expect(textElement?.textContent).toBe('HERE');
      expect(textElement?.getAttribute('fill')).toBe('#FFFFFF');
      expect(textElement?.getAttribute('font-weight')).toBe('900');
    });
  });

  describe('3. Reusable Component Integrity', () => {
    it('renders AnimatedPlotLocationPin standalone with unique idPrefix to avoid SVG ID collisions', () => {
      const { container } = render(
        <div style={{ position: 'relative', width: 400, height: 250 }}>
          <AnimatedPlotLocationPin idPrefix="test-pin" />
        </div>
      );

      const radialGrad = container.querySelector('#test-pin-pinRed3D');
      expect(radialGrad).not.toBeNull();

      const glossGrad = container.querySelector('#test-pin-pinGloss');
      expect(glossGrad).not.toBeNull();

      const bevelGrad = container.querySelector('#test-pin-innerBevel');
      expect(bevelGrad).not.toBeNull();
    });
  });

  describe('4. Responsive Design & Aspect Ratio', () => {
    it('uses aspect-[16/10] on the hero image banner container for consistent plot alignment', () => {
      render(<CustomerView isAdmin={false} userEmail="user@example.com" />);

      const heroImage = screen.getByAltText(/developed residential plots and luxury apartments/i);
      const container = heroImage.parentElement;
      expect(container?.className).toContain('aspect-[16/10]');
      expect(container?.className).toContain('overflow-hidden');
    });
  });
});

