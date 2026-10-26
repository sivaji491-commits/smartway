export interface RouteMapContent {
  headlineText: string;
  badgeText?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_ROUTE_MAP_CONTENT: RouteMapContent = {
  headlineText: 'One Time Work',
  badgeText: 'LIFETIME ROADMAP',
  updatedAt: '2026-10-26T12:00:00.000Z',
  updatedBy: 'sivaji491@gmail.com',
};

export interface RouteMapValidationResult {
  valid: boolean;
  isValid: boolean;
  error?: string;
}
