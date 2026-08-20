import React, {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react'
import { supabase } from '../lib/supabaseClient.js'

const SettingsContext = createContext(null)

// Fallback shown only for the brief moment before the first Supabase fetch
// resolves (or if the network request fails) - never persisted anywhere.
const FALLBACK_SETTINGS = {
  id: 1,
  company_name: 'CHIMACY OF UNN',
  tagline: 'Your Trusted Admission Consulting Partner',
  institution_name: 'University of Nigeria, Nsukka',
  phone: '',
  email: '',
  address: '',
  logo_url: '',
  signature_url: '',
  footer_text: 'This quotation is generated electronically and is valid for 14 days from the date of issue.',
  currency: 'NGN',
  currency_symbol: '\u20a6',
  primary_color: '#15803d',
  accent_color: '#facc15',
  secondary_color: '#16a34a',
  whatsapp_number: '',
  website: '',
  flutterwave_public_key: '',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
    if (!error && data) {
      setSettings(data)
      applyThemeColors(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()

    // Realtime subscription: any admin, on any device, who edits Settings
    // instantly pushes the change to every other open session - this is what
    // makes branding "permanent and consistent no matter where it's logged
    // into" rather than a per-device localStorage value.
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        setSettings(payload.new)
        applyThemeColors(payload.new)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSettings])

  const updateSettings = useCallback(async (patch) => {
    const { data, error } = await supabase
      .from('settings')
      .update(patch)
      .eq('id', 1)
      .select()
      .single()
    if (error) throw error
    setSettings(data)
    applyThemeColors(data)
    return data
  }, [])

  const uploadBrandingImage = useCallback(async (file, kind) => {
    // kind: 'logo' | 'signature'
    const ext = file.name.split('.').pop()
    const path = `${kind}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('branding').upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('branding').getPublicUrl(path)
    return data.publicUrl
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, uploadBrandingImage, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

// Pushes the admin-configured brand color into CSS variables so the whole
// Tailwind theme (buttons, badges, active nav states, etc.) reflects it
// without a rebuild - true "configure once, permanent everywhere" branding.
function applyThemeColors(data) {
  if (!data) return
  const root = document.documentElement
  if (data.primary_color) root.style.setProperty('--color-brand-primary', data.primary_color)
  if (data.accent_color) root.style.setProperty('--color-brand-accent', data.accent_color)
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
