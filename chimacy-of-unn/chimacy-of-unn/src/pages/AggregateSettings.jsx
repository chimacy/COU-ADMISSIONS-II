import React, { useEffect, useState } from 'react'
import { Calculator, Loader2, Save, Info, Plus, Trash2 } from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { Input, Textarea } from '../components/UI/FormField.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function AggregateSettings() {
  const [form, setForm] = useState(null)
  const [gradeConversion, setGradeConversion] = useState([])
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [subjectBusy, setSubjectBusy] = useState(false)

  const refreshSubjects = () => supabase.from('jamb_subjects').select('*').order('sort_order').then(({ data }) => setSubjects(data || []))

  useEffect(() => {
    Promise.all([
      supabase.from('aggregate_settings').select('*').eq('id', 1).single(),
      supabase.from('grade_conversion').select('*').order('sort_order'),
      supabase.from('jamb_subjects').select('*').order('sort_order'),
    ]).then(([agg, grades, subs]) => {
      setForm(agg.data)
      setGradeConversion(grades.data || [])
      setSubjects(subs.data || [])
    }).finally(() => setLoading(false))
  }, [])

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function updateGrade(grade, marks) {
    setGradeConversion((list) => list.map((g) => (g.grade === grade ? { ...g, marks } : g)))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await supabase.from('aggregate_settings').update({
        jamb_weight: Number(form.jamb_weight),
        olevel_weight: Number(form.olevel_weight),
        one_sitting_bonus: Number(form.one_sitting_bonus),
        terms_version: form.terms_version,
        disclaimer: form.disclaimer,
      }).eq('id', 1)

      await Promise.all(gradeConversion.map((g) => supabase.from('grade_conversion').update({ marks: Number(g.marks) }).eq('grade', g.grade)))

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      alert(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSubject() {
    const name = newSubject.trim()
    if (!name) return
    setSubjectBusy(true)
    try {
      const { error } = await supabase.from('jamb_subjects').insert({ name, sort_order: subjects.length })
      if (error) throw error
      setNewSubject('')
      await refreshSubjects()
    } catch (err) {
      alert(err.message || 'Failed to add subject. It may already exist.')
    } finally {
      setSubjectBusy(false)
    }
  }

  async function handleRemoveSubject(id) {
    setSubjectBusy(true)
    try {
      await supabase.from('jamb_subjects').delete().eq('id', id)
      await refreshSubjects()
    } catch (err) {
      alert(err.message || 'Failed to remove subject.')
    } finally {
      setSubjectBusy(false)
    }
  }

  if (loading || !form) {
    return (
      <DashboardLayout title="Aggregate Settings">
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Aggregate Settings">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-bold font-display text-slate-800 dark:text-white">UNN Aggregate Calculation Model</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update this if the official screening methodology changes. Nothing about this model is hardcoded elsewhere in the app.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="JAMB Weight (e.g. 0.90 = 90%)" type="number" step="0.01" value={form.jamb_weight} onChange={(e) => updateField('jamb_weight', e.target.value)} />
            <Input label="O'Level Weight (e.g. 0.10 = 10%)" type="number" step="0.01" value={form.olevel_weight} onChange={(e) => updateField('olevel_weight', e.target.value)} />
          </div>
          <Input label="One-Sitting Bonus (marks)" type="number" value={form.one_sitting_bonus} onChange={(e) => updateField('one_sitting_bonus', e.target.value)} />
          <Input label="Terms Version" value={form.terms_version} onChange={(e) => updateField('terms_version', e.target.value)} />
          <Textarea label="Disclaimer shown to every client" value={form.disclaimer} onChange={(e) => updateField('disclaimer', e.target.value)} rows={3} />

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Model
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold font-display text-slate-800 dark:text-white mb-1">O'Level Grade → Marks Conversion</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Used to calculate every client's O'Level contribution.</p>
          <div className="grid grid-cols-3 gap-3">
            {gradeConversion.map((g) => (
              <Input key={g.grade} label={g.grade} type="number" value={g.marks} onChange={(e) => updateGrade(g.grade, e.target.value)} />
            ))}
          </div>
          <div className="flex gap-2 mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 dark:text-blue-300">Click "Save Model" above to save both the weights and the grade table together.</p>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <h3 className="font-bold font-display text-slate-800 dark:text-white mb-1">Subject List</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            The subjects clients can pick from when entering their JAMB combination and O'Level grades — on both the Client Portal and Admin Portal.
          </p>
          <div className="flex gap-2 mb-4">
            <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Further Mathematics" className="flex-1" />
            <button onClick={handleAddSubject} disabled={subjectBusy || !newSubject.trim()} className="btn-primary shrink-0"><Plus className="h-4 w-4" /> Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s.id} className="badge bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 !py-1.5">
                {s.name}
                <button onClick={() => handleRemoveSubject(s.id)} disabled={subjectBusy} className="ml-1 text-red-500 hover:text-red-600">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
