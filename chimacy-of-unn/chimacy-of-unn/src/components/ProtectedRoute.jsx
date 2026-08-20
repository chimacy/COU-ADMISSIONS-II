import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const {
    isAuthenticated, isSuperAdmin, isActive, loading, logout,
  } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
        <div className="text-center max-w-sm">
          <ShieldAlert className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold font-display text-slate-800 dark:text-white mb-1">Account deactivated</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Your admin access has been deactivated. Contact a super admin if this is unexpected.</p>
          <button onClick={logout} className="btn-secondary">Sign Out</button>
        </div>
      </div>
    )
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
        <div className="text-center max-w-sm">
          <ShieldAlert className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold font-display text-slate-800 dark:text-white mb-1">Super Admin only</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">You don't have permission to view this page. Contact a super admin if you need access.</p>
        </div>
      </div>
    )
  }

  return children
}
