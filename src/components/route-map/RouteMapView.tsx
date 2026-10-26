import React, { useState, useEffect, useCallback } from 'react';
import {
  Route as RouteIcon,
  Edit3,
  Save,
  X,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ZoomIn,
  Layers,
  Award,
  Users,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Check,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import routeMapHeroAsset from '@/assets/route-map-hero.jpg';
import {
  loadRouteMapContent,
  saveRouteMapContentAdmin,
  resetRouteMapContentAdmin,
  syncRouteMapFromCloud,
  ROUTE_MAP_UPDATED_EVENT
} from '@/lib/route-map-storage';
import { RouteMapContent, DEFAULT_ROUTE_MAP_CONTENT } from '@/types/route-map';
import './route-map.css';

interface RouteMapViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export function RouteMapView({ isAdmin = false, userEmail, onNavigateToTab }: RouteMapViewProps) {
  const [content, setContent] = useState<RouteMapContent>(() => loadRouteMapContent());
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content.headlineText);
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Sync state with storage events and updates
  useEffect(() => {
    const handleUpdate = () => {
      setContent(loadRouteMapContent());
    };
    window.addEventListener(ROUTE_MAP_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Initial background cloud sync
    syncRouteMapFromCloud()
      .then((synced) => {
        if (synced && synced.headlineText) {
          setContent(synced);
        }
      })
      .catch(() => { });

    return () => {
      window.removeEventListener(ROUTE_MAP_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Update edit text whenever content updates
  useEffect(() => {
    if (!isEditing) {
      setEditText(content.headlineText);
    }
  }, [content, isEditing]);

  const handleStartEdit = () => {
    if (!isAdmin) return;
    setEditText(content.headlineText);
    setEditError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(content.headlineText);
    setEditError('');
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError('Text cannot be empty. Please enter a valid message.');
      return;
    }
    if (trimmed.length < 2) {
      setEditError('Text must be at least 2 characters long.');
      return;
    }

    setIsSaving(true);
    setEditError('');

    try {
      const res = await saveRouteMapContentAdmin(trimmed, userEmail || 'sivaji491@gmail.com');
      if (!res.success) {
        setEditError(res.error || 'Failed to save text.');
        return;
      }

      setContent(res.content || { ...content, headlineText: trimmed });
      setIsEditing(false);
      showToast('Route Map text successfully updated and published.');
    } catch {
      setEditError('Connection error. Could not persist to central server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!isAdmin) return;
    if (window.confirm('Reset the Route Map text back to the default "One Time Work"?')) {
      setIsSaving(true);
      try {
        const res = await resetRouteMapContentAdmin(userEmail || 'sivaji491@gmail.com');
        if (res.success) {
          setContent(res.content || DEFAULT_ROUTE_MAP_CONTENT);
          setEditText(DEFAULT_ROUTE_MAP_CONTENT.headlineText);
          setIsEditing(false);
          showToast('Route Map text reset to default "One Time Work".');
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncRouteMapFromCloud();
      setContent(synced);
      showToast('Route Map refreshed from central database.');
    } catch {
      showToast('Could not refresh from server. Showing cached view.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="route-map-wrapper animate-in fade-in duration-300" data-testid="route-map-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/95 border border-amber-500/50 text-amber-200 px-4 py-3 rounded-lg shadow-xl shadow-black/50 text-sm font-medium animate-in slide-in-from-top-2 duration-200"
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Navigation Header */}
      <header className="route-map-header">
        <div className="route-map-header-info">
          <div className="home-badge">
            <RouteIcon className="w-3.5 h-3.5 text-primary" />
            <span>IG INFRA BUSINESS ROADMAP</span>
            <span className="badge-divider">·</span>
            <span className="badge-highlight">LIFETIME MILESTONE</span>
          </div>
          <h1>Route Map</h1>
          <p className="route-map-header-desc">
            Your lifetime roadmap to financial freedom and property ownership through the 2-referral foundation.
          </p>
        </div>

        {/* Admin Header Controls */}
        <div className="route-map-header-actions">
          {isAdmin && (
            <>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
                  data-testid="edit-route-map-btn"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Edit Text
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="cancel-edit-btn"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancel
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={handleResetToDefault}
                disabled={isSaving}
                title="Reset text to default"
                className="border-slate-700 hover:bg-slate-800 text-muted-foreground"
                data-testid="reset-route-map-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Refresh from central database"
            className="border-slate-700 hover:bg-slate-800 text-muted-foreground"
            data-testid="refresh-route-map-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Hidden headline text node for screen readers and test tracking */}
      <span className="sr-only" data-testid="route-map-headline">
        {content.headlineText}
      </span>

      {/* Admin Inline Editor (Only visible when admin triggers Edit) */}
      {isAdmin && isEditing && (
        <form onSubmit={handleSaveEdit} className="route-map-edit-form" data-testid="route-map-edit-form">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
            <span>EDIT HIGHLIGHT TEXT</span>
            <span>{editText.length}/200</span>
          </div>

          <Input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="e.g. One Time Work"
            maxLength={200}
            className="bg-slate-950/90 border-amber-500/50 text-white font-bold text-center text-base h-10 focus-visible:ring-amber-500"
            autoFocus
            data-testid="route-map-input"
          />

          {editError && (
            <p className="text-rose-400 text-xs font-medium text-left" role="alert">
              {editError}
            </p>
          )}

          <div className="route-map-edit-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isSaving}
              data-testid="cancel-form-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              data-testid="save-route-map-btn"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Route Map Main Visual Card */}
      <section className="route-map-image-card" data-testid="route-map-image-card" aria-label="Route map reference visual">
        <button
          type="button"
          className="route-map-zoom-trigger"
          onClick={() => setIsZoomOpen(true)}
          title="View full-resolution image"
          data-testid="expand-view-btn"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Expand View</span>
        </button>

        {/* Two slowly moving golden stars around "ONE TIME WORK" in top-left */}
        <div className="route-map-stars-overlay" aria-hidden="true" data-testid="route-map-stars-overlay">
          <span className="route-map-moving-star route-map-moving-star-1" data-testid="route-map-moving-star-1">✦</span>
          <span className="route-map-moving-star route-map-moving-star-2" data-testid="route-map-moving-star-2">✦</span>
        </div>

        <div className="route-map-img-container">
          <img
            src={routeMapHeroAsset}
            alt="Just 2 Referrals in Entire Life - Without taking this small step, you may keep working throughout life. IG Infra Route Map"
            className="route-map-hero-image"
            loading="eager"
            fetchPriority="high"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== '/images/route-map/route-map-hero.jpg') {
                target.src = '/images/route-map/route-map-hero.jpg';
              }
            }}
            data-testid="route-map-hero-img"
          />
        </div>
      </section>

      {/* Structured Roadmap Milestones Breakdown */}
      <section className="route-map-milestones-grid" aria-label="Route map key milestones">
        <div className="route-map-milestone-card">
          <div className="milestone-badge-number">01</div>
          <h3 className="milestone-card-title">Just 2 Referrals in Entire Life</h3>
          <p className="milestone-card-desc">
            Sponsoring just 2 verified partners establishes your foundation, unlocks the 12-level matrix, and activates Double Connect Bonus (DCB).
          </p>
        </div>

        <div className="route-map-milestone-card">
          <div className="milestone-badge-number">02</div>
          <h3 className="milestone-card-title">One Time Smart Work</h3>
          <p className="milestone-card-desc">
            Unlike traditional endless sales pressure, our structured matrix duplicates organically across 12 levels to compound team performance.
          </p>
        </div>

        <div className="route-map-milestone-card">
          <div className="milestone-badge-number">03</div>
          <h3 className="milestone-card-title">Earn Plot or Flat Within 1 Year</h3>
          <p className="milestone-card-desc">
            Convert rank bonuses, matrix earnings, and team points directly into tangible residential plots and premium modern apartment ownership.
          </p>
        </div>

        <div className="route-map-milestone-card">
          <div className="milestone-badge-number">04</div>
          <h3 className="milestone-card-title milestone-card-title-gold">Don't Take</h3>
          <p className="milestone-card-desc">
            Don't take even ₹1 from your own pocket. We are here to earn.
          </p>
        </div>
      </section>

      {/* Quick Navigation Action Cards */}
      {onNavigateToTab && (
        <section className="route-map-quick-nav">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Explore Full Business Plan & Earnings</h4>
              <p className="text-xs text-muted-foreground">Inspect rank prices, 12-level payouts, and customer rank breakdown.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('earning-opportunities')}
              className="text-xs h-8 border-slate-700 hover:bg-slate-800"
            >
              Earning Opportunities
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigateToTab('potentiality')}
              className="text-xs h-8 bg-primary hover:bg-primary/90 flex items-center gap-1"
            >
              <span>Potentiality</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </section>
      )}

      {/* Full Resolution Zoom Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="relative max-w-6xl w-full flex flex-col items-center">
            <button
              type="button"
              className="absolute -top-12 right-0 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full border border-slate-600 transition-colors"
              onClick={() => setIsZoomOpen(false)}
              title="Close image view"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={routeMapHeroAsset}
              alt="IG Infra Route Map Full View"
              className="max-h-[85vh] w-auto max-w-full rounded-xl shadow-2xl object-contain border border-amber-500/30"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== '/images/route-map/route-map-hero.jpg') {
                  target.src = '/images/route-map/route-map-hero.jpg';
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
export default RouteMapView;
