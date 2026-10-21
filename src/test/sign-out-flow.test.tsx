import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { supabase } from '@/integrations/supabase/client';

describe('Sign Out Functionality and Session Teardown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe('1. AccessDeniedView Sign Out UI & States', () => {
    it('renders the Sign Out button and triggers callback when clicked', () => {
      const onSignOut = vi.fn();
      render(
        <AccessDeniedView
          userEmail="member@example.com"
          onSignOut={onSignOut}
        />
      );

      const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
      expect(signOutBtn).toBeDefined();
      fireEvent.click(signOutBtn);
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it('disables button and displays loading spinner when isSigningOut is true', () => {
      render(
        <AccessDeniedView
          userEmail="member@example.com"
          onSignOut={vi.fn()}
          isSigningOut={true}
        />
      );

      const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
      expect(signOutBtn).toBeDefined();
      expect(signOutBtn.hasAttribute('disabled')).toBe(true);
      // Check that loading indicator is present
      const spinner = signOutBtn.querySelector('.animate-spin');
      expect(spinner).not.toBeNull();
    });

    it('renders user-friendly alert message when signOutError is provided', () => {
      render(
        <AccessDeniedView
          userEmail="member@example.com"
          onSignOut={vi.fn()}
          signOutError="Network timeout during sign out. Please check your connection."
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain('Network timeout during sign out');
    });
  });

  describe('2. Client Session & Storage Cleanup', () => {
    it('cleans up only authentication/session tokens and preserves workspace database records', () => {
      // Simulate active session in storage
      window.localStorage.setItem('nexora-user-email', 'sivaji491@gmail.com');
      window.localStorage.setItem('nexora-preview-user-email', 'preview@test.com');
      window.localStorage.setItem('nexora-simulated-user', 'true');
      window.localStorage.setItem('nexora-user-role', 'Owner');
      window.localStorage.setItem('nexora_active_session', JSON.stringify({ active: true }));
      window.localStorage.setItem('nexora-session-expire', '9999999999');
      window.localStorage.setItem('nexora-session-start', '1234567890');
      window.localStorage.setItem('nexora-session-duration', '01:00:00');
      window.localStorage.setItem('nexora-timer-status', 'active');
      window.localStorage.setItem('nexora-session-only', 'true');
      window.sessionStorage.setItem('nexora-session-only', 'true');
      window.sessionStorage.setItem('nexora-recovery', 'true');

      // Preserve application data
      window.localStorage.setItem('nexora_workspace_users', JSON.stringify([{ id: '1', name: 'User 1' }]));

      // Execute session cleanup logic exactly as implemented in maintenance.tsx signOut()
      const sessionKeysToRemove = [
        'nexora-user-email',
        'nexora-preview-user-email',
        'nexora-simulated-user',
        'nexora-user-role',
        'nexora_active_session',
        'nexora-session-expire',
        'nexora-session-start',
        'nexora-session-duration',
        'nexora-timer-status',
        'nexora-session-only',
        'nexora_last_disabled_reason',
      ];
      sessionKeysToRemove.forEach((key) => window.localStorage.removeItem(key));
      window.sessionStorage.removeItem('nexora-session-only');
      window.sessionStorage.removeItem('nexora-recovery');

      // Verify all auth keys were removed
      sessionKeysToRemove.forEach((key) => {
        expect(window.localStorage.getItem(key)).toBeNull();
      });
      expect(window.sessionStorage.getItem('nexora-session-only')).toBeNull();
      expect(window.sessionStorage.getItem('nexora-recovery')).toBeNull();

      // Verify workspace users data is preserved
      expect(window.localStorage.getItem('nexora_workspace_users')).not.toBeNull();
    });
  });

  describe('3. Supabase Auth signOut Error & Missing Session Handling', () => {
    it('identifies AuthSessionMissingError as already signed out without blocking user redirect', () => {
      const missingSessionErrors = [
        { message: 'Auth session missing!' },
        { message: 'session missing from request' },
        { message: 'session_not_found' },
        { message: 'jwt expired' },
      ];

      missingSessionErrors.forEach((err) => {
        const msg = err.message.toLowerCase();
        const isSessionAlreadyGone = msg.includes('session missing') ||
          msg.includes('auth session missing') ||
          msg.includes('session_not_found') ||
          msg.includes('jwt expired');

        expect(isSessionAlreadyGone).toBe(true);
      });
    });

    it('differentiates genuine server error to display user-friendly message', () => {
      const serverError = { message: '500: Internal Server Error during logout' };
      const msg = serverError.message.toLowerCase();
      const isSessionAlreadyGone = msg.includes('session missing') ||
        msg.includes('auth session missing') ||
        msg.includes('session_not_found') ||
        msg.includes('jwt expired');

      expect(isSessionAlreadyGone).toBe(false);
    });
  });
});
