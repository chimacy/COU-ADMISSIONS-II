import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Eye, Pencil, Trash2, FileDown, Users, Loader2, CheckCircle2,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { getQuotations, deleteQuotation } from '../utils/db.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { statusBadgeStyle } from '../utils/evaluation.js'
import { useSettings } from '../context/SettingsContext.jsx'

async function downloadQuotationPDF(record, settings) {
  const mod = await import('../utils/pdfGenerator.js')
  return mod.downloadQuotationPDF(record, settings)
}
async function downloadInvoicePDF(record, settings) {
  const mod = await import('../utils/pdfGenerator.js')
  return mod.downloadInvoicePDF(record, settings)
}

export default function ClientRecords() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { settings } = useSettings()

  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const refresh = () => {
    setLoading(true)
    getQuotations().then(setQuotations).finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    const openId = params.get('open')
    if (openId && quotations.length) {
      const rec = quotations.find((q) => q.id === openId)
      if (rec) setViewing(rec)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, quotations.length])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return quotations
    return quotations.filter((r) =>
      [r.clientName, r.phone, r.email, r.programme, r.quotationNumber]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q)))
  }, [quotations, query])

  async function confirmDelete() {
    await deleteQuotation(deleting.id)
    setDeleting(null)
    refresh()
  }

  return (
    <DashboardLayout title="Client Records">
      <div className="space-y-5">
        <Card className="!p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, email, programme, or quotation number..."
              className="input-field !pl-10"
            />
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {quotations.length === 0 ? 'No client records yet.' : 'No records match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-primary-50/60 dark:bg-slate-800/50 border-b border-primary-100 dark:border-slate-700">
                    <th className="px-4 py-3 font-semibold">Quotation #</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Programme</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-primary-50/40 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{r.quotationNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{r.clientName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.programme}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.jambScore}</td>
                      <td className="px-4 py-3"><span className={`badge ${statusBadgeStyle(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-3">
                        {r.paid ? (
                          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(r.price, settings.currency_symbol)}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button title="View" onClick={() => setViewing(r)} className="btn-ghost !p-2 rounded-lg"><Eye className="h-4 w-4" /></button>
                          <button title="Edit" onClick={() => navigate(`/admin/new-client?edit=${r.id}`)} className="btn-ghost !p-2 rounded-lg"><Pencil className="h-4 w-4" /></button>
                          <button title="Download PDF" onClick={() => downloadQuotationPDF(r, settings)} className="btn-ghost !p-2 rounded-lg"><FileDown className="h-4 w-4" /></button>
                          <button title="Delete" onClick={() => setDeleting(r)} className="btn-ghost !p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button>
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
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.clientName} — ${viewing.quotationNumber}` : ''}
        size="lg"
        footer={viewing && (
          <>
            <button className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
            {viewing.paid && (
              <button className="btn-secondary" onClick={() => downloadInvoicePDF(viewing, settings)}>
                <FileDown className="h-4 w-4" /> Invoice
              </button>
            )}
            <button className="btn-primary" onClick={() => downloadQuotationPDF(viewing, settings)}>
              <FileDown className="h-4 w-4" /> Download PDF
            </button>
          </>
        )}
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Phone" value={viewing.phone} />
              <Detail label="Email" value={viewing.email} />
              <Detail label="Parent Name" value={viewing.parentName} />
              <Detail label="JAMB Reg. Number" value={viewing.jambRegNumber} />
              <Detail label="JAMB Score" value={viewing.jambScore} />
              <Detail label="Institution" value={settings.institution_name} />
              <Detail label="Programme" value={viewing.programme} />
              <Detail label="Grade" value={viewing.programmeGrade} />
              <Detail label="Working Type" value={viewing.workingType} />
              <Detail label="Price" value={formatCurrency(viewing.price, settings.currency_symbol)} />
              <Detail label="Category" value={viewing.category} />
              <Detail label="Date" value={formatDate(viewing.date)} />
            </div>
            <div className="glass-panel p-4">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Status</p>
              <span className={`badge ${statusBadgeStyle(viewing.status)}`}>{viewing.status}</span>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-3 mb-1">Benchmark Status</p>
              <p className="text-slate-700 dark:text-slate-200">{viewing.benchmarkStatus}</p>
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-3 mb-1">Recommendation</p>
              <p className="text-slate-700 dark:text-slate-200">{viewing.recommendation}</p>
              {viewing.paid && (
                <>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-3 mb-1">Payment</p>
                  <p className="text-slate-700 dark:text-slate-200">
                    {formatCurrency(viewing.paidAmount, settings.currency_symbol)} via {viewing.paymentMethod} on {formatDate(viewing.paidDate)} (Invoice {viewing.invoiceNumber})
                  </p>
                </>
              )}
            </div>
            {viewing.remarks && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Remarks</p>
                <p className="text-slate-700 dark:text-slate-200">{viewing.remarks}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Client Record"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn-danger" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        }
      >
        {deleting && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete the record for <strong>{deleting.clientName}</strong> ({deleting.quotationNumber})? This action cannot be undone.
          </p>
        )}
      </Modal>
    </DashboardLayout>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-slate-800 dark:text-white font-medium">{value || '-'}</p>
    </div>
  )
}
