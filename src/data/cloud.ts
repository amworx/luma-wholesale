import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '@/types';

/**
 * Cloud sync configuration.
 *
 * The URL and publishable (public, safe-to-expose) key are baked in so the
 * demo works on every device with no setup. Publishable keys are designed to
 * be shipped in browsers; database access is controlled by RLS policies.
 * See docs/CLOUD_SYNC.md for the security model and how to point at your own
 * Supabase project.
 */
const URL = 'https://dymkqaxrnmiveshhakan.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_pklhCJqPaGCGsp8CYES7-g_5mFPVFH8';
const ROW_ID = 'main';

export const cloudEnabled = Boolean(URL && PUBLISHABLE_KEY);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(URL, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface CloudRow {
  id: string;
  data: AppData;
  updated_at: string;
}

/** Fetch the shared document. Returns null when offline or empty. */
export async function fetchCloud(): Promise<CloudRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('luma_store')
    .select('id, data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as CloudRow;
}

/** Write the whole shared document. `expectedUpdatedAt` guards against a
 *  stale device overwriting a newer change (optimistic concurrency). */
export async function saveCloud(
  payload: AppData,
  expectedUpdatedAt: string | null
): Promise<{ ok: boolean; row?: CloudRow; conflict?: boolean }> {
  if (!supabase) return { ok: false };

  if (expectedUpdatedAt) {
    const { data, error } = await supabase
      .from('luma_store')
      .update({ data: payload as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('id', ROW_ID)
      .eq('updated_at', expectedUpdatedAt)
      .select('id, data, updated_at')
      .maybeSingle();
    if (!error && data) return { ok: true, row: data as unknown as CloudRow };
    // Either a conflict or a network error; re-read to tell them apart.
    const current = await fetchCloud();
    if (current && current.updated_at !== expectedUpdatedAt) return { ok: false, conflict: true, row: current };
    return { ok: false };
  }

  const { data, error } = await supabase
    .from('luma_store')
    .upsert(
      { id: ROW_ID, data: payload as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select('id, data, updated_at')
    .maybeSingle();
  if (error || !data) return { ok: false };
  return { ok: true, row: data as unknown as CloudRow };
}

/** Subscribe to remote changes. Returns an unsubscribe function. */
export function subscribeCloud(onChange: (row: CloudRow) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('luma-store-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'luma_store' }, (payload) => {
      const row = (payload.new || payload.old) as CloudRow | undefined;
      if (row?.id === ROW_ID && payload.eventType !== 'DELETE' && row.data) onChange(row);
    })
    .subscribe();
  return () => { void supabase?.removeChannel(channel); };
}
