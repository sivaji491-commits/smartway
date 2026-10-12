import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Eye, 
  Save, 
  Upload, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Star, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  FileText, 
  Compass, 
  Award, 
  Globe, 
  RotateCcw,
  Check,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  HomePageData, 
  PlotItem, 
  ApartmentItem 
} from '@/types/home-page';
import { 
  validateImageFile, 
  fileToDataUrl 
} from '@/lib/home-page-storage';
import { RankItem } from '@/types/rank-calculator';

interface HomePageAdminEditorProps {
  initialData: HomePageData;
  initialRanks: RankItem[];
  exchangeRate: number;
  adminEmail: string;
  onSaveDraft: (data: HomePageData, ranks: RankItem[]) => Promise<void> | void;
  onPublish: (data: HomePageData, ranks: RankItem[]) => Promise<void> | void;
  onPreview: (data: HomePageData, ranks: RankItem[]) => void;
  onCancel: () => void;
  isSaving: boolean;
  activeTab?: 'content' | 'plots' | 'apartments' | 'ranks';
}

export function HomePageAdminEditor({
  initialData,
  initialRanks,
  exchangeRate,
  adminEmail,
  onSaveDraft,
  onPublish,
  onPreview,
  onCancel,
  isSaving,
  activeTab: initialTabSection = 'content',
}: HomePageAdminEditorProps) {
  const [data, setData] = useState<HomePageData>(initialData);
  const [ranks, setRanks] = useState<RankItem[]>(initialRanks);
  const [activeSection, setActiveSection] = useState<'content' | 'plots' | 'apartments' | 'ranks'>(initialTabSection);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New plot / apartment modal state
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [newPlotForm, setNewPlotForm] = useState<Omit<PlotItem, 'id' | 'order'>>({
    title: '',
    category: 'Residential Plots',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
    features: ['Paved Roads', 'Underground Utilities', 'Gated Security'],
    tag: 'Illustrative Example',
    featured: false,
  });

  const [showAddAptModal, setShowAddAptModal] = useState(false);
  const [newAptForm, setNewAptForm] = useState<Omit<ApartmentItem, 'id' | 'order'>>({
    title: '',
    category: 'Modern Apartment Complex',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
    features: ['Balcony View', 'Pool Access', 'Elevator', 'Fitness Center'],
    tag: 'Illustrative Example',
    featured: false,
  });

  // Image Upload handler for Plots
  const handleUploadPlotImage = async (plotId: string, file: File) => {
    const check = validateImageFile(file);
    if (!check.valid) {
      setErrorMessage(check.error || 'Invalid image file.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setData((prev) => ({
        ...prev,
        plots: prev.plots.map((p) => (p.id === plotId ? { ...p, imageUrl: dataUrl } : p)),
      }));
      setSuccessMessage('Plot image uploaded successfully.');
    } catch {
      setErrorMessage('Failed to read and process image file.');
    }
  };

  // Image Upload handler for Apartments
  const handleUploadAptImage = async (aptId: string, file: File) => {
    const check = validateImageFile(file);
    if (!check.valid) {
      setErrorMessage(check.error || 'Invalid image file.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setData((prev) => ({
        ...prev,
        apartments: prev.apartments.map((a) => (a.id === aptId ? { ...a, imageUrl: dataUrl } : a)),
      }));
      setSuccessMessage('Apartment image uploaded successfully.');
    } catch {
      setErrorMessage('Failed to read and process image file.');
    }
  };

  // Reorder Plots
  const movePlot = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= data.plots.length) return;
    const newPlots = [...data.plots];
    const temp = newPlots[index];
    newPlots[index] = newPlots[targetIdx];
    newPlots[targetIdx] = temp;
    setData({
      ...data,
      plots: newPlots.map((p, idx) => ({ ...p, order: idx + 1 })),
    });
  };

  // Delete Plot
  const deletePlot = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      setData({
        ...data,
        plots: data.plots.filter((p) => p.id !== id).map((p, idx) => ({ ...p, order: idx + 1 })),
      });
      setSuccessMessage(`Plot "${title}" deleted.`);
    }
  };

  // Toggle Featured Plot
  const togglePlotFeatured = (id: string) => {
    setData({
      ...data,
      plots: data.plots.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p)),
    });
  };

  // Reorder Apartments
  const moveApt = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= data.apartments.length) return;
    const newApts = [...data.apartments];
    const temp = newApts[index];
    newApts[index] = newApts[targetIdx];
    newApts[targetIdx] = temp;
    setData({
      ...data,
      apartments: newApts.map((a, idx) => ({ ...a, order: idx + 1 })),
    });
  };

  // Delete Apartment
  const deleteApt = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      setData({
        ...data,
        apartments: data.apartments.filter((a) => a.id !== id).map((a, idx) => ({ ...a, order: idx + 1 })),
      });
      setSuccessMessage(`Apartment "${title}" deleted.`);
    }
  };

  // Toggle Featured Apartment
  const toggleAptFeatured = (id: string) => {
    setData({
      ...data,
      apartments: data.apartments.map((a) => (a.id === id ? { ...a, featured: !a.featured } : a)),
    });
  };

  // Add Plot Submission
  const handleAddPlot = () => {
    if (!newPlotForm.title.trim()) {
      setErrorMessage('Plot title is required.');
      return;
    }
    const newPlot: PlotItem = {
      ...newPlotForm,
      id: `plot-${Date.now()}`,
      order: data.plots.length + 1,
    };
    setData({ ...data, plots: [...data.plots, newPlot] });
    setShowAddPlotModal(false);
    setNewPlotForm({
      title: '',
      category: 'Residential Plots',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
      features: ['Paved Roads', 'Underground Utilities', 'Gated Security'],
      tag: 'Illustrative Example',
      featured: false,
    });
    setSuccessMessage('New plot opportunity added to draft.');
  };

  // Add Apartment Submission
  const handleAddApt = () => {
    if (!newAptForm.title.trim()) {
      setErrorMessage('Apartment title is required.');
      return;
    }
    const newApt: ApartmentItem = {
      ...newAptForm,
      id: `apt-${Date.now()}`,
      order: data.apartments.length + 1,
    };
    setData({ ...data, apartments: [...data.apartments, newApt] });
    setShowAddAptModal(false);
    setNewAptForm({
      title: '',
      category: 'Modern Apartment Complex',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      features: ['Balcony View', 'Pool Access', 'Elevator', 'Fitness Center'],
      tag: 'Illustrative Example',
      featured: false,
    });
    setSuccessMessage('New modern apartment added to draft.');
  };

  // Update Rank Price or Name
  const handleRankChange = (index: number, field: keyof RankItem, value: any) => {
    const updated = [...ranks];
    updated[index] = {
      ...updated[index],
      [field]: field === 'basePrice' ? Math.max(0, Number(value) || 0) : value,
    };
    setRanks(updated);
  };

  return (
    <div className="bg-[#071320] text-slate-100 min-h-full p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Admin Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ADMINISTRATOR CONTENT MANAGEMENT</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 font-normal">{adminEmail}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manage Real Estate Home Page
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Edit text, upload & reorder plot/apartment images, and update rank pricing with draft preview and publishing.
          </p>
        </div>

        {/* Global Action Workflow Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPreview(data, ranks)}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 text-xs flex items-center gap-1.5"
            title="Preview drafted changes on live home page"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preview Changes</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => onSaveDraft(data, ranks)}
            className="border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1.5"
            title="Save changes as working draft"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => onPublish(data, ranks)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
            title="Publish changes to all visitors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Changes</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-xs"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('content')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSection === 'content'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Home Page Content</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('plots')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSection === 'plots'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Manage Plot Images ({data.plots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('apartments')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSection === 'apartments'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Manage Flat Images ({data.apartments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('ranks')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeSection === 'ranks'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Edit Ranks & Prices ({ranks.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MANAGE HOME PAGE CONTENT
          ========================================================================= */}
      {activeSection === 'content' && (
        <div className="space-y-6">
          {/* Scrolling Marquee Announcement Form */}
          <div className="p-6 rounded-2xl bg-[#091827] border border-amber-500/25 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Scrolling Marquee Announcement</span>
            </h2>
            <p className="text-xs text-slate-400">
              Continuous horizontal scrolling announcement banner displayed across the Home Page with pause-on-hover.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Marquee Message Text
              </label>
              <Input
                value={data.marqueeText || 'Understand the subject first, or face the loss. Stay updated!'}
                onChange={(e) => setData({
                  ...data,
                  marqueeText: e.target.value,
                })}
                placeholder="Understand the subject first, or face the loss. Stay updated!"
                className="bg-[#071320] border-white/15 text-white text-xs font-medium"
              />
            </div>
          </div>

          {/* Hero Section Content Form */}
          <div className="p-6 rounded-2xl bg-[#091827] border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Hero Section Content</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Main Headline (Line 1) *
                </label>
                <Input
                  value={data.hero.headline}
                  onChange={(e) => setData({
                    ...data,
                    hero: { ...data.hero, headline: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Headline Highlight (Line 2) *
                </label>
                <Input
                  value={data.hero.highlightHeadline}
                  onChange={(e) => setData({
                    ...data,
                    hero: { ...data.hero, highlightHeadline: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hero Subtitle Description *
              </label>
              <Textarea
                rows={3}
                value={data.hero.subtitle}
                onChange={(e) => setData({
                  ...data,
                  hero: { ...data.hero, subtitle: e.target.value }
                })}
                className="bg-[#071320] border-white/15 text-white text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hero Background Image URL
              </label>
              <Input
                value={data.hero.heroBgImage}
                onChange={(e) => setData({
                  ...data,
                  hero: { ...data.hero, heroBgImage: e.target.value }
                })}
                className="bg-[#071320] border-white/15 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Button Text</label>
                <Input
                  value={data.hero.primaryButtonText}
                  onChange={(e) => setData({
                    ...data,
                    hero: { ...data.hero, primaryButtonText: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Button Link</label>
                <Input
                  value={data.hero.primaryButtonLink}
                  onChange={(e) => setData({
                    ...data,
                    hero: { ...data.hero, primaryButtonLink: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Button Text</label>
                <Input
                  value={data.hero.secondaryButtonText}
                  onChange={(e) => setData({
                    ...data,
                    hero: { ...data.hero, secondaryButtonText: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Button Link</label>
                <Input
                  value={data.hero.secondaryButtonLink}
                  onChange={(e) => setData({
                    ...data,
                    hero: { ...data.hero, secondaryButtonLink: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Philosophy Section Form */}
          <div className="p-6 rounded-2xl bg-[#091827] border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Business Philosophy (3 Cards)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Section Heading *</label>
                <Input
                  value={data.philosophy.heading}
                  onChange={(e) => setData({
                    ...data,
                    philosophy: { ...data.philosophy, heading: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Section Subtitle</label>
                <Input
                  value={data.philosophy.subtitle}
                  onChange={(e) => setData({
                    ...data,
                    philosophy: { ...data.philosophy, subtitle: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
            </div>

            {/* 3 Philosophy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {data.philosophy.cards.map((card, idx) => (
                <div key={card.id || idx} className="p-4 rounded-xl bg-[#071422] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                    Card #{idx + 1}
                  </span>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Title</label>
                    <Input
                      value={card.title}
                      onChange={(e) => {
                        const newCards = [...data.philosophy.cards];
                        newCards[idx] = { ...newCards[idx], title: e.target.value };
                        setData({ ...data, philosophy: { ...data.philosophy, cards: newCards } });
                      }}
                      className="bg-[#091827] border-white/15 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                    <Textarea
                      rows={2}
                      value={card.description}
                      onChange={(e) => {
                        const newCards = [...data.philosophy.cards];
                        newCards[idx] = { ...newCards[idx], description: e.target.value };
                        setData({ ...data, philosophy: { ...data.philosophy, cards: newCards } });
                      }}
                      className="bg-[#091827] border-white/15 text-white text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Call to Action Content Form */}
          <div className="p-6 rounded-2xl bg-[#091827] border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Final Call-to-Action Section</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CTA Headline *</label>
                <Input
                  value={data.finalCta.heading}
                  onChange={(e) => setData({
                    ...data,
                    finalCta: { ...data.finalCta, heading: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CTA Highlight</label>
                <Input
                  value={data.finalCta.highlightHeading}
                  onChange={(e) => setData({
                    ...data,
                    finalCta: { ...data.finalCta, highlightHeading: e.target.value }
                  })}
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">CTA Supporting Description</label>
              <Textarea
                rows={2}
                value={data.finalCta.subtitle}
                onChange={(e) => setData({
                  ...data,
                  finalCta: { ...data.finalCta, subtitle: e.target.value }
                })}
                className="bg-[#071320] border-white/15 text-white text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MANAGE PLOT IMAGES
          ========================================================================= */}
      {activeSection === 'plots' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Residential Plots Gallery ({data.plots.length})</h2>
              <p className="text-xs text-slate-400">Upload new plot photos, edit titles & descriptions, reorder, and set featured plot.</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddPlotModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Plot</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.plots.map((plot, idx) => (
              <div 
                key={plot.id} 
                className="p-4 rounded-2xl bg-[#091827] border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Image Preview & Actions */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-3 border border-white/10">
                    <img 
                      src={plot.imageUrl} 
                      alt={plot.title} 
                      className="w-full h-full object-cover"
                    />
                    {plot.featured && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Featured</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded">
                      <label 
                        htmlFor={`upload-plot-${plot.id}`}
                        className="text-[10.5px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Replace</span>
                      </label>
                      <input 
                        type="file" 
                        id={`upload-plot-${plot.id}`}
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPlotImage(plot.id, file);
                        }}
                      />
                    </div>
                  </div>

                  {/* Title & Category Input */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">Plot Title</label>
                      <Input
                        value={plot.title}
                        onChange={(e) => setData({
                          ...data,
                          plots: data.plots.map((p) => p.id === plot.id ? { ...p, title: e.target.value } : p)
                        })}
                        className="bg-[#071320] border-white/15 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">Category Label</label>
                      <Input
                        value={plot.category}
                        onChange={(e) => setData({
                          ...data,
                          plots: data.plots.map((p) => p.id === plot.id ? { ...p, category: e.target.value } : p)
                        })}
                        className="bg-[#071320] border-white/15 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">Description</label>
                      <Textarea
                        rows={2}
                        value={plot.description}
                        onChange={(e) => setData({
                          ...data,
                          plots: data.plots.map((p) => p.id === plot.id ? { ...p, description: e.target.value } : p)
                        })}
                        className="bg-[#071320] border-white/15 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Reorder, Featured & Delete Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => movePlot(idx, 'up')}
                      className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === data.plots.length - 1}
                      onClick={() => movePlot(idx, 'down')}
                      className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlotFeatured(plot.id)}
                      className={`h-7 px-2 text-[11px] font-semibold ${
                        plot.featured ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 mr-1 ${plot.featured ? 'fill-current' : ''}`} />
                      <span>{plot.featured ? 'Featured' : 'Make Featured'}</span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={data.plots.length <= 1}
                    onClick={() => deletePlot(plot.id, plot.title)}
                    className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MANAGE FLAT & APARTMENT IMAGES
          ========================================================================= */}
      {activeSection === 'apartments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Flats & Apartments Gallery ({data.apartments.length})</h2>
              <p className="text-xs text-slate-400">Upload new apartment photos, edit titles & descriptions, reorder, and set featured apartment.</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddAptModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Flat</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.apartments.map((apt, idx) => (
              <div 
                key={apt.id} 
                className="p-4 rounded-2xl bg-[#091827] border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Image Preview & Actions */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-3 border border-white/10">
                    <img 
                      src={apt.imageUrl} 
                      alt={apt.title} 
                      className="w-full h-full object-cover"
                    />
                    {apt.featured && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Featured</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded">
                      <label 
                        htmlFor={`upload-apt-${apt.id}`}
                        className="text-[10.5px] text-teal-400 hover:text-teal-300 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Replace</span>
                      </label>
                      <input 
                        type="file" 
                        id={`upload-apt-${apt.id}`}
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAptImage(apt.id, file);
                        }}
                      />
                    </div>
                  </div>

                  {/* Title & Category Input */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">Apartment Title</label>
                      <Input
                        value={apt.title}
                        onChange={(e) => setData({
                          ...data,
                          apartments: data.apartments.map((a) => a.id === apt.id ? { ...a, title: e.target.value } : a)
                        })}
                        className="bg-[#071320] border-white/15 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">Category Label</label>
                      <Input
                        value={apt.category}
                        onChange={(e) => setData({
                          ...data,
                          apartments: data.apartments.map((a) => a.id === apt.id ? { ...a, category: e.target.value } : a)
                        })}
                        className="bg-[#071320] border-white/15 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-0.5">Description</label>
                      <Textarea
                        rows={2}
                        value={apt.description}
                        onChange={(e) => setData({
                          ...data,
                          apartments: data.apartments.map((a) => a.id === apt.id ? { ...a, description: e.target.value } : a)
                        })}
                        className="bg-[#071320] border-white/15 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Reorder, Featured & Delete Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveApt(idx, 'up')}
                      className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === data.apartments.length - 1}
                      onClick={() => moveApt(idx, 'down')}
                      className="h-7 w-7 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAptFeatured(apt.id)}
                      className={`h-7 px-2 text-[11px] font-semibold ${
                        apt.featured ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 mr-1 ${apt.featured ? 'fill-current' : ''}`} />
                      <span>{apt.featured ? 'Featured' : 'Make Featured'}</span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={data.apartments.length <= 1}
                    onClick={() => deleteApt(apt.id, apt.title)}
                    className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: EDIT RANKS & PRICES (CANONICAL SOURCE OF TRUTH)
          ========================================================================= */}
      {activeSection === 'ranks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Existing Application Ranks & Pricing</span>
              </h2>
              <p className="text-xs text-slate-400">
                Updating rank prices updates the Home Page, 12 Level Bonus, Customer View, and Calculator simultaneously.
              </p>
            </div>
            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
              Exchange Rate Reference: <strong>₹{exchangeRate}/USD</strong>
            </div>
          </div>

          <div className="space-y-3">
            {ranks.map((rank, idx) => {
              const gasFeeUSD = Math.round(rank.basePrice * (rank.networkFeePercent / 100));
              const totalUSD = rank.basePrice + gasFeeUSD;
              const totalINR = totalUSD * exchangeRate;

              return (
                <div 
                  key={rank.id || idx}
                  className="p-4 rounded-xl bg-[#091827] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Tier ID: {rank.id}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          value={rank.name}
                          onChange={(e) => handleRankChange(idx, 'name', e.target.value)}
                          placeholder="Rank Name"
                          className="w-36 h-8 bg-[#071320] border-white/15 text-white text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Base Price ($ USD)</label>
                      <Input
                        type="number"
                        min="0"
                        value={rank.basePrice}
                        onChange={(e) => handleRankChange(idx, 'basePrice', e.target.value)}
                        className="w-32 h-8 bg-[#071320] border-white/15 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="text-xs space-y-0.5 text-right font-mono min-w-[150px]">
                      <div className="text-slate-400 text-[11px]">+3% Gas: ${gasFeeUSD}</div>
                      <div className="text-emerald-400 font-bold">Total: ${totalUSD} USD</div>
                      <div className="text-amber-300 text-[10.5px]">≈ ₹{totalINR.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD NEW PLOT MODAL
          ========================================================================= */}
      {showAddPlotModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#091827] border border-white/20 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Add Residential Plot Opportunity</h3>
              <button 
                type="button" 
                onClick={() => setShowAddPlotModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Plot Title *</label>
                <Input
                  value={newPlotForm.title}
                  onChange={(e) => setNewPlotForm({ ...newPlotForm, title: e.target.value })}
                  placeholder="e.g. Scenic Avenue Gated Plots"
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <Input
                  value={newPlotForm.category}
                  onChange={(e) => setNewPlotForm({ ...newPlotForm, category: e.target.value })}
                  placeholder="e.g. Master-Planned Layout"
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <Textarea
                  rows={2}
                  value={newPlotForm.description}
                  onChange={(e) => setNewPlotForm({ ...newPlotForm, description: e.target.value })}
                  placeholder="Detailed architectural & landscape description..."
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Image URL or Local Upload</label>
                <div className="flex gap-2">
                  <Input
                    value={newPlotForm.imageUrl}
                    onChange={(e) => setNewPlotForm({ ...newPlotForm, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-[#071320] border-white/15 text-white text-xs"
                  />
                  <label 
                    htmlFor="modal-plot-file-upload"
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-md cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </label>
                  <input
                    type="file"
                    id="modal-plot-file-upload"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const check = validateImageFile(file);
                        if (!check.valid) {
                          setErrorMessage(check.error || 'Invalid file');
                          return;
                        }
                        const url = await fileToDataUrl(file);
                        setNewPlotForm({ ...newPlotForm, imageUrl: url });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddPlotModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddPlot}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Add Plot to Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD NEW APARTMENT MODAL
          ========================================================================= */}
      {showAddAptModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#091827] border border-white/20 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Add Modern Apartment Opportunity</h3>
              <button 
                type="button" 
                onClick={() => setShowAddAptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Apartment Title *</label>
                <Input
                  value={newAptForm.title}
                  onChange={(e) => setNewAptForm({ ...newAptForm, title: e.target.value })}
                  placeholder="e.g. Horizon High-Rise Residences"
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <Input
                  value={newAptForm.category}
                  onChange={(e) => setNewAptForm({ ...newAptForm, category: e.target.value })}
                  placeholder="e.g. Luxury Residences"
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <Textarea
                  rows={2}
                  value={newAptForm.description}
                  onChange={(e) => setNewAptForm({ ...newAptForm, description: e.target.value })}
                  placeholder="Detailed architectural & amenities description..."
                  className="bg-[#071320] border-white/15 text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Image URL or Local Upload</label>
                <div className="flex gap-2">
                  <Input
                    value={newAptForm.imageUrl}
                    onChange={(e) => setNewAptForm({ ...newAptForm, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-[#071320] border-white/15 text-white text-xs"
                  />
                  <label 
                    htmlFor="modal-apt-file-upload"
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-md cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </label>
                  <input
                    type="file"
                    id="modal-apt-file-upload"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const check = validateImageFile(file);
                        if (!check.valid) {
                          setErrorMessage(check.error || 'Invalid file');
                          return;
                        }
                        const url = await fileToDataUrl(file);
                        setNewAptForm({ ...newAptForm, imageUrl: url });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddAptModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddApt}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Add Apartment to Draft
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
