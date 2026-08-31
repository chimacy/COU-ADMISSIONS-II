import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Inbox, Wallet, UserPlus, Sparkles, Loader2, ArrowRight, CreditCard,
} from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import { StatCard } from '../../components/UI/Badge.jsx'
import { getMyClients, getMyCommissions } from '../../utils/db.js'
import { formatCurrency } from '../../utils/format.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { STATUS } from '../../utils/evaluation.js'

export default function PartnerHome() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [clients, setClients] = useState([])
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMyClients(), getMyCommissions()])
      .then(([c, com]) => { setClients(c); setCommissions(com) })
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const activeRequests = clients.filter((c) => !c.paid).length
    const pendingPayments = clients.filter((c) => (c.status === STATUS.ELIGIBLE || c.status === STATUS.ELIGIBLE_DOUBLE) && !c.paid).length
    const pendingCommission = commissions.filter((c) => c.status === 'AWAITING_APPROVAL').reduce((s, c) => s + Number(c.commission_amount), 0)
    const approvedCommission = commissions.filter((c) => c.status === 'APPROVED').reduce((s, c) => s + Number(c.commission_amount), 0)
    const paidCommission = commissions.filter((c) => c.status === 'PAID').reduce((s, c) => s + Number(c.commission_amount), 0)
    return {
      totalClients: clients.length, activeRequests, pendingPayments, pendingCommission, approvedCommission, paidCommission,
    }
  }, [clients, commissions])

  if (loading) {
    return (
      <DashboardLayout title="My Dashboard">
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Dashboard">
      <div className="space-y-6">
        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-xl font-bold font-display text-slate-800">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1">Here's how your referred clients and commissions are doing.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="My Clients" value={stats.totalClients} accent="primary" />
          <StatCard icon={Inbox} label="Active Requests" value={stats.activeRequests} accent="gold" />
          <StatCard icon={CreditCard} label="Pending Payments" value={stats.pendingPayments} accent="accent" />
          <StatCard icon={Wallet} label="Pending Commission" value={formatCurrency(stats.pendingCommission, settings.currency_symbol)} accent="gold" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Wallet} label="Approved Commission" value={formatCurrency(stats.approvedCommission, settings.currency_symbol)} accent="emerald" />
          <StatCard icon={Wallet} label="Paid Commission" value={formatCurrency(stats.paidCommission, settings.currency_symbol)} accent="primary" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => navigate('/partner/new-client')} className="glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">Register New Client</p>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Add a new client under your referrals</p>
          </button>
          <button onClick={() => navigate('/partner/eligibility-checker')} className="glass-card p-5 text-left hover:-translate-y-1 hover:shadow-xl transition-all">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">Eligibility Checker</p>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Check a programme's fee and eligibility</p>
          </button>
        </div>

        <Card>
          <h3 className="font-bold font-display text-slate-800 mb-4">Recent Clients</h3>
          {clients.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No clients registered yet.</p>
          ) : (
            <div className="space-y-2">
              {clients.slice(0, 5).map((c) => (
                <div key={c.id} className="glass-panel p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.clientName}</p>
                    <p className="text-xs text-slate-500 truncate">{c.programme}</p>
                  </div>
                  <span className="badge bg-primary-50 text-primary-700 !text-[10px]">{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
