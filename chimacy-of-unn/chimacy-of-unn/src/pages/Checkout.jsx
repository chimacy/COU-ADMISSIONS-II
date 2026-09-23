import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CreditCard, Search, CheckCircle2, FileDown, FilePlus2, Receipt, Loader2, Plus, Clock, FileText,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Input, Select } from '../components/UI/FormField.jsx'
import {
  getQuotations, recordPayment, generateInvoiceNumber, getPaymentsForQuotation,
  getPendingPartnerPayments, confirmPendingPayment, getPaymentById, getQuotationById,
} from '../utils/db.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format.js'
import { statusBadgeStyle, STATUS } from '../utils/evaluation.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'

export default function Checkout() {
  const { settings } = useSettings()
  const { showToast } = useNotifications()
  const [params, setParams] = useSearchParams()
  const [quotations, setQuotations] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('eligible-unpaid')
  const [recording, setRecording] = useState(null)
  const [form, setForm] = useState({
    amount: '', method: 'Bank Transfer', date: new Date().toISOString().slice(0, 10), note: '', paymentType: 'FULL',
  })
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const [confirming, setConfirming] = useState(null)
  const [confirmMethod, setConfirmMethod] = useState('Bank Transfer')
  const [receiptSignedUrl, setReceiptSignedUrl] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const refresh = () => {
    setLoading(true)
    Promise.all([getQuotations(), getPendingPartnerPayments()])
      .then(([q, p]) => { setQuotations(q); setPendingPayments(p) })
      .catch(() => showToast('Unable to load payment data', 'Please check your connection and try again.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    const confirmId = params.get('confirm')
    if (confirmId) openConfirm(confirmId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const filtered = useMemo(() => {
    let list = quotations
    if (filter === 'eligible-unpaid') {
      list = list.filter((q) => (q.status === STATUS.ELIGIBLE || q.status === STATUS.ELIGIBLE_DOUBLE) && !q.paid)
    } else if (filter === 'paid') {
      list = list.filter((q) => q.paid)
    }
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((r) => [r.clientName, r.quotationNumber, r.programme].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
    return list
  }, [quotations, filter, query])

  function openRecordPayment(record) {
    const remaining = Math.max(0, record.price - record.paidAmount)
    setRecording(record)
    setForm({
      amount: remaining, method: 'Bank Transfer', date: new Date().toISOString().slice(0, 10), note: '', paymentType: 'FULL',
    })
  }

  async function handleRecordPayment() {
    if (!recording) return
    setSaving(true)
    try {
      await recordPayment(recording.id, {
        amount: Number(form.amount) || 0, method: form.method, date: form.date, note: form.note, paymentType: form.paymentType,
      })
      setRecording(null)
      refresh()
      showToast('Payment recorded successfully')
    } catch (err) {
      showToast('Unable to record payment', err.message || 'Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateInvoice(record) {
    setBusyId(record.id)
    try {
      await generateInvoiceNumber(record.id)
      refresh()
      showToast('Invoice generated successfully')
    } catch (err) {
      showToast('Unable to generate invoice', err.message || 'Please try again.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDownloadInvoice(record) {
    setBusyId(record.id)
    try {
      const { downloadInvoicePDF } = await import('../utils/pdfGenerator.js')
      await downloadInvoicePDF(record, settings)
    } catch (err) {
      showToast('Unable to download invoice', err.message || 'Please try again.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function openHistory(record) {
    const payments = await getPaymentsForQuotation(record.id)
    setHistory({ record, payments })
  }

  async function openConfirm(paymentId) {
    const payment = await getPaymentById(paymentId)
    if (!payment) return
    const quotation = payment.quotation_id ? await getQuotationById(payment.quotation_id) : null
    setConfirming({ payment, quotation })
    setConfirmMethod(payment.payment_method || 'Bank Transfer')
    setReceiptSignedUrl(null)

    if (payment.receipt_url) {
      const { data } = await supabase.storage.from('payment-receipts').createSignedUrl(payment.receipt_url, 3600)
      if (data?.signedUrl) setReceiptSignedUrl(data.signedUrl)
    }
  }

  function closeConfirm() {
    setConfirming(null)
    setReceiptSignedUrl(null)
    if (params.get('confirm')) {
      params.delete('confirm')
      setParams(params, { replace: true })
    }
  }

  async function handleConfirmPending() {
    if (!confirming) return
    setConfirmBusy(true)
    try {
      await confirmPendingPayment(confirming.payment.id, confirmMethod)
      closeConfirm()
      refresh()
      showToast('Payment confirmed successfully')
    } catch (err) {
      showToast('Unable to confirm payment', err.message || 'Please try again.', 'error')
    } finally {
      setConfirmBusy(false)
    }
  }

  const isReceiptImage = confirming?.payment?.receipt_url && /\.(png|jpe?g)$/i.test(confirming.payment.receipt_url)

  return (
    <DashboardLayout title="Checkout & Invoices">
      <div className="space-y-5">
        {pendingPayments.length > 0 && (
          <Card className="!bg-amber-50 !p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="font-bold text-sm text-amber-800">Payments Awaiting Your Confirmation ({pendingPayments.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingPayments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openConfirm(p.id)}
                  className="w-full text-left bg-white rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{p.client_name || 'Client'} — {formatCurrency(p.amount, settings.currency_symbol)}</p>
                    <p className="text-xs text-slate-500">Declared by {p.admin_profiles?.display_name || 'a partner'} &middot; {formatDate(p.payment_date || p.created_at)}</p>
                  </div>
                  <span className="badge bg-amber-100 text-amber-700 shrink-0">Review</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card className="!p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients..." className="input-field !pl-10" />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-64 shrink-0">
            <option value="eligible-unpaid">Eligible &amp; Awaiting Payment</option>
            <option value="paid">Fully Paid</option>
            <option value="all">All Records</option>
          </Select>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No records match this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Paid So Far</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.clientName}</td>
                      <td className="px-4 py-3">
                        {r.sourceType === 'PARTNER' ? (
                          <span className="badge bg-accent-100 text-accent-700 !text-[10px]">{r.partnerName || 'Partner'}</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500 !text-[10px]">Direct</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.programme}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusBadgeStyle(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatCurrency(r.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.paid ? (
                          <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Fully Paid</span>
                        ) : r.paidAmount > 0 ? (
                          <button onClick={() => openHistory(r)} className="badge bg-amber-100 text-amber-700">
                            {formatCurrency(r.paidAmount, settings.currency_symbol)} of {formatCurrency(r.price, settings.currency_symbol)}
                          </button>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-400">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!r.paid && (
                            <button onClick={() => openRecordPayment(r)} className="btn-primary !px-3 !py-1.5 !text-xs">
                              <Plus className="h-3.5 w-3.5" /> Record Payment
                            </button>
                          )}
                          {r.paidAmount > 0 && (
                            <button onClick={() => openHistory(r)} className="btn-secondary !px-3 !py-1.5 !text-xs">History</button>
                          )}
                          {r.paid && !r.invoiceNumber && (
                            <button onClick={() => handleGenerateInvoice(r)} disabled={busyId === r.id} className="btn-secondary !px-3 !py-1.5 !text-xs">
                              {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />} Generate Invoice
                            </button>
                          )}
                          {r.paid && r.invoiceNumber && (
                            <button onClick={() => handleDownloadInvoice(r)} disabled={busyId === r.id} className="btn-secondary !px-3 !py-1.5 !text-xs">
                              {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} Invoice
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
        open={!!recording}
        onClose={() => setRecording(null)}
        title="Record Payment"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRecording(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleRecordPayment} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Record Payment
            </button>
          </>
        }
      >
        {recording && (
          <div className="space-y-4">
            <div className="glass-panel p-3">
              <p className="text-sm font-semibold text-slate-800">{recording.clientName}</p>
              <p className="text-xs text-slate-500">
                {recording.programme} &middot; Price {formatCurrency(recording.price, settings.currency_symbol)}
                {recording.paidAmount > 0 && ` · Already paid ${formatCurrency(recording.paidAmount, settings.currency_symbol)}`}
              </p>
            </div>
            <Select label="Payment Type" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
              <option value="FULL">Full Payment</option>
              <option value="INSTALLMENT">Installment Payment</option>
            </Select>
            <Input label="Amount Received (₦)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Payment Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Moniepoint</option>
              <option>Opay</option>
              <option>POS / Card</option>
            </Select>
            <Input label="Payment Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Receipt Note / Reference (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <p className="text-[11px] text-slate-400">
              If this is an installment amount less than the full price, the client stays "Unpaid" until the total received reaches the full price.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!history}
        onClose={() => setHistory(null)}
        title={history ? `Payment History — ${history.record.clientName}` : ''}
      >
        {history && (
          <div className="space-y-3">
            <div className="glass-panel p-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total Paid</span>
              <span className="font-bold text-slate-800">{formatCurrency(history.record.paidAmount, settings.currency_symbol)} / {formatCurrency(history.record.price, settings.currency_symbol)}</span>
            </div>
            {history.payments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No payments recorded yet.</p>
            ) : (
              history.payments.map((p) => (
                <div key={p.id} className="glass-panel p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{formatCurrency(p.amount, settings.currency_symbol)}</span>
                    <span className={`badge !text-[10px] ${p.status === 'SUCCESSFUL' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.payment_type === 'INSTALLMENT' ? 'Installment' : 'Full Payment'} &middot; {formatDate(p.payment_date || p.created_at)} &middot; {p.payment_method || '-'}
                    {p.receipt_note ? ` · ${p.receipt_note}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirming}
        onClose={closeConfirm}
        title="Confirm Payment"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={closeConfirm}>Cancel</button>
            <button className="btn-primary" onClick={handleConfirmPending} disabled={confirmBusy}>
              {confirmBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm Payment
            </button>
          </>
        }
      >
        {confirming && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold text-slate-800">{confirming.payment.client_name || confirming.quotation?.clientName || 'Client'}</p>
              {confirming.payment.admin_profiles?.display_name && (
                <p className="text-xs text-slate-500">Registered by: <strong>{confirming.payment.admin_profiles.display_name}</strong></p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReadField label="Programme" value={confirming.quotation?.programme || '-'} />
              <ReadField label="Grade / Department" value={confirming.quotation?.programmeGrade || '-'} />
              <ReadField label="Payment Amount" value={formatCurrency(confirming.payment.amount, settings.currency_symbol)} emphasis />
              <ReadField label="Payment Type" value={confirming.payment.payment_type === 'INSTALLMENT' ? 'Installment' : 'Full Payment'} />
              <ReadField label="Payment Date" value={formatDate(confirming.payment.payment_date || confirming.payment.created_at)} />
              <ReadField label="Declared" value={formatDateTime(confirming.payment.created_at)} />
            </div>

            <Select label="Payment Method (the only field you can set)" value={confirmMethod} onChange={(e) => setConfirmMethod(e.target.value)}>
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Moniepoint</option>
              <option>Opay</option>
            </Select>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Receipt</p>
              {!confirming.payment.receipt_url ? (
                <p className="text-sm text-slate-400">No receipt was attached to this payment.</p>
              ) : !receiptSignedUrl ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading receipt...</div>
              ) : isReceiptImage ? (
                <img src={receiptSignedUrl} alt="Payment receipt" className="max-h-64 rounded-xl border border-slate-200 object-contain" />
              ) : (
                <a href={receiptSignedUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex">
                  <FileText className="h-4 w-4" /> Open Receipt
                </a>
              )}
            </div>

            {confirming.quotation && (
              <div className="glass-panel p-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Paid After This Payment</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(
                    Number(confirming.quotation.paidAmount || 0) +
                    Number(confirming.payment.amount || 0),
                    settings.currency_symbol
                  )}{' '}
                  / {formatCurrency(confirming.quotation.price, settings.currency_symbol)}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

function ReadField({ label, value, emphasis = false }) {
  return (
    <div className="glass-panel p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`text-sm mt-1 ${emphasis ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
        {value}
      </p>
    </div>
  )
}
