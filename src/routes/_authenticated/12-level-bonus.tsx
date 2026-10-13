import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/12-level-bonus')({
  head: () => pageMeta('12 Level Bonus · IG Infra Business Plan', '12-level compressed matrix bonus structure and dynamic rank calculation.'),
  beforeLoad: async ({ context }) => {
    const previewEmail = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-preview-user-email') : null;
    const userEmail = (typeof window !== 'undefined' && window.localStorage.getItem('nexora-user-email')) || (context as any)?.user?.email;
    const effectiveEmail = previewEmail || userEmail;
    const allowed = getUserAllowedTabs(effectiveEmail);

    if (!allowed.includes('12-level-bonus')) {
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
      search: { tab: '12-level-bonus' },
      replace: true,
    });
  },
  component: () => null,
});
