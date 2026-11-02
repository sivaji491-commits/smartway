import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Maximize2,
  X,
  Home,
  Users,
  MapPin,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OneTimeWorkHighlight } from '@/components/common/OneTimeWorkHighlight';
import whyLandBankAsset from '@/assets/why-land-bank.jpg';
import './why.css';

export interface WhyViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export function WhyView({ isAdmin = false, userEmail, onNavigateToTab }: WhyViewProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Close zoom modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomOpen(false);
      }
    };
    if (isZoomOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomOpen]);

  return (
    <div className="why-page-container font-['Inter',system-ui,sans-serif]" data-testid="why-view-container">
      {/* Compact Top Header Bar: ONE TIME WORK + Title Card + Zoom Trigger */}
      <header className="why-compact-header shrink-0 flex items-center justify-between gap-2">
        <div className="why-header-cards-group flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap sm:flex-nowrap">
          <OneTimeWorkHighlight forceRender={true} />
          
          <div
            className="why-title-card"
            data-testid="why-title-card"
            aria-label="Why IG INFRA.... For LAND BANK CREATION"
          >
            {/* Top decorative golden line with centered diamond star */}
            <div className="why-title-frame-line top-line" aria-hidden="true">
              <span className="why-frame-line-segment" />
              <span className="why-frame-star">✦</span>
              <span className="why-frame-line-segment" />
            </div>

            {/* Center text row with decorative flanking lines */}
            <div className="why-title-text-row">
              <span className="why-title-decor-line line-left" aria-hidden="true" />
              <h1 className="why-title-heading" data-testid="why-title-heading">
                <span className="why-title-gold-text">Why IG INFRA.... For LAND BANK CREATION</span>
              </h1>
              <span className="why-title-decor-line line-right" aria-hidden="true" />
            </div>

            {/* Bottom decorative golden line with centered diamond star */}
            <div className="why-title-frame-line bottom-line" aria-hidden="true">
              <span className="why-frame-line-segment" />
              <span className="why-frame-star">✦</span>
              <span className="why-frame-line-segment" />
            </div>
          </div>

          <span className="sr-only">
            Land is a Gift of God · Build Your Own Land Bank · Think Beyond Money... Think Property Ownership · A Property Ownership Opportunity for Everyday Earners · Just 2 Referrals in Your Life · A House + A Land · Secure Your Future
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToTab && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToTab('route-map')}
              className="hidden md:inline-flex text-[11.5px] h-7 px-2.5 text-amber-200 hover:text-white hover:bg-[#142D50]"
            >
              <span>Route Map</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsZoomOpen(true)}
            className="text-xs h-7 px-2.5 bg-[#142D50] hover:bg-[#1b3b68] text-white border-amber-500/40 hover:border-amber-400 shadow-2xs font-medium cursor-pointer"
            data-testid="why-zoom-btn"
            title="View image in full-resolution modal"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1 text-amber-300" />
            <span>Full View</span>
          </Button>
        </div>
      </header>

      {/* Main Visual Presentation: Edge-to-Edge Prominent Promotional Image */}
      <main className="why-main-area">
        <section
          className="why-visual-wrapper group"
          data-testid="why-image-card"
          aria-label="Why IG INFRA - Land is a Gift of God Visual Presentation"
        >
          {/* Subtle rotating light rays around the divine hand & floating land */}
          <div className="why-light-rays-effect" aria-hidden="true" />
          <div className="why-land-glow-core" aria-hidden="true" />

          {/* Quick Zoom Trigger in Top-Right Corner */}
          <button
            type="button"
            className="why-zoom-trigger"
            onClick={() => setIsZoomOpen(true)}
            title="Click to view full-resolution image"
            aria-label="Expand image"
            data-testid="why-expand-trigger"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expand</span>
          </button>

          {/* Newly Attached Approved Promotional Image */}
          <img
            src={whyLandBankAsset}
            alt="Land is a Gift of God - Build Your Own Land Bank - Think Beyond Money... Think Property Ownership - A Property Ownership Opportunity for Everyday Earners - Just 2 Referrals in Your Life - A House + A Land - Secure Your Future"
            className="why-main-image"
            data-testid="why-main-img"
            loading="eager"
            decoding="async"
          />
        </section>
      </main>

      {/* Compact Interactive Navigation Badges */}
      <footer className="why-bottom-bar shrink-0 flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('route-map')}
          className="why-badge-pill"
          data-testid="why-badge-referrals"
          title="View Route Map for 2 Referrals Plan"
        >
          <Users className="w-3 h-3 text-blue-600" />
          <span className="font-semibold text-slate-800">Just 2 Referrals</span>
          <span className="text-slate-500 hidden sm:inline">· In Your Life</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('customer-view')}
          className="why-badge-pill"
          data-testid="why-badge-property"
          title="View Customer Property Benefits"
        >
          <Home className="w-3 h-3 text-amber-600" />
          <span className="font-semibold text-slate-800">A House + A Land</span>
          <span className="text-slate-500 hidden sm:inline">· Property Ownership</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('earning-opportunities')}
          className="why-badge-pill"
          data-testid="why-badge-future"
          title="View Earning Opportunities"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span className="font-semibold text-slate-800">Secure Your Future</span>
          <span className="text-slate-500 hidden sm:inline">· Everyday Earners</span>
        </button>
      </footer>

      {/* Full-Resolution Zoom Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
          data-testid="why-zoom-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Why IG INFRA full-resolution presentation"
        >
          <div
            className="relative max-w-7xl w-full max-h-[96vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-10 right-0 sm:right-2 text-white hover:text-amber-400 bg-slate-900/90 hover:bg-slate-800 p-1.5 sm:p-2 rounded-full border border-white/20 transition-all cursor-pointer z-10 shadow-lg"
              onClick={() => setIsZoomOpen(false)}
              aria-label="Close full view"
              data-testid="close-zoom-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="rounded-xl overflow-hidden border border-amber-500/40 shadow-2xl bg-black max-h-[90vh] flex items-center justify-center">
              <img
                src={whyLandBankAsset}
                alt="Land is a Gift of God - Build Your Own Land Bank - A Property Ownership Opportunity for Everyday Earners - Full Resolution"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
