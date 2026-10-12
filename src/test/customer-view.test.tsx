import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CustomerView } from '../components/customer-view/CustomerView';
import { 
  DEFAULT_NAVIGATION_FIELDS, 
  getRegisteredNavigationFields 
} from '../lib/permissions';
import { 
  resetRankCalculatorToDefault, 
  loadRankCalculatorState, 
  saveRankCalculatorState 
} from '../lib/rank-storage';

describe('Customer View Page – Rank-Based Benefits Display', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
  });

  describe('1. Sidebar Navigation Placement & Registration', () => {
    it('places "Customer view" directly below "DCB (90 days)" in default navigation fields', () => {
      const fields = DEFAULT_NAVIGATION_FIELDS;
      const dcbIndex = fields.findIndex((f) => f.id === 'dcb-90-days');
      const customerViewIndex = fields.findIndex((f) => f.id === 'customer-view');

      expect(dcbIndex).toBeGreaterThanOrEqual(0);
      expect(customerViewIndex).toBe(dcbIndex + 1);

      const customerField = fields[customerViewIndex];
      expect(customerField.label).toBe('Customer view');
      expect(customerField.iconName).toBe('UserCheck');
    });

    it('returns "Customer view" in getRegisteredNavigationFields', () => {
      const fields = getRegisteredNavigationFields();
      const customerField = fields.find((f) => f.id === 'customer-view');

      expect(customerField).toBeDefined();
      expect(customerField?.label).toBe('Customer view');
    });
  });

  describe('2. Rank Selection Dropdown', () => {
    it('renders the "Select Rank:" label and dropdown trigger', () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByText(/Select Rank:/i)).toBeInTheDocument();
      const trigger = screen.getByTestId('customer-rank-dropdown-trigger');
      expect(trigger).toBeInTheDocument();

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;
      expect(nativeSelect).toBeInTheDocument();
    });

    it('populates dropdown with all available ranks dynamically', () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;
      const options = Array.from(nativeSelect.options).map((opt) => opt.text);

      expect(options.length).toBeGreaterThanOrEqual(7);
      expect(options.some((o) => o.includes('PBA 1'))).toBe(true);
      expect(options.some((o) => o.includes('PBA 7'))).toBe(true);
    });

    it('defaults to PBA 7 upon load as in reference screenshot', () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;
      expect(nativeSelect.value).toBe('pba-7');
    });
  });

  describe('3. Dynamic Rank-Based Content & Screenshot Reference Values', () => {
    it('displays exact values matching reference screenshot when PBA 7 is selected', async () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;
      fireEvent.change(nativeSelect, { target: { value: 'pba-7' } });

      await waitFor(() => {
        // Rank name
        const rankTitles = screen.getAllByText(/PBA 7/i);
        expect(rankTitles.length).toBeGreaterThan(0);

        // Rank amount ₹5,00,000 / $5,000.00
        expect(screen.getAllByText(/5,00,000/i).length).toBeGreaterThan(0);

        // Referral 1 and Referral 2 benefits: ₹1,25,000/- ($1,250.00)
        expect(screen.getAllByText(/1,25,000/i).length).toBeGreaterThanOrEqual(2);

        // DCB amount: ₹1,50,000/- ($1,500.00)
        expect(screen.getAllByText(/1,50,000/i).length).toBeGreaterThan(0);

        // Total amount (gross): ₹4,00,000/- ($4,000.00)
        expect(screen.getAllByText(/4,00,000/i).length).toBeGreaterThan(0);

        // Net amount: ₹3,60,000/- ($3,600.00)
        expect(screen.getAllByText(/3,60,000/i).length).toBeGreaterThan(0);

        // Unlimited progression milestones
        expect(screen.getAllByText(/7,20,000/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/10,80,000/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Unlimited Progression Indicator/i)).toBeInTheDocument();
      });
    });

    it('immediately updates all values dynamically when switching from PBA 7 to PBA 1', async () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;

      // Select PBA 1
      fireEvent.change(nativeSelect, { target: { value: 'pba-1' } });

      await waitFor(() => {
        // Rank name
        expect(screen.getAllByText(/PBA 1/i).length).toBeGreaterThan(0);

        // Rank amount ₹10,000 ($100.00)
        expect(screen.getAllByText(/10,000/i).length).toBeGreaterThan(0);

        // Referral benefits: 25% of ₹10,000 = ₹2,500/-
        expect(screen.getAllByText(/2,500/i).length).toBeGreaterThanOrEqual(2);

        // DCB amount: 30% of ₹10,000 = ₹3,000/-
        expect(screen.getAllByText(/3,000/i).length).toBeGreaterThan(0);

        // Total amount (gross): 80% = ₹8,000/-
        expect(screen.getAllByText(/8,000/i).length).toBeGreaterThan(0);

        // Net amount: ₹7,200/-
        expect(screen.getAllByText(/7,200/i).length).toBeGreaterThan(0);
      });
    });

    it('immediately updates all values dynamically when switching to PBA 4', async () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;

      // Select PBA 4 ($2,000 cumulative base -> ₹2,00,000)
      fireEvent.change(nativeSelect, { target: { value: 'pba-4' } });

      await waitFor(() => {
        expect(screen.getAllByText(/PBA 4/i).length).toBeGreaterThan(0);
        // Rank value: ₹2,00,000
        expect(screen.getAllByText(/2,00,000/i).length).toBeGreaterThan(0);
        // Ref 1 & 2: 25% = ₹50,000/-
        expect(screen.getAllByText(/50,000/i).length).toBeGreaterThanOrEqual(2);
        // DCB: 30% = ₹60,000/-
        expect(screen.getAllByText(/60,000/i).length).toBeGreaterThan(0);
        // Gross: 80% = ₹1,60,000/-
        expect(screen.getAllByText(/1,60,000/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('4. Custom Ranks Support', () => {
    it('reacts dynamically if custom rank names or prices are configured in rank storage', async () => {
      const state = loadRankCalculatorState();
      // Modify first rank name to "Starter Executive"
      const modifiedRanks = [...state.ranks];
      modifiedRanks[0] = { ...modifiedRanks[0], name: 'Starter Executive', basePrice: 200 };
      saveRankCalculatorState({ ...state, ranks: modifiedRanks });

      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      const nativeSelect = screen.getByTestId('customer-rank-native-select') as HTMLSelectElement;
      const options = Array.from(nativeSelect.options).map((opt) => opt.text);
      expect(options.some((o) => o.includes('Starter Executive'))).toBe(true);

      fireEvent.change(nativeSelect, { target: { value: modifiedRanks[0].id } });

      await waitFor(() => {
        expect(screen.getAllByText(/Starter Executive/i).length).toBeGreaterThan(0);
        // 200 * 100 = 20,000
        expect(screen.getAllByText(/20,000/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('5. UI Structure & Accessibility', () => {
    it('renders structured benefit cards for direct referrals, DCB, and total return', () => {
      render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);

      expect(screen.getByText(/Direct Referral 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct Referral 2/i)).toBeInTheDocument();
      expect(screen.getByText(/DCB Amount/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Total Amount/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Unlimited Progression Indicator/i)).toBeInTheDocument();
    });

    it('contains no overflowing fixed heights and uses compact layout in customer-view-container', () => {
      const { container } = render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);
      const root = container.querySelector('.customer-view-container');
      expect(root).toBeInTheDocument();
      expect(root?.className).toContain('rounded-xl');
    });
  });

  describe('6. Card Hover Zoom & Smooth Animation Effect', () => {
    it('applies customer-view-card class to all 9 relevant cards across rank details, benefits, DCB, total, and milestones', () => {
      const { container } = render(<CustomerView isAdmin={true} userEmail="sivaji491@gmail.com" />);
      const cards = container.querySelectorAll('.customer-view-card');
      // 2 primary cards (rank details, total) + 4 benefit cards (ref1, ref2, dcb, total) + 3 milestone cards (2, 4, 6) = 9 cards
      expect(cards.length).toBe(9);

      cards.forEach((card) => {
        expect(card.classList.contains('customer-view-card')).toBe(true);
      });
    });
  });
});

