import React, { useEffect, useState } from 'react'
import { ScrollText, Plus, Pencil, Trash2, Save, Loader2 } from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Input, Textarea } from '../components/UI/FormField.jsx'
import { getRules, saveRule, deleteRule } from '../utils/db.js'

export default function RulesPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = () => {
    setLoading(true)
    getRules().then(setRules).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  function openNew() {
    setEditing({ id: '', title: '', text: '' })
  }

  async function handleSave() {
    if (!editing.text.trim()) return
    setSaving(true)
    try {
      await saveRule(editing, rules.length)
      setEditing(null)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to save rule.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    await deleteRule(deleting.id)
    setDeleting(null)
    refresh()
  }

  return (
    <DashboardLayout title="Rules & Guidelines">
      <div className="space-y-5">
        <Card className="!p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-bold font-display text-slate-800 dark:text-white">Company Rules</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">These rules print automatically on every generated quotation PDF, and update instantly for every admin.</p>
            </div>
          </div>
          <button onClick={openNew} className="btn-primary shrink-0"><Plus className="h-4 w-4" /> Add Rule</button>
        </Card>

        {loading ? (
          <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <Card key={rule.id} className="!p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {rule.title && <p className="font-semibold text-sm text-slate-800 dark:text-white">{rule.title}</p>}
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{rule.text}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(rule)} className="btn-ghost !p-2 rounded-lg"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleting(rule)} className="btn-ghost !p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Rule' : 'Add Rule'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Rule
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Input label="Title (Optional)" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Refund Policy" />
            <Textarea label="Rule Text" required value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={5} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Rule"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn-danger" onClick={confirmDelete}><Trash2 className="h-4 w-4" /> Delete</button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">Delete this rule? It will no longer appear on new quotation PDFs.</p>
      </Modal>
    </DashboardLayout>
  )
}
