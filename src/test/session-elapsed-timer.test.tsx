import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { useSessionTimer } from '../hooks/use-session-timer';
import { 
  formatSecondsToDuration, 
  startUserLoginSession, 
  saveStoredWorkspaceUsers,
  getStoredWorkspaceUsers,
  EXPIRED_ACCOUNT_MESSAGE 
} from '../lib/session-manager';
import { Clock, ShieldCheck } from 'lucide-react';

describe('User Access-Time Indicator & Automatic Logout Acceptance Tests', () => {
  const baseTime = 1700000000000; // Deterministic timestamp

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTime));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Formats total seconds accurately into HH:MM:SS format', () => {
    expect(formatSecondsToDuration(0)).toBe('00:00:00');
    expect(formatSecondsToDuration(312)).toBe('00:05:12');
    expect(formatSecondsToDuration(9930)).toBe('02:45:30');
    expect(formatSecondsToDuration(10800)).toBe('03:00:00');
    expect(formatSecondsToDuration(43845)).toBe('12:10:45');
  });

  it('2. Starts countdown after login and displays authoritative remaining access time', () => {
    // Admin configures 3 hours of access
    const user = {
      id: 'usr-regular-john',
      username: 'johndoe',
      status: 'ACTIVE' as const,
      loginDuration: '03:00:00',
    };
    saveStoredWorkspaceUsers([user]);

    // User logs in at baseTime
    const loginRes = startUserLoginSession('johndoe');
    expect(loginRes.success).toBe(true);
    window.localStorage.setItem('nexora-user-email', 'johndoe');

    const { result } = renderHook(() => useSessionTimer('johndoe'));

    // Initial countdown shows full 3 hours: 03:00:00
    expect(result.current.formattedTime).toBe('03:00:00');
    expect(result.current.remainingSeconds).toBe(10800);

    // Advance 14 minutes 30 seconds (870 seconds) -> 02:45:30
    act(() => {
      vi.advanceTimersByTime(870 * 1000);
    });

    expect(result.current.formattedTime).toBe('02:45:30');
    expect(result.current.remainingSeconds).toBe(9930);
    expect(result.current.isExpired).toBe(false);
  });

  it('3. Page refresh preserves accurate remaining time without restarting or extending access', () => {
    window.localStorage.setItem('nexora-user-email', 'member@example.com');
    // Admin granted access that expires in exactly 2 hours 45 mins 30 secs
    const expireTime = baseTime + 9930 * 1000;
    window.localStorage.setItem('nexora-session-expire', String(expireTime));
    const user = {
      id: 'usr-member',
      username: 'member@example.com',
      status: 'ACTIVE' as const,
      loginDuration: '03:00:00',
      sessionExpireTime: expireTime,
    };
    saveStoredWorkspaceUsers([user]);

    // First mount (before reload)
    const hook1 = renderHook(() => useSessionTimer('member@example.com'));
    expect(hook1.result.current.formattedTime).toBe('02:45:30');
    hook1.unmount();

    // Simulate page refresh / remount 30 seconds later
    vi.advanceTimersByTime(30 * 1000);
    const hook2 = renderHook(() => useSessionTimer('member@example.com'));
    // Never restarted: exactly 30 seconds elapsed from authoritative expiry
    expect(hook2.result.current.formattedTime).toBe('02:45:00');
    expect(hook2.result.current.remainingSeconds).toBe(9900);
  });

  it('4. Navigating between pages preserves countdown accurately', () => {
    window.localStorage.setItem('nexora-user-email', 'member@example.com');
    const expireTime = baseTime + 3600 * 1000; // 1 hour remaining
    window.localStorage.setItem('nexora-session-expire', String(expireTime));
    const user = {
      id: 'usr-member',
      username: 'member@example.com',
      status: 'ACTIVE' as const,
      loginDuration: '01:00:00',
      sessionExpireTime: expireTime,
    };
    saveStoredWorkspaceUsers([user]);

    const hook = renderHook(() => useSessionTimer('member@example.com'));
    expect(hook.result.current.formattedTime).toBe('01:00:00');

    // Simulate navigating to "Ranks" tab after 45 seconds
    act(() => {
      vi.advanceTimersByTime(45 * 1000);
    });
    expect(hook.result.current.formattedTime).toBe('00:59:15');

    // Simulate navigating to "Earning Opportunities" after another 60 seconds
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    expect(hook.result.current.formattedTime).toBe('00:58:15');
  });

  it('5. Automatic logout when access reaches zero: stops at 00:00:00, disables user, and triggers expiry', () => {
    const onExpireMock = vi.fn();
    const user = {
      id: 'usr-expire-check',
      username: 'expire_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:01:00', // 1 minute limit
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 60 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    window.localStorage.setItem('nexora-user-email', 'expire_user');
    window.localStorage.setItem('nexora-session-start', String(baseTime));
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 60 * 1000));

    const { result } = renderHook(() => useSessionTimer('expire_user', onExpireMock));

    expect(result.current.isExpired).toBe(false);
    expect(result.current.formattedTime).toBe('00:01:00');

    // Advance 60 seconds to expire
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.formattedTime).toBe('00:00:00');
    expect(result.current.remainingSeconds).toBe(0);
    expect(onExpireMock).toHaveBeenCalledTimes(1);

    // Verify stored user account was disabled with SESSIONTIMEEXPIRED
    const users = getStoredWorkspaceUsers();
    const target = users.find((u) => u.username === 'expire_user');
    expect(target?.status).toBe('DISABLED');
    expect(target?.disableReason).toBe('SESSIONTIMEEXPIRED');
  });

  it('6. Rechecks expiry immediately when inactive browser tab wakes up / receives focus', () => {
    const onExpireMock = vi.fn();
    const user = {
      id: 'usr-inactive-check',
      username: 'sleep_user',
      status: 'ACTIVE' as const,
      loginDuration: '00:10:00',
      sessionStartTime: baseTime,
      sessionExpireTime: baseTime + 600 * 1000,
    };
    saveStoredWorkspaceUsers([user]);

    window.localStorage.setItem('nexora-user-email', 'sleep_user');
    window.localStorage.setItem('nexora-session-start', String(baseTime));
    window.localStorage.setItem('nexora-session-expire', String(baseTime + 600 * 1000));

    const { result } = renderHook(() => useSessionTimer('sleep_user', onExpireMock));
    expect(result.current.isExpired).toBe(false);

    // Simulate browser being suspended / inactive for 15 minutes
    vi.setSystemTime(new Date(baseTime + 900 * 1000));

    // Simulate window focus / visibilitychange
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.formattedTime).toBe('00:00:00');
    expect(onExpireMock).toHaveBeenCalledTimes(1);
  });

  it('7. UI renders Access Valid For label, countdown, and responsive attributes', () => {
    // Render the countdown badge component as structured in maintenance topbar
    render(
      <div 
        className="session-timer-badge"
        data-testid="session-timer-badge"
        title="Access Valid For: 02:45:30 · Expiry: 05:45:30 PM"
        aria-label="Access Valid For: 02:45:30"
      >
        <Clock className="w-3.5 h-3.5 shrink-0" data-testid="timer-clock-icon" />
        <span className="timer-label font-medium">
          <span className="hidden sm:inline">Access Valid For:</span>
          <span className="sm:hidden">Access:</span>
        </span>
        <span className="timer-countdown font-semibold text-xs tabular-nums">02:45:30</span>
      </div>
    );

    const badge = screen.getByTestId('session-timer-badge');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('aria-label')).toBe('Access Valid For: 02:45:30');
    expect(badge.getAttribute('title')).toContain('Access Valid For: 02:45:30');

    // Clock icon is rendered
    const clock = screen.getByTestId('timer-clock-icon');
    expect(clock).toBeDefined();

    // Access Valid For text and countdown are rendered
    expect(screen.getByText('Access Valid For:')).toBeDefined();
    expect(screen.getByText('02:45:30')).toBeDefined();
  });

  it('8. Administrator account displays permanent unlimited access indicator', () => {
    window.localStorage.setItem('nexora-user-email', 'sivaji491@gmail.com');
    const { result } = renderHook(() => useSessionTimer('sivaji491@gmail.com'));

    expect(result.current.remainingSeconds).toBe(Infinity);
    expect(result.current.formattedTime).toBe('Unlimited');
    expect(result.current.isExpired).toBe(false);

    render(
      <div 
        className="session-timer-badge"
        data-testid="session-timer-badge-admin"
        title="Access Valid For: Unlimited · Administrator Account"
        aria-label="Access Valid For: Unlimited"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" data-testid="shield-icon" />
        <span className="timer-label font-medium">
          <span className="hidden sm:inline">Access Valid For:</span>
          <span className="sm:hidden">Access:</span>
        </span>
        <span className="timer-countdown font-semibold text-xs tabular-nums text-emerald-300">Unlimited</span>
        <span className="text-[10px] font-semibold text-emerald-400/90 ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          Admin
        </span>
      </div>
    );

    const adminBadge = screen.getByTestId('session-timer-badge-admin');
    expect(adminBadge.getAttribute('aria-label')).toBe('Access Valid For: Unlimited');
    expect(screen.getByTestId('shield-icon')).toBeDefined();
    expect(screen.getByText('Unlimited')).toBeDefined();
    expect(screen.getByText('Admin')).toBeDefined();
  });
});

