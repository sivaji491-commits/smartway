import React from 'react';

export interface AnimatedPlotLocationPinProps {
  idPrefix: string;
}

/**
 * Animated "HERE" Location Pin with realistic ground shadow and gentle jumping animation.
 * Reusable across Home and Customer View pages.
 */
export function AnimatedPlotLocationPin({ idPrefix }: AnimatedPlotLocationPinProps) {
  return (
    <>
      {/* Subtle, soft realistic ground contact shadow directly beneath the pin */}
      <div 
        className="absolute pointer-events-none z-10"
        style={{
          left: '55.4%',
          top: '73.5%',
          transform: 'translate(-50%, -50%)',
          width: '7%',
          maxWidth: '50px',
          minWidth: '24px',
          height: '5px',
        }}
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-full bg-black/35 blur-[1.5px] plot-pin-shadow" />
      </div>

      {/* Large, Prominent Animated Foreground "HERE" Location Pin */}
      <div 
        className="absolute pointer-events-none z-20 flex flex-col items-center"
        style={{
          left: '55.4%',
          top: '73.5%',
          transform: 'translate(-50%, -97%)',
          width: '14%',
          maxWidth: '100px',
          minWidth: '54px',
          aspectRatio: '100 / 136',
        }}
        role="img"
        aria-label="Featured plot location marker"
      >
        <div className="w-full h-full plot-pin-animated flex items-center justify-center">
          <svg 
            viewBox="0 0 100 136" 
            className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 3D Glossy Red Spherical Body Gradient */}
              <radialGradient id={`${idPrefix}-pinRed3D`} cx="32%" cy="26%" r="68%">
                <stop offset="0%" stopColor="#FF5C5C" />
                <stop offset="35%" stopColor="#E60000" />
                <stop offset="75%" stopColor="#B30000" />
                <stop offset="100%" stopColor="#700000" />
              </radialGradient>
              {/* Top-Left Gloss Highlight */}
              <linearGradient id={`${idPrefix}-pinGloss`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
              </linearGradient>
              {/* Inner Inset Bevel */}
              <radialGradient id={`${idPrefix}-innerBevel`} cx="50%" cy="40%" r="45%">
                <stop offset="65%" stopColor="#B80000" stopOpacity="0" />
                <stop offset="100%" stopColor="#450000" stopOpacity="0.7" />
              </radialGradient>
            </defs>

            {/* Outer 3D Teardrop Pin Body */}
            <path
              d="M 50 132 C 47 124 10 78 10 48 A 40 40 0 1 1 90 48 C 90 78 53 124 50 132 Z"
              fill={`url(#${idPrefix}-pinRed3D)`}
            />

            {/* Subtle Outer Edge 3D Highlight & Shadow */}
            <path
              d="M 50 132 C 47 124 10 78 10 48 A 40 40 0 1 1 90 48 C 90 78 53 124 50 132 Z"
              stroke={`url(#${idPrefix}-pinGloss)`}
              strokeWidth="2.5"
            />

            {/* Recessed Inset Circular Face */}
            <circle cx="50" cy="48" r="28" fill={`url(#${idPrefix}-innerBevel)`} />

            {/* Crisp Bold White "HERE" Typography */}
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fill="#FFFFFF"
              fontWeight="900"
              fontSize="18"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              letterSpacing="0.5px"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.65))' }}
            >
              HERE
            </text>
          </svg>
        </div>
      </div>
    </>
  );
}

