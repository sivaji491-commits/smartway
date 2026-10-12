import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  checkCurrentSessionValidity, 
  expireAndDisableUser, 
  formatSecondsToDuration,
  getStoredWorkspaceUsers,
  type AccountStatus,
  type TimerStatus 
} from '@/lib/session-manager';
import { isUserAdminOrOwner } from '@/lib/permissions';

export interface SessionTimerState {
  remainingSeconds: number;
  formattedTime: string; // HH:MM:SS
  isWarning: boolean; // <= 5 minutes (300s)
  isUrgent: boolean; // <= 1 minute (60s)
  isExpired: boolean;
  status: AccountStatus;
  timerStatus: TimerStatus;
  sessionExpireTime: number | null;
  loginDuration: string;
}

export function useSessionTimer(userIdentifier?: string | null, onExpire?: () => void): SessionTimerState {
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const hasExpiredRef = useRef(false);
  const isUpdatingRef = useRef(false);

  const getEffectiveId = useCallback(() => {
    if (userIdentifier) return userIdentifier;
    if (typeof window !== 'undefined') {
      return (
        window.localStorage.getItem('nexora-user-email') ||
        window.localStorage.getItem('nexora-preview-user-email')
      );
    }
    return null;
  }, [userIdentifier]);

  const [state, setState] = useState<SessionTimerState>(() => {
    const id = getEffectiveId();
    if (isUserAdminOrOwner(id, 'sivaji491@gmail.com')) {
      return {
        remainingSeconds: Infinity,
        formattedTime: 'Unlimited',
        isWarning: false,
        isUrgent: false,
        isExpired: false,
        status: 'ACTIVE',
        timerStatus: 'active',
        sessionExpireTime: null,
        loginDuration: 'Unlimited',
      };
    }

    const check = checkCurrentSessionValidity(id);
    const users = getStoredWorkspaceUsers();
    const lower = (id || '').toLowerCase().trim();
    const user = users.find(
      (u) =>
        (u.username && u.username.toLowerCase().trim() === lower) ||
        (u.email && u.email.toLowerCase().trim() === lower) ||
        (u.name && u.name.toLowerCase().trim() === lower) ||
        u.id === id
    );

    const expireRaw = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-session-expire') : null;
    const durationRaw = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-session-duration') : null;
    const effectiveExpireTime = user?.sessionExpireTime || user?.expiresAt || (expireRaw ? parseInt(expireRaw, 10) : null);
    const effectiveDuration = user?.loginDuration || user?.assignedDuration || durationRaw || '01:00:00';

    const remaining = check.valid ? check.remainingSeconds : 0;
    const isExpired = !check.valid || remaining <= 0;
    return {
      remainingSeconds: remaining,
      formattedTime: formatSecondsToDuration(remaining),
      isWarning: remaining > 0 && remaining <= 300 && remaining > 60,
      isUrgent: remaining > 0 && remaining <= 60,
      isExpired,
      status: check.status,
      timerStatus: isExpired ? 'expired' : 'active',
      sessionExpireTime: effectiveExpireTime,
      loginDuration: effectiveDuration,
    };
  });

  const updateTimer = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      const id = getEffectiveId();
      if (!id) return;

      if (isUserAdminOrOwner(id, 'sivaji491@gmail.com')) {
        hasExpiredRef.current = false;
        setState({
          remainingSeconds: Infinity,
          formattedTime: 'Unlimited',
          isWarning: false,
          isUrgent: false,
          isExpired: false,
          status: 'ACTIVE',
          timerStatus: 'active',
          sessionExpireTime: null,
          loginDuration: 'Unlimited',
        });
        return;
      }

      const check = checkCurrentSessionValidity(id);
      const users = getStoredWorkspaceUsers();
      const lower = (id || '').toLowerCase().trim();
      const user = users.find(
        (u) =>
          (u.username && u.username.toLowerCase().trim() === lower) ||
          (u.email && u.email.toLowerCase().trim() === lower) ||
          (u.name && u.name.toLowerCase().trim() === lower) ||
          u.id === id
      );

      const expireRaw = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-session-expire') : null;
      const durationRaw = typeof window !== 'undefined' ? window.localStorage.getItem('nexora-session-duration') : null;
      const effectiveExpireTime = user?.sessionExpireTime || user?.expiresAt || (expireRaw ? parseInt(expireRaw, 10) : null);
      const effectiveDuration = user?.loginDuration || user?.assignedDuration || durationRaw || '01:00:00';

      if (!check.valid || check.remainingSeconds <= 0) {
        setState({
          remainingSeconds: 0,
          formattedTime: '00:00:00',
          isWarning: false,
          isUrgent: false,
          isExpired: true,
          status: 'DISABLED',
          timerStatus: 'expired',
          sessionExpireTime: effectiveExpireTime,
          loginDuration: effectiveDuration,
        });

        // Automatically expire & disable if not already disabled
        expireAndDisableUser(id, 'SESSIONTIMEEXPIRED');

        // Trigger onExpire callback exactly ONCE to prevent duplicate logout calls or UI freezing
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          if (onExpireRef.current) {
            onExpireRef.current();
          }
        }
        return;
      }

      // Valid session with remaining time
      hasExpiredRef.current = false;
      const remaining = check.remainingSeconds;
      setState({
        remainingSeconds: remaining,
        formattedTime: formatSecondsToDuration(remaining),
        isWarning: remaining > 0 && remaining <= 300 && remaining > 60,
        isUrgent: remaining > 0 && remaining <= 60,
        isExpired: false,
        status: check.status,
        timerStatus: 'active',
        sessionExpireTime: effectiveExpireTime,
        loginDuration: effectiveDuration,
      });
    } finally {
      isUpdatingRef.current = false;
    }
  }, [getEffectiveId]);

  useEffect(() => {
    updateTimer();

    // 1-second interval for live countdown
    const interval = window.setInterval(updateTimer, 1000);

    // Cross-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'nexora-session-expire' || 
        e.key === 'nexora_workspace_users' || 
        e.key === 'nexora_active_session'
      ) {
        updateTimer();
      }
    };

    const handleSessionEvent = () => {
      updateTimer();
    };

    // Tab visibility and focus handlers:
    // Ensures countdown is immediately verified and evaluated when switching back from inactive/background tabs
    const handleVisibilityOrFocus = () => {
      updateTimer();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('nexora_session_updated', handleSessionEvent);
    window.addEventListener('nexora_account_disabled', handleSessionEvent);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nexora_session_updated', handleSessionEvent);
      window.removeEventListener('nexora_account_disabled', handleSessionEvent);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [updateTimer]);

  // Direct precision timeout: triggers at the exact millisecond sessionExpireTime is reached
  useEffect(() => {
    if (!state.sessionExpireTime || state.isExpired || state.remainingSeconds === Infinity) return;
    const msRemaining = state.sessionExpireTime - Date.now();
    if (msRemaining > 0 && msRemaining < 2147483647) {
      const timeoutId = window.setTimeout(() => {
        updateTimer();
      }, msRemaining + 20);
      return () => window.clearTimeout(timeoutId);
    }
  }, [state.sessionExpireTime, state.isExpired, updateTimer]);

  return state;
}
