import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getUserAllowedTabs, getAccessibleLandingPage, isUserAdminOrOwner, resolveEffectiveUserIdentifier } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/user-management')({
  head: () => pageMeta('User Management · IG Infra Business Plan', 'User directory, user creation, and navigation permissions.'),
  beforeLoad: async ({ context }) => {
    const effectiveEmail = resolveEffectiveUserIdentifier((context as any)?.user?.email);
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
