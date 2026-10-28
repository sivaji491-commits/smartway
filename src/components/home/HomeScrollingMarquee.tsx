import React, { useState, useMemo } from 'react';
import { Bell, Pause, Play, Sparkles } from 'lucide-react';
import { NoticeItem } from '@/types/notice';

export interface HomeScrollingMarqueeProps {
  text?: string;
  notices?: (NoticeItem | string)[];
  className?: string;
}

export const DEFAULT_MARQUEE_TEXT = "It's like ONE TIME SMART WORK FOR ASSET EARNING, FIRST UNDERSTAND THE BUSINESS PLAN";

export function HomeScrollingMarquee({
  text = DEFAULT_MARQUEE_TEXT,
  notices,
  className = '',
}: HomeScrollingMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Extract display messages from notices if provided, or fallback to text
  const displayItems = useMemo(() => {
    if (Array.isArray(notices) && notices.length > 0) {
      const active = notices
        .filter((n) => typeof n === 'string' || n.isActive !== false)
        .map((n) => (typeof n === 'string' ? n : n.text))
        .map((t) => t?.trim())
        .filter((t): t is string => Boolean(t));
      if (active.length > 0) {
        return active;
      }
    }
    return [text?.trim() || DEFAULT_MARQUEE_TEXT];
  }, [notices, text]);

  // We repeat the sequence to ensure a smooth, continuous looping experience across any screen size
  const repeatCount = displayItems.length === 1 ? 4 : Math.max(2, Math.ceil(4 / displayItems.length));
  const sequence = Array.from({ length: repeatCount });

  // Mobile touch handlers: pause immediately on touch, automatically resume on finger lift
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);
  const handleTouchCancel = () => setIsPaused(false);

  return (
    <div
      role="region"
      aria-label="Important Announcement Marquee"
      className={`home-marquee-container relative w-full overflow-hidden bg-gradient-to-r from-emerald-50 via-white to-sky-50 border-y border-emerald-200/80 shadow-xs z-20 select-none touch-pan-y ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Subtle top emerald highlight line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

      <div className="flex items-center">
        {/* Left Badge: IMPORTANT NOTICE */}
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 border-r border-emerald-700 text-white font-bold text-xs uppercase tracking-wider z-20 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <div className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-white shrink-0 animate-bounce" />
            <span className="hidden sm:inline">NOTICE</span>
            <span className="sm:hidden font-extrabold">!</span>
          </div>
        </div>

        {/* Center Marquee Moving Track */}
        <div 
          className="relative flex-1 overflow-hidden py-2 sm:py-2.5 touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {/* Edge Fade Overlays */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-emerald-50 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-sky-50 to-transparent z-10" />

          {/* Continuous Infinite Track with Hover Pause */}
          <div
            className={`home-marquee-track flex items-center whitespace-nowrap will-change-transform ${
              isPaused ? 'paused' : ''
            }`}
            style={{
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {/* Primary sequence */}
            {sequence.map((_, seqIdx) => (
              <React.Fragment key={`seq-${seqIdx}`}>
                {displayItems.map((message, itemIdx) => (
                  <div
                    key={`item-${seqIdx}-${itemIdx}`}
                    className="inline-flex items-center mx-4 sm:mx-8 text-xs sm:text-sm font-semibold tracking-wide text-[#0B2545]"
                  >
                    <span className="text-emerald-600 mr-2 sm:mr-3 text-sm">⚡</span>
                    <span className="text-[#0B2545] hover:text-emerald-700 transition-colors">
                      {message}
                    </span>
                    <span className="ml-4 sm:ml-8 text-emerald-500/50 text-xs">✦</span>
                  </div>
                ))}
              </React.Fragment>
            ))}

            {/* Duplicate sequence for gapless infinite scrolling */}
            {sequence.map((_, seqIdx) => (
              <React.Fragment key={`dup-seq-${seqIdx}`}>
                {displayItems.map((message, itemIdx) => (
                  <div
                    key={`dup-${seqIdx}-${itemIdx}`}
                    aria-hidden="true"
                    className="inline-flex items-center mx-4 sm:mx-8 text-xs sm:text-sm font-semibold tracking-wide text-[#0B2545]"
                  >
                    <span className="text-emerald-600 mr-2 sm:mr-3 text-sm">⚡</span>
                    <span className="text-[#0B2545] hover:text-emerald-700 transition-colors">
                      {message}
                    </span>
                    <span className="ml-4 sm:ml-8 text-emerald-500/50 text-xs">✦</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Status Badge: Hover to Pause / Paused Status */}
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[10.5px] text-slate-700 hover:text-emerald-700 border-l border-slate-200 z-20 transition-colors cursor-pointer"
          title={isPaused ? 'Click to resume scrolling' : 'Hover or click to pause'}
          aria-label={isPaused ? 'Resume scrolling' : 'Pause scrolling'}
        >
          {isPaused ? (
            <>
              <Play className="w-3 h-3 text-emerald-400 shrink-0 fill-current" />
              <span className="font-semibold text-emerald-300">Paused</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden md:inline text-slate-400">Hover to pause</span>
            </>
          )}
        </button>
      </div>

      {/* Subtle bottom border glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </div>
  );
}
