import React, { useEffect, useMemo, useState } from 'react'
import {
  CreditCard, Loader2, Search, CheckCircle2, Landmark, Copy,
} from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import Modal from '../../components/UI/Modal.jsx'
import { getMyClients } from '../../utils/db.js'
import { formatCurrency } from '../../utils/format.js'
import { STATUS, statusBadgeStyle } from '../../utils/evaluation.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'

export default function PayForClient() {
  const { settings } = useSettings()
  const { user, profile } = useAuth()
  const [clients, setClients] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [paying, setPaying] = useState(null)
  const [declaring, setDeclaring] = useState(false)
  const [declaredIds, setDeclaredIds] = useState([])

  const refresh = () => {
    setLoading(true)
    Promise.all([
      getMyClients(),
      supabase.from('payment_accounts').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([c, acc]) => { setClients(c); setAccounts(acc.data || []) }).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const eligibleUnpaid = useMemo(() => {
    let list = clients.filter((c) => (c.status === STATUS.ELIGIBLE || c.status === STATUS.ELIGIBLE_DOUBLE) && !c.paid)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => [c.clientName, c.quotationNumber].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
    return list
  }, [clients, query])

  async function handleDeclarePayment(account) {
    setDeclaring(true)
    try {
      const txRef = `manual-${paying.id}-${Date.now()}`
      const { error } = await supabase.from('payments').insert({
        quotation_id: paying.id,
        partner_id: user?.id,
        client_name: paying.clientName,
        amount: paying.price,
        currency: 'NGN',
        tx_ref: txRef,
        payment_date: new Date().toISOString().slice(0, 10),
        recorded_by: user?.id,
      })
      if (error) throw error
      setDeclaredIds((ids) => [...ids, paying.id])
      setPaying(null)
    } catch (err) {
      alert(err.message || 'Could not record this payment declaration.')
    } finally {
      setDeclaring(false)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text)
  }

  return (
    <DashboardLayout title="Payment for Client">
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
                        {declaredIds.includes(c.id) ? (
                          <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Awaiting confirmation</span>
                        ) : (
                          <button onClick={() => setPaying(c)} className="btn-primary !px-3 !py-1.5 !text-xs">
                            <Landmark className="h-3.5 w-3.5" /> Pay for Client
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
          After you send a payment, your Super Admin reviews and confirms it before it counts as complete - you'll get a notification once that happens.
        </p>
      </div>

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Pay for Client"
      >
        {paying && (
          <div className="space-y-4">
            <div className="glass-panel p-3">
              <p className="text-sm font-semibold text-slate-800">{paying.clientName}</p>
              <p className="text-xs text-slate-500">Amount to pay: <strong>{formatCurrency(paying.price, settings.currency_symbol)}</strong></p>
            </div>

            {accounts.length === 0 ? (
              <p className="text-sm text-slate-500">No payment accounts have been configured yet. Contact your Super Admin.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Send the payment to any of the accounts below, then confirm you've sent it.</p>
                {accounts.map((acc) => (
                  <div key={acc.id} className="glass-panel p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="badge bg-primary-50 text-primary-700 !text-[10px]">{acc.provider}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{acc.account_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-slate-600 font-mono">{acc.account_number}</p>
                      <button onClick={() => copyToClipboard(acc.account_number)} className="btn-ghost !p-1 rounded"><Copy className="h-3 w-3" /></button>
                    </div>
                    {acc.bank_name && <p className="text-xs text-slate-400">{acc.bank_name}</p>}
                    <button
                      onClick={() => handleDeclarePayment(acc)}
                      disabled={declaring}
                      className="btn-secondary w-full mt-3 !text-xs"
                    >
                      {declaring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      I've Sent This Payment via {acc.provider}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
