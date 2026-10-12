import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage, isUserAdminOrOwner } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/user-management')({
  head: () => pageMeta('User Management · Nexora Business Plan', 'User directory, user creation, and navigation permissions.'),
  beforeLoad: async ({ context }) => {
    const previewEmail = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-preview-user-email') : null;
    const userEmail = (typeof window !== 'undefined' && window.localStorage.getItem('nexora-user-email')) || (context as any)?.user?.email;
    const effectiveEmail = previewEmail || userEmail;
    const allowed = getUserAllowedTabs(effectiveEmail);
    const isAdmin = isUserAdminOrOwner(effectiveEmail, 'sivaji491@gmail.com');

    if (!isAdmin || !allowed.includes('users')) {
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
      search: { tab: 'users' },
      replace: true,
    });
  },
  component: () => null,
});
