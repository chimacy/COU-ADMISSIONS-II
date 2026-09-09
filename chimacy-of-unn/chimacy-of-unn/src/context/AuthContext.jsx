import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load the user's profile only.
  // IMPORTANT: This function NEVER updates last_login.
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
    // Restore an existing session on page load or refresh.
    // This MUST NOT update last_login.
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
          // IMPORTANT:
          // Auth state events such as INITIAL_SESSION,
          // TOKEN_REFRESHED, and session restoration only load
          // the profile. They NEVER update last_login.
          //
          // This prevents a Partner opening or refreshing the
          // Partner page from generating a login notification.
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
    // Authenticate first.
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Failed login:
    // Do NOT update last_login and do NOT trigger a login notification.
    if (error) throw error

    // Authentication succeeded.
    setSession(data.session)

    // IMPORTANT:
    // This is the ONLY place in AuthContext where last_login
    // is updated.
    //
    // Therefore, the "Partner logged in" database notification
    // can only be triggered by an actual successful Sign In.
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
        // If the profile somehow does not exist yet,
        // loadProfile will create/load it as before.
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

    isActive:
      profile ? profile.status === 'active' : true,

    isAuthenticated: !!session,
    loading,

    login,
    logout,

    refetchProfile: () => (
      session?.user
        ? loadProfile(
            session.user.id,
            session.user.email,
          )
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
