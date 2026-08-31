import React, { useEffect, useState } from 'react'
import { Save, Loader2, Info, Landmark } from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import { Input } from '../../components/UI/FormField.jsx'
import { getMyProfile, proposeMyBankDetails } from '../../utils/db.js'

export default function PartnerBankDetails() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ accountName: '', bankName: '', accountNumber: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMyProfile().then((p) => {
      setProfile(p)
      setForm({
        accountName: p?.pending_bank_details?.account_name || p?.bank_account_name || '',
        bankName: p?.pending_bank_details?.bank_name || p?.bank_name || '',
        accountNumber: p?.pending_bank_details?.account_number || p?.bank_account_number || '',
      })
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await proposeMyBankDetails(form)
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      alert(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Payment / Bank Details">
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </DashboardLayout>
    )
  }

  const hasPending = !!profile?.pending_bank_details

  return (
    <DashboardLayout title="Payment / Bank Details">
      <div className="max-w-lg space-y-5">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold font-display text-slate-800">Commission Payout Details</h3>
          </div>

          {profile?.bank_account_name && (
            <div className="glass-panel p-3 mb-4 text-sm">
              <p className="text-xs uppercase text-slate-400 mb-1">Currently Active</p>
              <p className="text-slate-700">{profile.bank_account_name} &middot; {profile.bank_name} &middot; {profile.bank_account_number}</p>
            </div>
          )}

          {hasPending && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">You have a change awaiting Super Admin approval. It will become active once approved.</p>
            </div>
          )}

          <div className="space-y-4">
            <Input label="Account Name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
            <Input label="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <Input label="Account Number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Submit for Approval
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-600">Submitted ✓</span>}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Changes to your payout details require Super Admin approval before they take effect, to protect your commission payments.</p>
        </Card>
      </div>
    </DashboardLayout>
  )
}
