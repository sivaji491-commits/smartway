import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  KeyRound, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Save, 
  ShieldCheck, 
  FileText, 
  Sliders, 
  Lock, 
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  KeyPointItem, 
  DEFAULT_KEY_POINTS 
} from '@/types/key-points';
import { 
  loadKeyPoints, 
  addKeyPoint, 
  updateKeyPoint, 
  deleteKeyPoint, 
  validateKeyPointText,
  resetKeyPointsDefaults,
  KEY_POINTS_UPDATED_EVENT 
} from '@/lib/key-points-storage';

interface SettingsViewProps {
  isAdmin: boolean;
  userEmail?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isAdmin,
  userEmail,
  onNavigateToTab
}) => {
  const [items, setItems] = useState<KeyPointItem[]>(() => loadKeyPoints());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeyPointItem | null>(null);
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync with persistent storage & real-time broadcasts
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

  const openAddModal = () => {
    setEditingItem(null);
    setFormText('');
    setFormCategory('General');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: KeyPointItem) => {
    setEditingItem(item);
    setFormText(item.text);
    setFormCategory(item.category || 'General');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormText('');
    setFormError(null);
  };

  const handleSave = () => {
    // Validate empty or whitespace-only entries
    const validation = validateKeyPointText(formText);
    if (!validation.valid) {
      setFormError(validation.error || 'Please enter valid key point content.');
      return;
    }

    const currentIdentifier = userEmail || 'sivaji491@gmail.com';

    if (editingItem) {
      // Edit existing key point
      const result = updateKeyPoint(
        editingItem.id, 
        formText, 
        currentIdentifier, 
        formCategory
      );

      if (!result.success) {
        setFormError(result.error || 'Failed to update key point.');
        return;
      }

      setItems(loadKeyPoints());
      setSuccessMessage('Key point updated successfully.');
      closeModal();
    } else {
      // Add new key point
      const result = addKeyPoint(
        formText, 
        currentIdentifier, 
        formCategory
      );

      if (!result.success) {
        setFormError(result.error || 'Failed to add key point.');
        return;
      }

      setItems(loadKeyPoints());
      setSuccessMessage('Key point added successfully.');
      closeModal();
    }

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleDelete = (id: string) => {
    const currentIdentifier = userEmail || 'sivaji491@gmail.com';
    const result = deleteKeyPoint(id, currentIdentifier);

    if (!result.success) {
      setFormError(result.error || 'Failed to delete key point.');
      return;
    }

    setItems(loadKeyPoints());
    setDeleteConfirmId(null);
    setSuccessMessage('Key point deleted successfully.');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all key points back to system defaults?')) {
      const currentIdentifier = userEmail || 'sivaji491@gmail.com';
      resetKeyPointsDefaults(currentIdentifier);
      setItems(loadKeyPoints());
      setSuccessMessage('Key points reset to default principles.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-[#08111D] text-slate-100 box-border overflow-y-auto">
      {/* Top Header Bar */}
      <header className="px-4 py-3 sm:px-6 border-b border-white/10 bg-[#0A1422]/95 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Settings
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                  Configuration & Key Points
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage application settings, business key points, and administration options.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Access Enabled</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Read-Only Mode</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 box-border">
        {/* Success Notification Banner */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center justify-between shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {formError && !isModalOpen && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFormError(null)}
              className="text-rose-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Section 1: Key Points Management Card */}
        <section className="bg-gradient-to-br from-[#0B1C2A]/90 via-[#071420]/90 to-[#040B13]/95 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Key Points Management
                  </h2>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {items.length} Points Configured
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Add, update, or reorganize critical business rules and knowledge guidelines displayed on the Key Points page.
                </p>
              </div>
            </div>

            {/* Admin Add Key Points Action Button */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Button
                    type="button"
                    onClick={openAddModal}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 h-9 rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-emerald-400/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Key Points</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetDefaults}
                    size="sm"
                    className="h-9 text-xs border-white/15 text-slate-400 hover:text-white hover:bg-white/5"
                    title="Reset to default key points"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>
                </>
              )}
              {onNavigateToTab && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onNavigateToTab('key-points')}
                  size="sm"
                  className="h-9 text-xs border-white/15 text-emerald-300 hover:text-white hover:bg-emerald-500/10"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  View Public Page
                </Button>
              )}
            </div>
          </div>

          {/* Key Points Items List */}
          <div className="space-y-2.5">
            {items.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white/5 border border-white/10 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                <p className="text-sm font-semibold text-white">No key points found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isAdmin 
                    ? "Click 'Add Key Points' above to create your first business principle." 
                    : "No key points have been published yet."}
                </p>
              </div>
            ) : (
              items.map((item, index) => {
                const pointDisplayNumber = String(item.pointNumber || index + 1).padStart(2, '0');
                const isConfirmingDelete = deleteConfirmId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#0C1A27]/80 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {pointDisplayNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {item.category || 'General'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ID: {item.id}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-white font-medium leading-relaxed break-words">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Only visible to Administrator */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                            <span className="text-[11px] text-rose-300 font-medium">Confirm delete?</span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="h-7 text-xs px-2.5 bg-rose-600 hover:bg-rose-500 text-white"
                            >
                              Yes, Delete
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(null)}
                              className="h-7 text-xs px-2 text-slate-400 hover:text-white"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(item)}
                              className="h-8 text-xs text-slate-300 hover:text-white hover:bg-white/10 px-2.5 rounded-lg"
                              title="Edit key point"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 rounded-lg"
                              title="Delete key point"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Section 2: General System & Governance Information */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#0A1422]/70 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Workspace Preferences</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              IG Infra enterprise workspace running with profile guardian protection and real-time synchronisation across active sessions.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 space-y-1">
              <div><strong>Sync Protocol:</strong> Real-time broadcast and persistent storage</div>
              <div><strong>Default Currency:</strong> USD / INR dynamic converter</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A1422]/70 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Role & Permission Security</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Permission checks are enforced both in UI presentation and authoritative backend handlers to prevent unauthorized data tampering.
            </p>
            <div className="pt-2 text-[11px] text-slate-400 space-y-1">
              <div><strong>Active Role:</strong> {isAdmin ? 'Workspace Administrator' : 'Regular User / Member'}</div>
              <div><strong>Current Session:</strong> {userEmail || 'Active Workspace Session'}</div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal / Popup for Adding or Editing Key Point */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg rounded-2xl bg-[#0B1A28] border border-white/20 p-5 sm:p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="key-point-modal-title"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="key-point-modal-title" className="text-base font-bold text-white">
                    {editingItem ? 'Edit Key Point' : 'Add New Key Point'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enter the principle or guideline description below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message Alert */}
            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Key Point Text <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={formText}
                  onChange={(e) => {
                    setFormText(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  rows={4}
                  placeholder="Enter the key point or guideline (e.g. Understand the Business Plan First. Decide After You Understand.)..."
                  className="w-full rounded-xl bg-[#071320] border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Provide clear, concise guidance for business plan members and partners.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Category Tag
                </label>
                <Input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Core Principle, Compensation, Bonuses, Governance"
                  className="h-9 bg-[#071320] border-white/15 text-xs text-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeModal}
                className="h-8 text-xs border-white/15 text-slate-300 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Key Point</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
