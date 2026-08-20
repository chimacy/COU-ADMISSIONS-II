import React from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
      <div className="glass-card p-10 text-center max-w-sm">
        <GraduationCap className="h-10 w-10 text-primary-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold font-display text-slate-800 dark:text-white mb-2">404</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Page not found.</p>
        <Link to="/" className="btn-primary inline-flex">Back to Home</Link>
      </div>
    </div>
  )
}
