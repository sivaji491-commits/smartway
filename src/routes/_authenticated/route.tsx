import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { canAccessMaintenance } from '@/lib/auth-validation';
import { checkCurrentSessionValidity, EXPIRED_ACCOUNT_MESSAGE } from '@/lib/session-manager';
import { ensureCloudAuth } from '@/lib/workspace-user-sync';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    let { data, error } = await supabase.auth.getUser();
    if (error || !canAccessMaintenance(data.user)) {
      // If a valid workspace session exists, ensure cloud auth session is established
      const validity = checkCurrentSessionValidity();
      if (validity.valid) {
        await ensureCloudAuth();
        const retry = await supabase.auth.getUser();
        data = retry.data;
        error = retry.error;
      }
    }
    if (error || !canAccessMaintenance(data.user)) throw redirect({ to: '/auth', replace: true });

    // Validate account status and session expiration
    const validity = checkCurrentSessionValidity();
    if (!validity.valid) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('nexora-user-email');
        window.localStorage.removeItem('nexora-preview-user-email');
        if (validity.disableReason === 'SESSIONTIMEEXPIRED') {
          window.localStorage.setItem('nexora_last_disabled_reason', 'SESSIONTIMEEXPIRED');
        }
      }
      throw redirect({ to: '/auth', replace: true });
    }

    return { user: data.user };
  },
  component: Outlet,
});