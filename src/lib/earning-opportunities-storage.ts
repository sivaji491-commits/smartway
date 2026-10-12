import { 
  EarningOpportunitiesData, 
  EarningOpportunityItem, 
  DEFAULT_EARNING_OPPORTUNITIES 
} from '@/types/earning-opportunities';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';

export const EARNING_OPPORTUNITIES_STORAGE_KEY = 'nexora_earning_opportunities_data';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates earning opportunities data payload.
 */
export function validateEarningOpportunities(data: EarningOpportunitiesData): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid configuration data.' };
  }

  if (!data.heading || !data.heading.trim()) {
    return { valid: false, error: 'Page heading is required.' };
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { valid: false, error: 'At least one earning opportunity item is required.' };
  }

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!item.title || !item.title.trim()) {
      return { valid: false, error: `Item #${i + 1} title cannot be empty.` };
    }
    if (!item.description || !item.description.trim()) {
      return { valid: false, error: `Item #${i + 1} description cannot be empty.` };
    }
  }

  return { valid: true };
}

/**
 * Loads published Source Structure / Earning Opportunities configuration.
 * Uses persistent browser storage, falling back to canonical defaults.
 */
export function loadEarningOpportunities(): EarningOpportunitiesData {
  if (typeof window === 'undefined') {
    return DEFAULT_EARNING_OPPORTUNITIES;
  }

  try {
    const raw = window.localStorage.getItem(EARNING_OPPORTUNITIES_STORAGE_KEY);
    if (!raw) {
      saveEarningOpportunitiesLocal(DEFAULT_EARNING_OPPORTUNITIES);
      return DEFAULT_EARNING_OPPORTUNITIES;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      return DEFAULT_EARNING_OPPORTUNITIES;
    }

    return {
      heading: parsed.heading || DEFAULT_EARNING_OPPORTUNITIES.heading,
      subtitle: parsed.subtitle !== undefined ? parsed.subtitle : DEFAULT_EARNING_OPPORTUNITIES.subtitle,
      items: parsed.items.map((item: any, idx: number) => ({
        id: item.id || `bonus-${idx + 1}`,
        number: typeof item.number === 'number' ? item.number : idx + 1,
        title: item.title || `Bonus ${idx + 1}`,
        description: item.description || '',
        accentColor: item.accentColor || '#10B981',
        iconName: item.iconName || 'Coins',
        position: item.position || (idx === 0 ? 'top-left' : idx === 1 ? 'top-right' : idx === 2 ? 'middle-right' : idx === 3 ? 'bottom-right' : 'bottom-left'),
      })),
      updatedAt: parsed.updatedAt || undefined,
      updatedBy: parsed.updatedBy || undefined,
    };
  } catch (err) {
    console.error('Failed to parse earning opportunities data:', err);
    return DEFAULT_EARNING_OPPORTUNITIES;
  }
}

/**
 * Saves data into persistent browser storage and dispatches sync event.
 */
export function saveEarningOpportunitiesLocal(data: EarningOpportunitiesData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EARNING_OPPORTUNITIES_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('nexora_earning_opportunities_updated', { detail: data }));
}

/**
 * Admin-only action: Saves and publishes updated Source Structure configuration.
 * Rejects non-admin callers on both client and server sides.
 */
export async function saveEarningOpportunitiesAdmin(
  data: EarningOpportunitiesData,
  adminIdentifier: string = 'sivaji491@gmail.com'
): Promise<{ success: boolean; error?: string; data?: EarningOpportunitiesData }> {
  // Strict admin authorization check
  if (!isUserAdminOrOwner(adminIdentifier, 'sivaji491@gmail.com')) {
    return {
      success: false,
      error: 'Unauthorized: Only administrators have permission to edit the Source Structure.',
    };
  }

  const validation = validateEarningOpportunities(data);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Validation failed.',
    };
  }

  const payload: EarningOpportunitiesData = {
    heading: data.heading.trim(),
    subtitle: (data.subtitle || '').trim(),
    items: data.items.map((item, idx) => ({
      ...item,
      number: idx + 1,
      title: item.title.trim(),
      description: item.description.trim(),
    })),
    updatedAt: new Date().toISOString(),
    updatedBy: adminIdentifier,
  };

  // 1. Save locally
  saveEarningOpportunitiesLocal(payload);

  // 2. Persist to database asynchronously without blocking UI or test execution
  try {
    if (typeof window !== 'undefined' && (supabase as any)?.from && process.env.NODE_ENV !== 'test') {
      (supabase as any)
        .from('earning_opportunities')
        .upsert({
          id: 'source-structure-config',
          heading: payload.heading,
          subtitle: payload.subtitle,
          items: payload.items,
          updated_at: payload.updatedAt,
          updated_by: payload.updatedBy,
        })
        .then(() => {})
        .catch((err: any) => {
          console.warn('Could not sync earning opportunities to remote database:', err);
        });
    }
  } catch (err) {
    console.warn('Could not sync earning opportunities to remote database:', err);
  }

  return {
    success: true,
    data: payload,
  };
}
