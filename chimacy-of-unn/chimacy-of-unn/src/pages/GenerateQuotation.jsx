import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileDown, Search, Sparkles, UserPlus, Loader2, Calculator,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { Select, Input } from '../components/UI/FormField.jsx'
import BudgetSearch from '../components/BudgetSearch.jsx'
import { getProgrammes, getQuotations } from '../utils/db.js'
import { evaluateCandidate, statusBadgeStyle } from '../utils/evaluation.js'
import { calculateAggregate } from '../utils/aggregate.js'
import { getAssessmentConfig } from '../utils/publicApi.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

async function downloadQuotationPDF(record, settings) {
  const mod = await import('../utils/pdfGenerator.js')
  return mod.downloadQuotationPDF(record, settings)
}

const emptySubjects = Array.from({ length: 4 }, () => ({ subject: '', grade: '' }))

export default function GenerateQuotation() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { isSuperAdmin } = useAuth()
  const [programmes, setProgrammes] = useState([])
  const [quotations, setQuotations] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [programmeId, setProgrammeId] = useState('')
  const [score, setScore] = useState('')
  const [query, setQuery] = useState('')

  const [useAggregate, setUseAggregate] = useState(false)
  const [subjects, setSubjects] = useState(emptySubjects)
  const [olevelSittings, setOlevelSittings] = useState(1)

  useEffect(() => {
    // Regular admins never see saved quotations here, so skip fetching them.
    const tasks = [getProgrammes(), getAssessmentConfig()]
    if (isSuperAdmin) tasks.push(getQuotations())
    Promise.all(tasks)
      .then(([p, cfg, q]) => { setProgrammes(p); setConfig(cfg); if (q) setQuotations(q) })
      .finally(() => setLoading(false))
  }, [isSuperAdmin])

  const selectedProgramme = useMemo(
    () => programmes.find((p) => p.id === programmeId) || null,
    [programmes, programmeId],
  )

  const aggregateResult = useMemo(() => {
    if (!useAggregate || !config || !score) return null
    const complete = subjects.every((s) => s.subject && s.grade)
    if (!complete) return null
    return calculateAggregate({
      jambScore: score,
      olevelSubjects: subjects,
      olevelSittings,
      gradeConversion: config.grade_conversion,
      aggregateSettings: config.aggregate_settings,
    })
  }, [useAggregate, config, score, subjects, olevelSittings])

  const effectiveScore = useAggregate ? (aggregateResult ? Math.round(aggregateResult.aggregate) : '') : score

  const evaluation = useMemo(() => evaluateCandidate(selectedProgramme, effectiveScore), [selectedProgramme, effectiveScore])

  function updateSubject(index, field, value) {
    setSubjects((list) => {
      const next = [...list]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const filteredQuotations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return quotations.slice(0, 8)
    return quotations.filter((r) =>
      [r.clientName, r.quotationNumber, r.programme].filter(Boolean).some((f) => f.toLowerCase().includes(q))).slice(0, 8)
  }, [quotations, query])

  const jambOptions = config?.jamb_subjects || []
  const gradeOptions = Object.keys(config?.grade_conversion || {})
  const chosenSubjects = subjects.map((s) => s.subject).filter(Boolean)

  const pageTitle = isSuperAdmin ? 'Generate Quotation' : 'Eligibility Checker'

  return (
    <DashboardLayout title={pageTitle}>
      <div className={isSuperAdmin ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : 'max-w-2xl'}>
        <Card>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              <h3 className="font-bold font-display text-slate-800">Quick Eligibility Checker</h3>
            </div>
            <button
              onClick={() => setUseAggregate((v) => !v)}
              className={`btn-secondary !text-xs !py-1.5 ${useAggregate ? '!bg-primary-50 !text-primary-700' : ''}`}
            >
              <Calculator className="h-3.5 w-3.5" /> {useAggregate ? 'Using Aggregate' : 'Use Aggregate Calculator'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {useAggregate
              ? "Enter the client's JAMB score and O'Level grades - their aggregate is calculated automatically and used for eligibility, exactly like the Client Portal."
              : 'Check a programme against a raw JAMB score instantly. Toggle "Use Aggregate Calculator" to factor in O\'Level grades.'}
          </p>

          <div className="space-y-4">
            <BudgetSearch
              programmes={programmes}
              currencySymbol={settings.currency_symbol}
              onSelect={(p) => setProgrammeId(p.id)}
            />
            <Select label="Programme" value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}>
              <option value="">-- Select a programme --</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.grade})</option>
              ))}
            </Select>
            <Input label="JAMB Score" type="number" min="0" max="400" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 272" />

            {useAggregate && (
              <div className="glass-panel p-4">
                <Select label="Number of O'Level Sittings" value={olevelSittings} onChange={(e) => setOlevelSittings(e.target.value)} className="mb-3 max-w-xs">
                  <option value={1}>One Sitting</option>
                  <option value={2}>Two Sittings</option>
                </Select>
                <p className="label-field">4 Subjects &amp; O'Level Grades</p>
                <div className="space-y-2">
                  {subjects.map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Select value={row.subject} onChange={(e) => updateSubject(i, 'subject', e.target.value)}>
                        <option value="">-- Subject {i + 1} --</option>
                        {jambOptions.map((s) => <option key={s} value={s} disabled={chosenSubjects.includes(s) && row.subject !== s}>{s}</option>)}
                      </Select>
                      <Select value={row.grade} onChange={(e) => updateSubject(i, 'grade', e.target.value)}>
                        <option value="">-- Grade --</option>
                        {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </Select>
                    </div>
                  ))}
                </div>
                {aggregateResult && (
                  <div className="mt-3 pt-3 border-t border-primary-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Calculated Aggregate</span>
                    <span className="font-bold text-primary-700">{aggregateResult.aggregate} / 400</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedProgramme && (
            <div className="mt-5 glass-panel p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">Status</span>
                <span className={`badge ${statusBadgeStyle(evaluation.status)}`}>{evaluation.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">Working Type</span>
                <span className="font-medium text-slate-800">{evaluation.workingType || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">Price</span>
                <span className="font-bold text-primary-700">{formatCurrency(evaluation.price, settings.currency_symbol)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-slate-500">Recommendation</span>
                <p className="text-sm text-slate-700 mt-1">{evaluation.recommendation}</p>
              </div>
              <button
                onClick={() => navigate(`/admin/new-client?prefill=${selectedProgramme.id}`)}
                className="btn-primary w-full mt-2"
              >
                <UserPlus className="h-4 w-4" /> Continue to Full Quotation
              </button>
            </div>
          )}
        </Card>

        {/* Regular admins only ever see the checker above - the saved
            quotation search/regeneration panel is Super Admin only. */}
        {isSuperAdmin && (
          <Card>
            <h3 className="font-bold font-display text-slate-800 mb-4">Regenerate a Saved Quotation</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved clients..."
                className="input-field !pl-10"
              />
            </div>

            {loading ? (
              <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-500 mx-auto" /></div>
            ) : filteredQuotations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No saved quotations found.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {filteredQuotations.map((r) => (
                  <div key={r.id} className="glass-panel p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.clientName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {r.programme} &middot; {formatDate(r.date)} &middot; {formatCurrency(r.price, settings.currency_symbol)}
                      </p>
                    </div>
                    <button onClick={() => downloadQuotationPDF(r, settings)} className="btn-secondary !px-3 shrink-0">
                      <FileDown className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
