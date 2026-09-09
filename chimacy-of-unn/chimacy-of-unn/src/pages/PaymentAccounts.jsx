import React, { useEffect, useState } from 'react'
import {
  Landmark, Plus, Trash2, Loader2, Power,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import Modal from '../components/UI/Modal.jsx'
import { Input, Select } from '../components/UI/FormField.jsx'
import { supabase } from '../lib/supabaseClient.js'

const emptyAccount = {
  provider: 'Moniepoint', account_name: '', account_number: '', bank_name: '',
}

export default function PaymentAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const refresh = () => {
    setLoading(true)
    supabase.from('payment_accounts').select('*').order('sort_order').then(({ data }) => setAccounts(data || [])).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  async function handleSave() {
    if (!editing.account_number.trim()) return
    setSaving(true)
    try {
      if (editing.id) {
        await supabase.from('payment_accounts').update({
          provider: editing.provider,
          account_name: editing.account_name,
          account_number: editing.account_number,
          bank_name: editing.bank_name,
        }).eq('id', editing.id)
      } else {
        await supabase.from('payment_accounts').insert({
          provider: editing.provider,
          account_name: editing.account_name,
          account_number: editing.account_number,
          bank_name: editing.bank_name,
          sort_order: accounts.length,
        })
      }
      setEditing(null)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to save account.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(account) {
    await supabase.from('payment_accounts').update({ is_active: !account.is_active }).eq('id', account.id)
    refresh()
  }

  async function confirmDelete() {
    await supabase.from('payment_accounts').delete().eq('id', deleting.id)
    setDeleting(null)
    refresh()
  }

  return (
    <DashboardLayout title="Payment Accounts">
      <div className="space-y-5">
        <Card className="!p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-bold font-display text-slate-800">Manual Payment Accounts</h3>
              <p className="text-xs text-slate-500">Every account here is visible to every Partner when they go to pay for a client.</p>
            </div>
          </div>
          <button onClick={() => setEditing({ ...emptyAccount })} className="btn-primary shrink-0"><Plus className="h-4 w-4" /> Add Account</button>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No accounts added yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-primary-50 text-primary-700 !text-[10px]">{a.provider}</span>
                      {!a.is_active && <span className="badge bg-slate-100 text-slate-400 !text-[10px]">Inactive</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{a.account_name || 'Unnamed account'}</p>
                    <p className="text-xs text-slate-500">{a.account_number} {a.bank_name ? `· ${a.bank_name}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(a)} title={a.is_active ? 'Deactivate' : 'Activate'} className="btn-ghost !p-2 rounded-lg">
                      <Power className={`h-4 w-4 ${a.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </button>
                    <button onClick={() => setEditing(a)} className="btn-secondary !px-3 !py-1.5 !text-xs">Edit</button>
                    <button onClick={() => setDeleting(a)} className="btn-ghost !p-2 rounded-lg text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Account' : 'Add Account'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Select label="Provider" value={editing.provider} onChange={(e) => setEditing({ ...editing, provider: e.target.value })}>
              <option>Moniepoint</option>
              <option>Opay</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </Select>
            <Input label="Account Name" value={editing.account_name} onChange={(e) => setEditing({ ...editing, account_name: e.target.value })} />
            <Input label="Account Number" required value={editing.account_number} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} />
            <Input label="Bank Name (optional)" value={editing.bank_name} onChange={(e) => setEditing({ ...editing, bank_name: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Account"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button className="btn-danger" onClick={confirmDelete}><Trash2 className="h-4 w-4" /> Delete</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Remove this payment account? Partners will no longer see it as an option.</p>
      </Modal>
    </DashboardLayout>
  )
}
