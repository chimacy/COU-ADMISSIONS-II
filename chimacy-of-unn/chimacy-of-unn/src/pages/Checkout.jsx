import React, { useEffect, useMemo, useState } from 'react'
import {
  CreditCard, Search, CheckCircle2, FileDown, FilePlus2, Receipt, Loader2, MessageCircle,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Input, Select } from '../components/UI/FormField.jsx'
import { getQuotations, markQuotationPaid, generateInvoiceNumber } from '../utils/db.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { statusBadgeStyle, STATUS } from '../utils/evaluation.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildWhatsAppLink, buildAdminOutreachMessage } from '../utils/whatsapp.js'

export default function Checkout() {
  const { settings } = useSettings()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('eligible-unpaid')
  const [paying, setPaying] = useState(null)
  const [form, setForm] = useState({ amount: '', method: 'Bank Transfer', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const refresh = () => {
    setLoading(true)
    getQuotations().then(setQuotations).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    let list = quotations
    if (filter === 'eligible-unpaid') {
      list = list.filter((q) => (q.status === STATUS.ELIGIBLE || q.status === STATUS.ELIGIBLE_DOUBLE) && !q.paid)
    } else if (filter === 'paid') {
      list = list.filter((q) => q.paid)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.clientName, r.quotationNumber, r.programme].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
    }
    return list
  }, [quotations, filter, query])

  function openPay(record) {
    setPaying(record)
    setForm({ amount: record.price, method: 'Bank Transfer', date: new Date().toISOString().slice(0, 10) })
  }

  // FIXED: this now ONLY confirms payment. It does not generate or download
  // anything. Generating and downloading an invoice are now separate,
  // deliberate actions the admin takes afterward.
  async function confirmPayment() {
    if (!paying) return
    setSaving(true)
    try {
      await markQuotationPaid(paying.id, {
        amount: Number(form.amount) || 0,
        method: form.method,
        date: form.date,
      })
      setPaying(null)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateInvoice(record) {
    setBusyId(record.id)
    try {
      await generateInvoiceNumber(record.id)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to generate invoice.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDownloadInvoice(record) {
    setBusyId(record.id)
    try {
      const { downloadInvoicePDF } = await import('../utils/pdfGenerator.js')
      await downloadInvoicePDF(record, settings)
    } finally {
      setBusyId(null)
    }
  }

  function handleWhatsApp(record) {
    const message = buildAdminOutreachMessage({
      clientFirstName: (record.clientName || '').split(' ')[0],
      requestNumber: record.quotationNumber,
      programmeName: record.programme,
    })
    window.open(buildWhatsAppLink(record.phone, message), '_blank')
  }

  return (
    <DashboardLayout title="Checkout & Invoices">
      <div className="space-y-5">
        <Card className="!p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients..."
              className="input-field !pl-10"
            />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-64 shrink-0">
            <option value="eligible-unpaid">Eligible &amp; Awaiting Payment</option>
            <option value="paid">Paid Clients</option>
            <option value="all">All Records</option>
          </Select>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No records match this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-primary-50/60 dark:bg-slate-800/50 border-b border-primary-100 dark:border-slate-700">
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Amount Due</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{r.clientName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.programme}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusBadgeStyle(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(r.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3">
                        {r.paid ? (
                          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Paid {formatDate(r.paidDate)}
                          </span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button onClick={() => handleWhatsApp(r)} title="Contact on WhatsApp" className="btn-secondary !px-2.5 !py-1.5 !text-xs">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                          {!r.paid && (
                            <button onClick={() => openPay(r)} className="btn-primary !px-3 !py-1.5 !text-xs">
                              <CreditCard className="h-3.5 w-3.5" /> Confirm Payment
                            </button>
                          )}
                          {r.paid && !r.invoiceNumber && (
                            <button onClick={() => handleGenerateInvoice(r)} disabled={busyId === r.id} className="btn-secondary !px-3 !py-1.5 !text-xs">
                              {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />} Generate Invoice
                            </button>
                          )}
                          {r.paid && r.invoiceNumber && (
                            <button onClick={() => handleDownloadInvoice(r)} disabled={busyId === r.id} className="btn-secondary !px-3 !py-1.5 !text-xs">
                              {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} Download Invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Confirm Payment"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPaying(null)}>Cancel</button>
            <button className="btn-primary" onClick={confirmPayment} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Confirm Payment
            </button>
          </>
        }
      >
        {paying && (
          <div className="space-y-4">
            <div className="glass-panel p-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{paying.clientName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{paying.programme} &middot; {paying.workingType}</p>
            </div>
            <Input label="Amount Received (₦)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Payment Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>POS / Card</option>
              <option>Flutterwave (Online)</option>
            </Select>
            <Input label="Payment Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <p className="text-[11px] text-slate-400">This only marks the payment as confirmed. Invoice generation is a separate step afterward.</p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
