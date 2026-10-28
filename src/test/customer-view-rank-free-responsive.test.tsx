import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CustomerView } from '../components/customer-view/CustomerView';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('Customer View Page 4-Card Section with Rank Free', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
    window.localStorage.clear();
  });

  it('renders all four purchase option cards in the grid with responsive classes', () => {
    render(<CustomerView isAdmin={false} userEmail="member@example.com" />);

    // 1. Grid container has responsive 4-column layout classes
    const grid = screen.getByTestId('customer-purchase-cards-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-4');

    // 2. All 4 cards are rendered in sequence
    const cardSavings = screen.getByTestId('customer-purchase-card-savings');
    const cardLoan = screen.getByTestId('customer-purchase-card-loan');
    const cardOurOption = screen.getByTestId('customer-purchase-card-our-option');
    const cardRankFree = screen.getByTestId('customer-purchase-card-rank-free');

    expect(cardSavings).toBeInTheDocument();
    expect(cardLoan).toBeInTheDocument();
    expect(cardOurOption).toBeInTheDocument();
    expect(cardRankFree).toBeInTheDocument();

    // 3. Numbers 1, 2, 3, 4 are present
    expect(cardSavings).toHaveTextContent('1');
    expect(cardLoan).toHaveTextContent('2');
    expect(cardOurOption).toHaveTextContent('3');
    expect(cardRankFree).toHaveTextContent('4');
  });

  it('verifies the fourth card (Rank Free) styling, content, image, button, and info strip', () => {
    render(<CustomerView isAdmin={false} userEmail="member@example.com" />);

    const card = screen.getByTestId('customer-purchase-card-rank-free');
    expect(card.className).toContain('customer-purchase-card');
    expect(card.className).toContain('theme-purple');

    // Heading and description
    expect(screen.getByRole('heading', { level: 2, name: /Rank Free/i })).toBeInTheDocument();
    expect(card).toHaveTextContent(/Explore rank progression to qualify for property opportunities\./i);

    // Image
    const img = screen.getByAltText(/Rank Free - Real estate achievement milestone with golden badge and property key/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/customer-view/rank-free-option.jpg');

    // Button
    const button = screen.getByRole('button', { name: /Explore Rank Free benefits and rank details/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Explore Rank Free');

    // Bottom info strip
    expect(card).toHaveTextContent('Rank-based path');
    expect(card).toHaveTextContent('Earned progression');
  });

  it('scrolls to rank-benefits-calculator when "Explore Rank Free" button is clicked', () => {
    const scrollIntoViewMock = vi.fn();
    render(<CustomerView isAdmin={false} userEmail="member@example.com" />);

    const calculatorTarget = document.getElementById('rank-benefits-calculator');
    if (calculatorTarget) {
      calculatorTarget.scrollIntoView = scrollIntoViewMock;
    }

    const button = screen.getByRole('button', { name: /Explore Rank Free benefits and rank details/i });
    fireEvent.click(button);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('preserves existing three cards and rank calculator functionality', () => {
    render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

    // Existing cards preserved
    expect(screen.getByText('Use Your Savings')).toBeInTheDocument();
    expect(screen.getByText('Take a Bank Loan')).toBeInTheDocument();
    expect(screen.getByText('Use Our Option')).toBeInTheDocument();

    // Existing buttons preserved
    expect(screen.getByRole('button', { name: /Buy with Savings option details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get Bank Loan financing details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Know More about our special purchase option/i })).toBeInTheDocument();

    // Trust strip preserved
    expect(screen.getByTestId('customer-trust-strip')).toBeInTheDocument();

    // Rank calculator section preserved
    expect(screen.getByTestId('customer-rank-dropdown-trigger')).toBeInTheDocument();
  });
});
