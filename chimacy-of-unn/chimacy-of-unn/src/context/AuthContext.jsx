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

    let { data } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!data) {
      const { data: created } = await supabase
        .from('admin_profiles')
        .insert({
          id: userId,
          display_name: userEmail?.split('@')[0] || 'User',
        })
        .select()
        .maybeSingle()

      data = created
    }

    setProfile(data)
  }, [])

  useEffect(() => {
    // Restore an existing session on page load/refresh.
    // IMPORTANT: This NEVER updates last_login.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)

      if (data.session?.user) {
        loadProfile(
          data.session.user.id,
          data.session.user.email,
        ).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession)

        if (newSession?.user) {
          // Auth state changes such as INITIAL_SESSION,
          // TOKEN_REFRESHED, and session restoration must NEVER
          // update last_login or create a login notification.
          loadProfile(
            newSession.user.id,
            newSession.user.email,
          )
        } else {
          setProfile(null)
        }
      },
    )

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If login failed, do absolutely nothing else.
    if (error) throw error

    // The login was successful.
    setSession(data.session)

    // IMPORTANT:
    // This is now the ONLY place in the application where
    // last_login is updated.
    //
    // Therefore, the existing database notification mechanism
    // can only interpret an actual successful Sign In as a login.
    if (data.user) {
      const { data: updatedProfile } = await supabase
        .from('admin_profiles')
        .update({
          last_login: new Date().toISOString(),
        })
        .eq('id', data.user.id)
        .select()
        .maybeSingle()

      if (updatedProfile) {
        setProfile(updatedProfile)
      } else {
        await loadProfile(
          data.user.id,
          data.user.email,
        )
      }
    }

    return data
  }, [loadProfile])

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
    isSuperAdmin:
      profile?.role === 'super_admin' &&
      profile?.status === 'active',
    isPartner:
      profile?.role === 'partner' &&
      profile?.status === 'active',
    isActive: profile ? profile.status === 'active' : true,
    isAuthenticated: !!session,
    loading,
    login,
    logout,
    refetchProfile: () => (
      session?.user
        ? loadProfile(session.user.id, session.user.email)
        : Promise.resolve()
    ),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}
