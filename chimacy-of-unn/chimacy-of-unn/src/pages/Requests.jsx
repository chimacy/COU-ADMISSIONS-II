import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Inbox, Loader2, MessageCircle, CheckCircle2, XCircle, ArrowRightCircle, Send,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Select, Textarea } from '../components/UI/FormField.jsx'
import {
  getRequests, getRequestById, updateRequestStatus, getRequestNotes, addRequestNote,
  getRequestStatusHistory, acceptRequestAndConvert, REQUEST_STATUSES, getQuotationById,
} from '../utils/db.js'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { buildWhatsAppLink, buildAdminOutreachMessage } from '../utils/whatsapp.js'
import { statusBadgeStyle } from '../utils/evaluation.js'

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  CONTACTED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  PAYMENT_CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export default function Requests() {
  const [params] = useSearchParams()
  const { settings } = useSettings()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const refresh = () => {
    setLoading(true)
    getRequests().then(setRequests).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    const openId = params.get('open')
    if (openId) openDetail(openId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const filtered = useMemo(() => {
    let list = requests
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.fullName, r.phone, r.requestNumber, r.programmeName].filter(Boolean).some((f) => f.toLowerCase().includes(q)))
    }
    return list
  }, [requests, statusFilter, query])

  async function openDetail(id) {
    const r = await getRequestById(id)
    setSelected(r)
  }

  return (
    <DashboardLayout title="Assistance Requests">
      <div className="space-y-5">
        <Card className="!p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requests..." className="input-field !pl-10" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-56 shrink-0">
            <option value="all">All Statuses</option>
            {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </Select>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No requests match this view.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-primary-50/60 dark:bg-slate-800/50 border-b border-primary-100 dark:border-slate-700">
                    <th className="px-4 py-3 font-semibold">Request #</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Aggregate</th>
                    <th className="px-4 py-3 font-semibold">Eligibility</th>
                    <th className="px-4 py-3 font-semibold">Package</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => setSelected(r)} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-primary-50/40 dark:hover:bg-slate-800/30 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{r.requestNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{r.fullName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.programmeName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.aggregate ? `${r.aggregate}/400` : (r.jambScore ?? '-')}</td>
                      <td className="px-4 py-3"><span className={`badge !text-[10px] ${statusBadgeStyle(r.eligibilityStatus)}`}>{r.eligibilityStatus || '-'}</span></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.workingType || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(r.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3">
                        {r.status === 'PAYMENT_CONFIRMED' ? (
                          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">Paid</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[r.status] || ''}`}>{r.status?.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { refresh(); openDetail(selected.id) }}
          settings={settings}
        />
      )}
    </DashboardLayout>
  )
}

function RequestDetailModal({
  request, onClose, onChanged, settings,
}) {
  const [notes, setNotes] = useState([])
  const [history, setHistory] = useState([])
  const [linkedQuotation, setLinkedQuotation] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getRequestNotes(request.id).then(setNotes)
    getRequestStatusHistory(request.id).then(setHistory)
    if (request.linkedQuotationId) {
      getQuotationById(request.linkedQuotationId).then(setLinkedQuotation)
    } else {
      setLinkedQuotation(null)
    }
  }, [request.id, request.linkedQuotationId])

  async function handleStatusChange(status) {
    setBusy(true)
    try {
      await updateRequestStatus(request.id, status)
      onChanged()
    } catch (err) {
      alert(err.message || 'Failed to update status.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAccept() {
    setBusy(true)
    try {
      await acceptRequestAndConvert(request)
      onChanged()
      alert('Request accepted and added to Client Records. You can now confirm payment from Checkout & Invoices.')
    } catch (err) {
      alert(err.message || 'Failed to accept request.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    setBusy(true)
    try {
      await addRequestNote(request.id, noteText.trim())
      setNoteText('')
      const fresh = await getRequestNotes(request.id)
      setNotes(fresh)
    } catch (err) {
      alert(err.message || 'Failed to add note.')
    } finally {
      setBusy(false)
    }
  }

  function handleWhatsApp() {
    const message = buildAdminOutreachMessage({
      clientFirstName: (request.fullName || '').split(' ')[0],
      requestNumber: request.requestNumber,
      programmeName: request.programmeName,
    })
    window.open(buildWhatsAppLink(request.phone, message), '_blank')
  }

  return (
    <Modal open onClose={onClose} title={`${request.fullName} — ${request.requestNumber}`} size="xl">
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-2">
          <button onClick={handleWhatsApp} className="btn-secondary !text-xs"><MessageCircle className="h-3.5 w-3.5" /> Contact on WhatsApp</button>
          {request.status === 'PENDING' && (
            <button onClick={() => handleStatusChange('UNDER_REVIEW')} disabled={busy} className="btn-secondary !text-xs"><ArrowRightCircle className="h-3.5 w-3.5" /> Mark Under Review</button>
          )}
          {!request.linkedQuotationId && (request.status === 'PENDING' || request.status === 'UNDER_REVIEW') && (
            <button onClick={handleAccept} disabled={busy} className="btn-primary !text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Accept &amp; Convert to Client</button>
          )}
          {request.status !== 'REJECTED' && request.status !== 'COMPLETED' && (
            <button onClick={() => handleStatusChange('REJECTED')} disabled={busy} className="btn-danger !text-xs"><XCircle className="h-3.5 w-3.5" /> Reject</button>
          )}
        </div>

        <Select label="Update Status Manually" value={request.status} onChange={(e) => handleStatusChange(e.target.value)}>
          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>

        <Section title="Client Information">
          <Grid>
            <Field label="Full Name" value={request.fullName} />
            <Field label="Phone" value={request.phone} />
            <Field label="Email" value={request.email} />
            <Field label="JAMB Reg. Number" value={request.jambRegNumber} />
          </Grid>
        </Section>

        <Section title="Assessment">
          <Grid>
            <Field label="JAMB Score" value={request.jambScore} />
            <Field label="O'Level Score" value={request.olevelScore} />
            <Field label="One-Sitting Bonus" value={request.oneSittingBonusApplied} />
            <Field label="JAMB Contribution" value={request.jambContribution} />
            <Field label="O'Level Contribution" value={request.olevelContribution} />
            <Field label="Final Aggregate" value={request.aggregate ? `${request.aggregate} / 400` : '-'} />
          </Grid>
          {request.jambSubjects?.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              <strong>JAMB Subjects:</strong> {request.jambSubjects.join(', ')}
            </p>
          )}
          {request.olevelSubjects?.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              <strong>O'Level:</strong> {request.olevelSubjects.map((s) => `${s.subject} (${s.grade})`).join(', ')}
            </p>
          )}
        </Section>

        <Section title="Programme &amp; Package">
          <Grid>
            <Field label="Programme" value={request.programmeName} />
            <Field label="Grade" value={request.programmeGrade} />
            <Field label="Working Type" value={request.workingType} />
            <Field label="Quoted Fee" value={formatCurrency(request.price, settings.currency_symbol)} />
            <Field label="Eligibility" value={request.eligibilityStatus} />
            <Field label="Benchmark Status" value={request.benchmarkStatus} />
          </Grid>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{request.recommendation}</p>
        </Section>

        <Section title="Terms Acceptance">
          <Grid>
            <Field label="Accepted" value={request.termsAccepted ? 'Yes' : 'No'} />
            <Field label="Accepted At" value={request.termsAcceptedAt ? formatDateTime(request.termsAcceptedAt) : '-'} />
          </Grid>
        </Section>

        {request.linkedQuotationId && (
          <Section title="Payment">
            {linkedQuotation ? (
              linkedQuotation.paid ? (
                <Grid>
                  <Field label="Payment Status" value="Paid" />
                  <Field label="Amount Paid" value={formatCurrency(linkedQuotation.paidAmount, settings.currency_symbol)} />
                  <Field label="Method" value={linkedQuotation.paymentMethod} />
                  <Field label="Paid Date" value={formatDate(linkedQuotation.paidDate)} />
                  <Field label="Invoice Number" value={linkedQuotation.invoiceNumber || 'Not generated yet'} />
                </Grid>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">Not yet paid. Confirm payment from Checkout &amp; Invoices.</p>
              )
            ) : (
              <p className="text-xs text-slate-400">Loading payment info...</p>
            )}
            <div className="glass-panel p-3 text-xs text-emerald-700 dark:text-emerald-400 mt-3">
              This request has been converted into a client record. Manage payment and invoicing from Checkout &amp; Invoices.
            </div>
          </Section>
        )}

        <Section title="Status History">
          <div className="space-y-1">
            {history.map((h) => (
              <p key={h.id} className="text-xs text-slate-500 dark:text-slate-400">
                <span className={`badge !text-[10px] ${STATUS_COLORS[h.status] || ''}`}>{h.status?.replace(/_/g, ' ')}</span>
                <span className="ml-2">{formatDateTime(h.changed_at)}</span>
              </p>
            ))}
          </div>
        </Section>

        <Section title="Admin Notes">
          <div className="flex gap-2 mb-3">
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="e.g. Spoke with client. Parent requested Pharmacy." rows={2} className="flex-1" />
            <button onClick={handleAddNote} disabled={busy || !noteText.trim()} className="btn-primary self-end !px-3"><Send className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notes.length === 0 && <p className="text-xs text-slate-400">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="glass-panel p-2.5">
                <p className="text-sm text-slate-700 dark:text-slate-200">{n.note}</p>
                <p className="text-[11px] text-slate-400 mt-1">{n.admin_name} &middot; {formatDateTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Modal>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-400 mb-2">{title}</p>
      {children}
    </div>
  )
}

function Grid({ children }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="text-slate-800 dark:text-white font-medium">{value ?? '-'}</p>
    </div>
  )
}
