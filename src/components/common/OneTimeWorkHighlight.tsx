import React from 'react';
import { cn } from '@/lib/utils';
import '@/components/route-map/route-map.css';

export interface OneTimeWorkHighlightProps {
  className?: string;
  forceRender?: boolean;
}

/**
 * React Context used to ensure that ONE TIME WORK is never duplicated
 * on a page that already has it rendered by a parent container or layout.
 */
export const OneTimeWorkContext = React.createContext<boolean>(false);

/**
 * Universal "ONE TIME WORK" animated component - the default animated element
 * for all future and existing pages:
 * - Exact text: "ONE TIME WORK" with glowing golden gradient typography
 * - Top and bottom horizontal golden lines with centered golden diamond star (✦)
 * - Exactly two golden stars (✦) revolving in a continuous 180-degree circular orbit
 * - Stars remain strictly inside the border throughout the entire rotation
 * - Deep luxury navy background (#08111D) matching reference styling
 */
export const OneTimeWorkHighlight: React.FC<OneTimeWorkHighlightProps> = ({ 
  className,
  forceRender = false 
}) => {
  const isAlreadyRendered = React.useContext(OneTimeWorkContext);

  // Prevent duplicate instances if a parent layout has already rendered it
  if (isAlreadyRendered && !forceRender) {
    return null;
  }

  return (
    <div
      className={cn('key-points-one-time-work-badge route-map-one-time-work-lockup', className)}
      data-testid="key-points-one-time-work"
      aria-label="ONE TIME WORK highlight"
    >
      {/* Orbiting Golden Stars Overlay (Exact 180° circular orbit matching reference) */}
      <div className="route-map-stars-overlay-lockup" aria-hidden="true" data-testid="route-map-stars-overlay">
        {/* Star 1 - Traveling in continuous 6s circular orbit */}
        <span
          className="route-map-moving-star route-map-moving-star-1 one-time-work-star"
          data-testid="one-time-work-star-1"
          aria-hidden="true"
        >
          ✦
        </span>

        {/* Star 2 - Exactly 180 degrees opposite phase (-3s delay) */}
        <span
          className="route-map-moving-star route-map-moving-star-2 one-time-work-star"
          data-testid="one-time-work-star-2"
          aria-hidden="true"
        >
          ✦
        </span>
      </div>

      {/* Top decorative golden line with centered diamond star */}
      <div className="one-time-work-frame-line top-line" aria-hidden="true">
        <span className="frame-line-segment" />
        <span className="frame-star">✦</span>
        <span className="frame-line-segment" />
      </div>

      {/* Center text container with flanking decorative lines */}
      <div className="one-time-work-text-row">
        <span className="one-time-work-decor-line line-left" aria-hidden="true" />
        <span
          className="one-time-work-text"
          data-testid="one-time-work-text"
        >
          ONE TIME WORK
        </span>
        <span className="one-time-work-decor-line line-right" aria-hidden="true" />
      </div>

      {/* Bottom decorative golden line with centered diamond star */}
      <div className="one-time-work-frame-line bottom-line" aria-hidden="true">
        <span className="frame-line-segment" />
        <span className="frame-star">✦</span>
        <span className="frame-line-segment" />
      </div>
    </div>
  );
};
