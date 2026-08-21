import React, { memo } from 'react'
import { Menu } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import NotificationBell from './NotificationBell.jsx'

function Topbar({ onMenuClick, title }) {
  const { settings } = useSettings()

  return (
    <header className="sticky top-0 z-30 lg:pt-3 lg:px-3">
      <div className="glass-chrome !rounded-none lg:!rounded-2xl flex items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="btn-ghost !p-2 rounded-full lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white truncate">
              {title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {settings.company_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationBell />
          <div className="hidden sm:flex h-9 w-9 rounded-full items-center justify-center text-white text-xs font-bold shadow-sm brand-surface overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.company_name} className="h-full w-full object-cover" loading="eager" decoding="async" />
            ) : (
              initials(settings.company_name)
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function initials(name) {
  if (!name) return 'CU'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

export default memo(Topbar)
