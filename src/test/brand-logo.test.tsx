import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { Brand } from '@/components/brand';

describe('Brand Sidebar Logo Replacement', () => {
  it('verifies that ig-infra-logo.png exists in src/assets and public', () => {
    const srcAssetPath = path.resolve('src/assets/ig-infra-logo.png');
    const publicAssetPath = path.resolve('public/ig-infra-logo.png');
    expect(fs.existsSync(srcAssetPath)).toBe(true);
    expect(fs.existsSync(publicAssetPath)).toBe(true);
    expect(fs.statSync(srcAssetPath).size).toBeGreaterThan(10000);
  });

  it('renders IG Infra Developers logo next to Business Plan text', () => {
    render(<Brand />);

    // Brand text should be present
    expect(screen.getByText('Business Plan')).toBeDefined();

    // Sprout icon should not be present
    expect(screen.queryByTestId('sprout-icon')).toBeNull();

    // Logo image should be present with appropriate alt and styling
    const logoImg = screen.getByRole('img', { name: /IG Infra Developers/i });
    expect(logoImg).toBeDefined();
    expect(logoImg.getAttribute('src')).toBeTruthy();
    expect(logoImg.className).toContain('object-contain');
    expect(logoImg.className).toMatch(/h-\[62px\]|sm:h-\[64px\]/);
    expect(logoImg.className).toMatch(/max-w-\[110px\]|sm:max-w-\[115px\]/);
    expect(logoImg.className).toContain('cursor-pointer');

    // Business Plan text should have exact original styling
    const textSpan = screen.getByText('Business Plan');
    expect(textSpan.className).toContain('font-bold');
    expect(textSpan.className).toContain('text-base');
    expect(textSpan.className).toContain('text-white');
  });

  it('triggers onLogoClick (Home navigation) when clicking the logo', async () => {
    let clicked = false;
    render(<Brand onLogoClick={() => { clicked = true; }} />);

    const logoButton = screen.getByRole('button', { name: /IG Infra Developers - Go to Home/i });
    expect(logoButton).toBeDefined();
    logoButton.click();
    expect(clicked).toBe(true);
  });
});
