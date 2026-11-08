/**
 * Lazy Supabase client. The social layer boots only when both env vars are
 * present, so the city runs perfectly without it (and the main bundle stays
 * lean — supabase-js is pulled in as a separate chunk on first use).
 *
 * Configure via Vercel/`.env`:
 *   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>   (or VITE_SUPABASE_ANON_KEY)
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
// Accept both the legacy anon key name and the newer publishable key name.
// `||` (not `??`) so an empty legacy var falls through to the publishable one.
const key = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '',
).trim()

export const socialEnabled = Boolean(url && key)

let clientPromise: Promise<SupabaseClient> | null = null

/** Resolves the shared client (dynamic import keeps it out of the cold path). */
export function supabase(): Promise<SupabaseClient> {
  if (!socialEnabled) {
    return Promise.reject(
      new Error('SOCIAL OFFLINE // set VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY'),
    )
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then((m) =>
      m.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
        realtime: { params: { eventsPerSecond: 12 } },
      }),
    )
  }
  return clientPromise
}
