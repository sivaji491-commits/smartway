import { createFileRoute } from "@tanstack/react-router";
import { RankCalculatorApp } from '@/components/rank-calculator/RankCalculatorApp';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute("/")({
  head: () => pageMeta(
    'Rank Management & Cost Calculator · Network Business Tiers',
    'Calculate network business rank costs with 3% gas fees, cumulative multi-tier totals, USD to INR conversions, and auto-save.'
  ),
  component: RankCalculatorApp,
});
