import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardCheck, MessageCircle, ShieldCheck, TrendingUp, ArrowRight, ScrollText, ChevronDown, ChevronUp,
} from 'lucide-react'
import ClientPortalLayout from '../../components/Layout/ClientPortalLayout.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { buildWhatsAppLink } from '../../utils/whatsapp.js'
import TermsList from './TermsList.jsx'

const steps = [
  { icon: ClipboardCheck, title: 'Check Your Eligibility', desc: 'Enter your JAMB score, subjects, and O\'Level results. We calculate your aggregate instantly.' },
  { icon: TrendingUp, title: 'See Your Assessment', desc: 'Get a clear result: your programme grade, applicable package, and estimated service fee.' },
  { icon: MessageCircle, title: 'Request Assistance', desc: 'Accept our terms and submit a request. We follow up with you directly on WhatsApp.' },
]

export default function Landing() {
  const { settings } = useSettings()
  const [termsOpen, setTermsOpen] = useState(false)

  return (
    <ClientPortalLayout>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
        <div className="h-16 w-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg brand-surface">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold font-display text-slate-800 dark:text-white mb-3">
          {settings.company_name}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8">
          Professional admission assistance for {settings.institution_name}. Check your eligibility, understand your options, and get expert guidance through the admission process.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/check-eligibility" className="btn-primary !text-base !px-6 !py-3">
            Check Eligibility <ArrowRight className="h-4 w-4" />
          </Link>
          {settings.whatsapp_number && (
            <a
              href={buildWhatsAppLink(settings.whatsapp_number, 'Hello, I would like to know more about your admission assistance service.')}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary !text-base !px-6 !py-3"
            >
              <MessageCircle className="h-4 w-4" /> Chat With Us
            </a>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-lg font-bold font-display text-slate-800 dark:text-white text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map(({ icon: Icon, title, desc }, idx) => (
            <div key={title} className="glass-card p-6 text-center">
              <div className="h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center brand-surface">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <p className="font-semibold text-sm text-slate-800 dark:text-white mb-1">{idx + 1}. {title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer / terms teaser */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="glass-panel p-5">
          <div className="flex gap-3">
            <ScrollText className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Terms &amp; Disclaimer</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Eligibility assessment is based on the information and assessment criteria currently configured on this platform. It does not constitute a guarantee of admission. Final admission remains subject to the relevant institution's admission requirements, policies and available spaces.
              </p>
              <button onClick={() => setTermsOpen((o) => !o)} className="text-xs font-semibold text-primary-700 dark:text-primary-400 mt-2 inline-flex items-center gap-1">
                {termsOpen ? 'Hide full terms' : 'View full terms & conditions'}
                {termsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {termsOpen && (
                <div className="mt-4 pt-4 border-t border-primary-100 dark:border-slate-700">
                  <TermsList compact />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <Link to="/check-eligibility" className="btn-primary !text-base !px-8 !py-3">
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </ClientPortalLayout>
  )
}
