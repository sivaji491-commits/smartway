export interface HeroContent {
  headline: string;
  highlightHeadline: string;
  subtitle: string;
  heroBgImage: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

export interface PhilosophyCard {
  id: string;
  title: string;
  description: string;
  highlight: string;
  iconName: string;
}

export interface PhilosophyContent {
  heading: string;
  subtitle: string;
  cards: PhilosophyCard[];
  disclosureNote: string;
}

export interface HowItWorksStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
}

export interface HowItWorksContent {
  heading: string;
  subtitle: string;
  steps: HowItWorksStep[];
  disclaimer: string;
}

export interface PlotItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  features: string[];
  tag: string;
  order: number;
  featured?: boolean;
}

export interface ApartmentItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  features: string[];
  tag: string;
  order: number;
  featured?: boolean;
}

export interface FinalCtaContent {
  heading: string;
  highlightHeading: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

export interface HomePageData {
  marqueeText?: string;
  hero: HeroContent;
  philosophy: PhilosophyContent;
  howItWorks: HowItWorksContent;
  plots: PlotItem[];
  apartments: ApartmentItem[];
  finalCta: FinalCtaContent;
  status?: 'published' | 'draft';
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_HOME_PAGE_DATA: HomePageData = {
  marqueeText: "It's like ONE TIME SMART WORK FOR ASSET EARNING, FIRST UNDERSTAND THE BUSINESS PLAN",
  hero: {
    headline: 'Earn Plot or Flat Within 1 Year.',
    highlightHeadline: 'Understand the Possibilities.',
    subtitle: 'Already working in a job, managing a business, or pursuing another profession? Explore our real estate business plan, understand how it works, and evaluate the available opportunities at your own pace.',
    heroBgImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
    primaryButtonText: 'Explore the Business Plan',
    primaryButtonLink: 'earning-opportunities',
    secondaryButtonText: 'View Plots & Flats',
    secondaryButtonLink: 'plots-section',
  },
  philosophy: {
    heading: 'Understand First. Decide Confidently.',
    subtitle: 'We believe that sound decisions begin with clear knowledge. Our platform is built for employees, professionals, and entrepreneurs who value clarity and transparent evaluation.',
    cards: [
      {
        id: 'phil-1',
        title: 'No Pressure',
        description: 'Take your time to understand the business model. There is no pressure to join immediately.',
        highlight: 'Evaluate at your preferred pace',
        iconName: 'ShieldCheck',
      },
      {
        id: 'phil-2',
        title: 'Understand the Process',
        description: 'Learn how the plan works, what participation involves, and how the different ranks and prices are structured.',
        highlight: 'Full procedural transparency',
        iconName: 'Layers',
      },
      {
        id: 'phil-3',
        title: 'Make an Informed Decision',
        description: 'Review the relevant details, ask questions, understand the terms, and decide whether the opportunity suits your circumstances.',
        highlight: 'Your autonomy is respected',
        iconName: 'Scale',
      },
    ],
    disclosureNote: 'Important Transparency Notice: We do not describe our business model as completely risk-free or guarantee profits or returns. Participation is strictly optional. All applicable costs, conditions, and business dynamics must be reviewed and understood before taking any step.',
  },
  howItWorks: {
    heading: 'How the Business Plan Works',
    subtitle: 'A transparent, step-by-step roadmap to understand our business structure without pressure, ambiguity, or obligations.',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Step 1: Explore',
        description: 'Learn about the business concept, our vision, and the real estate ecosystem foundation.',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Step 2: Understand',
        description: 'Review how the plan operates, the compensation distribution model, and how participation works.',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Step 3: Review the Ranks',
        description: 'Explore the available ranks, associated tiers, and respective configured rank prices.',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Step 4: Evaluate',
        description: 'Understand the applicable terms, conditions, operational requirements, and business risks.',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        title: 'Step 5: Decide',
        description: 'Choose whether to participate based on your complete understanding and personal circumstances.',
      },
    ],
    disclaimer: 'Note: Selecting or reviewing any rank does not imply guaranteed income, automated earnings, or property ownership. All outcomes require individual active effort and compliance with plan conditions.',
  },
  plots: [
    {
      id: 'plot-1',
      title: 'Gated Township Residential Plots',
      category: 'Master-Planned Layout',
      description: 'Clearly demarcated residential plots featuring wide asphalt avenues, curbed sidewalks, underground electricity lines, and landscaped perimeter boundaries.',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
      features: ['60ft Main Avenue', 'Underground Cabling', 'Dedicated Drainage', 'Parks & Green Belts'],
      tag: 'Illustrative Example',
      order: 1,
      featured: true,
    },
    {
      id: 'plot-2',
      title: 'Green Landscaped Enclave Plots',
      category: 'Eco Residential Layout',
      description: 'Scenic tree-lined plots situated around centralized community parks, children play lawns, and perimeter walking trails.',
      imageUrl: 'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1000&q=80',
      features: ['40ft Sector Roads', 'Perimeter Compound Wall', '24/7 Gated Security', 'Organic Tree Walkways'],
      tag: 'Illustrative Example',
      order: 2,
      featured: false,
    },
    {
      id: 'plot-3',
      title: 'Boulevard Infrastructure Plots',
      category: 'Paved Avenue Demarcation',
      description: 'Modern residential plots with curb-to-curb blacktop roads, LED street lamp posts, overhead water storage, and corner boundary pillars.',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
      features: ['Grand Entrance Arch', 'Clear Demarcation Stones', 'Overhead Water Tank', 'LED Street Lighting'],
      tag: 'Illustrative Example',
      order: 3,
      featured: false,
    },
    {
      id: 'plot-4',
      title: 'Clubhouse Community Lifestyle Plots',
      category: 'Resort Living Concept',
      description: 'Premium villa plots planned around a central recreation clubhouse, landscaped water feature, and sports courts.',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
      features: ['Clubhouse Access', 'Lake View Landscaping', 'Rainwater Harvesting', 'Underground Utilities'],
      tag: 'Illustrative Example',
      order: 4,
      featured: false,
    },
  ],
  apartments: [
    {
      id: 'apt-1',
      title: 'Luxury High-Rise Sky Residences',
      category: 'Modern Apartment Exterior',
      description: 'Architectural residential apartments with wide glass sun-balconies, expansive skyline views, and designer entrance lobbies.',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      features: ['Infinity Pool Deck', 'Smart Access Control', 'EV Charging Bays', 'Designer Grand Lobby'],
      tag: 'Illustrative Example',
      order: 1,
      featured: true,
    },
    {
      id: 'apt-2',
      title: 'Contemporary Garden Courtyard Flats',
      category: 'Community Residential Living',
      description: 'Low-density modern flats featuring landscaped courtyard gardens, swimming pool, and dedicated recreational open spaces.',
      imageUrl: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1000&q=80',
      features: ['Podium Landscaping', 'Modern Fitness Center', 'Rooftop Lounge', 'Children Play Park'],
      tag: 'Illustrative Example',
      order: 2,
      featured: false,
    },
    {
      id: 'apt-3',
      title: 'Eco-Urban Residences with Vertical Greenery',
      category: 'Sustainable Architecture',
      description: 'Contemporary building design integrated with vertical foliage terraces, natural cross-ventilation, and energy-efficient systems.',
      imageUrl: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1000&q=80',
      features: ['Solar Power Generation', 'Rainwater Harvesting', 'Indoor Sports Hall', 'Community Banquet'],
      tag: 'Illustrative Example',
      order: 3,
      featured: false,
    },
    {
      id: 'apt-4',
      title: 'Sunset Horizon Executive Towers',
      category: 'Premium Residential Towers',
      description: 'Sleek stone and glass facade residences with spacious sundecks, floor-to-ceiling glass, and warm ambient evening lighting.',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
      features: ['3-Tier Security System', 'Multi-Level Car Parking', 'High-Speed Elevators', '24/7 Concierge'],
      tag: 'Illustrative Example',
      order: 4,
      featured: false,
    },
  ],
  finalCta: {
    heading: 'Before You Decide,',
    highlightHeading: 'Understand the Plan.',
    subtitle: 'Take the first step by learning how the business model works. Explore the process, review the available options, and make an informed decision.',
    primaryButtonText: 'Understand the Business Plan',
    primaryButtonLink: 'earning-opportunities',
    secondaryButtonText: 'Explore Real Estate',
    secondaryButtonLink: 'plots-section',
  },
  status: 'published',
  version: 1,
};
