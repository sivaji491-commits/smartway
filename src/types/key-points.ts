export interface KeyPointItem {
  id: string;
  pointNumber: number;
  text: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface KeyPointsData {
  items: KeyPointItem[];
  version: number;
  updatedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface KeyPointsServerResult {
  success: boolean;
  error?: string;
  data?: KeyPointItem | KeyPointItem[];
}

export const DEFAULT_KEY_POINTS: KeyPointItem[] = [
  {
    id: 'kp-1',
    pointNumber: 1,
    text: 'Understand the Business Plan First. Decide After You Understand.',
    category: 'Core Principle',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 'kp-2',
    pointNumber: 2,
    text: 'Leveraged 12-Level compressed matrix bonus structure designed for sustained network growth.',
    category: 'Compensation',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 'kp-3',
    pointNumber: 3,
    text: 'Double Connect Bonus (DCB) provides up to 30% milestone earnings over 90 days.',
    category: 'Bonuses',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 'kp-4',
    pointNumber: 4,
    text: 'Token appreciation and revenue participation pools reward consistent leadership performance.',
    category: 'Appreciation',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 'kp-5',
    pointNumber: 5,
    text: 'Strict security, role-based governance, and verified user identity framework protect all members.',
    category: 'Governance',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'System',
  },
];
