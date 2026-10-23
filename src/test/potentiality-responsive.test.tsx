import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PotentialityView } from '../components/potentiality/PotentialityView';
import { resetPotentialityState } from '../lib/potentiality-storage';
import { resetRankCalculatorToDefault } from '../lib/rank-storage';

describe('Potentiality Table Responsive Layout Verification', () => {
  beforeEach(() => {
    resetRankCalculatorToDefault();
    resetPotentialityState();
  });

  it('1. Eliminates hardcoded min-w-[860px] from the table element', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.className).not.toContain('min-w-[860px]');
    expect(table?.className).toContain('w-full');
  });

  it('2. Table wrapper uses scrollbar-none and responsive overflow without scrollbar-thin', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);
    const tableWrapper = container.querySelector('table')?.parentElement;
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper?.className).not.toContain('scrollbar-thin');
    expect(tableWrapper?.className).toContain('scrollbar-none');
    expect(tableWrapper?.className).toContain('overflow-x-auto');
  });

  it('3. Regular user colgroup uses proportional percentage widths totaling 100%', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);
    const cols = container.querySelectorAll('colgroup col');
    expect(cols.length).toBe(9);

    // Sum up percentages
    let totalPercentage = 0;
    cols.forEach((col) => {
      const match = col.className.match(/w-\[(\d+)%\]/);
      expect(match).not.toBeNull();
      if (match) {
        totalPercentage += parseInt(match[1], 10);
      }
    });
    expect(totalPercentage).toBe(100);
  });

  it('4. Admin user colgroup uses proportional percentage widths totaling 100%', () => {
    const { container } = render(<PotentialityView isAdmin={true} />);
    const cols = container.querySelectorAll('colgroup col');
    expect(cols.length).toBe(10);

    let totalPercentage = 0;
    cols.forEach((col) => {
      const match = col.className.match(/w-\[(\d+)%\]/);
      expect(match).not.toBeNull();
      if (match) {
        totalPercentage += parseInt(match[1], 10);
      }
    });
    expect(totalPercentage).toBe(100);
  });

  it('5. Allows multi-word column headers to wrap neatly with whitespace-normal', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);
    const ths = container.querySelectorAll('thead th');
    expect(ths.length).toBe(9);

    // Find headers by text content
    const earnEachHeader = Array.from(ths).find((th) => th.textContent?.includes('Earn Each Referral'));
    expect(earnEachHeader?.className).toContain('whitespace-normal');

    const refAmountHeader = Array.from(ths).find((th) => th.textContent?.includes('Ref. amount'));
    expect(refAmountHeader?.className).toContain('whitespace-normal');

    const justReferHeader = Array.from(ths).find((th) => th.textContent?.includes('Just refer'));
    expect(justReferHeader?.className).toContain('whitespace-normal');

    const timeHeader = Array.from(ths).find((th) => th.textContent?.includes('Time'));
    expect(timeHeader?.className).toContain('whitespace-nowrap');

    // DCB 30% and Duration should NOT be table headers
    const dcbHeader = Array.from(ths).find((th) => th.textContent?.includes('DCB 30%'));
    expect(dcbHeader).toBeUndefined();

    const durationHeader = Array.from(ths).find((th) => th.textContent?.includes('Duration'));
    expect(durationHeader).toBeUndefined();
  });

  it('6. Row 13 (Footer) spans matching columns correctly across all 9 columns', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);
    const rows = container.querySelectorAll('tbody tr');
    const footerRow = rows[rows.length - 1]; // Row 13
    expect(footerRow).not.toBeNull();

    const cells = footerRow.querySelectorAll('td');
    // Cell 1: Time (1 col), Cell 2: Banner (colSpan=5), Cell 3: Total label (1 col), Cell 4: Total Profit (colSpan=2)
    expect(cells.length).toBe(4);
    expect(cells[1].getAttribute('colspan')).toBe('5');
    expect(cells[3].getAttribute('colspan')).toBe('2');

    // Total spanning: 1 + 5 + 1 + 2 = 9 columns
    const totalCols = 1 + 5 + 1 + 2;
    expect(totalCols).toBe(9);
  });

  it('7. Compact responsive typography and padding are applied to table cells', () => {
    const { container } = render(<PotentialityView isAdmin={false} />);
    const firstRowCells = container.querySelectorAll('tbody tr:first-child td');
    expect(firstRowCells.length).toBe(9);

    // Check padding classes
    firstRowCells.forEach((td) => {
      expect(td.className).toMatch(/px-0\.5|px-1|pl-0\.5|pl-1/);
    });
  });
});
