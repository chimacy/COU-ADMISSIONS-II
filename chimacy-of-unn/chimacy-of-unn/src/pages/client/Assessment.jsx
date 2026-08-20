import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, XCircle, MessageCircle, RotateCcw, CreditCard,
} from 'lucide-react'
import ClientPortalLayout from '../../components/Layout/ClientPortalLayout.jsx'
import { Input, Select } from '../../components/UI/FormField.jsx'
import BudgetSearch from '../../components/BudgetSearch.jsx'
import TermsList from './TermsList.jsx'
import {
  getAssessmentConfig, listProgrammesPublic, checkEligibilityPublic, submitRequest,
} from '../../utils/publicApi.js'
import { calculateAggregate } from '../../utils/aggregate.js'
import { formatCurrency } from '../../utils/format.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { buildWhatsAppLink, buildClientAssessmentMessage } from '../../utils/whatsapp.js'
import { payWithFlutterwave } from '../../utils/flutterwave.js'

const SUBJECT_SLOTS = 4

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  jambRegNumber: '',
  jambScore: '',
  programmeId: '',
  olevelSittings: 1,
  // Unified: the same 4 subjects serve as both the JAMB combination and the
  // subjects an O'Level grade is entered for - this matches how a real
  // candidate's aggregate actually works (one combination, assessed two
  // ways), rather than asking for two separate, potentially-different
  // subject lists.
  subjects: Array.from({ length: SUBJECT_SLOTS }, () => ({ subject: '', grade: '' })),
  additionalNotes: '',
}

export default function Assessment() {
  const navigate = useNavigate()
  const { settings } = useSettings()

  const [config, setConfig] = useState(null)
  const [programmes, setProgrammes] = useState([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [step, setStep] = useState('form') // form -> result -> confirmation
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  function loadAssessmentData() {
    setLoadingConfig(true)
    setLoadError(null)
    Promise.all([getAssessmentConfig(), listProgrammesPublic()])
      .then(([cfg, progs]) => { setConfig(cfg); setProgrammes(progs) })
      .catch((err) => setLoadError(err.message || 'Failed to load the eligibility checker.'))
      .finally(() => setLoadingConfig(false))
  }

  useEffect(() => {
    loadAssessmentData()
  }, [])

  const selectedProgramme = useMemo(
    () => programmes.find((p) => p.id === form.programmeId) || null,
    [programmes, form.programmeId],
  )

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateSubjectSlot(index, field, value) {
    setForm((f) => {
      const next = [...f.subjects]
      next[index] = { ...next[index], [field]: value }
      return { ...f, subjects: next }
    })
  }

  function validate() {
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Required'
    if (!form.phone.trim()) errs.phone = 'Required'
    if (!form.jambScore) errs.jambScore = 'Required'
    if (!form.programmeId) errs.programmeId = 'Required'
    if (form.subjects.some((s) => !s.subject || !s.grade)) errs.subjects = 'Select all 4 subjects and their O\'Level grades'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCalculate() {
    if (!validate()) return
    setCalculating(true)
    try {
      const calc = calculateAggregate({
        jambScore: form.jambScore,
        olevelSubjects: form.subjects,
        olevelSittings: form.olevelSittings,
        gradeConversion: config.grade_conversion,
        aggregateSettings: config.aggregate_settings,
      })
      const eligibility = await checkEligibilityPublic(form.programmeId, Math.round(calc.aggregate))
      setResult({ ...calc, eligibility })
      setStep('result')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      alert(err.message || 'Could not calculate your assessment. Please try again.')
    } finally {
      setCalculating(false)
    }
  }

  async function handleSubmitRequest() {
    if (!termsAccepted) return
    setSubmitting(true)
    try {
      const payload = {
        full_name: form.fullName,
        phone: form.phone,
        email: form.email,
        jamb_reg_number: form.jambRegNumber,
        jamb_score: form.jambScore,
        institution: settings.institution_name,
        programme_id: form.programmeId,
        programme_name: selectedProgramme?.name,
        programme_grade: result.eligibility.programme_grade,
        working_type: result.eligibility.working_type,
        price: result.eligibility.price,
        eligibility_status: result.eligibility.status,
        benchmark_status: result.eligibility.benchmark_status,
        recommendation: result.eligibility.recommendation,
        additional_notes: form.additionalNotes,
        terms_accepted: true,
        terms_version: config.aggregate_settings?.terms_version || 'v1',
        jamb_subjects: form.subjects.map((s) => s.subject),
        olevel_subjects: form.subjects,
        olevel_sittings: Number(form.olevelSittings),
        olevel_score: result.olevelScore,
        one_sitting_bonus_applied: result.bonusApplied,
        jamb_contribution: result.jambContribution,
        olevel_contribution: result.olevelContribution,
        aggregate: result.aggregate,
      }
      const data = await submitRequest(payload)
      setConfirmation(data)
      setStep('confirmation')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      alert(err.message || 'Could not submit your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleStartAgain() {
    setForm(emptyForm)
    setResult(null)
    setConfirmation(null)
    setTermsAccepted(false)
    setStep('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loadingConfig) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </ClientPortalLayout>
    )
  }

  if (loadError || !config) {
    return (
      <ClientPortalLayout>
        <div className="max-w-md mx-auto px-4 sm:px-6 py-24 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            We couldn't load the eligibility checker right now. Please check your connection and try again.
          </p>
          <button onClick={loadAssessmentData} className="btn-primary">Try Again</button>
        </div>
      </ClientPortalLayout>
    )
  }

  return (
    <ClientPortalLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {step === 'form' && (
          <FormStep
            form={form}
            errors={errors}
            config={config}
            programmes={programmes}
            updateField={updateField}
            updateSubjectSlot={updateSubjectSlot}
            onSubmit={handleCalculate}
            calculating={calculating}
            settings={settings}
          />
        )}

        {step === 'result' && result && (
          <ResultStep
            form={form}
            result={result}
            selectedProgramme={selectedProgramme}
            settings={settings}
            disclaimer={config.aggregate_settings?.disclaimer}
            onBack={() => setStep('form')}
            onStartAgain={handleStartAgain}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
            showTerms={showTerms}
            setShowTerms={setShowTerms}
            onSubmit={handleSubmitRequest}
            submitting={submitting}
          />
        )}

        {step === 'confirmation' && confirmation && (
          <ConfirmationStep
            confirmation={confirmation}
            form={form}
            result={result}
            settings={settings}
            onStartAgain={handleStartAgain}
            onTrack={() => navigate('/track-request')}
          />
        )}
      </div>
    </ClientPortalLayout>
  )
}

/* -------------------------------- STEP: FORM -------------------------------- */

function FormStep({
  form, errors, config, programmes, updateField, updateSubjectSlot, onSubmit, calculating, settings,
}) {
  const jambOptions = config.jamb_subjects || []
  const gradeOptions = Object.keys(config.grade_conversion || {})
  const chosenSubjects = form.subjects.map((s) => s.subject).filter(Boolean)

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-800 dark:text-white">Check Your Eligibility</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">For admission into {settings.institution_name}</p>
      </div>

      <FormSection title="Your Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" required value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} error={errors.fullName} />
          <Input label="Phone / WhatsApp Number" required value={form.phone} onChange={(e) => updateField('phone', e.target.value)} error={errors.phone} placeholder="e.g. 0803 000 0000" />
          <Input label="Email (Optional)" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          <Input label="JAMB Registration Number (Optional)" value={form.jambRegNumber} onChange={(e) => updateField('jambRegNumber', e.target.value)} />
        </div>
      </FormSection>

      <FormSection title="JAMB Details">
        <div className="mb-4">
          <BudgetSearch
            programmes={programmes}
            currencySymbol={settings.currency_symbol}
            onSelect={(p) => updateField('programmeId', p.id)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input label="JAMB Score" required type="number" min="0" max="400" value={form.jambScore} onChange={(e) => updateField('jambScore', e.target.value)} error={errors.jambScore} />
          <Select label="Preferred Programme" required value={form.programmeId} onChange={(e) => updateField('programmeId', e.target.value)} error={errors.programmeId}>
            <option value="">-- Select a programme --</option>
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
      </FormSection>

      <FormSection title="Your 4 Subjects &amp; O'Level Grades">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Enter your JAMB subject combination and your O'Level grade for each of those same 4 subjects — this is what your aggregate is calculated from.
        </p>

        <Select label="Number of O'Level Sittings" value={form.olevelSittings} onChange={(e) => updateField('olevelSittings', e.target.value)} className="mb-4 max-w-xs">
          <option value={1}>One Sitting</option>
          <option value={2}>Two Sittings</option>
        </Select>

        <div className="space-y-2.5">
          {form.subjects.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2.5">
              <Select value={row.subject} onChange={(e) => updateSubjectSlot(i, 'subject', e.target.value)}>
                <option value="">-- Subject {i + 1} --</option>
                {jambOptions.map((s) => <option key={s} value={s} disabled={chosenSubjects.includes(s) && row.subject !== s}>{s}</option>)}
              </Select>
              <Select value={row.grade} onChange={(e) => updateSubjectSlot(i, 'grade', e.target.value)}>
                <option value="">-- O'Level Grade --</option>
                {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
          ))}
        </div>
        {errors.subjects && <p className="text-xs text-red-500 mt-1.5">{errors.subjects}</p>}
      </FormSection>

      <button onClick={onSubmit} disabled={calculating} className="btn-primary w-full !text-base !py-3.5">
        {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {calculating ? 'Calculating...' : 'Calculate My Aggregate'}
        {!calculating && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div className="glass-card p-5">
      <h2 className="font-bold text-sm text-slate-800 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

/* -------------------------------- STEP: RESULT -------------------------------- */

function ResultStep({
  form, result, selectedProgramme, settings, disclaimer, onBack, onStartAgain,
  termsAccepted, setTermsAccepted, showTerms, setShowTerms, onSubmit, submitting,
}) {
  const { eligibility } = result
  const isEligible = eligibility.status?.startsWith('Eligible')

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost !text-xs !px-2"><ArrowLeft className="h-3.5 w-3.5" /> Edit my information</button>

      <div className="glass-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-400 text-center mb-1">Admission Assessment Result</p>
        <h1 className="text-lg sm:text-xl font-bold font-display text-slate-800 dark:text-white text-center mb-6">{form.fullName}</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <ResultField label="Programme" value={selectedProgramme?.name} />
          <ResultField label="JAMB Score" value={form.jambScore} />
          <ResultField label="JAMB Contribution" value={result.jambContribution} />
          <ResultField label="O'Level Contribution" value={result.olevelContribution} />
        </div>

        <div className="text-center py-5 border-y border-primary-100 dark:border-slate-700 mb-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Final Aggregate</p>
          <p className="text-4xl font-bold font-display text-primary-700 dark:text-primary-400">{result.aggregate} <span className="text-lg text-slate-400">/ 400</span></p>
        </div>

        <div className={`rounded-xl p-4 mb-6 flex gap-3 ${isEligible ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
          {isEligible ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
          <div>
            <p className={`text-sm font-bold ${isEligible ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {isEligible ? 'MEETS CURRENT INTERNAL CRITERIA' : 'BELOW CURRENT INTERNAL CRITERIA'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{eligibility.recommendation}</p>
          </div>
        </div>

        {isEligible && (
          <div className="flex items-center justify-between glass-panel p-4 mb-6">
            <div>
              <p className="text-xs uppercase text-slate-400">Recommended Package</p>
              <p className="font-semibold text-slate-800 dark:text-white">{eligibility.working_type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-slate-400">Estimated Service Fee</p>
              <p className="font-bold text-primary-700 dark:text-primary-400">{formatCurrency(eligibility.price, settings.currency_symbol)}</p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center mb-6">{disclaimer}</p>

        {isEligible && (
          <>
            <div className="mb-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-600" />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  I have read and agreed to the{' '}
                  <button type="button" onClick={() => setShowTerms((s) => !s)} className="text-primary-700 dark:text-primary-400 font-semibold underline">
                    Terms and Conditions
                  </button>.
                </span>
              </label>
              {showTerms && (
                <div className="mt-3 glass-panel p-4 max-h-56 overflow-y-auto">
                  <TermsList compact />
                </div>
              )}
            </div>

            <button onClick={onSubmit} disabled={!termsAccepted || submitting} className="btn-primary w-full !text-base !py-3.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Submitting...' : 'Request Admission Assistance'}
            </button>
          </>
        )}

        {settings.whatsapp_number && (
          <a
            href={buildWhatsAppLink(settings.whatsapp_number, buildClientAssessmentMessage({
              programmeName: selectedProgramme?.name,
              jambScore: form.jambScore,
              aggregate: result.aggregate,
              status: eligibility.status,
            }))}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full mt-2"
          >
            <MessageCircle className="h-4 w-4" /> Continue on WhatsApp
          </a>
        )}

        <button onClick={onStartAgain} className="btn-ghost w-full mt-2 !text-xs"><RotateCcw className="h-3.5 w-3.5" /> Start Again</button>
      </div>
    </div>
  )
}

function ResultField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-slate-400">{label}</p>
      <p className="font-semibold text-sm text-slate-800 dark:text-white">{value ?? '-'}</p>
    </div>
  )
}

/* -------------------------------- STEP: CONFIRMATION -------------------------------- */

function ConfirmationStep({
  confirmation, form, result, settings, onStartAgain, onTrack,
}) {
  const [payStatus, setPayStatus] = useState('idle') // idle | processing | success | error
  const [payError, setPayError] = useState('')

  const whatsappMessage = buildClientAssessmentMessage({
    requestNumber: confirmation.request_number,
    programmeName: confirmation.programme_name,
    jambScore: form.jambScore,
    aggregate: confirmation.aggregate,
    status: confirmation.eligibility_status,
  })

  function handlePayNow() {
    setPayStatus('processing')
    setPayError('')
    payWithFlutterwave({
      publicKey: settings.flutterwave_public_key,
      amount: confirmation.price,
      email: form.email,
      phone: form.phone,
      name: form.fullName,
      requestId: confirmation.id,
      onVerified: () => setPayStatus('success'),
      onError: (err) => { setPayStatus('error'); setPayError(err.message) },
    })
  }

  return (
    <div className="glass-card p-6 sm:p-8 text-center">
      <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="text-lg sm:text-xl font-bold font-display text-slate-800 dark:text-white mb-1">Your request has been submitted successfully.</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">An administrator will review your request and contact you shortly. Payment is optional and not required to proceed.</p>

      <div className="glass-panel p-5 text-left space-y-2 mb-6">
        <RowKV label="Request ID" value={confirmation.request_number} mono />
        <RowKV label="Programme" value={confirmation.programme_name} />
        <RowKV label="Working Type" value={confirmation.working_type} />
        <RowKV label="Quoted Amount" value={formatCurrency(confirmation.price, settings.currency_symbol)} />
        <RowKV label="Status" value="PENDING REVIEW" badge />
      </div>

      {payStatus === 'success' ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 mb-4 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
          Payment received and verified. Thank you!
        </div>
      ) : (
        settings.flutterwave_public_key && (
          <button onClick={handlePayNow} disabled={payStatus === 'processing'} className="btn-secondary w-full mb-3">
            {payStatus === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {payStatus === 'processing' ? 'Processing...' : 'Pay Now (Optional)'}
          </button>
        )
      )}
      {payStatus === 'error' && <p className="text-xs text-red-500 mb-3">{payError}</p>}

      <div className="flex flex-col gap-2.5">
        {settings.whatsapp_number && (
          <a href={buildWhatsAppLink(settings.whatsapp_number, whatsappMessage)} target="_blank" rel="noreferrer" className="btn-primary !bg-emerald-600 !text-base !py-3" style={{ background: '#16a34a' }}>
            <MessageCircle className="h-4 w-4" /> Continue on WhatsApp
          </a>
        )}
        <button onClick={onTrack} className="btn-secondary">Track This Request</button>
        <button onClick={onStartAgain} className="btn-ghost !text-xs"><RotateCcw className="h-3.5 w-3.5" /> Start a New Assessment</button>
      </div>
    </div>
  )
}

function RowKV({
  label, value, mono, badge,
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      {badge ? (
        <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">{value}</span>
      ) : (
        <span className={`font-semibold text-sm text-slate-800 dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  )
}
