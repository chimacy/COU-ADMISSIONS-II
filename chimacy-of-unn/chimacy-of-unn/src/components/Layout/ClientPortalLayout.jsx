import React from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, MessageCircle } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { buildWhatsAppLink } from '../../utils/whatsapp.js'

export default function ClientPortalLayout({ children }) {
  const { settings } = useSettings()

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <header className="border-b border-primary-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 brand-surface overflow-hidden">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.company_name} className="h-full w-full object-cover" loading="eager" />
              ) : (
                <GraduationCap className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-slate-800 dark:text-white truncate">{settings.company_name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{settings.institution_name}</p>
            </div>
          </Link>

          {settings.whatsapp_number && (
            <a
              href={buildWhatsAppLink(settings.whatsapp_number, 'Hello, I would like to know more about your admission assistance service.')}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !bg-emerald-600 !px-3 sm:!px-4 shrink-0"
              style={{ background: '#16a34a' }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat on WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-primary-100 dark:border-slate-800 py-6 mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400 space-y-1">
          <p>&copy; {new Date().getFullYear()} {settings.company_name}. {settings.institution_name}.</p>
          <p><Link to="/track-request" className="hover:underline">Track a request</Link></p>
        </div>
      </footer>
    </div>
  )
}
