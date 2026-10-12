import React from 'react';
import { 
  Network, 
  Handshake, 
  Medal, 
  Gem, 
  Globe, 
  Users, 
  Award, 
  Sparkles, 
  TrendingUp, 
  DollarSign,
  Coins
} from 'lucide-react';
import { EarningOpportunityItem } from '@/types/earning-opportunities';

interface SourceStructureDiagramProps {
  items: EarningOpportunityItem[];
  activeIndex?: number | null;
  onHoverItem?: (index: number | null) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  network: Network,
  users: Users,
  handshake: Handshake,
  medal: Medal,
  award: Award,
  gem: Gem,
  diamond: Gem,
  sparkles: Sparkles,
  globe: Globe,
  trendingup: TrendingUp,
  coins: Coins,
  dollarsign: DollarSign,
};

function resolveItemIcon(name: string) {
  const clean = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (ICON_MAP[clean]) return ICON_MAP[clean];
  return Globe;
}

export const SourceStructureDiagram: React.FC<SourceStructureDiagramProps> = ({
  items,
  activeIndex,
  onHoverItem,
}) => {
  // Center (200, 200), Outer Radius 155, Inner Radius 70
  const cx = 200;
  const cy = 200;
  const R_outer = 155;
  const R_inner = 70;
  const segmentCount = Math.max(1, items.length);
  const angleStep = 360 / segmentCount;

  // Generate 5 chevron ring segments
  // Each segment starts at angle theta, has an inner & outer arc, with a forward chevron notch
  const segments = items.map((item, index) => {
    // Start angle: offset by -126 deg so segment 1 is top-left, 2 is top-right, etc.
    const startAngleDeg = -126 + index * angleStep;
    const endAngleDeg = startAngleDeg + angleStep;

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // Chevron tip offset angle (subtle arrow notch at end)
    const notchDeg = 8;
    const gapDeg = 2.5; // subtle gap between segments

    const a1 = toRad(startAngleDeg + gapDeg);
    const a2 = toRad(endAngleDeg - notchDeg);
    const aTip = toRad(endAngleDeg);
    const aInnerEnd = toRad(endAngleDeg - notchDeg * 0.7);

    // Outer arc points
    const xOuterStart = cx + R_outer * Math.cos(a1);
    const yOuterStart = cy + R_outer * Math.sin(a1);

    const xOuterNotch = cx + R_outer * Math.cos(a2);
    const yOuterNotch = cy + R_outer * Math.sin(a2);

    const midR = (R_outer + R_inner) / 2;
    const xTip = cx + midR * Math.cos(aTip);
    const yTip = cy + midR * Math.sin(aTip);

    const xInnerNotch = cx + R_inner * Math.cos(aInnerEnd);
    const yInnerNotch = cy + R_inner * Math.sin(aInnerEnd);

    const xInnerStart = cx + R_inner * Math.cos(a1);
    const yInnerStart = cy + R_inner * Math.sin(a1);

    // Chevron path
    // 1. Move to outer start
    // 2. Arc to outer notch
    // 3. Line to mid tip
    // 4. Line to inner notch
    // 5. Arc back to inner start
    // 6. Close
    const pathData = [
      `M ${xOuterStart} ${yOuterStart}`,
      `A ${R_outer} ${R_outer} 0 0 1 ${xOuterNotch} ${yOuterNotch}`,
      `L ${xTip} ${yTip}`,
      `L ${xInnerNotch} ${yInnerNotch}`,
      `A ${R_inner} ${R_inner} 0 0 0 ${xInnerStart} ${yInnerStart}`,
      'Z',
    ].join(' ');

    // Icon position at center of arc
    const iconAngleRad = toRad(startAngleDeg + angleStep / 2 - 2);
    const iconR = (R_outer + R_inner) / 2;
    const iconX = cx + iconR * Math.cos(iconAngleRad);
    const iconY = cy + iconR * Math.sin(iconAngleRad);

    const isHovered = activeIndex === index;
    const IconComponent = resolveItemIcon(item.iconName);

    return {
      index,
      item,
      pathData,
      iconX,
      iconY,
      isHovered,
      IconComponent,
    };
  });

  return (
    <div className="earning-opportunities-wheel-wrapper relative flex items-center justify-center select-none w-full max-w-[250px] sm:max-w-[275px] lg:max-w-[295px] aspect-square mx-auto cursor-pointer">
      <svg
        viewBox="0 0 400 400"
        className="earning-opportunities-wheel w-full h-full filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition-transform duration-300"
      >
        <defs>
          {/* Subtle gradient for ring segments matching screenshot leafy emerald tones */}
          <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E8B57" />
            <stop offset="50%" stopColor="#228B48" />
            <stop offset="100%" stopColor="#1E7A3E" />
          </linearGradient>
          <linearGradient id="emeraldGradHover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34A863" />
            <stop offset="50%" stopColor="#2BB05E" />
            <stop offset="100%" stopColor="#22994E" />
          </linearGradient>
          {/* Subtle inner shadow for center hole */}
          <radialGradient id="holeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#0B1E1B" />
            <stop offset="100%" stopColor="#061512" />
          </radialGradient>
        </defs>

        {/* 5 Circular Chevron Segments */}
        <g className="cursor-pointer">
          {segments.map((seg) => (
            <path
              key={seg.item.id || seg.index}
              d={seg.pathData}
              fill={seg.isHovered ? 'url(#emeraldGradHover)' : 'url(#emeraldGrad)'}
              stroke="#061512"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="transition-all duration-200 hover:brightness-110"
              onMouseEnter={() => onHoverItem && onHoverItem(seg.index)}
              onMouseLeave={() => onHoverItem && onHoverItem(null)}
            />
          ))}
        </g>

        {/* Center circular cutout matching background */}
        <circle
          cx={cx}
          cy={cy}
          r={R_inner - 2}
          fill="url(#holeGradient)"
          stroke="#164336"
          strokeWidth="1.5"
        />

        {/* Icons inside each segment */}
        {segments.map((seg) => {
          const Icon = seg.IconComponent;
          return (
            <g
              key={`icon-${seg.item.id || seg.index}`}
              transform={`translate(${seg.iconX - 12}, ${seg.iconY - 12})`}
              className="pointer-events-none transition-transform duration-200"
            >
              <Icon className="w-6 h-6 text-white stroke-[1.75]" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
