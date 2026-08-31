import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId, userEmail) => {
    if (!userId) {
      setProfile(null)
      return
    }
    let { data } = await supabase.from('admin_profiles').select('*').eq('id', userId).maybeSingle()

    if (!data) {
      // First time this person has logged in - auto-provision their profile.
      // A database trigger makes the very first admin_profiles row ever
      // created a super_admin automatically (bootstrap); every profile
      // after that defaults to 'partner' until a super admin changes it.
      const { data: created } = await supabase
        .from('admin_profiles')
        .insert({ id: userId, display_name: userEmail?.split('@')[0] || 'User' })
        .select()
        .maybeSingle()
      data = created
    } else {
      supabase.from('admin_profiles').update({ last_login: new Date().toISOString() }).eq('id', userId).then(() => {})
    }
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id, newSession.user.email)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setSession(data.session)
    return data
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = {
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    isSuperAdmin: profile?.role === 'super_admin' && profile?.status === 'active',
    isPartner: profile?.role === 'partner' && profile?.status === 'active',
    isActive: profile ? profile.status === 'active' : true,
    isAuthenticated: !!session,
    loading,
    login,
    logout,
    refetchProfile: () => (session?.user ? loadProfile(session.user.id, session.user.email) : Promise.resolve()),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
