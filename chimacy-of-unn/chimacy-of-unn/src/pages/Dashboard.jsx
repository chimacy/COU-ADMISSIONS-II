import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Users, FileText, Database, Settings as SettingsIcon,
  TrendingUp, CheckCircle2, Wallet, ArrowRight, CreditCard, Loader2, Inbox, Banknote,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { StatCard } from '../components/UI/Badge.jsx'
import { getQuotations, getProgrammes, getRequests, getAllCommissions } from '../utils/db.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
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
  const { isSuperAdmin } = useAuth()
  const [quotations, setQuotations] = useState([])
  const [commissions, setCommissions] = useState([])
  const [programmeCount, setProgrammeCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    Promise.all([getQuotations(), getProgrammes(), getRequests(), getAllCommissions()])
      .then(([q, p, r, c]) => {
        setQuotations(q)
        setProgrammeCount(p.length)
        setPendingRequests(r.filter((x) => x.status === 'PENDING' || x.status === 'UNDER_REVIEW').length)
        setCommissions(c)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!isSuperAdmin) return undefined
    const channel = supabase
      .channel('super-admin-dashboard-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=is.null',
        },
        () => { refresh() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  const stats = useMemo(() => {
    const total = quotations.length
    const eligible = quotations.filter((q) => q.status === STATUS.ELIGIBLE || q.status === STATUS.ELIGIBLE_DOUBLE).length
    const paidClients = quotations.filter((q) => q.paid)
    const totalCollected = quotations.reduce((sum, q) => sum + (Number(q.paidAmount) || 0), 0)
    const amountRemaining = quotations.reduce((sum, q) => sum + Math.max(0, (Number(q.price) || 0) - (Number(q.paidAmount) || 0)), 0)
    const paidCommissions = commissions.filter((c) => c.status === 'PAID')
    const commissionsPaidTotal = paidCommissions.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0)
    return {
      total, eligible, paidCount: paidClients.length, totalCollected, amountRemaining, commissionsPaidCount: paidCommissions.length, commissionsPaidTotal,
    }
  }, [quotations, commissions])

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
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-800">
              Welcome to {settings.company_name}
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
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
          <StatCard icon={Wallet} label="Amount Collected" value={formatCurrency(stats.totalCollected, settings.currency_symbol)} accent="primary" />
          <button onClick={() => navigate('/admin/administrators')} className="text-left">
            <StatCard
              icon={Banknote}
              label="Commissions Paid"
              value={`${stats.commissionsPaidCount} · ${formatCurrency(stats.commissionsPaidTotal, settings.currency_symbol)}`}
              accent="emerald"
            />
          </button>
          <StatCard icon={Wallet} label="Amount Remaining" value={formatCurrency(stats.amountRemaining, settings.currency_symbol)} accent="gold" />
          <StatCard icon={Database} label="Programmes" value={programmeCount} accent="accent" />
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Quick Actions</h3>
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
                  <p className="font-semibold text-slate-800">{label}</p>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-primary-600 transition-all" />
                </div>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-display text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-600" /> Recent Quotations
              </h3>
              <button onClick={() => navigate('/admin/clients')} className="text-xs font-semibold text-primary-700 hover:underline">View all</button>
            </div>
            {recent.length === 0 ? (
              <EmptyState navigate={navigate} />
            ) : (
              <div className="space-y-2">
                {recent.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/admin/clients?open=${q.id}`)}
                    className="w-full text-left glass-panel p-3 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 truncate">{q.clientName}</p>
                      <span className={`badge !text-[10px] ${statusBadgeStyle(q.status)}`}>{q.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{q.programme} &middot; {formatCurrency(q.price, settings.currency_symbol)} &middot; {formatDate(q.date)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-display text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary-600" /> Recently Paid
              </h3>
              <button onClick={() => navigate('/admin/payments')} className="text-xs font-semibold text-primary-700 hover:underline">View all</button>
            </div>
            {recentPaid.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPaid.map((q) => (
                  <div key={q.id} className="glass-panel p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 truncate">{q.clientName}</p>
                      <span className="badge bg-emerald-100 text-emerald-700">Paid</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
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
      <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-500">No quotations yet. Create your first client to get started.</p>
      <button onClick={() => navigate('/admin/new-client')} className="btn-primary mt-4">
        <UserPlus className="h-4 w-4" /> New Client
      </button>
    </div>
  )
}
