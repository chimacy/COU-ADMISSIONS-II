import React, { useEffect, useState } from 'react'
import {
  ShieldCheck, Loader2, Info, Wallet, Landmark, Save, CheckCircle2, Banknote,
} from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { Select, Input } from '../components/UI/FormField.jsx'
import {
  getAdminProfiles, updateAdminProfile, getAllCommissions, approveCommission,
  markCommissionPaid, getPartnerSettings, updateCommissionRate, approvePendingBankDetails,
} from '../utils/db.js'
import { formatCurrency, formatDateTime } from '../utils/format.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

const STATUS_LABELS = { AWAITING_APPROVAL: 'Awaiting Approval', APPROVED: 'Approved', PAID: 'Paid' }
const STATUS_COLORS = {
  AWAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
}

export default function Administrators() {
  const { user, refetchProfile } = useAuth()
  const { settings } = useSettings()
  const [partners, setPartners] = useState([])
  const [commissions, setCommissions] = useState([])
  const [rate, setRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [rateSaving, setRateSaving] = useState(false)
  const [rateSaved, setRateSaved] = useState(false)

  const refresh = () => {
    setLoading(true)
    Promise.all([getAdminProfiles(), getAllCommissions(), getPartnerSettings()])
      .then(([p, c, s]) => { setPartners(p); setCommissions(c); setRate(String(s.commission_rate)) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  async function handleRoleChange(admin, role) {
    if (admin.id === user.id && role !== 'super_admin') {
      if (!window.confirm('This will remove your own Super Admin access. Continue?')) return
    }
    setBusyId(admin.id)
    try {
      await updateAdminProfile(admin.id, { role })
      refresh()
      if (admin.id === user.id) refetchProfile()
    } catch (err) {
      alert(err.message || 'Failed to update role.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleStatusChange(admin, status) {
    setBusyId(admin.id)
    try {
      await updateAdminProfile(admin.id, { status })
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to update status.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleApproveBankDetails(admin) {
    setBusyId(admin.id)
    try {
      await approvePendingBankDetails(admin.id)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to approve bank details.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleApproveCommission(id) {
    setBusyId(id)
    try {
      await approveCommission(id)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to approve commission.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleMarkPaid(id) {
    setBusyId(id)
    try {
      await markCommissionPaid(id)
      refresh()
    } catch (err) {
      alert(err.message || 'Failed to mark commission as paid.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSaveRate() {
    setRateSaving(true)
    try {
      await updateCommissionRate(rate)
      setRateSaved(true)
      setTimeout(() => setRateSaved(false), 2000)
    } catch (err) {
      alert(err.message || 'Failed to save commission rate.')
    } finally {
      setRateSaving(false)
    }
  }

  return (
    <DashboardLayout title="Partners & Admins">
      <div className="space-y-5">
        <Card className="!p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold font-display text-slate-800">Accounts</h3>
            <p className="text-xs text-slate-500 mt-1">
              To add a new Partner, create their login in Supabase (Authentication → Users → Add user). The moment they log in for the first time, they'll appear here automatically as a Partner - promote to Super Admin below if needed.
            </p>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/60 border-b border-primary-100">
                    <th className="px-4 py-3 font-semibold">Display Name</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Bank Details</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {a.display_name} {a.id === user.id && <span className="text-[10px] text-primary-600">(you)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Select value={a.role} onChange={(e) => handleRoleChange(a, e.target.value)} disabled={busyId === a.id} className="!py-1.5 !text-xs">
                          <option value="partner">Partner</option>
                          <option value="super_admin">Super Admin</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={a.status} onChange={(e) => handleStatusChange(a, e.target.value)} disabled={busyId === a.id} className="!py-1.5 !text-xs">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {a.pending_bank_details ? (
                          <button onClick={() => handleApproveBankDetails(a)} disabled={busyId === a.id} className="btn-secondary !px-2.5 !py-1.5 !text-xs">
                            <Landmark className="h-3.5 w-3.5" /> Approve Pending
                          </button>
                        ) : a.bank_account_name ? (
                          <span className="text-xs text-slate-500">{a.bank_account_name} &middot; {a.bank_name}</span>
                        ) : (
                          <span className="text-xs text-slate-300">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {a.last_login ? formatDateTime(a.last_login) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold font-display text-slate-800">Commission Rate</h3>
          </div>
          <div className="flex items-end gap-3 max-w-xs">
            <Input label="Rate (e.g. 0.40 = 40%)" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
            <button onClick={handleSaveRate} disabled={rateSaving} className="btn-primary shrink-0">
              {rateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
          {rateSaved && <p className="text-xs font-semibold text-emerald-600 mt-2">Saved ✓</p>}
          <p className="text-[11px] text-slate-400 mt-2">Applied to every new commission going forward: Commission = (Client Price - Source Cost) × Rate.</p>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-primary-100 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary-600" />
            <h3 className="font-bold font-display text-slate-800">Partner Commissions</h3>
          </div>
          {commissions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No commissions generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-primary-50/50">
                    <th className="px-5 py-2.5 font-semibold">Partner</th>
                    <th className="px-5 py-2.5 font-semibold">Amount</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-700">{c.admin_profiles?.display_name || 'Partner'}</td>
                      <td className="px-5 py-3 font-bold text-slate-800">{formatCurrency(c.commission_amount, settings.currency_symbol)}</td>
                      <td className="px-5 py-3"><span className={`badge ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span></td>
                      <td className="px-5 py-3 text-right">
                        {c.status === 'AWAITING_APPROVAL' && (
                          <button onClick={() => handleApproveCommission(c.id)} disabled={busyId === c.id} className="btn-secondary !px-3 !py-1.5 !text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {c.status === 'APPROVED' && (
                          <button onClick={() => handleMarkPaid(c.id)} disabled={busyId === c.id} className="btn-primary !px-3 !py-1.5 !text-xs">
                            <Banknote className="h-3.5 w-3.5" /> Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="!p-4 flex gap-3 !bg-blue-50/60">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Deactivating a Partner blocks their access without deleting their login. To fully remove someone, delete their user from Supabase Authentication → Users.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  )
}
