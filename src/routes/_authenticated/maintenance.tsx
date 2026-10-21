import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  LogOut, 
  LoaderCircle, 
  Home, 
  Users, 
  Eye, 
  Clock, 
  ShieldCheck,
  Layers,
  Coins,
  TrendingUp,
  Award,
  Zap,
  Menu,
  X,
  UserCheck,
  GripVertical,
  KeyRound,
  Settings as SettingsIcon
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { HomeTab } from '@/components/home-tab';
import { UserManagementTab, resolveNavIcon } from '@/components/user-management-tab';
import { EarningOpportunitiesView } from '@/components/earning-opportunities/EarningOpportunitiesView';
import { KeyPointsView } from '@/components/key-points/KeyPointsView';
import { TimeInHandView } from '@/components/time-in-hand/TimeInHandView';
import { SettingsView } from '@/components/settings/SettingsView';
import { RankCalculatorApp } from '@/components/rank-calculator/RankCalculatorApp';
import { TwelveLevelBonusView } from '@/components/twelve-level-bonus/TwelveLevelBonusView';
import { DcbNinetyDaysView } from '@/components/dcb-bonus/DcbNinetyDaysView';
import { CustomerView } from '@/components/customer-view/CustomerView';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { supabase } from '@/integrations/supabase/client';
import { pageMeta } from '@/lib/page-meta';
import { 
  getUserAllowedTabs, 
  isUserAdminOrOwner, 
  getRegisteredNavigationFields, 
  getOrderedNavigationFields,
  saveSidebarNavOrder,
  getAccessibleLandingPage,
  resolveEffectiveUserIdentifier 
} from '@/lib/permissions';
import { useSessionTimer } from '@/hooks/use-session-timer';
import { loadRankCalculatorState } from '@/lib/rank-storage';

export const Route = createFileRoute('/_authenticated/maintenance')({
  head: () => pageMeta('Workspace Directory & Management · IG Infra', 'IG Infra connected workspace, team management, and Profile Guardian security center.'),
  component: Maintenance,
});

function Maintenance() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewUserEmail, setPreviewUserEmail] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? window.localStorage.getItem('nexora-preview-user-email') : null;
  });

  const effectiveEmail = resolveEffectiveUserIdentifier(user?.email);
  const allowedTabs = useMemo(() => getUserAllowedTabs(effectiveEmail), [effectiveEmail, refreshKey]);
  const effectiveAllowed = useMemo(() => allowedTabs.filter((t) => t !== 'status'), [allowedTabs]);

  const [activeTab, setActiveTab] = useState<string>(() => {
    const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    const initialAllowed = getUserAllowedTabs(effectiveEmail).filter((t) => t !== 'status');
    if (initialAllowed.length === 0) {
      return 'access-denied';
    }
    if (urlTab && initialAllowed.includes(urlTab)) {
      return urlTab;
    }
    if (initialAllowed.includes('home')) {
      return 'home';
    }
    return initialAllowed[0] || 'access-denied';
  });

  const [navItems, setNavItems] = useState(() => 
    getOrderedNavigationFields()
      .filter((f) => f.id !== 'status')
      .map((f) => ({ ...f, icon: f.icon || resolveNavIcon(f.id, f.iconName) }))
  );

  // Ranks count for Ranks indicator badge in the top navigation area
  const [rankCount, setRankCount] = useState<number>(() => {
    try {
      const saved = loadRankCalculatorState();
      return saved?.ranks?.length ?? 7;
    } catch {
      return 7;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = loadRankCalculatorState();
        if (saved?.ranks?.length) {
          setRankCount(saved.ranks.length);
        }
      } catch {
        // preserve current count
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('nexora_ranks_updated', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('nexora_ranks_updated', handleStorage);
      };
    }
  }, []);

  useEffect(() => {
    const handleNavUpdate = () => {
      setNavItems(
        getOrderedNavigationFields()
          .filter((f) => f.id !== 'status')
          .map((f) => ({ ...f, icon: f.icon || resolveNavIcon(f.id, f.iconName) }))
      );
      setPreviewUserEmail(typeof window !== 'undefined' ? window.localStorage.getItem('nexora-preview-user-email') : null);
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('nexora_nav_fields_updated', handleNavUpdate);
    window.addEventListener('nexora_permissions_updated', handleNavUpdate);
    window.addEventListener('nexora_nav_order_updated', handleNavUpdate);
    window.addEventListener('storage', handleNavUpdate);
    return () => {
      window.removeEventListener('nexora_nav_fields_updated', handleNavUpdate);
      window.removeEventListener('nexora_permissions_updated', handleNavUpdate);
      window.removeEventListener('nexora_nav_order_updated', handleNavUpdate);
      window.removeEventListener('storage', handleNavUpdate);
    };
  }, []);

  // Automatic sidebar layout adjustment: scales height, gap, and padding so all items fit cleanly with no scrollbars
  const [sidebarNavStyle, setSidebarNavStyle] = useState<React.CSSProperties>({});
  const sidebarNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const adjustSidebarLayout = () => {
      const visibleCount = navItems.filter((item) => allowedTabs.includes(item.id)).length;
      if (visibleCount === 0) return;

      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      // Heights of non-nav sidebar elements
      const reservedHeight = vh < 630 ? 130 : vh < 760 ? 180 : 230;
      const availableNavHeight = Math.max(120, vh - reservedHeight);

      // Compute optimal per-item height and gap with comfortable minimum for smooth scrolling
      const slotHeight = availableNavHeight / visibleCount;
      const computedGap = slotHeight < 36 ? 2 : 3;
      const computedHeight = Math.min(46, Math.max(38, Math.floor(slotHeight - computedGap)));
      const computedPy = computedHeight < 40 ? 4 : 5;
      const computedFontSize = 13;

      setSidebarNavStyle((prev) => {
        const nextH = `${computedHeight}px`;
        const nextGap = `${computedGap}px`;
        const nextPy = `${computedPy}px`;
        const nextFs = `${computedFontSize}px`;
        if (
          prev['--sidebar-item-height' as any] === nextH &&
          prev['--sidebar-item-gap' as any] === nextGap &&
          prev['--sidebar-item-py' as any] === nextPy &&
          prev['--sidebar-item-font-size' as any] === nextFs
        ) {
          return prev;
        }
        return {
          ['--sidebar-item-height' as any]: nextH,
          ['--sidebar-item-min-height' as any]: nextH,
          ['--sidebar-item-gap' as any]: nextGap,
          ['--sidebar-item-py' as any]: nextPy,
          ['--sidebar-item-font-size' as any]: nextFs,
        };
      });
    };

    adjustSidebarLayout();
    window.addEventListener('resize', adjustSidebarLayout);
    return () => window.removeEventListener('resize', adjustSidebarLayout);
  }, [navItems, allowedTabs]);

  // Drag and drop state for sidebar reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: 'before' | 'after' } | null>(null);
  const isDraggingGestureRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartIndexRef = useRef<number | null>(null);
  const isTouchDraggingRef = useRef(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    isDraggingGestureRef.current = false;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    isDraggingGestureRef.current = true;

    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const isUpperHalf = e.clientY < rect.top + rect.height / 2;
    setDropTarget({ index: targetIndex, position: isUpperHalf ? 'before' : 'after' });
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (dropTarget?.index === index && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  };

  const performReorder = (fromIndex: number, toIndex: number, position: 'before' | 'after') => {
    if (fromIndex === toIndex) return;

    const updated = [...navItems];
    const [movedItem] = updated.splice(fromIndex, 1);
    if (!movedItem) return;

    let targetIdx = updated.findIndex((item) => item.id === navItems[toIndex]?.id);
    if (targetIdx === -1) {
      targetIdx = toIndex > fromIndex ? toIndex - 1 : toIndex;
    }
    if (position === 'after') {
      targetIdx += 1;
    }

    updated.splice(targetIdx, 0, movedItem);
    setNavItems(updated);
    saveSidebarNavOrder(updated.map((i) => i.id));
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && dropTarget) {
      performReorder(draggedIndex, targetIndex, dropTarget.position);
    }
    setDraggedIndex(null);
    setDropTarget(null);
    setTimeout(() => {
      isDraggingGestureRef.current = false;
    }, 50);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTarget(null);
    setTimeout(() => {
      isDraggingGestureRef.current = false;
    }, 50);
  };

  // Touch device support
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartIndexRef.current = index;
    isTouchDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || touchStartIndexRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = Math.abs(currentY - touchStartYRef.current);

    if (deltaY > 8) {
      isTouchDraggingRef.current = true;
      isDraggingGestureRef.current = true;
      setDraggedIndex(touchStartIndexRef.current);

      const element = document.elementFromPoint(e.touches[0].clientX, currentY);
      const navBtn = element?.closest('.sidebar-nav-btn') as HTMLElement | null;
      if (navBtn && navBtn.dataset.index) {
        const targetIdx = parseInt(navBtn.dataset.index, 10);
        if (!isNaN(targetIdx) && targetIdx !== touchStartIndexRef.current) {
          const rect = navBtn.getBoundingClientRect();
          const isUpperHalf = currentY < rect.top + rect.height / 2;
          setDropTarget({ index: targetIdx, position: isUpperHalf ? 'before' : 'after' });
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (isTouchDraggingRef.current && touchStartIndexRef.current !== null && dropTarget !== null) {
      performReorder(touchStartIndexRef.current, dropTarget.index, dropTarget.position);
    }
    touchStartYRef.current = null;
    touchStartIndexRef.current = null;
    isTouchDraggingRef.current = false;
    setDraggedIndex(null);
    setDropTarget(null);
    setTimeout(() => {
      isDraggingGestureRef.current = false;
    }, 50);
  };

  const handleNavButtonClick = (itemId: string) => {
    if (isDraggingGestureRef.current) {
      isDraggingGestureRef.current = false;
      return;
    }
    handleSelectTab(itemId);
  };

  const isAdmin = isUserAdminOrOwner(effectiveEmail, 'sivaji491@gmail.com');

  const isLoggingOutRef = useRef(false);

  // Session timer expiration handler (only for regular users, NOT admin)
  const handleSessionExpired = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    if (isUserAdminOrOwner(effectiveEmail, 'sivaji491@gmail.com')) return;
    isLoggingOutRef.current = true;
    setBusy(true);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('nexora-user-email');
      window.localStorage.removeItem('nexora-preview-user-email');
      window.localStorage.setItem('nexora_last_disabled_reason', 'SESSIONTIMEEXPIRED');
      window.localStorage.setItem('nexora-timer-status', 'expired');
    }

    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch {
      // Ignore query cancellation errors
    }

    try {
      // Timeout race: ensures slow network or hanging Supabase signOut never freezes the screen
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch {
      // Proceed even if network signOut throws
    }

    try {
      await navigate({ to: '/auth', replace: true });
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
  }, [effectiveEmail, navigate, queryClient]);

  // Live session countdown timer
  const sessionTimer = useSessionTimer(effectiveEmail, handleSessionExpired);

  // Auto redirect if session is expired or disabled (regular users only)
  useEffect(() => {
    if (!isAdmin && sessionTimer.isExpired && !isLoggingOutRef.current) {
      handleSessionExpired();
    }
  }, [isAdmin, sessionTimer.isExpired, handleSessionExpired]);


  useEffect(() => {
    const currentAllowed = allowedTabs.filter((t) => t !== 'status');
    if (currentAllowed.length === 0) {
      if (activeTab !== 'access-denied') {
        setActiveTab('access-denied');
      }
      return;
    }

    const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;

    if (urlTab && currentAllowed.includes(urlTab)) {
      if (activeTab !== urlTab) {
        setActiveTab(urlTab);
      }
      return;
    }

    if (!currentAllowed.includes(activeTab) || activeTab === 'access-denied') {
      const fallback = currentAllowed.includes('home') ? 'home' : currentAllowed[0];
      if (fallback && activeTab !== fallback) {
        setActiveTab(fallback);
        if (typeof window !== 'undefined' && window.history.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', fallback);
          window.history.replaceState({}, '', url.toString());
        }
      }
    }
  }, [allowedTabs, activeTab]);

  const handleSelectTab = (tabId: string) => {
    if (!allowedTabs.includes(tabId)) {
      return;
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  async function signOut() {
    if (busy || isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setBusy(true);
    setSignOutError(null);

    try {
      // 1. Race server-side sign out against a timeout to prevent indefinite hanging
      const timeoutMs = 4000;
      let timedOut = false;
      const timeoutPromise = new Promise<{ error: Error | null }>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          resolve({ error: new Error('Network timeout during sign out') });
        }, timeoutMs);
      });

      const res = await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise,
      ]);

      // If server returned an error, verify whether session is already absent on the server
      if (res?.error && !timedOut) {
        const msg = res.error.message?.toLowerCase() || '';
        const isSessionAlreadyGone = msg.includes('session missing') ||
          msg.includes('auth session missing') ||
          msg.includes('session_not_found') ||
          msg.includes('jwt expired');

        if (!isSessionAlreadyGone) {
          // Genuine failure from auth provider: report error and allow user to retry
          setSignOutError(res.error.message || 'Unable to sign out. Please try again.');
          return;
        }
      }

      // If timed out or if session was already gone on server, ensure local Supabase token is cleared
      if (timedOut || res?.error) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Local cleanup completed
        }
      }

      // 2. Clear client-side authentication and session storage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('nexora-user-email');
        window.localStorage.removeItem('nexora-preview-user-email');
        window.localStorage.removeItem('nexora-simulated-user');
        window.localStorage.removeItem('nexora-user-role');
        window.localStorage.removeItem('nexora_active_session');
        window.localStorage.removeItem('nexora-session-expire');
        window.localStorage.removeItem('nexora-session-start');
        window.localStorage.removeItem('nexora-session-duration');
        window.localStorage.removeItem('nexora-timer-status');
        window.localStorage.removeItem('nexora-session-only');
        window.localStorage.removeItem('nexora_last_disabled_reason');

        window.sessionStorage.removeItem('nexora-session-only');
        window.sessionStorage.removeItem('nexora-recovery');
      }

      // 3. Clear query caches so no stale user data persists
      try {
        await queryClient.cancelQueries();
        queryClient.clear();
      } catch {
        // Query client cleanup completed
      }

      // 4. Invalidate router cache so protected route loaders re-evaluate
      try {
        await router.invalidate();
      } catch {
        // Router invalidated
      }

      // 5. Immediately redirect the user to the login page
      try {
        await navigate({ to: '/auth', replace: true });
      } catch {
        if (typeof window !== 'undefined') {
          window.location.replace('/auth');
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to sign out. Please try again.';
      setSignOutError(errorMessage);
    } finally {
      setBusy(false);
      isLoggingOutRef.current = false;
    }
  }

  function exitPreview() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('nexora-preview-user-email');
      window.dispatchEvent(new CustomEvent('nexora_permissions_updated'));
    }
    setPreviewUserEmail(null);
    handleSelectTab('users');
  }

  return (
    <div className={`app-shell ${activeTab === 'earning-opportunities' ? 'earning-opportunities-active' : ''}`}>
      {/* Left-Side Navigation Sidebar */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top flex items-center justify-between">
          <Brand onLogoClick={() => handleSelectTab('home')} />
          <button
            type="button"
            className="sidebar-close-mobile md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE MENU</div>
        
        <nav 
          ref={sidebarNavRef}
          className={`sidebar-nav ${draggedIndex !== null ? 'is-reordering' : ''}`}
          style={sidebarNavStyle} 
          aria-label="Main Navigation"
        >
          {navItems.map((item, index) => {
            if (!allowedTabs.includes(item.id)) return null;
            const Icon = item.icon;
            const isDragging = draggedIndex === index;
            const isDropTargetBefore = dropTarget?.index === index && dropTarget.position === 'before';
            const isDropTargetAfter = dropTarget?.index === index && dropTarget.position === 'after';
            const isOtherSidebarItem = item.id !== 'home';

            return (
              <button 
                key={item.id}
                type="button" 
                draggable={true}
                data-index={index}
                data-item-id={item.id}
                aria-label={item.label}
                className={`sidebar-nav-btn group ${activeTab === item.id ? 'active' : ''} ${isDragging ? 'is-dragging' : ''} ${isDropTargetBefore ? 'drop-target-before' : ''} ${isDropTargetAfter ? 'drop-target-after' : ''} ${isOtherSidebarItem ? 'has-submessage' : ''}`}
                onClick={() => handleNavButtonClick(item.id)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                title={`Drag to reorder · ${item.label}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="sidebar-nav-label-container flex flex-col min-w-0 flex-1 text-left">
                  <span className="truncate">{item.label}</span>
                  {isOtherSidebarItem && (
                    <span 
                      className="sidebar-blinking-msg"
                      data-testid="sidebar-blinking-message"
                    >
                      One Time Work in entire life
                    </span>
                  )}
                </div>
                <span 
                  className="sidebar-drag-handle" 
                  title="Drag to reorder"
                  aria-hidden="true"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-growth-card">
            <div className="sidebar-growth-card-header">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="sidebar-growth-card-title">Plan Your Growth</span>
            </div>
            <p className="sidebar-growth-card-desc">
              Better Planning Builds a Stronger Tomorrow.
            </p>
          </div>

          <div className="sidebar-user-badge" title={effectiveEmail || 'User'}>
            <span className="font-medium truncate block">{effectiveEmail}</span>
          </div>
          {signOutError && (
            <div role="alert" className="text-[11px] text-red-400 bg-red-950/60 border border-red-500/30 rounded px-2.5 py-1 leading-tight mb-2 text-center">
              {signOutError}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} disabled={busy} className="sidebar-signout-btn">
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin mr-1.5" /> : <LogOut className="w-4 h-4 mr-1.5" />}
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="sidebar-mobile-backdrop mobile-open" 
          onClick={() => setMobileMenuOpen(false)} 
          aria-hidden="true" 
        />
      )}

      {/* Main Content Area */}
      <div className={`app-main-content ${activeTab === 'earning-opportunities' ? 'earning-opportunities-active' : ''}`}>
        {/* Top Bar with Navigation Tabs & Live Session Countdown */}
        <header className={`app-topbar ${activeTab === 'earning-opportunities' ? 'earning-opportunities-topbar' : ''} ${!isAdmin ? 'regular-user-topbar' : ''}`}>
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            {isAdmin && (
              <nav className="topbar-nav-tabs" aria-label="Top Tabs Navigation">
                {navItems.map((item) => {
                  if (!allowedTabs.includes(item.id)) return null;
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={`top-${item.id}`}
                      type="button"
                      className={`topbar-tab-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectTab(item.id)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="topbar-actions">
            {/* Green Ranks Indicator (e.g. Ranks 7) */}
            {isAdmin && activeTab === 'ranks' && (
              <div 
                className="topbar-ranks-badge"
                title={`Total Ranks: ${rankCount}`}
              >
                <Layers className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">Ranks</span>
                <span className="topbar-ranks-count">{rankCount}</span>
              </div>
            )}

            {/* 12 Level Bonus Indicator */}
            {isAdmin && activeTab === '12-level-bonus' && (
              <div 
                className="topbar-ranks-badge bg-amber-600 border-amber-500"
                title={`12 Level Bonus · ${rankCount} Ranks Available`}
              >
                <Award className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">12 Level Bonus</span>
              </div>
            )}

            {/* DCB (90 days) Indicator */}
            {isAdmin && activeTab === 'dcb-90-days' && (
              <div 
                className="topbar-ranks-badge bg-amber-600 border-amber-500"
                title={`DCB (90 days) · 30% Double Connect Bonus`}
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">DCB (90 days)</span>
              </div>
            )}

            {/* Customer View Indicator */}
            {isAdmin && activeTab === 'customer-view' && (
              <div 
                className="topbar-ranks-badge bg-blue-600 border-blue-500"
                title={`Customer View · Rank-Based Benefits Display`}
              >
                <UserCheck className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">Customer View</span>
              </div>
            )}

            {/* Key Points Indicator */}
            {isAdmin && activeTab === 'key-points' && (
              <div 
                className="topbar-ranks-badge bg-emerald-600 border-emerald-500"
                title="Key Points · Executive Business Principles"
              >
                <KeyRound className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">Key Points</span>
              </div>
            )}

            {/* In-hand time Indicator */}
            {isAdmin && activeTab === 'time-in-hand' && (
              <div 
                className="topbar-ranks-badge bg-teal-600 border-teal-500"
                title="In-hand time · Working Hours & Time Calculation Table"
              >
                <Clock className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">In-hand time</span>
              </div>
            )}

            {/* Settings Indicator */}
            {isAdmin && activeTab === 'settings' && (
              <div 
                className="topbar-ranks-badge bg-indigo-600 border-indigo-500"
                title="Settings · Application Configuration & Key Points Management"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs text-white">Settings</span>
              </div>
            )}

            {/* Live Access Time Countdown Widget */}
            {effectiveEmail && (
              <div 
                className={`session-timer-badge ${!isAdmin && sessionTimer.isUrgent ? 'timer-urgent' : !isAdmin && sessionTimer.isWarning ? 'timer-warning' : ''}`}
                title={
                  isAdmin 
                    ? 'Access Valid For: Unlimited · Administrator Account' 
                    : `Access Valid For: ${sessionTimer.formattedTime} · Expiry: ${sessionTimer.sessionExpireTime ? new Date(sessionTimer.sessionExpireTime).toLocaleTimeString() : 'N/A'}`
                }
                aria-label={isAdmin ? 'Access Valid For: Unlimited' : `Access Valid For: ${sessionTimer.formattedTime}`}
                data-testid="session-timer-badge"
              >
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className={`w-3.5 h-3.5 shrink-0 ${sessionTimer.isUrgent ? 'text-rose-400' : sessionTimer.isWarning ? 'text-amber-400' : 'text-slate-300'}`} />
                )}
                <span className="timer-label font-medium">
                  {isAdmin ? (
                    <>
                      <span className="hidden sm:inline">Access Valid For:</span>
                      <span className="sm:hidden">Access:</span>
                    </>
                  ) : (
                    <span>Access Valid For:</span>
                  )}
                </span>
                <span className={`timer-countdown font-semibold text-xs tabular-nums ${isAdmin ? 'text-emerald-300' : 'text-foreground'}`}>
                  {isAdmin ? 'Unlimited' : sessionTimer.formattedTime}
                </span>
                {isAdmin && (
                  <span 
                    className="hidden md:inline-flex items-center text-[10px] font-semibold text-emerald-400/90 ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                    title="Administrator account with permanent access"
                  >
                    Admin
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Preview Mode Banner */}
        {previewUserEmail && (
          <div className="preview-active-banner">
            <span>Viewing workspace permissions as <strong>{previewUserEmail}</strong></span>
            <Button
              variant="outline"
              size="sm"
              className="exit-preview-btn"
              onClick={exitPreview}
            >
              Exit Preview & Return to Admin
            </Button>
          </div>
        )}

        {/* Tab Content */}
        <div className={`app-tab-body ${activeTab === 'earning-opportunities' ? 'earning-opportunities-body' : ''} ${activeTab === 'users' ? 'users-tab-body' : ''} ${activeTab === '12-level-bonus' ? 'twelve-bonus-tab-body' : ''}`}>
          {activeTab === 'access-denied' || effectiveAllowed.length === 0 || !allowedTabs.includes(activeTab) ? (
            <AccessDeniedView
              pageName={activeTab !== 'access-denied' ? (navItems.find((i) => i.id === activeTab)?.label || activeTab) : undefined}
              userEmail={effectiveEmail}
              authorizedPageName={effectiveAllowed.length > 0 ? (effectiveAllowed.includes('home') ? 'Home' : (navItems.find((i) => i.id === effectiveAllowed[0])?.label || effectiveAllowed[0])) : null}
              onNavigateToAuthorized={effectiveAllowed.length > 0 ? () => {
                const target = effectiveAllowed.includes('home') ? 'home' : (effectiveAllowed[0] || 'home');
                handleSelectTab(target);
              } : undefined}
              onSignOut={signOut}
              isSigningOut={busy}
              signOutError={signOutError}
            />
          ) : (
            <>
              {activeTab === 'ranks' && allowedTabs.includes('ranks') && (
                <main className="home-main-container ranks-container">
                  <RankCalculatorApp initialTab="ranks" embedded={true} isAdmin={isAdmin} allowedTabs={allowedTabs} />
                </main>
              )}
              {activeTab === '12-level-bonus' && allowedTabs.includes('12-level-bonus') && (
                <main className="home-main-container ranks-container twelve-bonus-container">
                  <TwelveLevelBonusView isAdmin={isAdmin} userEmail={effectiveEmail} />
                </main>
              )}
              {activeTab === 'dcb-90-days' && allowedTabs.includes('dcb-90-days') && (
                <main className="home-main-container ranks-container">
                  <DcbNinetyDaysView isAdmin={isAdmin} userEmail={effectiveEmail} />
                </main>
              )}
              {activeTab === 'customer-view' && allowedTabs.includes('customer-view') && (
                <main className="home-main-container ranks-container">
                  <CustomerView isAdmin={isAdmin} userEmail={effectiveEmail} />
                </main>
              )}
              {activeTab === 'currency' && allowedTabs.includes('currency') && (
                <main className="home-main-container ranks-container">
                  <RankCalculatorApp initialTab="currency" embedded={true} isAdmin={isAdmin} allowedTabs={allowedTabs} />
                </main>
              )}
              {activeTab === 'configuration' && allowedTabs.includes('configuration') && (
                <main className="home-main-container ranks-container">
                  <RankCalculatorApp initialTab="ranks" embedded={true} isAdmin={isAdmin} initialOpenConfig={true} allowedTabs={allowedTabs} />
                </main>
              )}
              {activeTab === 'home' && allowedTabs.includes('home') && (
                <main className="home-main-container home-real-estate-container p-0">
                  <HomeTab 
                    userEmail={effectiveEmail} 
                    onNavigateToTab={handleSelectTab} 
                  />
                </main>
              )}
              {activeTab === 'users' && allowedTabs.includes('users') && (
                <main className="home-main-container users-container">
                  <UserManagementTab currentUserEmail={effectiveEmail} />
                </main>
              )}
              {activeTab === 'earning-opportunities' && allowedTabs.includes('earning-opportunities') && (
                <main className="home-main-container earning-opportunities-container p-0">
                  <EarningOpportunitiesView isAdmin={isAdmin} userEmail={effectiveEmail} />
                </main>
              )}
              {activeTab === 'key-points' && allowedTabs.includes('key-points') && (
                <main className="home-main-container key-points-container p-0">
                  <KeyPointsView 
                    isAdmin={isAdmin} 
                    userEmail={effectiveEmail} 
                    onNavigateToTab={handleSelectTab} 
                  />
                </main>
              )}
              {activeTab === 'time-in-hand' && allowedTabs.includes('time-in-hand') && (
                <main className="home-main-container ranks-container time-in-hand-container">
                  <TimeInHandView 
                    isAdmin={isAdmin} 
                    userEmail={effectiveEmail} 
                    onNavigateToTab={handleSelectTab} 
                  />
                </main>
              )}
              {activeTab === 'settings' && allowedTabs.includes('settings') && (
                <main className="home-main-container settings-container p-0">
                  <SettingsView 
                    isAdmin={isAdmin} 
                    userEmail={effectiveEmail} 
                    onNavigateToTab={handleSelectTab} 
                  />
                </main>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}