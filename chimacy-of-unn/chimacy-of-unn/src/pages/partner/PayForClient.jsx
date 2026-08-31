import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Loader2, Search, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import { getMyClients } from '../../utils/db.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { STATUS, statusBadgeStyle } from '../../utils/evaluation.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { payWithFlutterwave } from '../../utils/flutterwave.js'

export default function PayForClient() {
  const { settings } = useSettings()
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [payingId, setPayingId] = useState(null)
  const [justPaidIds, setJustPaidIds] = useState([])

  const refresh = () => {
    setLoading(true)
    getMyClients().then(setClients).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const eligibleUnpaid = useMemo(() => {
    let list = clients.filter((c) => (c.status === STATUS.ELIGIBLE || c.status === STATUS.ELIGIBLE_DOUBLE) && !c.paid)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => [c.clientName, c.quotationNumber].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
    return list
  }, [clients, query])

  function handlePay(client) {
    setPayingId(client.id)
    payWithFlutterwave({
      publicKey: settings.flutterwave_public_key,
      amount: client.price,
      email: client.email,
      phone: client.phone,
      name: client.clientName,
      quotationId: client.id,
      partnerId: user?.id,
      onVerified: () => {
        setJustPaidIds((ids) => [...ids, client.id])
        setPayingId(null)
      },
      onError: (err) => {
        alert(err.message || 'Payment could not be completed.')
        setPayingId(null)
      },
    })
  }

  return (
    <DashboardLayout title="Payment for Client">
      <div className="space-y-5">
        {!settings.flutterwave_public_key && (
          <Card className="!bg-amber-50 !p-4">
            <p className="text-sm text-amber-800">Online payment isn't configured yet. Contact your Super Admin to set up Flutterwave.</p>
          </Card>
        )}

        <Card className="!p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your clients..." className="input-field !pl-10" />
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : eligibleUnpaid.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No clients awaiting payment right now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleUnpaid.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.clientName}</td>
                      <td className="px-4 py-3 text-slate-600">{c.programme}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusBadgeStyle(c.status)}`}>{c.status}</span></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatCurrency(c.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3 text-right">
                        {justPaidIds.includes(c.id) ? (
                          <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Sent for confirmation</span>
                        ) : (
                          <button
                            onClick={() => handlePay(c)}
                            disabled={payingId === c.id || !settings.flutterwave_public_key}
                            className="btn-primary !px-3 !py-1.5 !text-xs"
                          >
                            {payingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                            Pay for Client
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-400 px-1">
          After a successful payment, your Super Admin reviews and confirms it before it's marked complete - you'll get a notification once that happens.
        </p>
      </div>
    </DashboardLayout>
  )
}
