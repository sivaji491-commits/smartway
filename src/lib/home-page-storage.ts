import { 
  HomePageData, 
  DEFAULT_HOME_PAGE_DATA,
  PlotItem,
  ApartmentItem
} from '@/types/home-page';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { loadRankCalculatorState, saveRankCalculatorState } from '@/lib/rank-storage';
import { RankItem } from '@/types/rank-calculator';
import { supabase } from '@/integrations/supabase/client';

export const HOME_PAGE_PUBLISHED_KEY = 'real_estate_home_page_published_v1';
export const HOME_PAGE_DRAFT_KEY = 'real_estate_home_page_draft_v1';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates home page content before drafting or publishing
 */
export function validateHomePageData(data: HomePageData): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid home page payload.' };
  }

  // Hero validation
  if (!data.hero?.headline?.trim()) {
    return { valid: false, error: 'Hero main headline is required.' };
  }
  if (!data.hero?.subtitle?.trim()) {
    return { valid: false, error: 'Hero subtitle description is required.' };
  }

  // Philosophy validation
  if (!data.philosophy?.heading?.trim()) {
    return { valid: false, error: 'Philosophy section heading is required.' };
  }
  if (!Array.isArray(data.philosophy?.cards) || data.philosophy.cards.length < 3) {
    return { valid: false, error: 'All 3 business philosophy cards are required.' };
  }

  // How it works steps
  if (!Array.isArray(data.howItWorks?.steps) || data.howItWorks.steps.length < 5) {
    return { valid: false, error: 'All 5 process roadmap steps are required.' };
  }

  // Plots & Apartments
  if (!Array.isArray(data.plots) || data.plots.length === 0) {
    return { valid: false, error: 'At least one residential plot item is required.' };
  }
  if (!Array.isArray(data.apartments) || data.apartments.length === 0) {
    return { valid: false, error: 'At least one modern apartment item is required.' };
  }

  // Final CTA
  if (!data.finalCta?.heading?.trim()) {
    return { valid: false, error: 'Final call-to-action heading is required.' };
  }

  return { valid: true };
}

/**
 * Loads the active published Home Page data.
 */
export function loadPublishedHomePage(): HomePageData {
  if (typeof window === 'undefined') {
    return DEFAULT_HOME_PAGE_DATA;
  }

  try {
    const raw = window.localStorage.getItem(HOME_PAGE_PUBLISHED_KEY);
    if (!raw) {
      savePublishedHomePageLocal(DEFAULT_HOME_PAGE_DATA);
      return DEFAULT_HOME_PAGE_DATA;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.hero) {
      return DEFAULT_HOME_PAGE_DATA;
    }

    return {
      ...DEFAULT_HOME_PAGE_DATA,
      ...parsed,
      status: 'published',
    };
  } catch (err) {
    console.error('Failed to load published home page data:', err);
    return DEFAULT_HOME_PAGE_DATA;
  }
}

/**
 * Loads draft Home Page data if present, otherwise returns published data.
 */
export function loadDraftHomePage(): HomePageData {
  if (typeof window === 'undefined') {
    return DEFAULT_HOME_PAGE_DATA;
  }

  try {
    const raw = window.localStorage.getItem(HOME_PAGE_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.hero) {
        return {
          ...DEFAULT_HOME_PAGE_DATA,
          ...parsed,
          status: 'draft',
        };
      }
    }
    return loadPublishedHomePage();
  } catch (err) {
    console.error('Failed to load draft home page data:', err);
    return loadPublishedHomePage();
  }
}

/**
 * Checks whether an un-published draft currently exists
 */
export function hasActiveDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(HOME_PAGE_DRAFT_KEY));
  } catch {
    return false;
  }
}

/**
 * Saves published data locally and notifies active listeners
 */
export function savePublishedHomePageLocal(data: HomePageData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOME_PAGE_PUBLISHED_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('nexora_home_page_published', { detail: data }));
}

/**
 * Saves draft data locally and notifies active listeners
 */
export function saveDraftHomePageLocal(data: HomePageData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOME_PAGE_DRAFT_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('nexora_home_page_draft_updated', { detail: data }));
}

/**
 * Admin action: Saves changes as a working draft
 */
export function saveDraftHomePage(
  data: HomePageData,
  adminEmail: string
): { success: boolean; error?: string; data?: HomePageData } {
  if (!isUserAdminOrOwner(adminEmail, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can save home page drafts.',
    };
  }

  const payload: HomePageData = {
    ...data,
    status: 'draft',
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };

  saveDraftHomePageLocal(payload);
  return { success: true, data: payload };
}

/**
 * Admin action: Publishes approved changes to live public Home Page
 */
export async function publishHomePage(
  data: HomePageData,
  adminEmail: string
): Promise<{ success: boolean; error?: string; data?: HomePageData }> {
  if (!isUserAdminOrOwner(adminEmail, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators can publish home page changes.',
    };
  }

  const validation = validateHomePageData(data);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Validation failed.',
    };
  }

  const currentPublished = loadPublishedHomePage();
  const nextVersion = (currentPublished.version || 1) + 1;

  const publishedPayload: HomePageData = {
    ...data,
    status: 'published',
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };

  // 1. Commit published version to storage
  savePublishedHomePageLocal(publishedPayload);

  // 2. Clear draft
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(HOME_PAGE_DRAFT_KEY);
    window.dispatchEvent(new CustomEvent('nexora_home_page_draft_updated', { detail: null }));
  }

  // 3. Asynchronously sync to database if Supabase is connected
  try {
    if (typeof window !== 'undefined' && (supabase as any)?.from && process.env.NODE_ENV !== 'test') {
      (supabase as any)
        .from('real_estate_home_page')
        .upsert({
          id: 'home-page-published',
          payload: publishedPayload,
          updated_at: publishedPayload.updatedAt,
          updated_by: publishedPayload.updatedBy,
        })
        .then(() => {})
        .catch((err: any) => {
          console.warn('Could not sync home page to remote database:', err);
        });
    }
  } catch (err) {
    console.warn('Could not sync home page to remote database:', err);
  }

  return { success: true, data: publishedPayload };
}

/**
 * Admin action: Discards active draft and restores published state
 */
export function discardDraftHomePage(
  adminEmail: string
): { success: boolean; error?: string } {
  if (!isUserAdminOrOwner(adminEmail, 'sivaji491@gmail.com')) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(HOME_PAGE_DRAFT_KEY);
    window.dispatchEvent(new CustomEvent('nexora_home_page_draft_updated', { detail: null }));
  }

  return { success: true };
}

/**
 * Validates uploaded image files
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file format. Please upload JPG, PNG, WEBP, or SVG images.' };
  }

  // Max 5MB limit
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: 'File size exceeds 5MB limit. Please upload a compressed image.' };
  }

  return { valid: true };
}

/**
 * Converts a browser File into a persistent Base64 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Admin action: Updates existing rank details (name, basePrice, description)
 * and keeps the existing single source of truth in sync.
 */
export function updateRankConfigAdmin(
  updatedRanks: RankItem[],
  adminEmail: string
): { success: boolean; error?: string } {
  if (!isUserAdminOrOwner(adminEmail, 'sivaji491@gmail.com')) {
    return { success: false, error: 'Unauthorized: Only administrators can update rank pricing.' };
  }

  if (!Array.isArray(updatedRanks) || updatedRanks.length === 0) {
    return { success: false, error: 'At least one rank must be provided.' };
  }

  // Validate each rank
  for (const r of updatedRanks) {
    if (!r.name || !r.name.trim()) {
      return { success: false, error: `Rank ${r.id} must have a valid name.` };
    }
    if (typeof r.basePrice !== 'number' || isNaN(r.basePrice) || r.basePrice < 0) {
      return { success: false, error: `Price for ${r.name} must be a valid positive number.` };
    }
  }

  const currentState = loadRankCalculatorState();
  const newState = {
    ...currentState,
    ranks: updatedRanks,
  };

  const saved = saveRankCalculatorState(newState);
  if (!saved) {
    return { success: false, error: 'Failed to persist rank calculator state.' };
  }

  return { success: true };
}
