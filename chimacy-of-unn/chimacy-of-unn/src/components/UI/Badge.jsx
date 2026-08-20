import React from 'react'

export function Badge({ children, className = '' }) {
  return <span className={`badge ${className}`}>{children}</span>
}

export function StatCard({ icon: Icon, label, value, accent = 'primary' }) {
  const accents = {
    primary: 'from-primary-500 to-primary-600',
    accent: 'from-accent-500 to-accent-600',
    gold: 'from-gold-400 to-gold-600',
    emerald: 'from-emerald-500 to-emerald-600',
  }
  return (
    <div className="glass-card p-5 flex items-center gap-4 animate-slide-up">
      <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${accents[accent] || accents.primary} flex items-center justify-center shadow-lg`}>
        {Icon && <Icon className="h-6 w-6 text-white" strokeWidth={2} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-bold font-display text-slate-800 dark:text-white truncate">{value}</p>
      </div>
    </div>
  )
}
