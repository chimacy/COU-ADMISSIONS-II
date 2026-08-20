import React, { useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Pencil, Trash2, Database, Save, Loader2,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Input, Select } from '../components/UI/FormField.jsx'
import {
  getProgrammes, saveProgramme, deleteProgramme, GRADE_ORDER,
} from '../utils/db.js'
import { formatCurrency } from '../utils/format.js'
import { useSettings } from '../context/SettingsContext.jsx'

const emptyProgramme = {
  id: '',
  name: '',
  grade: 'First Grade',
  price: '',
  doublePrice: '',
  minimumScore: '',
  preferredScore: '',
  doubleWorkingScore: '',
  normalBenchmark: '',
  doubleBenchmark: '',
}

export default function PricingDatabase() {
  const { settings } = useSettings()
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    setLoading(true)
    getProgrammes().then(setProgrammes).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return programmes
    return programmes.filter((p) => p.name.toLowerCase().includes(q))
  }, [programmes, query])

  const grouped = useMemo(() => {
    const groups = {}
    GRADE_ORDER.forEach((g) => { groups[g] = [] })
    filtered.forEach((p) => {
      if (!groups[p.grade]) groups[p.grade] = []
      groups[p.grade].push(p)
    })
    return groups
  }, [filtered])

  function openNew() {
    setEditing({ ...emptyProgramme })
  }

  function openEdit(p) {
    setEditing({ ...p })
  }

  async function handleSave() {
    if (!editing.name.trim()) return
    setSaving(true)
    try {
      await saveProgramme(editing)
      setEditing(null)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to save programme.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    await deleteProgramme(deleting.id)
    setDeleting(null)
    refresh()
  }

  return (
    <DashboardLayout title="Pricing Database">
      <div className="space-y-5">
        <Card className="!p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programmes..."
              className="input-field !pl-10"
            />
          </div>
          <button onClick={openNew} className="btn-primary shrink-0">
            <Plus className="h-4 w-4" /> Add Programme
          </button>
        </Card>

        {loading ? (
          <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
        ) : (
          GRADE_ORDER.map((grade) => {
            const list = grouped[grade] || []
            if (query && list.length === 0) return null
            return (
              <Card key={grade} className="!p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-primary-100 dark:border-slate-700 flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary-600" />
                  <h3 className="font-bold font-display text-slate-800 dark:text-white">{grade}</h3>
                  <span className="badge bg-primary-50 dark:bg-slate-800 text-primary-700 dark:text-slate-400 ml-auto">{list.length} programmes</span>
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 px-5 py-6">No programmes in this grade yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-primary-50/50 dark:bg-slate-800/50">
                          <th className="px-5 py-2.5 font-semibold">Programme</th>
                          <th className="px-5 py-2.5 font-semibold">Normal Price</th>
                          <th className="px-5 py-2.5 font-semibold">Double Price</th>
                          <th className="px-5 py-2.5 font-semibold">Normal Benchmark</th>
                          <th className="px-5 py-2.5 font-semibold">Double Benchmark</th>
                          <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((p) => (
                          <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-primary-50/40 dark:hover:bg-slate-800/30">
                            <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{p.name}</td>
                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(p.price, settings.currency_symbol)}</td>
                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatCurrency(p.doublePrice, settings.currency_symbol)}</td>
                            <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.normalBenchmark}</td>
                            <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.doubleBenchmark}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(p)} className="btn-ghost !p-2 rounded-lg"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => setDeleting(p)} className="btn-ghost !p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Programme' : 'Add Programme'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Programme
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Course Name" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="sm:col-span-2" />
            <Select label="Programme Grade" value={editing.grade} onChange={(e) => setEditing({ ...editing, grade: e.target.value })}>
              {GRADE_ORDER.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <div />
            <Input label="Normal Price (₦)" type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
            <Input label="Double Working Price (₦)" type="number" value={editing.doublePrice} onChange={(e) => setEditing({ ...editing, doublePrice: e.target.value })} />
            <Input label="Minimum Score" type="number" value={editing.minimumScore} onChange={(e) => setEditing({ ...editing, minimumScore: e.target.value })} />
            <Input label="Preferred Score" type="number" value={editing.preferredScore} onChange={(e) => setEditing({ ...editing, preferredScore: e.target.value })} />
            <Input label="Double Working Score" type="number" value={editing.doubleWorkingScore} onChange={(e) => setEditing({ ...editing, doubleWorkingScore: e.target.value })} />
            <div />
            <Input label="Normal Benchmark (display text)" value={editing.normalBenchmark} onChange={(e) => setEditing({ ...editing, normalBenchmark: e.target.value })} placeholder="e.g. 285 - 300 & Above" />
            <Input label="Double Benchmark (display text)" value={editing.doubleBenchmark} onChange={(e) => setEditing({ ...editing, doubleBenchmark: e.target.value })} placeholder="e.g. 260-284" />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Programme"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn-danger" onClick={confirmDelete}><Trash2 className="h-4 w-4" /> Delete</button>
          </>
        }
      >
        {deleting && <p className="text-sm text-slate-600 dark:text-slate-300">Delete <strong>{deleting.name}</strong> from the pricing database? This cannot be undone.</p>}
      </Modal>
    </DashboardLayout>
  )
}
