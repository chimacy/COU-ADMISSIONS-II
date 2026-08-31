import React, { useEffect, useState } from 'react'
import { Wallet, Loader2 } from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import { getMyCommissions } from '../../utils/db.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const STATUS_LABELS = {
  AWAITING_APPROVAL: 'Awaiting Approval',
  APPROVED: 'Approved',
  PAID: 'Paid',
}
const STATUS_COLORS = {
  AWAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
}

export default function PartnerCommissions() {
  const { settings } = useSettings()
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyCommissions().then(setCommissions).finally(() => setLoading(false))
  }, [])

  const totals = commissions.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + Number(c.commission_amount)
    return acc
  }, {})

  return (
    <DashboardLayout title="My Commissions">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['AWAITING_APPROVAL', 'APPROVED', 'PAID'].map((status) => (
            <Card key={status} className="text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-bold font-display text-primary-700 mt-1">{formatCurrency(totals[status] || 0, settings.currency_symbol)}</p>
            </Card>
          ))}
        </div>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No commissions yet. These are generated automatically once a client you referred has their payment confirmed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">Commission</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(c.commission_amount, settings.currency_symbol)}</td>
                      <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span></td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
