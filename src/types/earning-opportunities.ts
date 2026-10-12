export interface EarningOpportunityItem {
  id: string;
  number: number;
  title: string;
  description: string;
  accentColor: string;
  iconName: string;
  position?: 'top-left' | 'top-right' | 'middle-right' | 'bottom-right' | 'bottom-left' | string;
}

export interface EarningOpportunitiesData {
  heading: string;
  subtitle: string;
  items: EarningOpportunityItem[];
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_EARNING_OPPORTUNITIES: EarningOpportunitiesData = {
  heading: 'Earning Opportunities',
  subtitle: 'IG Infra rewards your efforts with a multi-layered system built for financial freedom.',
  items: [
    {
      id: 'bonus-12-level',
      number: 1,
      title: '12 Level Bonus',
      description: 'Earn commissions across 12 tiers of your referral network — income that grows as your network does.',
      accentColor: '#10B981', // Emerald
      iconName: 'Network',
      position: '01',
    },
    {
      id: 'bonus-double-connect',
      number: 2,
      title: 'Double Connect Bonus (DCB)',
      description: 'Refer two people and earn a substantial extra bonus on top of your regular commissions.',
      accentColor: '#F43F5E', // Coral
      iconName: 'Handshake',
      position: '02',
    },
    {
      id: 'bonus-token-appreciation',
      number: 3,
      title: 'Token Appreciation Bonus',
      description: 'Reach the top rank and receive an exclusive bonus recognizing your outstanding network contribution.',
      accentColor: '#F59E0B', // Amber
      iconName: 'Award',
      position: '03',
    },
    {
      id: 'bonus-monthly-bonanza',
      number: 4,
      title: 'Monthly Bonanza',
      description: 'Hit your monthly targets and unlock high-value rewards — from luxury goods to travel experiences.',
      accentColor: '#3B82F6', // Electric Blue
      iconName: 'Trophy',
      position: '04',
    },
    {
      id: 'bonus-global-pool',
      number: 5,
      title: 'Global Pool Income',
      description: "Meet your yearly target and earn a share of the company's total global revenue.",
      accentColor: '#8B5CF6', // Vivid Violet
      iconName: 'Globe',
      position: '05',
    },
  ],
};
