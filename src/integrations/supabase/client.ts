import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      // Return a mock client that won't crash
      return {
        from: () => ({
          select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
        }),
        functions: {
          invoke: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        },
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
      } as unknown as SupabaseClient;
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseClient() as any)[prop];
  },
});
