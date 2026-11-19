import React, { useEffect, useMemo, useState } from 'react'
import { Layers, Loader2, AlertTriangle } from 'lucide-react'
import Card from './UI/Card.jsx'
import Modal from './UI/Modal.jsx'
import { Input, Select } from './UI/FormField.jsx'
import { getProgrammes, GRADE_ORDER } from '../utils/db.js'
import { invalidate } from '../utils/cache.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatCurrency } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'

const MODES = {
  add: {
    label: 'Add a fixed amount to every course',
    help: "Each course's price goes up by this amount, so price differences between courses are kept.",
    field: (what) => `Amount to add to ${what} price (₦)`,
    placeholder: 'e.g. 100000',
  },
  percent: {
    label: 'Increase by a percentage',
    help: "Each course's price goes up by this percentage, rounded to the nearest ₦1,000. Differences between courses are kept.",
    field: (what) => `Increase ${what} price by (%)`,
    placeholder: 'e.g. 10',
  },
  set: {
    label: 'Set every course to the same price',
    help: 'Every course in this grade gets exactly this price.',
    field: (what) => `New ${what} price (₦)`,
    placeholder: 'e.g. 700000',
  },
}

function applyChange(current, mode, raw) {
  if (raw === '' || raw === null || raw === undefined) return current
  const n = Number(raw)
  if (!Number.isFinite(n)) return current
  let next
  if (mode === 'set') next = n
  else if (mode === 'add') next = current + n
  else next = Math.round((current * (1 + n / 100)) / 1000) * 1000
  return Math.max(0, Math.round(next))
}

function range(values, symbol) {
  if (values.length === 0) return '-'
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max
    ? formatCurrency(min, symbol)
    : `${formatCurrency(min, symbol)} - ${formatCurrency(max, symbol)}`
}

export default function GradePriceEditor({ onSaved }) {
  const { settings } = useSettings()
  const { showToast } = useNotifications()
  const symbol = settings.currency_symbol

  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingGrade, setEditingGrade] = useState(null)
  const [mode, setMode] = useState('add')
  const [normalValue, setNormalValue] = useState('')
  const [doubleValue, setDoubleValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getProgrammes().then(setProgrammes).finally(() => setLoading(false))
  }, [])

  const byGrade = useMemo(() => {
    const map = {}
    programmes.forEach((p) => {
      if (!map[p.grade]) map[p.grade] = []
      map[p.grade].push(p)
    })
    return map
  }, [programmes])

  const grades = useMemo(() => {
    const extra = Object.keys(byGrade).filter((g) => !GRADE_ORDER.includes(g))
    return [...GRADE_ORDER.filter((g) => byGrade[g]), ...extra]
  }, [byGrade])

  const courses = editingGrade ? (byGrade[editingGrade] || []) : []

  const preview = useMemo(() => courses.map((c) => ({
    id: c.id,
    name: c.name,
    price: c.price,
    newPrice: applyChange(c.price, mode, normalValue),
    doublePrice: c.doublePrice,
    newDouble: applyChange(c.doublePrice, mode, doubleValue),
  })), [courses, mode, normalValue, doubleValue])

  const changedCount = preview.filter((r) => r.newPrice !== r.price || r.newDouble !== r.doublePrice).length

  const normalMixed = mode === 'set' && normalValue !== '' && new Set(courses.map((c) => c.price)).size > 1
  const doubleMixed = mode === 'set' && doubleValue !== '' && new Set(courses.map((c) => c.doublePrice)).size > 1

  function openEditor(grade) {
    // Pull fresh figures in case a course was edited individually since load.
    getProgrammes().then(setProgrammes)
    setEditingGrade(grade)
    setMode('add')
    setNormalValue('')
    setDoubleValue('')
  }

  function changeMode(next) {
    // The meaning of the typed numbers changes with the mode, so start clean.
    setMode(next)
    setNormalValue('')
    setDoubleValue('')
  }

  async function handleApply() {
    const updates = preview
      .map((r) => {
        const patch = {}
        if (r.newPrice !== r.price) patch.price = r.newPrice
        if (r.newDouble !== r.doublePrice) patch.double_price = r.newDouble
        return { id: r.id, patch }
      })
      .filter((u) => Object.keys(u.patch).length > 0)

    if (updates.length === 0) {
      showToast('No prices changed', '', 'info')
      return
    }

    setSaving(true)
    try {
      const results = await Promise.all(
        updates.map(({ id, patch }) => supabase.from('programmes').update(patch).eq('id', id).select('id')),
      )
      invalidate('programmes')
      const failed = results.find((r) => r.error || !r.data || r.data.length === 0)
      if (failed) throw failed.error || new Error('Some courses were not updated.')

      showToast(`${editingGrade} prices updated`, `${updates.length} course(s) now use the new prices.`)
      setEditingGrade(null)
      if (onSaved) {
        onSaved()
        getProgrammes().then(setProgrammes)
      } else {
        // The pricing table on this page reads its own copy of the data, so
        // reload once to make sure it shows the new prices.
        setTimeout(() => window.location.reload(), 900)
      }
    } catch (err) {
      getProgrammes().then(setProgrammes)
      showToast('Some prices could not be updated', 'Please check the list and try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <div className="flex items-start gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold font-display text-slate-800">Edit Prices by Grade</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Change a whole grade at once and every course under it updates together. The Edit button on each course below still works for one-off changes.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary-500 mx-auto" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {grades.map((grade) => {
              const list = byGrade[grade]
              return (
                <div key={grade} className="glass-panel p-4 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{grade}</p>
                    <span className="badge bg-primary-50 text-primary-700 !text-[10px]">{list.length} courses</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-500 flex-1">
                    <p>Normal: <span className="font-medium text-slate-700">{range(list.map((c) => c.price), symbol)}</span></p>
                    <p>Double: <span className="font-medium text-slate-700">{range(list.map((c) => c.doublePrice), symbol)}</span></p>
                  </div>
                  <button onClick={() => openEditor(grade)} className="btn-secondary w-full mt-3 !text-xs">
                    Edit Grade Prices
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={!!editingGrade}
        onClose={() => setEditingGrade(null)}
        title={editingGrade ? `Edit ${editingGrade} Prices` : ''}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditingGrade(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleApply} disabled={saving || changedCount === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {changedCount > 0 ? `Apply to ${changedCount} course${changedCount === 1 ? '' : 's'}` : 'Apply'}
            </button>
          </>
        }
      >
        {editingGrade && (
          <div className="space-y-4">
            <Select label="How do you want to change the prices?" value={mode} onChange={(e) => changeMode(e.target.value)}>
              {Object.entries(MODES).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
            </Select>
            <p className="text-[11px] text-slate-400 -mt-2">{MODES[mode].help}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={MODES[mode].field('Normal Working')}
                type="number"
                value={normalValue}
                onChange={(e) => setNormalValue(e.target.value)}
                placeholder={MODES[mode].placeholder}
              />
              <Input
                label={MODES[mode].field('Double Working')}
                type="number"
                value={doubleValue}
                onChange={(e) => setDoubleValue(e.target.value)}
                placeholder={MODES[mode].placeholder}
              />
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">Leave a box empty to keep that price unchanged.</p>

            {(normalMixed || doubleMixed) && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800">
                  Courses in this grade currently have different prices. Setting one price will make them all the same. To keep the differences, choose "Add a fixed amount" or "Increase by a percentage" instead.
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Preview ({courses.length} courses)</p>
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {preview.map((r) => {
                  const normalChanged = r.newPrice !== r.price
                  const doubleChanged = r.newDouble !== r.doublePrice
                  return (
                    <div key={r.id} className="glass-panel p-2.5">
                      <p className="text-sm font-medium text-slate-800">{r.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Normal: {formatCurrency(r.price, symbol)}
                        {normalChanged && <span className="font-semibold text-emerald-700"> to {formatCurrency(r.newPrice, symbol)}</span>}
                        {' · '}
                        Double: {formatCurrency(r.doublePrice, symbol)}
                        {doubleChanged && <span className="font-semibold text-emerald-700"> to {formatCurrency(r.newDouble, symbol)}</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              New prices apply to eligibility checks and quotations from now on. Quotations and client records already saved keep the price they were created with.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
