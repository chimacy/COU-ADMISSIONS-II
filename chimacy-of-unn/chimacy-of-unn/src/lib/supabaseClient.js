import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('SUPABASE URL:', supabaseUrl)
console.log(
  'SUPABASE KEY EXISTS:',
  Boolean(supabaseAnonKey)
)
console.log(
  'SUPABASE KEY LENGTH:',
  supabaseAnonKey?.length || 0
)

export const isSupabaseConfigured =
  Boolean(supabaseUrl?.trim()) &&
  Boolean(supabaseAnonKey?.trim())

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
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
      timeout: 10000,

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
