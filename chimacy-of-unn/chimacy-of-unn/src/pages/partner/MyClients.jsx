import React, { useEffect, useMemo, useState } from 'react'
import { Search, Loader2, Users } from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import { getMyClients } from '../../utils/db.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { statusBadgeStyle } from '../../utils/evaluation.js'
import { useSettings } from '../../context/SettingsContext.jsx'

/**
 * Serves both "My Clients" and "My Requests" in the Partner sidebar - in
 * this data model a Partner's client record and their admission request are
 * the same underlying record, so this single component covers both menu
 * items rather than duplicating the same list twice.
 */
export default function MyClients({ title = 'My Clients' }) {
  const { settings } = useSettings()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getMyClients().then(setClients).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.clientName, c.quotationNumber, c.programme].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
  }, [clients, query])

  return (
    <DashboardLayout title={title}>
      <div className="space-y-5">
        <Card className="!p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your clients..." className="input-field !pl-10" />
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                {clients.length === 0 ? 'No clients registered yet.' : 'No clients match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Fee</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.clientName}</td>
                      <td className="px-4 py-3 text-slate-600">{c.programme}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusBadgeStyle(c.status)}`}>{c.status}</span></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatCurrency(c.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3">
                        {c.paid ? (
                          <span className="badge bg-emerald-100 text-emerald-700">Paid</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(c.date)}</td>
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
