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
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    const el = document.getElementById(sectionId);
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
    <div className="min-h-full w-full bg-[#071320] text-slate-100 font-['Inter',system-ui,sans-serif] selection:bg-emerald-500/30 selection:text-white">
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
          CONTINUOUS SCROLLING MARQUEE ANNOUNCEMENT
          ========================================================================= */}
      <HomeScrollingMarquee text={activeData.marqueeText || DEFAULT_MARQUEE_TEXT} />

      {/* =========================================================================
          2. HERO SECTION — PREMIUM VISUAL DESIGN
          ========================================================================= */}
      <section className="relative overflow-hidden flex items-center justify-center border-b border-white/10">
        {/* Background Image with Dark Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url(${activeData.hero.heroBgImage || DEFAULT_HOME_PAGE_DATA.hero.heroBgImage})`,
          }}
          role="img"
          aria-label="Panoramic view of luxury residential plots and modern apartment developments"
        />
        
        {/* Subtle Dark Overlays for Optimal Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06101B]/95 via-[#071524]/85 to-[#050D18]/90" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#071320]/60 to-[#050D18]/95" />

        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide mb-3 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TRANSPARENT REAL ESTATE BUSINESS ECOSYSTEM</span>
            <span className="text-emerald-500/50">·</span>
            <span className="text-slate-300 font-normal">INFORMED DECISIONS FIRST</span>
          </div>

          {/* Large Bold Headline */}
          <h1 className="text-3xl sm:5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight mb-3">
            {activeData.hero.headline}{' '}
            <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              {activeData.hero.highlightHeadline}
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-3xl mx-auto text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed mb-4 sm:mb-5">
            {activeData.hero.subtitle}
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Button
              type="button"
              size="lg"
              onClick={() => handleExploreBusinessPlan(activeData.hero.primaryButtonLink)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>{activeData.hero.primaryButtonText}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => scrollToSection(activeData.hero.secondaryButtonLink || 'plots-section')}
              className="bg-white/10 hover:bg-white/15 text-slate-100 font-semibold text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>{activeData.hero.secondaryButtonText}</span>
            </Button>
          </div>

          {/* Transparent Trust Indicators */}
          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs text-slate-400 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Transparent Review</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>No Pressure Evaluation</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Dynamic Rank Pricing</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Independent Decision Making</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. BUSINESS PHILOSOPHY SECTION
          ========================================================================= */}
      <section className="py-7 sm:py-9 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Core Philosophy</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {activeData.philosophy.heading}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed">
            {activeData.philosophy.subtitle}
          </p>
        </div>

        {/* 3 Philosophy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {activeData.philosophy.cards.map((card, idx) => (
            <div 
              key={card.id || idx}
              className="relative group rounded-2xl bg-gradient-to-b from-[#0C1E30]/90 to-[#071524]/90 border border-white/10 p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-emerald-950/30"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-3.5 group-hover:scale-105 transition-transform">
                {idx === 0 ? <ShieldCheck className="w-5 h-5 stroke-[2]" /> : idx === 1 ? <Layers className="w-5 h-5 stroke-[2]" /> : <Scale className="w-5 h-5 stroke-[2]" />}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight">
                {card.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {card.description}
              </p>
              <div className="mt-3.5 pt-3 border-t border-white/10 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{card.highlight}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          4. PREMIUM PLOTS GALLERY
          ========================================================================= */}
      <section id="plots-section" className="py-7 sm:py-9 bg-[#06101B]/80 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Planned Layouts</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Explore Residential Plot Opportunities
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl">
                Discover master-planned layouts featuring paved avenues, green landscaping, clear demarcation, and community infrastructure.
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 self-start md:self-auto">
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
                  <div className="p-4 sm:p-4.5">
                    <h3 className="text-base font-bold text-white mb-1.5 leading-snug group-hover:text-emerald-300 transition-colors">
                      {plot.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {plot.description}
                    </p>

                    {/* Features Badges */}
                    {Array.isArray(plot.features) && plot.features.length > 0 && (
                      <div className="space-y-1 pt-2.5 border-t border-white/10">
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

                <div className="p-4 sm:p-4.5 pt-0">
                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
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
          5. MODERN FLATS & APARTMENTS GALLERY
          ========================================================================= */}
      <section id="flats-section" className="py-7 sm:py-9 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Contemporary Residences</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Discover Modern Living Opportunities
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl">
              Explore luxury apartment architecture, modern flats, premium community developments, and landscaped amenities.
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 self-start md:self-auto">
            Illustrative examples for residential architecture
          </div>
        </div>

        {/* Apartment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {activeData.apartments.map((apt) => (
            <div 
              key={apt.id}
              className="group rounded-2xl bg-[#091827] border border-white/10 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-500/40 hover:shadow-2xl flex flex-col justify-between"
            >
              <div>
                {/* Image Container with Fallback */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                  {!imageErrors[apt.id] ? (
                    <img 
                      src={apt.imageUrl} 
                      alt={apt.title}
                      onError={() => handleImageError(apt.id)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 to-slate-900 p-4 text-center">
                      <Building2 className="w-10 h-10 text-teal-400 mb-2 opacity-80" />
                      <span className="text-xs font-semibold text-slate-300">{apt.title}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-[#071320]/80 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-teal-300">
                    {apt.category}
                  </div>
                  {apt.featured && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-bold text-[9.5px] px-2 py-0.5 rounded shadow flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Featured</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9.5px] font-medium text-slate-300">
                    {apt.tag || 'Illustrative Example'}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-4.5">
                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug group-hover:text-teal-300 transition-colors">
                    {apt.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {apt.description}
                  </p>

                  {/* Features Badges */}
                  {Array.isArray(apt.features) && apt.features.length > 0 && (
                    <div className="space-y-1 pt-2.5 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Key Community Features
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {apt.features.map((feat, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200"
                          >
                            <span className="w-1 h-1 rounded-full bg-teal-400" />
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-4.5 pt-0">
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-teal-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Modern Lifestyle
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300">Architecture Concept</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. HOW THE BUSINESS PLAN WORKS
          ========================================================================= */}
      <section id="how-it-works-section" className="py-7 sm:py-9 bg-[#06101B]/80 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Structured Roadmap</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              {activeData.howItWorks.heading}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed">
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
                  className="flex flex-col items-start lg:items-center text-left lg:text-center p-3.5 sm:p-4 rounded-2xl bg-[#091827] border border-white/10 shadow-lg group hover:border-emerald-500/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-500/15 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center font-bold text-sm mb-3 shadow-sm group-hover:scale-110 transition-transform">
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
          <div className="mt-5 p-3 sm:p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 text-center max-w-3xl mx-auto">
            <span>{activeData.howItWorks.disclaimer || 'Note: Selecting or reviewing any rank does not imply guaranteed income, automated earnings, or property ownership. All outcomes require individual active effort and compliance with plan conditions.'}</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. RANK & PRICE PREVIEW
          ========================================================================= */}
      <section id="ranks-preview-section" className="py-7 sm:py-9 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>Transparent Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Explore Available Ranks
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl">
              Review our live configured rank hierarchy and transparent prices. Reviewing a rank is purely informational and commits you to nothing.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 self-start md:self-auto">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Exchange Reference: <strong>₹{exchangeRate.toFixed(2)}/USD</strong></span>
          </div>
        </div>

        {/* Dynamic Ranks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {computedRanks.map((rank, idx) => (
            <div 
              key={rank.id || idx}
              className="group rounded-2xl bg-[#091827] border border-white/10 p-3.5 sm:p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-xl flex flex-col justify-between"
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

                <h3 className="text-base sm:text-lg font-extrabold text-white mb-2.5 group-hover:text-amber-300 transition-colors">
                  {rank.name}
                </h3>

                <div className="space-y-1.5 mb-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
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
        <div className="mt-4 p-3 sm:p-3.5 rounded-xl bg-[#091522] border border-white/10 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Reviewing rank costs does not commit you to purchasing or joining. All calculations are real-time and orderwise.</span>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('ranks')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
            >
              <span>Open Full Rank Calculator</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* =========================================================================
          8. FINAL CALL-TO-ACTION SECTION
          ========================================================================= */}
      <section className="relative overflow-hidden py-8 sm:py-10 lg:py-12 border-t border-white/10 bg-gradient-to-b from-[#081524] to-[#040C16]">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url(${activeData.hero.heroBgImage || DEFAULT_HOME_PAGE_DATA.hero.heroBgImage})`,
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#06101B]/80 to-[#040C16]/95 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Informed Next Step</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2.5">
            {activeData.finalCta.heading}{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              {activeData.finalCta.highlightHeading}
            </span>
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-4 sm:mb-5">
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

          <div className="mt-5 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-5 sm:gap-6">
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
