-- Migration: 0004_add_earning_opportunities.sql
-- Adds earning_opportunities configuration table for Source Structure

CREATE TABLE IF NOT EXISTS public.earning_opportunities (
  id text PRIMARY KEY DEFAULT 'source-structure-config',
  heading text NOT NULL DEFAULT 'Source Structure',
  subtitle text NOT NULL DEFAULT 'IG Infra rewards your efforts with a multi-layered system built for financial freedom.',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'sivaji491@gmail.com'
);

-- Seed initial 5 earning opportunity concepts
INSERT INTO public.earning_opportunities (id, heading, subtitle, items, updated_at, updated_by)
VALUES (
  'source-structure-config',
  'Source Structure',
  'IG Infra rewards your efforts with a multi-layered system built for financial freedom.',
  '[
    {
      "id": "bonus-12-level",
      "number": 1,
      "title": "12 Level Bonus",
      "description": "Earn commissions across 12 tiers of your referral network — income that grows as your network does.",
      "accentColor": "#A855F7",
      "iconName": "Network",
      "position": "top-left"
    },
    {
      "id": "bonus-double-connect",
      "number": 2,
      "title": "Double Connect Bonus (DCB)",
      "description": "Refer two people and earn a substantial extra bonus on top of your regular commissions.",
      "accentColor": "#EF4444",
      "iconName": "Handshake",
      "position": "top-right"
    },
    {
      "id": "bonus-token-appreciation",
      "number": 3,
      "title": "Token Appreciation Bonus",
      "description": "Reach the top rank and receive an exclusive bonus recognizing your outstanding network contribution.",
      "accentColor": "#D97706",
      "iconName": "Medal",
      "position": "middle-right"
    },
    {
      "id": "bonus-monthly-bonanza",
      "number": 4,
      "title": "Monthly Bonanza",
      "description": "Hit your monthly targets and unlock high-value rewards — from luxury goods to travel experiences.",
      "accentColor": "#3B82F6",
      "iconName": "Gem",
      "position": "bottom-right"
    },
    {
      "id": "bonus-global-pool",
      "number": 5,
      "title": "Global Pool Income",
      "description": "Meet your yearly target and earn a share of the company''s total global revenue.",
      "accentColor": "#EAB308",
      "iconName": "Globe",
      "position": "bottom-left"
    }
  ]'::jsonb,
  now(),
  'sivaji491@gmail.com'
)
ON CONFLICT (id) DO NOTHING;
