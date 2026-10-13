import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/login-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/')({
  head: () => pageMeta(
    'Sign in to your workspace',
    'Securely sign in to your IG Infra connected workspace.'
  ),
  component: LoginPage,
});
