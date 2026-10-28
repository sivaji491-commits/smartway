import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  RotateCcw, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { NoticeItem, DEFAULT_NOTICES } from '@/types/notice';
import { 
  loadNotices, 
  addNoticeAdmin, 
  updateNoticeAdmin, 
  deleteNoticeAdmin, 
  toggleNoticeStatusAdmin, 
  resetNoticesDefaultsAdmin,
  validateNoticeText,
  NOTICE_UPDATED_EVENT 
} from '@/lib/notice-storage';
import { HomeScrollingMarquee } from '@/components/home/HomeScrollingMarquee';
import { AccessDeniedView } from '@/components/AccessDeniedView';

export interface NoticeManagementViewProps {
  isAdmin?: boolean;
  userEmail?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export const NoticeManagementView: React.FC<NoticeManagementViewProps> = ({
  isAdmin = false,
  userEmail,
  onNavigateToTab,
}) => {
  // Strict authorization enforcement: Regular users are immediately denied access
  if (!isAdmin) {
    return (
      <AccessDeniedView
        pageName="Notice"
        userEmail={userEmail}
        authorizedPageName="Home"
        onNavigateToAuthorized={onNavigateToTab ? () => onNavigateToTab('home') : undefined}
      />
    );
  }

  const effectiveAdmin = userEmail || 'sivaji491@gmail.com';

  const [notices, setNotices] = useState<NoticeItem[]>(() => loadNotices());
  const [newNoticeText, setNewNoticeText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingNotice, setDeletingNotice] = useState<NoticeItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize across windows/tabs
  const syncFromStorage = useCallback(() => {
    setNotices(loadNotices());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener(NOTICE_UPDATED_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(NOTICE_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, [syncFromStorage]);

  // Handle Add Notice
  const handleAddNotice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;

    const validation = validateNoticeText(newNoticeText);
    if (!validation.valid) {
      setFeedback({ type: 'error', message: validation.error || 'Please enter a valid notice message.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const res = await addNoticeAdmin(newNoticeText, effectiveAdmin);
    setIsSaving(false);

    if (res.success && res.notices) {
      setNotices(res.notices);
      setNewNoticeText('');
      setFeedback({
        type: 'success',
        message: 'New notice added and published to the Home page scrolling area successfully.',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to add notice.',
      });
    }
  };

  // Handle Start Edit
  const handleStartEdit = (notice: NoticeItem) => {
    setEditingId(notice.id);
    setEditingText(notice.text);
    setFeedback(null);
  };

  // Handle Save Edit
  const handleSaveEdit = async (id: string) => {
    if (!isAdmin) return;

    const validation = validateNoticeText(editingText);
    if (!validation.valid) {
      setFeedback({ type: 'error', message: validation.error || 'Please enter a valid notice message.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const res = await updateNoticeAdmin(id, editingText, effectiveAdmin);
    setIsSaving(false);

    if (res.success && res.notices) {
      setNotices(res.notices);
      setEditingId(null);
      setEditingText('');
      setFeedback({
        type: 'success',
        message: 'Notice updated successfully and reflected on the Home page.',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to update notice.',
      });
    }
  };

  // Handle Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  // Handle Delete Confirmation & Action
  const handleConfirmDelete = async () => {
    if (!isAdmin || !deletingNotice) return;

    setIsSaving(true);
    setFeedback(null);

    const res = await deleteNoticeAdmin(deletingNotice.id, effectiveAdmin);
    setIsSaving(false);
    setDeletingNotice(null);

    if (res.success && res.notices) {
      setNotices(res.notices);
      setFeedback({
        type: 'success',
        message: 'Notice deleted successfully and removed from the Home page.',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Failed to delete notice.',
      });
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = async (id: string) => {
    if (!isAdmin) return;
    const res = await toggleNoticeStatusAdmin(id, effectiveAdmin);
    if (res.success && res.notices) {
      setNotices(res.notices);
      setFeedback({
        type: 'success',
        message: 'Notice visibility updated successfully.',
      });
    }
  };

  // Handle Reset to Defaults
  const handleResetDefaults = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to restore the default Home page notice announcement?')) {
      return;
    }
    const res = await resetNoticesDefaultsAdmin(effectiveAdmin);
    if (res.success && res.notices) {
      setNotices(res.notices);
      setEditingId(null);
      setFeedback({
        type: 'success',
        message: 'Restored default Home page notice announcement.',
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 lg:p-6 space-y-6 w-full animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0 shadow-xs border border-amber-500/20">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Notice Management
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Home Page Ticker
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, edit, and manage scrolling announcement notices displayed on the Home Page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          {onNavigateToTab && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('home')}
              className="h-8 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
              title="Navigate to Home Page to view the live ticker"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-500" />
              View on Home
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
            title="Reset to default announcement notice"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* 2. Notification Banner */}
      {feedback && (
        <div 
          className={`flex items-center justify-between p-3 rounded-lg text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 ml-2"
            aria-label="Dismiss feedback message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Live Marquee Preview Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Live Home Page Marquee Preview
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Hover or touch the banner to pause
          </span>
        </div>

        {/* Embedded Live Marquee showing the exact synchronized notices */}
        <div className="rounded-lg overflow-hidden border border-amber-500/30 shadow-xs">
          <HomeScrollingMarquee notices={notices} />
        </div>
      </div>

      {/* 4. Add Notice Form Card */}
      <div className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-white shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
            <Plus className="w-4 h-4 text-teal-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Add New Notice
          </h2>
        </div>

        <form onSubmit={handleAddNotice} className="space-y-3">
          <div>
            <label htmlFor="new-notice-input" className="block text-xs font-medium text-slate-700 mb-1">
              Notice Content
            </label>
            <Textarea
              id="new-notice-input"
              value={newNoticeText}
              onChange={(e) => setNewNoticeText(e.target.value)}
              placeholder="Enter announcement text to scroll across the Home Page marquee (e.g. Special weekend offer: Invest in 2 plots and earn double bonus)..."
              rows={3}
              maxLength={500}
              className="text-xs resize-y min-h-[70px] focus:ring-1 focus:ring-teal-500"
              disabled={isSaving}
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Must be at least 3 characters. Appears immediately on save.</span>
              <span className="tabular-nums font-mono">{newNoticeText.trim().length} / 500</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="submit"
              disabled={isSaving || newNoticeText.trim().length < 3}
              className="h-8 px-4 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save & Publish Notice'}
            </Button>
          </div>
        </form>
      </div>

      {/* 5. Existing Notices List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Active Notices ({notices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {notices.filter((n) => n.isActive !== false).length} displaying on Home Page
          </span>
        </div>

        {notices.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-2">
            <Bell className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
            <p className="text-sm font-medium text-slate-700">No notices currently saved</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your first notice using the form above to display it on the Home Page scrolling marquee.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="h-7 text-xs mt-2"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Load Default Notice
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notices.map((notice, idx) => {
              const isBeingEdited = editingId === notice.id;

              return (
                <div
                  key={notice.id}
                  className={`rounded-xl border transition-all duration-200 p-3 sm:p-4 ${
                    isBeingEdited 
                      ? 'border-indigo-400 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-400/20' 
                      : notice.isActive === false
                      ? 'border-slate-200 bg-slate-50/50 opacity-75'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {isBeingEdited ? (
                    // Inline Edit Mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-900">
                          Edit Notice #{idx + 1}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Editing Mode
                        </span>
                      </div>

                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="text-xs bg-white resize-y min-h-[70px] border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 tabular-nums font-mono">
                          {editingText.trim().length} / 500 characters
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-800"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveEdit(notice.id)}
                            disabled={isSaving || editingText.trim().length < 3}
                            className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Read Mode
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            #{idx + 1}
                          </span>
                          {notice.isActive !== false ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active in Marquee
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive (Hidden)
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(notice.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-slate-900 break-words leading-relaxed select-text">
                          {notice.text}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(notice.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            notice.isActive !== false 
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' 
                              : 'text-slate-500 bg-slate-100 hover:bg-slate-200 border-slate-300'
                          }`}
                          title={notice.isActive !== false ? 'Hide from scrolling ticker' : 'Show in scrolling ticker'}
                          aria-label={notice.isActive !== false ? 'Hide from ticker' : 'Show in ticker'}
                        >
                          {notice.isActive !== false ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(notice)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                          title="Edit this notice"
                          aria-label={`Edit notice #${idx + 1}`}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingNotice(notice)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                          title="Delete this notice"
                          aria-label={`Delete notice #${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Delete Confirmation Modal Dialog */}
      {deletingNotice && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-dialog-title" className="text-sm font-bold text-slate-900">
                  Delete Notice Announcement?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete this notice? It will be removed immediately from the Home page scrolling area.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 italic max-h-24 overflow-y-auto">
              "{deletingNotice.text}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingNotice(null)}
                disabled={isSaving}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isSaving ? 'Deleting...' : 'Delete Notice'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
