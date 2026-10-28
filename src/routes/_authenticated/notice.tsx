import { createFileRoute, redirect } from '@tanstack/react-router';
import { pageMeta } from '@/lib/page-meta';
import { getAccessibleLandingPage, resolveEffectiveUserIdentifier, isUserAdminOrOwner } from '@/lib/permissions';

export const Route = createFileRoute('/_authenticated/notice')({
  head: () => pageMeta('Notice Management · IG Infra Admin', 'Manage announcements and scrolling notices displayed on the Home Page.'),
  beforeLoad: async ({ context }) => {
    const effectiveEmail = resolveEffectiveUserIdentifier((context as any)?.user?.email);
    const isAdmin = isUserAdminOrOwner(effectiveEmail, 'sivaji491@gmail.com');

    if (!isAdmin) {
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
      search: { tab: 'notice' },
      replace: true,
    });
  },
  component: () => null,
});
