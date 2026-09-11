import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Save, FileDown, Sparkles, RefreshCcw, Loader2, Calculator } from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { Input, Select, Textarea } from '../components/UI/FormField.jsx'
import {
  getProgrammes, saveQuotation, getQuotationById, getRules,
} from '../utils/db.js'
import { getAssessmentConfig } from '../utils/publicApi.js'
import { calculateAggregate } from '../utils/aggregate.js'
import { evaluateCandidate, suggestAlternatives, statusBadgeStyle, WORKING_TYPE } from '../utils/evaluation.js'
import { formatCurrency } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

async function downloadQuotationPDF(record, settings) {
  const mod = await import('../utils/pdfGenerator.js')
  return mod.downloadQuotationPDF(record, settings)
}

const emptySubjects = Array.from({ length: 4 }, () => ({ subject: '', grade: '' }))

const emptyForm = {
  clientName: '',
  parentName: '',
  phone: '',
  email: '',
  jambRegNumber: '',
  jambScore: '',
  olevelSittings: 1,
  subjects: emptySubjects,
  programmeId: '',
  category: 'New Application',
  workingTypeOverride: '',
  remarks: '',
  date: new Date().toISOString().slice(0, 10),
}

export default function NewClient() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const prefillProgrammeId = params.get('prefill')
  const { settings } = useSettings()
  const { isSuperAdmin } = useAuth()

  const myClientsPath = isSuperAdmin ? '/admin/clients' : '/partner/my-clients'

  const [programmes, setProgrammes] = useState([])
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [list, cfg] = await Promise.all([getProgrammes(), getAssessmentConfig()])
        if (cancelled) return
        setProgrammes(list)
        setConfig(cfg)
        if (prefillProgrammeId && !editId) {
          setForm((f) => ({ ...f, programmeId: prefillProgrammeId }))
        }
        if (editId) {
          const existing = await getQuotationById(editId)
          if (existing && !cancelled) {
            setForm({
              clientName: existing.clientName || '',
              parentName: existing.parentName || '',
              phone: existing.phone || '',
              email: existing.email || '',
              jambRegNumber: existing.jambRegNumber || '',
              jambScore: existing.jambScore || '',
              olevelSittings: 1,
              subjects: emptySubjects,
              programmeId: existing.programmeId || '',
              category: existing.category || 'New Application',
              workingTypeOverride: existing.workingTypeOverride || '',
              remarks: existing.remarks || '',
              date: existing.date || new Date().toISOString().slice(0, 10),
            })
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [editId, prefillProgrammeId])

  const selectedProgramme = useMemo(
    () => programmes.find((p) => p.id === form.programmeId) || null,
    [programmes, form.programmeId],
  )

  const aggregateResult = useMemo(() => {
    if (!config || !form.jambScore) return null
    const complete = form.subjects.every((s) => s.subject && s.grade)
    if (!complete) return null
    return calculateAggregate({
      jambScore: form.jambScore,
      olevelSubjects: form.subjects,
      olevelSittings: form.olevelSittings,
      gradeConversion: config.grade_conversion,
      aggregateSettings: config.aggregate_settings,
    })
  }, [config, form.jambScore, form.subjects, form.olevelSittings])

  const effectiveScore = aggregateResult ? Math.round(aggregateResult.aggregate) : ''

  const evaluation = useMemo(
    () => evaluateCandidate(selectedProgramme, effectiveScore),
    [selectedProgramme, effectiveScore],
  )

  const finalPrice = useMemo(() => {
    if (!selectedProgramme) return 0
    if (form.workingTypeOverride === WORKING_TYPE.DOUBLE) return selectedProgramme.doublePrice
    if (form.workingTypeOverride === WORKING_TYPE.SINGLE) return selectedProgramme.price
    return evaluation.price
  }, [form.workingTypeOverride, selectedProgramme, evaluation])

  const finalWorkingType = form.workingTypeOverride || evaluation.workingType

  const alternatives = useMemo(() => {
    if (evaluation.status !== 'Not Eligible' || !effectiveScore) return []
    return suggestAlternatives(programmes, effectiveScore, form.programmeId, 4)
  }, [evaluation.status, programmes, effectiveScore, form.programmeId])

  const handleChange = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setSaved(false)
  }

  function updateSubjectSlot(index, field, value) {
    setForm((f) => {
      const next = [...f.subjects]
      next[index] = { ...next[index], [field]: value }
      return { ...f, subjects: next }
    })
    setSaved(false)
  }

  function validate() {
    const errs = {}
    if (!form.clientName.trim()) errs.clientName = 'Client name is required'
    if (!form.phone.trim()) errs.phone = 'Phone number is required'
    if (!form.programmeId) errs.programmeId = 'Select a programme'
    if (!form.jambScore) errs.jambScore = 'Enter JAMB score'
    if (form.subjects.some((s) => !s.subject || !s.grade)) errs.subjects = "Select all 4 subjects and their O'Level grades to calculate the aggregate"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function buildQuotationRecord() {
    return {
      id: editId || undefined,
      clientName: form.clientName,
      parentName: form.parentName,
      phone: form.phone,
      email: form.email,
      jambRegNumber: form.jambRegNumber,
      jambScore: Number(form.jambScore),
      category: form.category,
      remarks: form.remarks,
      date: form.date,
      programme: selectedProgramme?.name || '',
      programmeGrade: selectedProgramme?.grade || '',
      programmeId: selectedProgramme?.id || null,
      workingType: finalWorkingType,
      price: finalPrice,
      status: evaluation.status,
      benchmarkStatus: evaluation.benchmarkStatus,
      recommendation: evaluation.recommendation,
      rulesSnapshot: await getRules(),
    }
  }

  async function handleSave(andDownload = false) {
    if (!validate()) return
    setSaving(true)
    try {
      const record = await buildQuotationRecord()
      const persisted = await saveQuotation(record)
      setSaved(true)
      if (andDownload) {
        downloadQuotationPDF(persisted, settings)
      }
      setTimeout(() => navigate(myClientsPath), andDownload ? 600 : 0)
    } catch (err) {
      alert(err.message || 'Failed to save client record.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setForm(emptyForm)
    setErrors({})
    setSaved(false)
  }

  if (loading) {
    return (
      <DashboardLayout title={editId ? 'Edit Client' : 'New Client'}>
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </DashboardLayout>
    )
  }

  const jambOptions = config?.jamb_subjects || []
  const gradeOptions = Object.keys(config?.grade_conversion || {})
  const chosenSubjects = form.subjects.map((s) => s.subject).filter(Boolean)

  return (
    <DashboardLayout title={editId ? 'Edit Client' : 'Register New Client'}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 space-y-6">
          <div>
            <h3 className="font-bold font-display text-slate-800 mb-1">Client Information</h3>
            <p className="text-xs text-slate-500">
              All fields marked * are required. Institution: <strong>{settings.institution_name}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client Name" required value={form.clientName} onChange={handleChange('clientName')} error={errors.clientName} placeholder="e.g. Chidinma Okafor" />
            <Input label="Parent / Guardian Name (Optional)" value={form.parentName} onChange={handleChange('parentName')} placeholder="e.g. Mr. Okafor" />
            <Input label="Phone Number" required value={form.phone} onChange={handleChange('phone')} error={errors.phone} placeholder="e.g. 0803 000 0000" />
            <Input label="Email" type="email" required value={form.email} onChange={handleChange('email')} placeholder="e.g. client@email.com" />
            <Input label="JAMB Registration Number" value={form.jambRegNumber} onChange={handleChange('jambRegNumber')} placeholder="e.g. 20261234567AB" />
            <Select label="Category" value={form.category} onChange={handleChange('category')}>
              <option>New Application</option>
              <option>Change of Course</option>
              <option>Supplementary</option>
              <option>Direct Entry</option>
            </Select>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-primary-600" />
              <h4 className="font-bold text-sm text-slate-800">Aggregate Calculator</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input label="JAMB Score" required type="number" min="0" max="400" value={form.jambScore} onChange={handleChange('jambScore')} error={errors.jambScore} placeholder="e.g. 272" />
              <Select label="Number of O'Level Sittings" value={form.olevelSittings} onChange={handleChange('olevelSittings')}>
                <option value={1}>One Sitting</option>
                <option value={2}>Two Sittings</option>
              </Select>
            </div>

            <p className="label-field">4 Subjects &amp; O'Level Grades</p>
            <div className="space-y-2">
              {form.subjects.map((row, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Select value={row.subject} onChange={(e) => updateSubjectSlot(i, 'subject', e.target.value)}>
                    <option value="">-- Subject {i + 1} --</option>
                    {jambOptions.map((s) => <option key={s} value={s} disabled={chosenSubjects.includes(s) && row.subject !== s}>{s}</option>)}
                  </Select>
                  <Select value={row.grade} onChange={(e) => updateSubjectSlot(i, 'grade', e.target.value)}>
                    <option value="">-- Grade --</option>
                    {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            {errors.subjects && <p className="text-xs text-red-500 mt-1.5">{errors.subjects}</p>}

            {aggregateResult && (
              <div className="mt-3 pt-3 border-t border-primary-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Calculated Aggregate (auto-fills eligibility below)</span>
                <span className="font-bold text-lg text-primary-700">{aggregateResult.aggregate} / 400</span>
              </div>
            )}
          </div>

          <Select label="Programme / Course" required value={form.programmeId} onChange={handleChange('programmeId')} error={errors.programmeId}>
            <option value="">-- Select a programme --</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.grade})</option>
            ))}
          </Select>

          <Select label="Working Type" value={form.workingTypeOverride} onChange={handleChange('workingTypeOverride')}>
            <option value="">Auto-determine (recommended)</option>
            <option value={WORKING_TYPE.SINGLE}>Single Working</option>
            <option value={WORKING_TYPE.DOUBLE}>Double Working</option>
          </Select>

          <Input label="Date" type="date" value={form.date} onChange={handleChange('date')} />
          <Textarea label="Remarks" value={form.remarks} onChange={handleChange('remarks')} placeholder="Any additional notes about this client..." />

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Client Record
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn-secondary">
              <FileDown className="h-4 w-4" /> Save & Download PDF
            </button>
            <button onClick={handleReset} className="btn-ghost">
              <RefreshCcw className="h-4 w-4" /> Reset
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-600 self-center">Saved successfully ✓</span>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="!border-0 text-white brand-surface">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-bold font-display">Smart Evaluation</h3>
            </div>

            {!selectedProgramme || !aggregateResult ? (
              <p className="text-sm text-white/80">Complete the aggregate calculator and select a programme to see the live eligibility evaluation.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Programme Grade</p>
                  <p className="font-semibold">{selectedProgramme.grade}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Eligibility Status</p>
                  <span className={`badge mt-1 ${statusBadgeStyle(evaluation.status)} !bg-white/90`}>
                    {evaluation.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Working Type</p>
                  <p className="font-semibold">{finalWorkingType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Price</p>
                  <p className="text-2xl font-bold font-display">{formatCurrency(finalPrice, settings.currency_symbol)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Benchmark Status</p>
                  <p className="text-sm">{evaluation.benchmarkStatus}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Recommendation</p>
                  <p className="text-sm leading-relaxed">{evaluation.recommendation}</p>
                </div>
              </div>
            )}
          </Card>

          {alternatives.length > 0 && (
            <Card>
              <h4 className="font-bold text-sm text-slate-800 mb-3">Suggested Alternatives</h4>
              <div className="space-y-2">
                {alternatives.map(({ programme, evaluation: ev }) => (
                  <button
                    key={programme.id}
                    onClick={() => setForm((f) => ({ ...f, programmeId: programme.id, workingTypeOverride: '' }))}
                    className="w-full text-left glass-panel p-3 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{programme.name}</p>
                      <span className={`badge !text-[10px] ${statusBadgeStyle(ev.status)}`}>{ev.status}</span>
                    </div>
                    <p className="text-xs text-slate-500">{programme.grade} &middot; {formatCurrency(ev.price, settings.currency_symbol)}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
      }
