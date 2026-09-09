import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },

    realtime: {
      // Keep the realtime connection from hanging indefinitely.
      timeout: 10000,

      // Supabase automatically reconnects after temporary failures.
      reconnectAfterMs: (tries) => {
        const delays = [1000, 2000, 5000, 10000]
        return delays[tries - 1] || 10000
      },
    },

    global: {
      headers: {
        'x-application-name': 'cou-admission-service',
      },
    },
  }
)
