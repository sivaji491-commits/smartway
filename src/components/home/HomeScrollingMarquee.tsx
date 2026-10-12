import React, { useState } from 'react';
import { Bell, Pause, Play, Sparkles } from 'lucide-react';

interface HomeScrollingMarqueeProps {
  text?: string;
  className?: string;
}

export const DEFAULT_MARQUEE_TEXT = 'Understand the subject first, or face the loss. Stay updated!';

export function HomeScrollingMarquee({
  text = DEFAULT_MARQUEE_TEXT,
  className = '',
}: HomeScrollingMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  const displayMessage = text?.trim() || DEFAULT_MARQUEE_TEXT;

  // We repeat the message 4 times per sequence for seamless continuous looping across any screen size
  const items = [0, 1, 2, 3];

  // Mobile touch handlers: pause immediately on touch, automatically resume on finger lift
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);
  const handleTouchCancel = () => setIsPaused(false);

  return (
    <div
      role="region"
      aria-label="Important Announcement Marquee"
      className={`home-marquee-container relative w-full overflow-hidden bg-gradient-to-r from-[#040C16] via-[#081B2E] to-[#040C16] border-y border-amber-500/25 shadow-md shadow-black/30 z-20 select-none touch-pan-y ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Subtle top amber highlight glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="flex items-center">
        {/* Left Badge: IMPORTANT NOTICE */}
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-r border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider z-20 backdrop-blur-md shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <div className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
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
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-[#040C16] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-[#040C16] to-transparent z-10" />

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
            {items.map((idx) => (
              <div
                key={`item-${idx}`}
                className="inline-flex items-center mx-4 sm:mx-8 text-xs sm:text-sm font-semibold tracking-wide text-slate-100"
              >
                <span className="text-amber-400 mr-2 sm:mr-3 text-sm">⚡</span>
                <span className="text-white hover:text-amber-200 transition-colors">
                  {displayMessage}
                </span>
                <span className="ml-4 sm:ml-8 text-amber-500/50 text-xs">✦</span>
              </div>
            ))}

            {/* Duplicate sequence for gapless infinite scrolling */}
            {items.map((idx) => (
              <div
                key={`dup-${idx}`}
                aria-hidden="true"
                className="inline-flex items-center mx-4 sm:mx-8 text-xs sm:text-sm font-semibold tracking-wide text-slate-100"
              >
                <span className="text-amber-400 mr-2 sm:mr-3 text-sm">⚡</span>
                <span className="text-white hover:text-amber-200 transition-colors">
                  {displayMessage}
                </span>
                <span className="ml-4 sm:ml-8 text-amber-500/50 text-xs">✦</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Status Badge: Hover to Pause / Paused Status */}
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-black/40 hover:bg-black/60 text-[10.5px] text-slate-300 hover:text-amber-300 border-l border-white/10 z-20 transition-colors cursor-pointer"
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
