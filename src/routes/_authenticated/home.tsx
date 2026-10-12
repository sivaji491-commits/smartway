import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/home')({
  head: () => pageMeta('Workspace Home · Nexora Business Plan', 'Workspace dashboard and summary.'),
  beforeLoad: async ({ context }) => {
    const previewEmail = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-preview-user-email') : null;
    const userEmail = (typeof window !== 'undefined' && window.localStorage.getItem('nexora-user-email')) || (context as any)?.user?.email;
    const effectiveEmail = previewEmail || userEmail;
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
