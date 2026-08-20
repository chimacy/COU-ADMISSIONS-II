import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Users, FileText, Database, Settings as SettingsIcon,
  TrendingUp, CheckCircle2, AlertTriangle, Wallet, ArrowRight, CreditCard, Loader2, Inbox,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { StatCard } from '../components/UI/Badge.jsx'
import { getQuotations, getProgrammes, getRequests } from '../utils/db.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { STATUS, statusBadgeStyle } from '../utils/evaluation.js'

const actions = [
  { to: '/admin/requests', label: 'Assistance Requests', desc: 'Review new client requests', icon: Inbox, accent: 'gold' },
  { to: '/admin/new-client', label: 'New Client', desc: 'Register a new prospect', icon: UserPlus, accent: 'primary' },
  { to: '/admin/clients', label: 'Client Records', desc: 'View & manage all clients', icon: Users, accent: 'accent' },
  { to: '/admin/quotation', label: 'Generate Quotation', desc: 'Create a PDF quotation', icon: FileText, accent: 'gold' },
  { to: '/admin/payments', label: 'Checkout & Invoices', desc: 'Record payments, generate invoices', icon: CreditCard, accent: 'emerald' },
  { to: '/admin/pricing', label: 'Pricing Database', desc: 'Browse programmes & fees', icon: Database, accent: 'primary' },
  { to: '/admin/settings', label: 'Settings', desc: 'Company & branding setup', icon: SettingsIcon, accent: 'accent' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [quotations, setQuotations] = useState([])
  const [programmeCount, setProgrammeCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getQuotations(), getProgrammes(), getRequests()])
      .then(([q, p, r]) => {
        setQuotations(q)
        setProgrammeCount(p.length)
        setPendingRequests(r.filter((x) => x.status === 'PENDING' || x.status === 'UNDER_REVIEW').length)
      })
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const total = quotations.length
    const eligible = quotations.filter((q) => q.status === STATUS.ELIGIBLE || q.status === STATUS.ELIGIBLE_DOUBLE).length
    const notEligible = quotations.filter((q) => q.status === STATUS.NOT_ELIGIBLE).length
    const paidClients = quotations.filter((q) => q.paid)
    const totalCollected = paidClients.reduce((sum, q) => sum + (Number(q.paidAmount) || 0), 0)
    const pipelineValue = quotations.filter((q) => !q.paid).reduce((sum, q) => sum + (Number(q.price) || 0), 0)
    return {
      total, eligible, notEligible, paidCount: paidClients.length, totalCollected, pipelineValue,
    }
  }, [quotations])

  const recent = quotations.slice(0, 5)
  const recentPaid = quotations.filter((q) => q.paid).slice(0, 5)

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="glass-card p-6 sm:p-8 relative overflow-hidden animate-fade-in">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary-300/40 to-accent-300/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-800 dark:text-white">
              Welcome to {settings.company_name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Generate accurate, professional admission quotations for {settings.institution_name} in seconds — powered by your internal pricing guide and benchmark rules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => navigate('/admin/requests')} className="text-left">
            <StatCard icon={Inbox} label="Pending Requests" value={pendingRequests} accent="gold" />
          </button>
          <StatCard icon={FileText} label="Total Quotations" value={stats.total} accent="primary" />
          <StatCard icon={CheckCircle2} label="Eligible Clients" value={stats.eligible} accent="emerald" />
          <StatCard icon={CreditCard} label="Clients Paid" value={stats.paidCount} accent="accent" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Wallet} label="Total Collected" value={formatCurrency(stats.totalCollected, settings.currency_symbol)} accent="primary" />
          <StatCard icon={AlertTriangle} label="Below Benchmark" value={stats.notEligible} accent="gold" />
          <StatCard icon={Wallet} label="Outstanding Pipeline" value={formatCurrency(stats.pipelineValue, settings.currency_symbol)} accent="accent" />
          <StatCard icon={Database} label="Programmes" value={programmeCount} accent="primary" />
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map(({ to, label, desc, icon: Icon, accent }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-200 group"
              >
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-3 ${
                  accent === 'primary' ? 'bg-gradient-to-br from-primary-600 to-primary-700'
                    : accent === 'accent' ? 'bg-gradient-to-br from-accent-400 to-accent-600'
                    : accent === 'gold' ? 'bg-gradient-to-br from-gold-400 to-gold-600'
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                } shadow-lg`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 dark:text-white">{label}</p>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-primary-600 transition-all" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-600" /> Recent Quotations
              </h3>
              <button onClick={() => navigate('/admin/clients')} className="text-xs font-semibold text-primary-700 dark:text-primary-400 hover:underline">View all</button>
            </div>
            {recent.length === 0 ? (
              <EmptyState navigate={navigate} />
            ) : (
              <div className="space-y-2">
                {recent.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/admin/clients?open=${q.id}`)}
                    className="w-full text-left glass-panel p-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{q.clientName}</p>
                      <span className={`badge !text-[10px] ${statusBadgeStyle(q.status)}`}>{q.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{q.programme} &middot; {formatCurrency(q.price, settings.currency_symbol)} &middot; {formatDate(q.date)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary-600" /> Recently Paid
              </h3>
              <button onClick={() => navigate('/admin/payments')} className="text-xs font-semibold text-primary-700 dark:text-primary-400 hover:underline">View all</button>
            </div>
            {recentPaid.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPaid.map((q) => (
                  <div key={q.id} className="glass-panel p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{q.clientName}</p>
                      <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">Paid</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {formatCurrency(q.paidAmount, settings.currency_symbol)} &middot; {q.paymentMethod} &middot; {formatDate(q.paidDate)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

function EmptyState({ navigate }) {
  return (
    <div className="text-center py-10">
      <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
      <p className="text-sm text-slate-500 dark:text-slate-400">No quotations yet. Create your first client to get started.</p>
      <button onClick={() => navigate('/admin/new-client')} className="btn-primary mt-4">
        <UserPlus className="h-4 w-4" /> New Client
      </button>
    </div>
  )
}
