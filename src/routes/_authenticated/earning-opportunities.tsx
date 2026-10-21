import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage, resolveEffectiveUserIdentifier } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/earning-opportunities')({
  head: () => pageMeta('Earning Opportunities · Source Structure', 'Explore the IG Infra Source Structure commission model and earning tiers.'),
  beforeLoad: async ({ context }) => {
    const effectiveEmail = resolveEffectiveUserIdentifier((context as any)?.user?.email);
    const allowed = getUserAllowedTabs(effectiveEmail);

    if (!allowed.includes('earning-opportunities')) {
      const fallback = getAccessibleLandingPage(effectiveEmail);
      if (fallback) {
        throw redirect({
          to: '/maintenance',
          search: { tab: fallback },
          replace: true,
        });
      }
      throw redirect({
        to: '/maintenance',
        search: { tab: 'access-denied' },
        replace: true,
      });
    }

    throw redirect({
      to: '/maintenance',
      search: { tab: 'earning-opportunities' },
      replace: true,
    });
  },
  component: () => null,
});
