import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId, userEmail, touchLogin = false) => {
    if (!userId) {
      setProfile(null)
      return
    }
    let { data } = await supabase.from('admin_profiles').select('*').eq('id', userId).maybeSingle()

    if (!data) {
      const { data: created } = await supabase
        .from('admin_profiles')
        .insert({ id: userId, display_name: userEmail?.split('@')[0] || 'User' })
        .select()
        .maybeSingle()
      data = created
    } else if (touchLogin) {
      // IMPORTANT: last_login is only ever touched here, and only when
      // `touchLogin` is explicitly true (a real sign-in action) - NOT on
      // every page load/refresh, which just restores an existing session.
      // Previously this ran unconditionally, which meant a Partner simply
      // refreshing their browser looked identical to a fresh login and
      // triggered a "Partner logged in" notification every single time.
      const { data: touched } = await supabase
        .from('admin_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .maybeSingle()
      if (touched) data = touched
    }
    setProfile(data)
  }, [])

  useEffect(() => {
    // Restoring a session on page load/refresh - never touches last_login.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user.email, false).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        // Only a genuine SIGNED_IN event (the person just typed their
        // password and clicked Sign In) counts as a real login - events
        // like INITIAL_SESSION and TOKEN_REFRESHED fire on ordinary page
        // loads and must never be mistaken for a fresh login.
        loadProfile(newSession.user.id, newSession.user.email, event === 'SIGNED_IN')
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
    refetchProfile: () => (session?.user ? loadProfile(session.user.id, session.user.email, false) : Promise.resolve()),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
