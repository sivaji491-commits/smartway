export interface NoticeItem {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isActive?: boolean;
}

export const DEFAULT_NOTICES: NoticeItem[] = [
  {
    id: 'default-notice-1',
    text: "It's like ONE TIME SMART WORK FOR ASSET EARNING, FIRST UNDERSTAND THE BUSINESS PLAN",
    createdAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
  },
];
