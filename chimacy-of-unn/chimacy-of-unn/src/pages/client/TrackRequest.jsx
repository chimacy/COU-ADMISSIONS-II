import React, { useState } from 'react'
import { Search, Loader2, CheckCircle2, Circle } from 'lucide-react'
import ClientPortalLayout from '../../components/Layout/ClientPortalLayout.jsx'
import { Input } from '../../components/UI/FormField.jsx'
import { trackRequest } from '../../utils/publicApi.js'
import { formatCurrency, formatDate } from '../../utils/format.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const TIMELINE = [
  'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'PROCESSING', 'COMPLETED',
]

export default function TrackRequest() {
  const { settings } = useSettings()
  const [requestNumber, setRequestNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [notFound, setNotFound] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    setNotFound(false)
    setResult(null)
    try {
      const data = await trackRequest(requestNumber.trim(), phone.trim())
      if (data) setResult(data)
      else setNotFound(true)
    } catch (err) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const currentIndex = result ? TIMELINE.indexOf(result.status) : -1
  const isTerminal = result && (result.status === 'REJECTED' || result.status === 'CANCELLED')

  return (
    <ClientPortalLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-800 dark:text-white">Track Your Request</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your Request ID and phone number to see its status.</p>
        </div>

        <form onSubmit={handleSearch} className="glass-card p-6 space-y-4">
          <Input label="Request ID" required value={requestNumber} onChange={(e) => setRequestNumber(e.target.value)} placeholder="e.g. REQ-2026-000001" />
          <Input label="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="The number you submitted with" />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Searching...' : 'Track Request'}
          </button>
        </form>

        {notFound && (
          <p className="text-sm text-red-500 text-center mt-6">No matching request found. Please check your Request ID and phone number.</p>
        )}

        {result && (
          <div className="glass-card p-6 mt-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-slate-400">Request ID</p>
                <p className="font-mono font-bold text-slate-800 dark:text-white">{result.request_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Programme</p>
                <p className="font-semibold text-slate-800 dark:text-white">{result.programme_name}</p>
              </div>
            </div>

            {isTerminal ? (
              <div className="text-center py-4">
                <span className="badge bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 !text-sm">{result.status}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {TIMELINE.map((status, idx) => (
                  <div key={status} className="flex items-center gap-3">
                    {idx <= currentIndex ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300 dark:text-slate-700 shrink-0" />
                    )}
                    <span className={`text-sm ${idx <= currentIndex ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-primary-100 dark:border-slate-700 flex items-center justify-between text-sm">
              <span className="text-slate-400">Quoted Amount</span>
              <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(result.price, settings.currency_symbol)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-400">Submitted</span>
              <span className="text-slate-600 dark:text-slate-300">{formatDate(result.created_at)}</span>
            </div>
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}
