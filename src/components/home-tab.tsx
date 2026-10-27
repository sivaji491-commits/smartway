import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  MapPin, 
  TreePine, 
  Compass, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Coins, 
  Sparkles, 
  Layers, 
  Eye, 
  Scale, 
  Info, 
  ChevronRight, 
  Home as HomeIcon,
  X,
  ExternalLink,
  Award,
  TrendingUp,
  FileText,
  Users,
  Edit3,
  Upload,
  Save,
  Send,
  Star,
  ArrowLeft,
  ChevronLeft,
  User,
  UserPlus,
  Menu,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loadRankCalculatorState } from '@/lib/rank-storage';
import { computeRankTotals } from '@/lib/rank-calculator-engine';
import { ComputedRankItem, RankCalculatorState, RankItem } from '@/types/rank-calculator';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { HomePageData, DEFAULT_HOME_PAGE_DATA } from '@/types/home-page';
import { HomeScrollingMarquee, DEFAULT_MARQUEE_TEXT } from './home/HomeScrollingMarquee';
import { 
  loadPublishedHomePage, 
  loadDraftHomePage, 
  saveDraftHomePage, 
  publishHomePage,
  updateRankConfigAdmin
} from '@/lib/home-page-storage';
import { HomePageAdminEditor } from '@/components/home/HomePageAdminEditor';

interface HomeTabProps {
  userEmail?: string | null | undefined;
  onNavigateToTab?: ((tabId: string) => void) | undefined;
  onNavigateToStatus?: (() => void) | undefined;
}

export function HomeTab({ userEmail, onNavigateToTab }: HomeTabProps) {
  // Authorization
  const isAdmin = isUserAdminOrOwner(userEmail, 'sivaji491@gmail.com');

  // Published & Live Data
  const [publishedData, setPublishedData] = useState<HomePageData>(() => loadPublishedHomePage());
  const [calcState, setCalcState] = useState<RankCalculatorState>(() => loadRankCalculatorState());

  // Admin Editing & Preview States
  const [isEditing, setIsEditing] = useState(false);
  const [editingTab, setEditingTab] = useState<'content' | 'plots' | 'apartments' | 'ranks'>('content');
  const [previewData, setPreviewData] = useState<HomePageData | null>(null);
  const [previewRanks, setPreviewRanks] = useState<RankItem[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal inspection for rank cards
  const [selectedRankForModal, setSelectedRankForModal] = useState<ComputedRankItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Hero Carousel State (Slide 1: Business Intro, Slide 2: Plot Opportunity, Slide 3: Flat Opportunity)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Top Navigation Bar State (Matches Reference Design)
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('home');

  // Auto-advance slides smoothly every 5.5s (unless paused on hover/touch or user prefers reduced motion)
  useEffect(() => {
    if (isCarouselPaused) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5500);

    return () => clearInterval(timer);
  }, [isCarouselPaused]);

  const nextSlide = useCallback(() => setCurrentSlide((prev) => (prev + 1) % 3), []);
  const prevSlide = useCallback(() => setCurrentSlide((prev) => (prev - 1 + 3) % 3), []);
  const goToSlide = useCallback((index: number) => setCurrentSlide(index), []);

  // Touch handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null && touchEndX !== null) {
      const distance = touchStartX - touchEndX;
      const minSwipeDistance = 45;
      if (distance > minSwipeDistance) {
        nextSlide();
      } else if (distance < -minSwipeDistance) {
        prevSlide();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Reload published home page & rank data on storage events
  const reloadData = useCallback(() => {
    try {
      const liveHome = loadPublishedHomePage();
      setPublishedData(liveHome);
      const liveRanks = loadRankCalculatorState();
      setCalcState(liveRanks);
    } catch {
      // Keep existing state if parse fails
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', reloadData);
      window.addEventListener('nexora_home_page_published', reloadData);
      window.addEventListener('nexora_ranks_updated', reloadData);
      return () => {
        window.removeEventListener('storage', reloadData);
        window.removeEventListener('nexora_home_page_published', reloadData);
        window.removeEventListener('nexora_ranks_updated', reloadData);
      };
    }
  }, [reloadData]);

  // Active dataset: uses previewData if in preview mode, else publishedData
  const activeData = previewData || publishedData;
  const activeRanks = previewRanks || calcState.ranks || [];
  const exchangeRate = calcState.currency?.exchangeRateUSDToINR || 100;

  const computedRanks = computeRankTotals(activeRanks, exchangeRate);

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const scrollToSection = (sectionId: string) => {
    const target = sectionId === 'flats-section' ? 'plots-section' : sectionId;
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreBusinessPlan = (targetLink?: string) => {
    const link = targetLink || activeData.hero.primaryButtonLink || 'earning-opportunities';
    if (link === 'plots-section' || link === 'flats-section') {
      scrollToSection(link);
    } else if (onNavigateToTab) {
      onNavigateToTab(link);
    } else {
      scrollToSection('how-it-works-section');
    }
  };

  // --- Admin Workflow Handlers ---
  const handleOpenEditor = (tab: 'content' | 'plots' | 'apartments' | 'ranks' = 'content') => {
    if (!isAdmin) return;
    setEditingTab(tab);
    setIsEditing(true);
    setPreviewData(null);
  };

  const handleSaveDraft = (draft: HomePageData, updatedRanks: RankItem[]) => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const res = saveDraftHomePage(draft, userEmail || 'sivaji491@gmail.com');
      const rankRes = updateRankConfigAdmin(updatedRanks, userEmail || 'sivaji491@gmail.com');
      
      if (!res.success) {
        setNotification({ type: 'error', message: res.error || 'Failed to save draft.' });
      } else if (!rankRes.success) {
        setNotification({ type: 'error', message: rankRes.error || 'Failed to update ranks.' });
      } else {
        setNotification({ type: 'success', message: 'Changes saved as draft. Preview or Publish when ready.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'An unexpected error occurred while saving draft.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (draft: HomePageData, updatedRanks: RankItem[]) => {
    if (!isAdmin) return;
    setIsSaving(true);
    try {
      const res = await publishHomePage(draft, userEmail || 'sivaji491@gmail.com');
      const rankRes = updateRankConfigAdmin(updatedRanks, userEmail || 'sivaji491@gmail.com');

      if (!res.success) {
        setNotification({ type: 'error', message: res.error || 'Validation failed.' });
      } else if (!rankRes.success) {
        setNotification({ type: 'error', message: rankRes.error || 'Failed to update ranks.' });
      } else {
        setPublishedData(res.data || draft);
        setIsEditing(false);
        setPreviewData(null);
        setPreviewRanks(null);
        setNotification({ type: 'success', message: 'Home Page published successfully! Your updates are now live.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to publish changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = (draft: HomePageData, updatedRanks: RankItem[]) => {
    if (!isAdmin) return;
    setPreviewData(draft);
    setPreviewRanks(updatedRanks);
    setIsEditing(false);
  };

  const handleExitPreview = () => {
    setPreviewData(null);
    setPreviewRanks(null);
    setIsEditing(true);
  };

  const handleDirectPublishFromPreview = async () => {
    if (!previewData || !isAdmin) return;
    await handlePublish(previewData, previewRanks || calcState.ranks);
  };

  // --- Render Admin Editor Panel if editing ---
  if (isEditing && isAdmin) {
    return (
      <HomePageAdminEditor
        initialData={loadDraftHomePage()}
        initialRanks={calcState.ranks || []}
        exchangeRate={exchangeRate}
        adminEmail={userEmail || 'sivaji491@gmail.com'}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onPreview={handlePreview}
        onCancel={() => setIsEditing(false)}
        isSaving={isSaving}
        activeTab={editingTab}
      />
    );
  }

  return (
    <div className="min-h-full w-full bg-slate-50 text-slate-800 font-['Inter',system-ui,sans-serif] selection:bg-emerald-500/30 selection:text-slate-900">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold animate-in slide-in-from-top-4 duration-200 ${
            notification.type === 'success' 
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50 backdrop-blur-md' 
              : 'bg-rose-950/95 text-rose-200 border-rose-500/50 backdrop-blur-md'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Preview Banner when in Preview Mode */}
      {previewData && (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-900/90 via-slate-900/95 to-amber-900/90 border-b border-amber-500/40 px-4 py-2.5 backdrop-blur-md flex items-center justify-between text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <strong className="text-amber-300 font-bold uppercase tracking-wider">PREVIEW MODE:</strong>
            <span className="text-slate-200">You are reviewing un-published draft changes.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExitPreview}
              className="h-7 text-xs border-white/20 bg-white/10 hover:bg-white/20 text-white"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              <span>Back to Editor</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDirectPublishFromPreview}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Send className="w-3 h-3 mr-1" />
              <span>Publish Now</span>
            </Button>
          </div>
        </div>
      )}

      {/* Admin Dashboard Quick Access Bar (Visible only to authorized Admin/Owner users) */}
      {isAdmin && !previewData && (
        <div className="bg-[#0A1727] border-b border-white/10 px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ADMIN PANEL
            </span>
            <span className="text-slate-400 hidden sm:inline">Real Estate Home Page Management</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditor('content')}
              className="h-7 text-[11px] border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <Edit3 className="w-3 h-3 mr-1 text-emerald-400" />
              <span>Edit Home Page</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditor('plots')}
              className="h-7 text-[11px] border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <MapPin className="w-3 h-3 mr-1 text-teal-400" />
              <span>Manage Plot Images</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditor('apartments')}
              className="h-7 text-[11px] border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <Building2 className="w-3 h-3 mr-1 text-cyan-400" />
              <span>Manage Flat Images</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditor('content')}
              className="h-7 text-[11px] border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <FileText className="w-3 h-3 mr-1 text-indigo-400" />
              <span>Manage Home Page Content</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditor('ranks')}
              className="h-7 text-[11px] border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
            >
              <Award className="w-3 h-3 mr-1 text-amber-400" />
              <span>Edit Ranks & Prices</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenEditor('content')}
              className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <Send className="w-3 h-3 mr-1" />
              <span>Publish Changes</span>
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          1. PROFESSIONAL TOP NAVIGATION BAR (Matches Reference Design)
          ========================================================================= */}
      <nav className="relative z-30 w-full bg-[#071526] border-b border-white/10 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between">
          {/* Brand Logo with IG INFRAS stylized mark */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => {
              setActiveNav('home');
              scrollToSection('home-hero-carousel');
            }}
            role="button"
            tabIndex={0}
            aria-label="IG INFRAS - Home"
          >
            {/* Stylized Roof / House Icon matching screenshot */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-400 transition-colors">
              <svg 
                className="w-5 h-5 text-emerald-400" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 10.5L12 3l9 7.5" />
                <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                <path d="M9 21V12h6v9" />
              </svg>
            </div>
            <div className="flex items-baseline tracking-tight">
              <span className="font-extrabold text-xl text-emerald-400">iG</span>
              <span className="font-extrabold text-xl text-white ml-1 tracking-wider">INFRAS</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm">
            <button
              type="button"
              onClick={() => {
                setActiveNav('home');
                scrollToSection('home-hero-carousel');
              }}
              className={cn(
                "relative py-1.5 font-medium transition-colors cursor-pointer",
                activeNav === 'home' 
                  ? "text-emerald-400 font-semibold" 
                  : "text-slate-300 hover:text-white"
              )}
            >
              <span>Home</span>
              {activeNav === 'home' && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-emerald-400 rounded-full shadow-xs shadow-emerald-400/50" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNav('about');
                scrollToSection('philosophy-section');
              }}
              className={cn(
                "relative py-1.5 font-medium transition-colors cursor-pointer",
                activeNav === 'about' ? "text-emerald-400 font-semibold" : "text-slate-300 hover:text-white"
              )}
            >
              <span>About Us</span>
              {activeNav === 'about' && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNav('business-plan');
                handleExploreBusinessPlan('earning-opportunities');
              }}
              className={cn(
                "relative py-1.5 font-medium transition-colors cursor-pointer",
                activeNav === 'business-plan' ? "text-emerald-400 font-semibold" : "text-slate-300 hover:text-white"
              )}
            >
              <span>Business Plan</span>
              {activeNav === 'business-plan' && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNav('plots-flats');
                scrollToSection('plots-section');
              }}
              className={cn(
                "relative py-1.5 font-medium transition-colors cursor-pointer",
                activeNav === 'plots-flats' ? "text-emerald-400 font-semibold" : "text-slate-300 hover:text-white"
              )}
            >
              <span>Plots &amp; Flats</span>
              {activeNav === 'plots-flats' && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNav('ecosystem');
                scrollToSection('how-it-works-section');
              }}
              className={cn(
                "relative py-1.5 font-medium transition-colors cursor-pointer",
                activeNav === 'ecosystem' ? "text-emerald-400 font-semibold" : "text-slate-300 hover:text-white"
              )}
            >
              <span>Our Ecosystem</span>
              {activeNav === 'ecosystem' && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNav('contact');
                scrollToSection('final-cta-section');
              }}
              className={cn(
                "relative py-1.5 font-medium transition-colors cursor-pointer",
                activeNav === 'contact' ? "text-emerald-400 font-semibold" : "text-slate-300 hover:text-white"
              )}
            >
              <span>Contact</span>
              {activeNav === 'contact' && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Desktop Action Buttons: Login & Register */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/auth';
              }}
              className="rounded-full border border-slate-600/70 hover:border-slate-400 bg-white/5 hover:bg-white/10 text-slate-200 px-4 py-1.5 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
              aria-label="User Login"
            >
              <User className="w-3.5 h-3.5 text-slate-300" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/auth?mode=register';
              }}
              className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer hover:shadow-emerald-500/25"
              aria-label="Register New Account"
            >
              <UserPlus className="w-3.5 h-3.5 text-white" />
              <span>Register</span>
            </button>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#061221] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('home');
                  setMobileNavOpen(false);
                  scrollToSection('home-hero-carousel');
                }}
                className={cn(
                  "text-left py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeNav === 'home' ? "bg-emerald-500/15 text-emerald-400 font-semibold" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('about');
                  setMobileNavOpen(false);
                  scrollToSection('philosophy-section');
                }}
                className={cn(
                  "text-left py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeNav === 'about' ? "bg-emerald-500/15 text-emerald-400 font-semibold" : "text-slate-300 hover:bg-white/5"
                )}
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('business-plan');
                  setMobileNavOpen(false);
                  handleExploreBusinessPlan('earning-opportunities');
                }}
                className={cn(
                  "text-left py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeNav === 'business-plan' ? "bg-emerald-500/15 text-emerald-400 font-semibold" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Business Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('plots-flats');
                  setMobileNavOpen(false);
                  scrollToSection('plots-section');
                }}
                className={cn(
                  "text-left py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeNav === 'plots-flats' ? "bg-emerald-500/15 text-emerald-400 font-semibold" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Plots &amp; Flats
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('ecosystem');
                  setMobileNavOpen(false);
                  scrollToSection('how-it-works-section');
                }}
                className={cn(
                  "text-left py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeNav === 'ecosystem' ? "bg-emerald-500/15 text-emerald-400 font-semibold" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Our Ecosystem
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('contact');
                  setMobileNavOpen(false);
                  scrollToSection('final-cta-section');
                }}
                className={cn(
                  "text-left py-2 px-3 rounded-lg transition-colors cursor-pointer",
                  activeNav === 'contact' ? "bg-emerald-500/15 text-emerald-400 font-semibold" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Contact
              </button>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.href = '/auth';
                }}
                className="flex-1 rounded-full border border-slate-600/70 bg-white/5 text-slate-200 py-2 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-slate-300" />
                <span>Login</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.href = '/auth?mode=register';
                }}
                className="flex-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
                <span>Register</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* =========================================================================
          CONTINUOUS SCROLLING MARQUEE ANNOUNCEMENT
          ========================================================================= */}
      <HomeScrollingMarquee text={activeData.marqueeText || DEFAULT_MARQUEE_TEXT} />

      {/* =========================================================================
          2. HERO SECTION — THREE-SLIDE REAL ESTATE HERO CAROUSEL (Matches Reference Screenshot)
          ========================================================================= */}
      <section 
        id="home-hero-carousel"
        className="relative overflow-hidden border-b border-white/10 select-none bg-[#071526]"
        aria-label="Real Estate Opportunities Carousel"
        role="region"
        aria-roledescription="carousel"
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="home-hero-carousel"
      >
        {/* Desktop/Tablet Left & Right Chevron Arrows */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          className="hidden md:flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-white items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg hover:scale-105"
        >
          <ChevronLeft className="w-5 h-5 text-white/90" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="hidden md:flex absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-white items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg hover:scale-105"
        >
          <ChevronRight className="w-5 h-5 text-white/90" />
        </button>

        {/* Carousel Slide Container */}
        <div className="relative z-10 w-full min-h-[380px] sm:min-h-[420px] lg:min-h-[440px] flex items-center">
          
          {/* ===================================================================
              SLIDE 1 — BUSINESS INTRODUCTION (Exact Reference Screenshot Match)
              =================================================================== */}
          <div 
            className={cn(
              "w-full transition-all duration-700 ease-in-out",
              currentSlide === 0
                ? "opacity-100 z-10 translate-y-0"
                : "opacity-0 z-0 pointer-events-none absolute translate-y-2"
            )}
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 1 of 3: Business Introduction"
            aria-hidden={currentSlide !== 0}
            data-testid="hero-slide-0"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-7">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 max-w-6xl mx-auto">
                {/* Text & Action Column (Left) */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                  {/* Badges Container */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-2.5">
                    {/* Real Estate Opportunity Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-[#0F2942] text-xs font-bold tracking-tight shadow-md">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>Earn as soon as possible</span>
                    </div>

                    {/* Ecosystem & Informed Decisions Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#071F2C]/80 border border-teal-500/40 text-teal-300 text-xs font-semibold tracking-wide shadow-sm backdrop-blur-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>TRANSPARENT REAL ESTATE BUSINESS ECOSYSTEM</span>
                      <span className="text-teal-500/50">|</span>
                      <span className="text-slate-300 font-normal">INFORMED DECISIONS FIRST</span>
                    </div>
                  </div>

                  {/* Large Bold Headline */}
                  <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-2 max-w-5xl">
                    <span className="hero-golden-headline">{activeData.hero.headline}</span>
                  </h1>

                  {/* Supporting Headline with green teal gradient accent */}
                  <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300">
                      {activeData.hero.highlightHeadline}
                    </span>
                  </p>

                  {/* Supporting Paragraph */}
                  <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed mb-4 sm:mb-6 max-w-xl">
                    {activeData.hero.subtitle}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 mb-2">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => handleExploreBusinessPlan(activeData.hero.primaryButtonLink)}
                      className="bg-[#059669] hover:bg-[#10B981] text-white font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span>{activeData.hero.primaryButtonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => scrollToSection(activeData.hero.secondaryButtonLink || 'plots-section')}
                      className="bg-[#081C30]/80 hover:bg-[#0E2844] text-slate-100 font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span>{activeData.hero.secondaryButtonText}</span>
                    </Button>
                  </div>
                </div>

                {/* Prominent Visible Plot Image Element (Right Column) */}
                <div className="w-full sm:w-[90%] lg:w-[48%] shrink-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 aspect-[16/10] group">
                    <img 
                      src="/images/home-hero/slide-plot.png" 
                      alt="Master-planned residential plots and avenue layouts"
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/customer-view/hero-real-estate.jpg';
                      }}
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              SLIDE 2 — PLOT OPPORTUNITY
              =================================================================== */}
          <div 
            className={cn(
              "w-full transition-all duration-700 ease-in-out",
              currentSlide === 1
                ? "opacity-100 z-10 translate-y-0"
                : "opacity-0 z-0 pointer-events-none absolute translate-y-2"
            )}
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 2 of 3: Plot Opportunity"
            aria-hidden={currentSlide !== 1}
            data-testid="hero-slide-1"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-7">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 max-w-6xl mx-auto">
                {/* Text & Action Column */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                  {/* Real Estate Opportunity Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-[#0F2942] text-xs font-bold tracking-tight mb-2.5 shadow-md">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span>Earn as soon as possible</span>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
                    <span>Explore Your</span>{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 bg-clip-text text-transparent">
                      Plot Opportunity
                    </span>
                  </h2>

                  {/* Supporting Text */}
                  <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed mb-3.5 max-w-lg">
                    Discover master-planned residential plots with clear demarcations, wide paved avenues, and transparent pathways to own land through our business plan.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 mb-3.5">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => handleExploreBusinessPlan(activeData.hero.primaryButtonLink)}
                      className="bg-[#059669] hover:bg-[#10B981] text-white font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span>Explore the Business Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => scrollToSection('plots-section')}
                      className="bg-[#081C30]/80 hover:bg-[#0E2844] text-slate-100 font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <TreePine className="w-4 h-4 text-emerald-400" />
                      <span>View Plots &amp; Flats</span>
                    </Button>
                  </div>

                  {/* Plot Opportunity Highlights */}
                  <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Planned Demarcations</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Clear Documentation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Prime Location Access</span>
                    </div>
                  </div>
                </div>

                {/* Prominent Visible Plot Image Element */}
                <div className="w-full sm:w-[90%] lg:w-[48%] shrink-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 aspect-[16/10] group">
                    <img 
                      src="/images/home-hero/slide-plot.png" 
                      alt="Master-planned residential plots and avenue layouts"
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/customer-view/hero-real-estate.jpg';
                      }}
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              SLIDE 3 — FLAT OPPORTUNITY
              =================================================================== */}
          <div 
            className={cn(
              "w-full transition-all duration-700 ease-in-out",
              currentSlide === 2
                ? "opacity-100 z-10 translate-y-0"
                : "opacity-0 z-0 pointer-events-none absolute translate-y-2"
            )}
            role="group"
            aria-roledescription="slide"
            aria-label="Slide 3 of 3: Flat Opportunity"
            aria-hidden={currentSlide !== 2}
            data-testid="hero-slide-2"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-7">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 max-w-6xl mx-auto">
                {/* Text & Action Column */}
                <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                  {/* Eyebrow Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide mb-2.5 shadow-sm">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>CONTEMPORARY RESIDENTIAL LIVING</span>
                    <span className="text-teal-500/50">·</span>
                    <span className="text-slate-300 font-normal">LUXURY INTERIORS</span>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
                    <span>Discover Your</span>{' '}
                    <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                      Dream Flat
                    </span>
                  </h2>

                  {/* Supporting Text */}
                  <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed mb-3.5 max-w-lg">
                    Step into modern, thoughtfully designed luxury flats with world-class amenities, premium finishes, and transparent paths to ownership through our business plan.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 mb-3.5">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => handleExploreBusinessPlan(activeData.hero.primaryButtonLink)}
                      className="bg-[#059669] hover:bg-[#10B981] text-white font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <span>Explore the Business Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => scrollToSection('plots-section')}
                      className="bg-[#081C30]/80 hover:bg-[#0E2844] text-slate-100 font-semibold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>View Plots &amp; Flats</span>
                    </Button>
                  </div>

                  {/* Flat Opportunity Highlights */}
                  <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Modern Architecture</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Gated Community Security</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Verified Construction Quality</span>
                    </div>
                  </div>
                </div>

                {/* Prominent Visible Flat Interior Image Element */}
                <div className="w-full sm:w-[90%] lg:w-[48%] shrink-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 aspect-[16/10] group">
                    <img 
                      src="/images/home-hero/slide-flat.jpg" 
                      alt="Contemporary luxury flat interior with modern living and dining spaces"
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Trust & Information Strip (Horizontal Strip matching reference design) */}
        <div className="relative z-20 border-t border-white/10 bg-[#061220]/85 backdrop-blur-md py-2.5 sm:py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* 4 Trust Feature Items */}
            <div className="w-full md:w-auto grid grid-cols-2 md:flex md:items-center gap-3 md:gap-7 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-medium whitespace-nowrap">100% Transparent Review</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium whitespace-nowrap">No Pressure Evaluation</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium whitespace-nowrap">Dynamic Rank Pricing</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-medium whitespace-nowrap">Independent Decision Making</span>
              </div>
            </div>

            {/* Carousel Indicators (Pills & Dots) */}
            <div 
              className="flex items-center gap-2 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 shrink-0"
              role="tablist"
              aria-label="Slide Selection"
            >
              {[0, 1, 2].map((idx) => {
                const labels = ['Business Plan', 'Plot Opportunity', 'Flat Opportunity'];
                const isActive = currentSlide === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center",
                      isActive
                        ? "w-7 sm:w-8 bg-emerald-400 shadow-xs shadow-emerald-400/50"
                        : "w-2 bg-white/40 hover:bg-white/70"
                    )}
                    aria-label={`Go to slide ${idx + 1}: ${labels[idx]}`}
                    aria-current={isActive ? 'true' : 'false'}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BUSINESS PHILOSOPHY SECTION
          ========================================================================= */}
      <section id="philosophy-section" className="w-full bg-white py-5 sm:py-6 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-4.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Core Philosophy</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B2545] tracking-tight">
              {activeData.philosophy.heading}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              {activeData.philosophy.subtitle}
            </p>
          </div>

          {/* 3 Philosophy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {activeData.philosophy.cards.map((card, idx) => (
              <div 
                key={card.id || idx}
                className="relative group rounded-2xl bg-gradient-to-b from-[#0C1E30]/90 to-[#071524]/90 border border-white/10 p-3.5 sm:p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/30"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-2.5 group-hover:scale-105 transition-transform">
                  {idx === 0 ? <ShieldCheck className="w-5 h-5 stroke-[2]" /> : idx === 1 ? <Layers className="w-5 h-5 stroke-[2]" /> : <Scale className="w-5 h-5 stroke-[2]" />}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {card.description}
                </p>
                <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{card.highlight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. PREMIUM PLOTS GALLERY
          ========================================================================= */}
      <section id="plots-section" className="w-full py-5 sm:py-6 bg-[#F8FAFC] border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-3 sm:mb-4.5 gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Planned Layouts</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B2545] tracking-tight">
                Explore Residential Plot Opportunities
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                Discover master-planned layouts featuring paved avenues, green landscaping, clear demarcation, and community infrastructure.
              </p>
            </div>
            <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-2xs self-start md:self-auto">
              Visual architectural examples shown for concept clarity
            </div>
          </div>

          {/* Plot Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {activeData.plots.map((plot) => (
              <div 
                key={plot.id}
                className="group rounded-2xl bg-[#091827] border border-white/10 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-2xl flex flex-col justify-between"
              >
                <div>
                  {/* Image Container with Fallback */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                    {!imageErrors[plot.id] ? (
                      <img 
                        src={plot.imageUrl} 
                        alt={plot.title}
                        onError={() => handleImageError(plot.id)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 to-slate-900 p-4 text-center">
                        <TreePine className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
                        <span className="text-xs font-semibold text-slate-300">{plot.title}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-[#071320]/80 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      {plot.category}
                    </div>
                    {plot.featured && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-bold text-[9.5px] px-2 py-0.5 rounded shadow flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Featured</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9.5px] font-medium text-slate-300">
                      {plot.tag || 'Illustrative Example'}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 sm:p-4">
                    <h3 className="text-base font-bold text-white mb-1.5 leading-snug group-hover:text-emerald-300 transition-colors">
                      {plot.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      {plot.description}
                    </p>

                    {/* Features Badges */}
                    {Array.isArray(plot.features) && plot.features.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Infrastructure Highlights
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {plot.features.map((feat, i) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200"
                            >
                              <span className="w-1 h-1 rounded-full bg-emerald-400" />
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 pt-0">
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Planned Demarcation
                    </span>
                    <span className="text-[11px] font-semibold text-slate-300">Phase Layout</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HOW THE BUSINESS PLAN WORKS
          ========================================================================= */}
      <section id="how-it-works-section" className="w-full py-5 sm:py-6 bg-[#F8FAFC] border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-4.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Structured Roadmap</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B2545] tracking-tight">
              {activeData.howItWorks.heading}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              {activeData.howItWorks.subtitle}
            </p>
          </div>

          {/* 5-Step Process Timeline */}
          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-12 right-12 h-0.5 bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-amber-500/40 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 relative z-10">
              {activeData.howItWorks.steps.map((st, i) => (
                <div 
                  key={st.id || i}
                  className="flex flex-col items-start lg:items-center text-left lg:text-center p-3 sm:p-3.5 rounded-2xl bg-[#091827] border border-white/10 shadow-lg group hover:border-emerald-500/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center font-bold text-sm mb-2 shadow-sm group-hover:scale-110 transition-transform">
                    {String(st.stepNumber || i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">{st.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {st.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Disclosure Note */}
          <div className="mt-3.5 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-600 text-center max-w-3xl mx-auto shadow-2xs">
            <span>{activeData.howItWorks.disclaimer || 'Note: Selecting or reviewing any rank does not imply guaranteed income, automated earnings, or property ownership. All outcomes require individual active effort and compliance with plan conditions.'}</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. RANK & PRICE PREVIEW
          ========================================================================= */}
      <section id="ranks-preview-section" className="w-full bg-white py-5 sm:py-6 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-3 sm:mb-4.5 gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>Transparent Pricing</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B2545] tracking-tight">
                Explore Available Ranks
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                Review our live configured rank hierarchy and transparent prices. Reviewing a rank is purely informational and commits you to nothing.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs self-start md:self-auto">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Exchange Reference: <strong>₹{exchangeRate.toFixed(2)}/USD</strong></span>
            </div>
          </div>

          {/* Dynamic Ranks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {computedRanks.map((rank, idx) => (
              <div 
                key={rank.id || idx}
                className="group rounded-2xl bg-[#091827] border border-white/10 p-3 sm:p-3.5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                        {String(rank.serialNumber || idx + 1).padStart(2, '0')}
                      </div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Level {rank.serialNumber || idx + 1}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      Active Tier
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {rank.name}
                  </h3>

                  <div className="space-y-1 mb-2.5 p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Base Price:</span>
                      <strong className="text-white font-mono">${rank.basePrice.toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Gas Fee ({rank.networkFeePercent}%):</span>
                      <span className="text-slate-300 font-mono">+${rank.networkFeeUSD.toLocaleString()}</span>
                    </div>
                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Total with Gas:</span>
                      <strong className="text-emerald-400 font-bold font-mono text-sm">
                        ${rank.totalRankCostUSD.toLocaleString()}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>INR Equivalent:</span>
                      <span className="font-mono text-slate-300">₹{(rank.totalRankCostUSD * exchangeRate).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRankForModal(rank)}
                    className="w-full h-7.5 text-xs font-semibold border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Details</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Commitment-Free Notice */}
          <div className="mt-3 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Reviewing rank costs does not commit you to purchasing or joining. All calculations are real-time and orderwise.</span>
            </div>

            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('ranks')}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <span>Open Full Rank Calculator</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FINAL CALL-TO-ACTION SECTION
          ========================================================================= */}
      <section id="final-cta-section" className="relative overflow-hidden py-6 sm:py-7 lg:py-8 border-t border-white/10 bg-gradient-to-b from-[#081524] to-[#040C16]">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url(${activeData.hero.heroBgImage || DEFAULT_HOME_PAGE_DATA.hero.heroBgImage})`,
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#06101B]/80 to-[#040C16]/95 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Informed Next Step</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
            {activeData.finalCta.heading}{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              {activeData.finalCta.highlightHeading}
            </span>
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-3 sm:mb-4">
            {activeData.finalCta.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Button
              type="button"
              size="lg"
              onClick={() => handleExploreBusinessPlan(activeData.finalCta.primaryButtonLink)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>{activeData.finalCta.primaryButtonText}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => scrollToSection(activeData.finalCta.secondaryButtonLink || 'plots-section')}
              className="bg-white/10 hover:bg-white/15 text-slate-100 font-semibold text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>{activeData.finalCta.secondaryButtonText}</span>
            </Button>
          </div>

          <div className="mt-3.5 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            <span>✓ Transparent Information</span>
            <span>✓ No Mandatory Commitment</span>
            <span>✓ Authentic Project Ranks</span>
            <span>✓ Self-Paced Decision</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE RANK DETAILS MODAL
          ========================================================================= */}
      {selectedRankForModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedRankForModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="relative w-full max-w-md rounded-2xl bg-[#091827] border border-white/20 p-6 sm:p-7 shadow-2xl text-white space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Level #{selectedRankForModal.serialNumber}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400">
                    Live Rank Specification
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedRankForModal.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRankForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Base Rank Cost:</span>
                <span className="font-mono font-semibold text-white">${selectedRankForModal.basePrice.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network / Gas Fee ({selectedRankForModal.networkFeePercent}%):</span>
                <span className="font-mono font-semibold text-slate-300">+${selectedRankForModal.networkFeeUSD.toLocaleString()} USD</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold">
                <span className="text-emerald-400">Total Rank Cost:</span>
                <span className="font-mono text-emerald-400">${selectedRankForModal.totalRankCostUSD.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-slate-300 font-medium pt-1">
                <span className="text-slate-400">INR Value (@ ₹{exchangeRate}/USD):</span>
                <span className="font-mono text-amber-300">₹{(selectedRankForModal.totalRankCostUSD * exchangeRate).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Information Only:</strong> Reviewing this rank or viewing cost breakdowns does not commit you to joining or investing. Participation is strictly optional.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRankForModal(null)}
                className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10 text-xs rounded-lg"
              >
                Close
              </Button>
              {onNavigateToTab && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setSelectedRankForModal(null);
                    onNavigateToTab('ranks');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium"
                >
                  Open in Calculator
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
