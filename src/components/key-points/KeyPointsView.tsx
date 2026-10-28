import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronLeft,
  Search, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Settings,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyPointItem } from '@/types/key-points';
import { OneTimeWorkHighlight } from './OneTimeWorkHighlight';
import { 
  loadKeyPoints, 
  moveKeyPointUp,
  moveKeyPointDown,
  reorderKeyPoints,
  KEY_POINTS_UPDATED_EVENT 
} from '@/lib/key-points-storage';

interface KeyPointsViewProps {
  isAdmin: boolean;
  userEmail?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export const ITEMS_PER_PAGE = 10;

export const KeyPointsView: React.FC<KeyPointsViewProps> = ({
  isAdmin,
  userEmail,
  onNavigateToTab
}) => {
  const [items, setItems] = useState<KeyPointItem[]>(() => loadKeyPoints());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Drag and drop state for admin reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Real-time synchronization with Settings page updates & persistent storage
  useEffect(() => {
    const handleUpdate = () => {
      setItems(loadKeyPoints());
    };

    window.addEventListener(KEY_POINTS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(KEY_POINTS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Distinct category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [items]);

  // Filtered key points based on category pill and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = 
        selectedCategory === 'all' || 
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        item.text.toLowerCase().includes(q) || 
        (item.category && item.category.toLowerCase().includes(q)) ||
        String(item.pointNumber).includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Reset page to 1 whenever search query or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Total pages calculation (10 points per page)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  // Keep current page accurate if items count changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Slice items for the current active page
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, startIndex]);

  // Reorder handlers
  const handleMoveUp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) return;

    const currentGlobalIndex = items.findIndex((it) => it.id === id);
    if (currentGlobalIndex <= 0) return;

    const currentIdentifier = userEmail || 'sivaji491@gmail.com';
    const result = moveKeyPointUp(id, currentIdentifier);
    if (result.success && result.items) {
      setItems(result.items);
      const newGlobalIndex = currentGlobalIndex - 1;
      const newPage = Math.floor(newGlobalIndex / ITEMS_PER_PAGE) + 1;
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
        setFeedbackMessage(`Moved to Page ${newPage} (Point #${String(newGlobalIndex + 1).padStart(2, '0')}).`);
      } else {
        setFeedbackMessage('Moved up successfully.');
      }
      setTimeout(() => setFeedbackMessage(null), 2500);
    }
  };

  const handleMoveDown = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) return;

    const currentGlobalIndex = items.findIndex((it) => it.id === id);
    if (currentGlobalIndex < 0 || currentGlobalIndex >= items.length - 1) return;

    const currentIdentifier = userEmail || 'sivaji491@gmail.com';
    const result = moveKeyPointDown(id, currentIdentifier);
    if (result.success && result.items) {
      setItems(result.items);
      const newGlobalIndex = currentGlobalIndex + 1;
      const newPage = Math.floor(newGlobalIndex / ITEMS_PER_PAGE) + 1;
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
        setFeedbackMessage(`Moved to Page ${newPage} (Point #${String(newGlobalIndex + 1).padStart(2, '0')}).`);
      } else {
        setFeedbackMessage('Moved down successfully.');
      }
      setTimeout(() => setFeedbackMessage(null), 2500);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isAdmin) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isAdmin || !draggedId || draggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!isAdmin || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    e.preventDefault();

    const fromIndex = items.findIndex((it) => it.id === draggedId);
    const toIndex = items.findIndex((it) => it.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      const orderedIds = updated.map((it) => it.id);
      const currentIdentifier = userEmail || 'sivaji491@gmail.com';
      const result = reorderKeyPoints(orderedIds, currentIdentifier);
      if (result.success && result.items) {
        setItems(result.items);
        const newPage = Math.floor(toIndex / ITEMS_PER_PAGE) + 1;
        if (newPage !== currentPage) {
          setCurrentPage(newPage);
        }
        setFeedbackMessage('Order updated successfully.');
        setTimeout(() => setFeedbackMessage(null), 2500);
      }
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#f8fafc] text-slate-900 select-none box-border overflow-y-auto">
      {/* Top Header & Breadcrumb Bar */}
      <header className="px-4 py-2 sm:px-6 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
            <span className="text-slate-600 hover:text-slate-900 transition-colors cursor-default">Business Plan</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-semibold">Key Points</span>
            <span className="text-slate-400 mx-0.5">·</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Core Principles
            </span>
          </nav>

          {/* Admin shortcut to Settings page */}
          {isAdmin && onNavigateToTab && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => onNavigateToTab('settings')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm font-semibold text-xs px-3 py-1.5 h-7 flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-400/30"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage in Settings</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 space-y-3 box-border flex flex-col min-h-0">
        {/* Top-Left Animated "ONE TIME WORK" Highlight */}
        <div className="flex items-center justify-start self-start">
          <OneTimeWorkHighlight />
        </div>

        {/* Streamlined Executive Hero Banner */}
        <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0B1C2A]/95 via-[#071420]/90 to-[#040B13]/95 p-3 sm:p-4 shadow-lg backdrop-blur-xl shrink-0">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>EXECUTIVE GUIDELINES & PRINCIPLES</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                Understand the Subject First. <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Stay Updated!</span>
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                Critical business rules, token appreciation models, and 12-level compressed matrix guidelines designed to foster transparent long-term financial growth.
              </p>
              {isAdmin && (
                <p className="text-[10.5px] text-emerald-400/90 font-medium pt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Admin Reordering Enabled: Move Up (↑) / Move Down (↓) or drag cards to organize sequence.</span>
                </p>
              )}
            </div>

            {/* Compact Stats Badges */}
            <div className="flex flex-row md:flex-col gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-left min-w-[110px]">
                <div className="text-[10px] text-slate-400 font-medium">Total Key Points</div>
                <div className="text-base font-extrabold text-white font-mono">{items.length}</div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-left min-w-[110px]">
                <div className="text-[10px] text-emerald-300 font-medium">Page Navigation</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feedback Message Notification */}
        {feedbackMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 shadow-md animate-in fade-in duration-200 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              All Points ({items.length})
            </button>
            {categories.map((cat) => {
              const count = items.filter((it) => it.category?.toLowerCase() === cat.toLowerCase()).length;
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search key points..."
              className="h-7 pl-7 text-xs bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        {/* Key Points Display Grid (Displays up to 10 points per page in a sleek, readable 2-column desktop grid) */}
        <section className="flex-1 min-h-0 overflow-y-auto">
          {paginatedItems.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white/5 border border-white/10 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-sm font-semibold text-white">No key points match your search</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Try searching with different keywords or switch the category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5">
              {paginatedItems.map((item) => {
                const pointNumberStr = String(item.pointNumber).padStart(2, '0');

                // Determine position in the master array for disabling Move Up/Down buttons
                const globalIndex = items.findIndex((it) => it.id === item.id);
                const isFirst = globalIndex <= 0;
                const isLast = globalIndex >= items.length - 1;

                const isDraggingThis = draggedId === item.id;
                const isOverThis = dragOverId === item.id;

                return (
                  <div
                    key={item.id}
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex items-start justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#0C1A27]/95 via-[#0A1622]/95 to-[#07111C]/95 border transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-md ${
                      isOverThis
                        ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                        : isDraggingThis
                        ? 'opacity-40 border-dashed border-white/30'
                        : 'border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    {/* Left Accent Bar */}
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-gradient-to-b from-emerald-400 to-teal-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 pl-1">
                      {/* Drag Handle (Admin Only) */}
                      {isAdmin && (
                        <div 
                          className="p-0.5 rounded text-slate-500 hover:text-emerald-400 cursor-grab active:cursor-grabbing transition-colors mt-0.5 shrink-0"
                          title="Drag to reorder"
                          aria-hidden="true"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Number Badge */}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {pointNumberStr}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 tracking-wide">
                            {item.category || 'General Principle'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active Rule</span>
                          </span>
                        </div>

                        {/* Main Key Point Text */}
                        <p className="text-xs sm:text-[13px] text-slate-100 font-medium leading-relaxed break-words">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    {/* Actions Cluster */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0 pt-0.5">
                      {/* Admin Move Up and Move Down Buttons */}
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 shadow-sm">
                          <button
                            type="button"
                            onClick={(e) => handleMoveUp(item.id, e)}
                            disabled={isFirst}
                            className={`p-1 rounded-md text-xs font-semibold transition-all flex items-center gap-0.5 ${
                              isFirst
                                ? 'opacity-30 cursor-not-allowed text-slate-500'
                                : 'text-slate-300 hover:text-white hover:bg-emerald-500/20 active:scale-95 cursor-pointer text-emerald-400'
                            }`}
                            title={isFirst ? 'Already at the top' : 'Move Up (↑)'}
                            aria-label={`Move key point ${pointNumberStr} up`}
                          >
                            <ArrowUp className="w-3 h-3" />
                            <span className="sr-only sm:not-sr-only sm:text-[10px] sm:font-medium">Up</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleMoveDown(item.id, e)}
                            disabled={isLast}
                            className={`p-1 rounded-md text-xs font-semibold transition-all flex items-center gap-0.5 ${
                              isLast
                                ? 'opacity-30 cursor-not-allowed text-slate-500'
                                : 'text-slate-300 hover:text-white hover:bg-emerald-500/20 active:scale-95 cursor-pointer text-emerald-400'
                            }`}
                            title={isLast ? 'Already at the bottom' : 'Move Down (↓)'}
                            aria-label={`Move key point ${pointNumberStr} down`}
                          >
                            <ArrowDown className="w-3 h-3" />
                            <span className="sr-only sm:not-sr-only sm:text-[10px] sm:font-medium">Down</span>
                          </button>
                        </div>
                      )}

                      {/* Metadata Tag */}
                      <div className="text-right text-[10px] text-slate-500 font-mono hidden sm:block">
                        #{pointNumberStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Automatic Pagination Controls */}
        {filteredItems.length > 0 && (
          <footer 
            className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs shrink-0"
            aria-label="Key points pagination"
          >
            {/* Range & Total Summary */}
            <div className="text-xs text-slate-600 font-medium">
              Showing <span className="font-semibold text-emerald-700">{startIndex + 1}</span>–
              <span className="font-semibold text-emerald-700">{Math.min(filteredItems.length, startIndex + ITEMS_PER_PAGE)}</span> of{' '}
              <span className="font-semibold text-slate-900">{filteredItems.length}</span> key points
              {totalPages > 1 && (
                <> <span className="text-slate-500 ml-1.5 font-mono text-[11px]">(Page {currentPage} of {totalPages})</span></>
              )}
            </div>

            {/* Pagination Buttons (Previous, Numeric Pages, Next) */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                <span>Previous</span>
              </Button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`Page ${pageNum}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-bold'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || filteredItems.length === 0}
                className="h-7 px-2.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
};
