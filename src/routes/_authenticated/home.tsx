import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage, resolveEffectiveUserIdentifier } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/home')({
  head: () => pageMeta('Workspace Home · IG Infra Business Plan', 'Workspace dashboard and summary.'),
  beforeLoad: async ({ context }) => {
    const effectiveEmail = resolveEffectiveUserIdentifier((context as any)?.user?.email);
    const allowed = getUserAllowedTabs(effectiveEmail);

    if (!allowed.includes('home')) {
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
      search: { tab: 'home' },
      replace: true,
    });
  },
  component: () => null,
});
