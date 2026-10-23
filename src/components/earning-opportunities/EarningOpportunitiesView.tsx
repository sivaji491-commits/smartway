import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Network,
  Users,
  Handshake,
  TrendingUp,
  Award,
  Trophy,
  CalendarCheck,
  Globe,
  Gem,
  Coins,
  DollarSign,
  Layers,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Check,
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  EarningOpportunitiesData, 
  EarningOpportunityItem, 
  DEFAULT_EARNING_OPPORTUNITIES 
} from '@/types/earning-opportunities';
import { 
  loadEarningOpportunities, 
  saveEarningOpportunitiesAdmin,
  validateEarningOpportunities 
} from '@/lib/earning-opportunities-storage';

interface EarningOpportunitiesViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
}

interface OpportunityMeta {
  category: string;
  themeColor: string;
  themeSecondary: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  type: 'core' | 'pool';
  rewardType: string;
  qualification: string;
  distribution: string;
}

const OPPORTUNITY_METAS: Record<number, OpportunityMeta> = {
  1: {
    category: '12-Tier Matrix',
    themeColor: '#10B981',
    themeSecondary: '#059669',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#34D399',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    type: 'core',
    rewardType: 'Multi-Level Matrix Bonus',
    qualification: 'Network referral growth across 12 levels',
    distribution: 'Continuous dynamic tier distribution',
  },
  2: {
    category: 'Direct Referral',
    themeColor: '#F43F5E',
    themeSecondary: '#E11D48',
    glowColor: 'rgba(244, 63, 94, 0.3)',
    badgeBg: 'rgba(244, 63, 94, 0.12)',
    badgeText: '#FB7185',
    badgeBorder: 'rgba(244, 63, 94, 0.3)',
    type: 'core',
    rewardType: 'Dual Direct Referral Incentive',
    qualification: '2 verified direct sponsor connections',
    distribution: 'Direct bonus upon qualifying referrals',
  },
  3: {
    category: 'Rank Milestone',
    themeColor: '#F59E0B',
    themeSecondary: '#D97706',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeText: '#FBBF24',
    badgeBorder: 'rgba(245, 158, 11, 0.3)',
    type: 'core',
    rewardType: 'Leadership Rank Appreciation',
    qualification: 'Achieving top network rank milestones',
    distribution: 'Milestone achievement bonus',
  },
  4: {
    category: 'Monthly Achievement',
    themeColor: '#3B82F6',
    themeSecondary: '#2563EB',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeText: '#60A5FA',
    badgeBorder: 'rgba(59, 130, 246, 0.3)',
    type: 'pool',
    rewardType: 'Monthly Target Bonanza',
    qualification: 'Hitting verified monthly volume targets',
    distribution: 'Monthly rewards, luxury goods & travel',
  },
  5: {
    category: 'Global Pool',
    themeColor: '#8B5CF6',
    themeSecondary: '#7C3AED',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeText: '#A78BFA',
    badgeBorder: 'rgba(139, 92, 246, 0.3)',
    type: 'pool',
    rewardType: 'Company Revenue Share',
    qualification: 'Meeting annual global performance target',
    distribution: 'Annual corporate revenue pool share',
  },
};

const DEFAULT_CONTEXT_TAGS: Record<number, string> = {
  1: '12-Tier Matrix',
  2: 'Direct Referral',
  3: 'Rank Milestone',
  4: 'Monthly Achievement',
  5: 'Global Pool',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  network: Network,
  gitbranch: Network,
  users: Users,
  handshake: Handshake,
  trendingup: TrendingUp,
  award: Award,
  trophy: Trophy,
  calendarcheck: CalendarCheck,
  gem: Gem,
  diamond: Gem,
  globe: Globe,
  coins: Coins,
  dollarsign: DollarSign,
  sparkles: Sparkles,
  shieldcheck: ShieldCheck,
  layers: Layers,
};

function resolveOpportunityIcon(name: string) {
  const clean = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (ICON_MAP[clean]) return ICON_MAP[clean];
  return TrendingUp;
}

// Math helpers for SVG annular wheel
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
) {
  const p1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 1 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

// Interactive 5-Segment Commission Visualization Wheel inspired by Image 1
interface CommissionWheelProps {
  items: EarningOpportunityItem[];
  activeId: string | null;
  onSelect: (item: EarningOpportunityItem) => void;
}

const CommissionWheel: React.FC<CommissionWheelProps> = ({ items, activeId, onSelect }) => {
  const [internalHover, setInternalHover] = useState<number | null>(null);
  const [isWheelHovered, setIsWheelHovered] = useState(false);

  // Wheel geometry
  const cx = 200;
  const cy = 200;
  const rOuter = 172;
  const rInner = 92;
  const rCenter = 85;

  // Segment angles corresponding to Image 1 layout:
  // 1 (12 Level) on upper-left, 2 (Double Connect) on top, 3 (Token) on right, 4 (Bonanza) on bottom-right, 5 (Global) on bottom-left
  const segmentAngles = useMemo(() => [
    { start: 164, end: 232, mid: 198 }, // 0: 12 Level Bonus (upper-left)
    { start: 236, end: 304, mid: 270 }, // 1: Double Connect (top / top-right)
    { start: 308, end: 376, mid: 342 }, // 2: Token Appreciation (right)
    { start: 380, end: 448, mid: 414 }, // 3: Monthly Bonanza (bottom-right, 414 deg = 54 deg)
    { start: 92,  end: 160, mid: 126 }, // 4: Global Pool (bottom-left)
  ], []);

  // Determine current active item for center hub
  const activeIndex = useMemo(() => {
    if (internalHover !== null) return internalHover;
    if (activeId) {
      const idx = items.findIndex((it) => it.id === activeId);
      if (idx >= 0 && idx < 5) return idx;
    }
    return null;
  }, [internalHover, activeId, items]);

  const activeItem = activeIndex !== null ? items[activeIndex] : null;
  const activeMeta = activeIndex !== null ? OPPORTUNITY_METAS[activeIndex + 1] : null;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer ambient glow */}
      <div 
        className="absolute w-[165px] h-[165px] rounded-full blur-2xl opacity-30 pointer-events-none transition-all duration-500"
        style={{
          background: activeMeta 
            ? `radial-gradient(circle, ${activeMeta.themeColor}55 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* SVG Circular Wheel with Slow Continuous Clockwise Rotation & Hover Pause */}
      <div
        className="earning-opportunities-wheel-wrapper inline-flex items-center justify-center cursor-pointer"
        onMouseEnter={() => setIsWheelHovered(true)}
        onMouseLeave={() => setIsWheelHovered(false)}
        onTouchStart={() => setIsWheelHovered(true)}
        onTouchEnd={() => setIsWheelHovered(false)}
      >
        <svg 
          viewBox="0 0 400 400" 
          className={`earning-opportunities-wheel w-[130px] h-[130px] sm:w-[145px] sm:h-[145px] lg:w-[155px] lg:h-[155px] xl:w-[165px] xl:h-[165px] drop-shadow-lg ${isWheelHovered ? 'paused' : ''}`}
          style={{
            animationPlayState: isWheelHovered ? 'paused' : 'running',
          }}
          role="img"
          aria-label="Interactive IG Infra Commission Structure Wheel with 5 segments"
        >
        <defs>
          {/* Linear gradients for all 5 opportunity segments */}
          <linearGradient id="grad-segment-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="grad-segment-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
          <linearGradient id="grad-segment-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="grad-segment-4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="grad-segment-5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="segment-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer decorative orbit track */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={rOuter + 8} 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.08)" 
          strokeWidth="1.5" 
          strokeDasharray="4 6" 
        />

        {/* 5 Annular Segments */}
        {segmentAngles.map((ang, idx) => {
          const item = items[idx] || DEFAULT_EARNING_OPPORTUNITIES.items[idx];
          const isSelected = activeIndex === idx;
          const meta = OPPORTUNITY_METAS[idx + 1];
          const pathD = describeArc(cx, cy, rInner, rOuter, ang.start, ang.end);
          const iconPos = polarToCartesian(cx, cy, 133, ang.mid);
          const numPos = polarToCartesian(cx, cy, 158, ang.mid);

          return (
            <g 
              key={`segment-${idx}`}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setInternalHover(idx)}
              onMouseLeave={() => setInternalHover(null)}
              onClick={() => item && onSelect(item)}
            >
              {/* Segment Annular Sector Path */}
              <path
                d={pathD}
                fill={`url(#grad-segment-${idx + 1})`}
                stroke={isSelected ? '#FFFFFF' : '#071524'}
                strokeWidth={isSelected ? '3.5' : '2'}
                filter={isSelected ? 'url(#segment-glow)' : undefined}
                opacity={isSelected ? 1 : internalHover !== null ? 0.65 : 0.94}
                className="transition-all duration-200 hover:brightness-110"
              />

              {/* Segment Icon - Native crisp SVG path icons matching Image 1 */}
              <g 
                transform={`translate(${iconPos.x}, ${iconPos.y})`}
                pointerEvents="none"
              >
                {idx === 0 && (
                  /* 12 Level Matrix - Network hierarchy */
                  <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="0" cy="-6" r="2.5" fill="#FFFFFF" />
                    <circle cx="-6" cy="6" r="2.2" fill="#FFFFFF" />
                    <circle cx="6" cy="6" r="2.2" fill="#FFFFFF" />
                    <path d="M0 -3.5 L0 1 M-6 3.8 L0 1 L6 3.8" />
                  </g>
                )}
                {idx === 1 && (
                  /* Double Connect - Handshake connection */
                  <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M-7 -2 L-3 2 L1 -2 L5 2 L8 -1" />
                    <path d="M-5 -5 L-2 -2 L2 -5 L6 -2" />
                    <circle cx="-4" cy="5" r="2" fill="#FFFFFF" />
                    <circle cx="4" cy="5" r="2" fill="#FFFFFF" />
                  </g>
                )}
                {idx === 2 && (
                  /* Token Appreciation - Medal & Award */
                  <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="0" cy="-2.5" r="5" />
                    <circle cx="0" cy="-2.5" r="2" fill="#FFFFFF" />
                    <path d="M-3 2 L-5 8 L0 5.5 L5 8 L3 2" />
                  </g>
                )}
                {idx === 3 && (
                  /* Monthly Bonanza - Celebration trophy / gift */
                  <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M-5 -5 h10 v4 c0 3 -2 5 -5 5 s-5 -2 -5 -5 z" />
                    <path d="M-5 -3 h-2 c-1 0 -1.5 1 -1.5 2 s0.5 2 1.5 2 h2" />
                    <path d="M5 -3 h2 c1 0 1.5 1 1.5 2 s-0.5 2 -1.5 2 h-2" />
                    <path d="M0 4 v4 M-3.5 8 h7" />
                  </g>
                )}
                {idx === 4 && (
                  /* Global Pool - Worldwide network sphere */
                  <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="0" cy="0" r="7" />
                    <ellipse cx="0" cy="0" rx="3.5" ry="7" />
                    <line x1="-7" y1="0" x2="7" y2="0" />
                  </g>
                )}
              </g>
            </g>
          );
        })}

        {/* Center Dark Circle Hub */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={rCenter} 
          fill="#07131F" 
          stroke={activeMeta ? activeMeta.themeColor : '#10B981'} 
          strokeWidth="2.5"
          className="transition-colors duration-300"
        />

        {/* Center inner dashed ring */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={rCenter - 7} 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.12)" 
          strokeWidth="1" 
          strokeDasharray="3 4" 
        />

        {/* Center Interactive Content */}
        {activeItem && activeMeta ? (
          <g pointerEvents="none">
            {/* Number Pill */}
            <rect 
              x={cx - 16} 
              y={cy - 50} 
              width="32" 
              height="16" 
              rx="8" 
              fill={activeMeta.themeColor} 
            />
            <text 
              x={cx} 
              y={cy - 39} 
              fill="#FFFFFF" 
              fontSize="10" 
              fontWeight="800" 
              fontFamily="monospace"
              textAnchor="middle"
            >
              {`0${activeItem.number || activeIndex! + 1}`}
            </text>

            {/* Opportunity Title */}
            <text 
              x={cx} 
              y={cy - 12} 
              fill="#FFFFFF" 
              fontSize="12.5" 
              fontWeight="800" 
              textAnchor="middle"
              className="tracking-tight"
            >
              {activeItem.title.length > 20 ? activeItem.title.substring(0, 18) + '...' : activeItem.title}
            </text>

            {/* Category Subtitle */}
            <text 
              x={cx} 
              y={cy + 7} 
              fill={activeMeta.badgeText} 
              fontSize="9.5" 
              fontWeight="700" 
              textAnchor="middle"
              className="tracking-wide"
            >
              {activeMeta.category}
            </text>

            {/* Click to inspect prompt */}
            <rect 
              x={cx - 42} 
              y={cy + 22} 
              width="84" 
              height="18" 
              rx="9" 
              fill="rgba(255, 255, 255, 0.08)" 
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
            <text 
              x={cx} 
              y={cy + 34} 
              fill="rgba(255, 255, 255, 0.9)" 
              fontSize="8.5" 
              fontWeight="600" 
              textAnchor="middle"
            >
              Click to Inspect ↗
            </text>
          </g>
        ) : (
          <g pointerEvents="none">
            {/* Default IG INFRA Center Badge */}
            <text 
              x={cx} 
              y={cy - 20} 
              fill="#10B981" 
              fontSize="10" 
              fontWeight="800" 
              letterSpacing="2.5" 
              textAnchor="middle"
            >
              IG INFRA
            </text>
            <text 
              x={cx} 
              y={cy + 3} 
              fill="#FFFFFF" 
              fontSize="14" 
              fontWeight="800" 
              textAnchor="middle"
              className="tracking-tight"
            >
              5 EARNING
            </text>
            <text 
              x={cx} 
              y={cy + 20} 
              fill="#94A3B8" 
              fontSize="10" 
              fontWeight="700" 
              letterSpacing="1" 
              textAnchor="middle"
            >
              OPPORTUNITIES
            </text>

            <rect 
              x={cx - 36} 
              y={cy + 34} 
              width="72" 
              height="14" 
              rx="7" 
              fill="rgba(16, 185, 129, 0.15)" 
              stroke="rgba(16, 185, 129, 0.3)"
              strokeWidth="0.8"
            />
            <text 
              x={cx} 
              y={cy + 44} 
              fill="#34D399" 
              fontSize="8" 
              fontWeight="700" 
              letterSpacing="0.5" 
              textAnchor="middle"
            >
              ECOSYSTEM
            </text>
          </g>
        )}
      </svg>
      </div>

      {/* Interactive Quick-Select Pills Legend */}
      <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5 max-w-xs">
        {items.slice(0, 5).map((item, idx) => {
          const meta = OPPORTUNITY_METAS[idx + 1];
          const isSelected = activeIndex === idx;

          return (
            <button
              key={`pill-${item.id || idx}`}
              type="button"
              onClick={() => onSelect(item)}
              onMouseEnter={() => setInternalHover(idx)}
              onMouseLeave={() => setInternalHover(null)}
              className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold transition-all duration-200 flex items-center gap-1 border cursor-pointer ${
                isSelected
                  ? 'bg-white/15 text-white scale-105 shadow-md'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              style={{
                borderColor: isSelected ? meta.themeColor : 'rgba(255, 255, 255, 0.12)',
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: meta.themeColor }}
              />
              <span>{`#${idx + 1}`}</span>
              <span className="truncate max-w-[75px] sm:max-w-none">{item.title.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const EarningOpportunitiesView: React.FC<EarningOpportunitiesViewProps> = ({
  isAdmin = false,
  userEmail,
}) => {
  const [data, setData] = useState<EarningOpportunitiesData>(() => loadEarningOpportunities());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EarningOpportunitiesData>(() => loadEarningOpportunities());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Interactivity states
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'core' | 'pools'>('all');
  const [detailModalItem, setDetailModalItem] = useState<EarningOpportunityItem | null>(null);

  // Sync data across tabs and storage events
  const refreshData = useCallback(() => {
    const loaded = loadEarningOpportunities();
    setData(loaded);
  }, []);

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('nexora_earning_opportunities_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('nexora_earning_opportunities_updated', handleUpdate);
    };
  }, [refreshData]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const startEditing = () => {
    if (!isAdmin) return;
    setEditForm(JSON.parse(JSON.stringify(data)));
    setValidationError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditForm(JSON.parse(JSON.stringify(data)));
    setValidationError(null);
    setIsEditing(false);
  };

  const resetToDefault = () => {
    setEditForm(JSON.parse(JSON.stringify(DEFAULT_EARNING_OPPORTUNITIES)));
    setValidationError(null);
  };

  const handleItemChange = (index: number, field: keyof EarningOpportunityItem, value: any) => {
    const updated = [...editForm.items];
    updated[index] = { ...updated[index], [field]: value };
    setEditForm({ ...editForm, items: updated });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editForm.items.length) return;
    const updated = [...editForm.items];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    // Re-number
    updated.forEach((item, idx) => {
      item.number = idx + 1;
    });
    setEditForm({ ...editForm, items: updated });
  };

  const addItem = () => {
    const nextNumber = editForm.items.length + 1;
    const newItem: EarningOpportunityItem = {
      id: `opportunity-${Date.now()}`,
      number: nextNumber,
      title: `Earning Stream ${nextNumber}`,
      description: 'Describe the qualification criteria, bonus structure, and earning potential.',
      accentColor: OPPORTUNITY_METAS[(nextNumber - 1) % 5 + 1].themeColor,
      iconName: 'TrendingUp',
    };
    setEditForm({
      ...editForm,
      items: [...editForm.items, newItem],
    });
  };

  const removeItem = (index: number) => {
    if (editForm.items.length <= 1) {
      setValidationError('At least one earning opportunity must be maintained.');
      return;
    }
    const updated = editForm.items.filter((_, idx) => idx !== index);
    updated.forEach((item, idx) => {
      item.number = idx + 1;
    });
    setEditForm({ ...editForm, items: updated });
  };

  const handleSave = async () => {
    if (!isAdmin) {
      showToast('Unauthorized: Only administrators can modify earning opportunities.', 'error');
      return;
    }

    const validation = validateEarningOpportunities(editForm);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please fill in all required fields.');
      showToast(validation.error || 'Validation error', 'error');
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      const res = await saveEarningOpportunitiesAdmin(editForm, userEmail || 'sivaji491@gmail.com');
      if (res.success && res.data) {
        setData(res.data);
        setIsEditing(false);
        showToast('Earning opportunities published successfully!', 'success');
      } else {
        setValidationError(res.error || 'Failed to save changes.');
        showToast(res.error || 'Save failed', 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error while saving.';
      setValidationError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Scroll to card and highlight when wheel segment is selected
  const handleSelectOpportunity = (item: EarningOpportunityItem) => {
    setSelectedOpportunityId(item.id);
    const element = document.getElementById(`card-${item.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Auto-clear active selection highlight after 4s
    setTimeout(() => {
      setSelectedOpportunityId((curr) => (curr === item.id ? null : curr));
    }, 4000);
  };

  // Filter items based on active category filter
  const displayedItems = useMemo(() => {
    if (activeFilter === 'core') {
      return data.items.filter((_, idx) => idx < 3);
    }
    if (activeFilter === 'pools') {
      return data.items.filter((_, idx) => idx >= 3);
    }
    return data.items;
  }, [data.items, activeFilter]);

  return (
    <div className="source-structure-page h-full min-h-0 max-h-full w-full flex flex-col text-slate-100 select-none box-border overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 backdrop-blur-md' 
              : 'bg-rose-950/90 text-rose-200 border-rose-500/50 backdrop-blur-md'
          }`}
          role="status"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb Bar */}
      <header className="px-3.5 py-1 sm:px-5 border-b border-white/10 bg-[#08121E]/95 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium" aria-label="Breadcrumb">
            <span className="hover:text-white transition-colors cursor-default">Business Plan</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-emerald-400 font-semibold">Earning Opportunities</span>
            <span className="text-slate-600 mx-0.5">·</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              Source Structure
            </span>
          </nav>

          {isAdmin && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    size="sm"
                    className="h-7 text-xs border-white/20 text-slate-300 hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={startEditing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm font-semibold text-xs px-3 py-1 h-7 flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-400/30"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Structure</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Dashboard Content */}
      {!isEditing ? (
        <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-3 py-1 sm:px-4 sm:py-1.5 box-border flex flex-col justify-start overflow-hidden gap-1.5 sm:gap-2">
          {/* Hero Section with Interactive 5-Segment Wheel Visualization */}
          <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0B1C2A]/95 via-[#071420]/90 to-[#040B13]/95 p-2 sm:p-2.5 shadow-lg backdrop-blur-xl shrink-0">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-teal-500/5 blur-3xl" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 items-center">
              {/* Left Column: Headlines, Ecosystem Stats & Context */}
              <div className="lg:col-span-7 space-y-1 sm:space-y-1.5">
                {/* Brand Eyebrow */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>IG INFRA ECOSYSTEM</span>
                </div>

                {/* Main Heading & Source Structure */}
                <div>
                  <h1 className="text-base sm:text-lg lg:text-[20px] font-extrabold text-white tracking-tight leading-tight">
                    Your Growth. <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Your Rewards.</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-300">{data.heading || 'Earning Opportunities'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      5 Earning Opportunities
                    </span>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-[10.5px] sm:text-[11px] text-slate-300 leading-snug max-w-lg">
                  {data.subtitle || 'IG Infra rewards your efforts with a multi-layered system built for financial freedom.'}
                </p>

                {/* Status Badges & Quick Stats */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-200 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>5 Earning Opportunities</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Framework</span>
                  </div>
                </div>

                {/* Ecosystem Info Bar */}
                <div className="pt-0.5">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] sm:text-[10.5px] text-slate-300 flex items-start gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <strong className="text-white">Multi-Layered Architecture:</strong> Click any segment on the diagram or cards below to inspect qualification criteria and reward pathways.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive 5-Segment Commission Visualization */}
              <div className="lg:col-span-5 flex justify-center">
                <CommissionWheel
                  items={data.items}
                  activeId={hoveredCardId || selectedOpportunityId}
                  onSelect={handleSelectOpportunity}
                />
              </div>
            </div>
          </section>

          {/* Opportunity Overview Header & Filter Controls */}
          <section className="flex flex-col justify-start space-y-1.5 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/10 pb-0.5 sm:pb-1">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Explore Your Earning Potential
                </h2>
                <p className="text-[9.5px] sm:text-[10px] text-slate-400">
                  Discover how each opportunity contributes to your growth journey.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="inline-flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Opportunities ({data.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('core')}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    activeFilter === 'core'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Core Matrix (3)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('pools')}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    activeFilter === 'pools'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pool Tiers (2)
                </button>
              </div>
            </div>

            {/* 5 Earning Opportunity Cards in Balanced Single-Row Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2">
              {displayedItems.map((item, idx) => {
                const meta = OPPORTUNITY_METAS[item.number || idx + 1] || OPPORTUNITY_METAS[1];
                const IconComponent = resolveOpportunityIcon(item.iconName);
                const formattedNumber = String(item.number || idx + 1).padStart(2, '0');
                const isHovered = hoveredCardId === item.id;
                const isSelected = selectedOpportunityId === item.id;

                let colSpanClass = 'col-span-1';
                if (displayedItems.length === 3) {
                  if (idx === 0) colSpanClass = 'lg:col-start-2 lg:col-span-1';
                } else if (displayedItems.length === 2) {
                  if (idx === 0) colSpanClass = 'lg:col-start-2 lg:col-span-1';
                  if (idx === 1) colSpanClass = 'lg:col-start-4 lg:col-span-1';
                }

                return (
                  <div
                    key={item.id || idx}
                    id={`card-${item.id}`}
                    onMouseEnter={() => setHoveredCardId(item.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    className={`group relative flex flex-col justify-between rounded-xl bg-[#0C1A27]/90 border transition-all duration-200 p-2 sm:p-2.5 backdrop-blur-md ${colSpanClass} ${
                      isHovered || isSelected
                        ? 'border-opacity-100 -translate-y-0.5 scale-[1.01] shadow-xl'
                        : 'border-white/10 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg'
                    }`}
                    style={{
                      borderColor: isHovered || isSelected ? meta.themeColor : 'rgba(255, 255, 255, 0.1)',
                      boxShadow: isHovered || isSelected 
                        ? `0 10px 20px -6px rgba(0,0,0,0.7), 0 0 14px -2px ${meta.glowColor}` 
                        : '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {/* Top Accent Gradient Border */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 rounded-t-xl transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(90deg, ${meta.themeColor}, ${meta.themeSecondary})`,
                        opacity: isHovered || isSelected ? 1 : 0.75,
                      }}
                    />

                    <div>
                      {/* Card Top Row: Gradient Icon Container & Badges */}
                      <div className="flex items-center justify-between mb-1">
                        <div 
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform duration-300"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${meta.themeColor}33, ${meta.themeSecondary}11)`,
                            borderColor: `${meta.themeColor}55`,
                            color: meta.themeColor,
                            boxShadow: `0 2px 6px ${meta.glowColor}`,
                          }}
                        >
                          <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2]" />
                        </div>

                        <div className="flex items-center gap-1">
                          <span 
                            className="text-[8.5px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded-full border tracking-wide"
                            style={{
                              backgroundColor: meta.badgeBg,
                              color: meta.badgeText,
                              borderColor: meta.badgeBorder,
                            }}
                          >
                            {meta.category}
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] font-bold font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10">
                            {formattedNumber}
                          </span>
                        </div>
                      </div>

                      {/* Opportunity Title */}
                      <h3 className="earning-card-title text-[13.5px] sm:text-[13px] md:text-[13.5px] lg:text-[12.5px] xl:text-[13.5px] 2xl:text-[14px] font-bold text-white tracking-tight leading-snug mb-1 group-hover:text-white transition-colors line-clamp-2 min-h-[2.4rem] sm:min-h-[2.5rem] lg:min-h-[2.25rem] xl:min-h-[2.5rem] flex items-center">
                        {item.title}
                      </h3>

                      {/* Complete Description */}
                      <p className="text-[9.5px] sm:text-[10px] text-slate-300 leading-tight font-normal line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {/* Card Footer: Active Status & View Details Action */}
                    <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Tier
                      </span>

                      <button
                        type="button"
                        onClick={() => setDetailModalItem(item)}
                        className="inline-flex items-center gap-0.5 font-semibold group-hover:translate-x-0.5 transition-all duration-200 cursor-pointer bg-transparent border-0 p-0 text-[10.5px]"
                        style={{ color: meta.themeColor }}
                      >
                        <span>View Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      ) : (
        /* Admin Edit Mode Panel */
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 box-border overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="bg-[#0B1A28] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Edit Commission Structure</h2>
                  <p className="text-xs text-slate-400">Update page title, subtitle, and opportunity card content.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="text-xs text-slate-400 hover:text-white hover:bg-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Defaults
              </Button>
            </div>

            {validationError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}

            {/* General Header Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Page Heading <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={editForm.heading}
                  onChange={(e) => setEditForm({ ...editForm, heading: e.target.value })}
                  placeholder="Source Structure"
                  className="bg-[#07131F] border-white/15 text-white text-sm focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subtitle Description
                </label>
                <Input
                  type="text"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                  placeholder="IG Infra rewards your efforts with a multi-layered system..."
                  className="bg-[#07131F] border-white/15 text-white text-sm focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Opportunities List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Opportunity Cards ({editForm.items.length})
                </h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={addItem}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Opportunity
                </Button>
              </div>

              {editForm.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-5 rounded-2xl bg-[#071421] border border-white/10 space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        Opportunity #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveItem(idx, 'down')}
                        disabled={idx === editForm.items.length - 1}
                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                        disabled={editForm.items.length <= 1}
                        className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-30"
                        title="Remove Opportunity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Title <span className="text-rose-400">*</span>
                      </label>
                      <Input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                        placeholder="Opportunity Title"
                        className="bg-[#0B1927] border-white/15 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Icon Preset
                      </label>
                      <select
                        value={item.iconName || 'TrendingUp'}
                        onChange={(e) => handleItemChange(idx, 'iconName', e.target.value)}
                        className="w-full h-9 rounded-md border border-white/15 bg-[#0B1927] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Network">Network / Matrix (01)</option>
                        <option value="Handshake">Handshake (02)</option>
                        <option value="Award">Award / Medal (03)</option>
                        <option value="Trophy">Trophy / Bonanza (04)</option>
                        <option value="Globe">Globe / Worldwide Pool (05)</option>
                        <option value="Users">Users / Team</option>
                        <option value="TrendingUp">Trending Up</option>
                        <option value="Coins">Coins</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Description <span className="text-rose-400">*</span>
                    </label>
                    <Textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Brief descriptive copy..."
                      className="bg-[#0B1927] border-white/15 text-white text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-6 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={isSaving}
                className="border-white/15 text-slate-300 hover:bg-white/5 text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 rounded-lg flex items-center gap-1.5 font-medium shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </main>
      )}

      {/* Presentation-Quality Detail Experience Modal (Section 10) */}
      {detailModalItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDetailModalItem(null)}
          role="dialog"
          aria-modal="true"
        >
          {(() => {
            const meta = OPPORTUNITY_METAS[detailModalItem.number || 1] || OPPORTUNITY_METAS[1];
            const IconComp = resolveOpportunityIcon(detailModalItem.iconName);
            const formattedNumber = String(detailModalItem.number || 1).padStart(2, '0');

            return (
              <div 
                className="relative w-full max-w-lg rounded-3xl bg-[#091522] border border-white/15 p-6 sm:p-8 shadow-2xl text-white space-y-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${meta.themeColor}33, ${meta.themeSecondary}11)`,
                        borderColor: `${meta.themeColor}66`,
                        color: meta.themeColor,
                        boxShadow: `0 4px 16px ${meta.glowColor}`,
                      }}
                    >
                      <IconComp className="w-7 h-7 stroke-[2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: meta.badgeBg,
                            color: meta.badgeText,
                            borderColor: meta.badgeBorder,
                          }}
                        >
                          {meta.category}
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                          {formattedNumber}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                        {detailModalItem.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailModalItem(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Description */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-200 leading-relaxed">
                  {detailModalItem.description}
                </div>

                {/* Framework Details Specs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Reward Structure</span>
                    <strong className="text-white block font-semibold">{meta.rewardType}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Qualification Rule</span>
                    <strong className="text-white block font-semibold">{meta.qualification}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Settlement Engine</span>
                    <strong className="text-emerald-400 block font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Smart Protocol
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Tier Distribution</span>
                    <strong className="text-white block font-semibold">{meta.distribution}</strong>
                  </div>
                </div>

                {/* Close Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setDetailModalItem(null)}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-5 py-2 rounded-xl border border-white/15 cursor-pointer font-semibold"
                  >
                    Close Window
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
