import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage, resolveEffectiveUserIdentifier } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/key-points')({
  head: () => pageMeta('Key Points · Core Business Plan Principles', 'Review essential guidelines, compensation rules, and executive key points.'),
  beforeLoad: async ({ context }) => {
    const effectiveEmail = resolveEffectiveUserIdentifier((context as any)?.user?.email);
    const allowed = getUserAllowedTabs(effectiveEmail);

    if (!allowed.includes('key-points')) {
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
      search: { tab: 'key-points' },
      replace: true,
    });
  },
  component: () => null,
});
