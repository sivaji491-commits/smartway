import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/dcb-90-days')({
  head: () => pageMeta('DCB (90 days) · Nexora Business Plan', 'Double Connect Bonus (30%) 90-day referral program, dynamic rank calculation, and earnings milestones.'),
  beforeLoad: async ({ context }) => {
    const previewEmail = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-preview-user-email') : null;
    const userEmail = (typeof window !== 'undefined' && window.localStorage.getItem('nexora-user-email')) || (context as any)?.user?.email;
    const effectiveEmail = previewEmail || userEmail;
    const allowed = getUserAllowedTabs(effectiveEmail);

    if (!allowed.includes('dcb-90-days')) {
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
      search: { tab: 'dcb-90-days' },
      replace: true,
    });
  },
  component: () => null,
});
