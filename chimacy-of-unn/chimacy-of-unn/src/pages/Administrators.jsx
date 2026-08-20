import React, { useEffect, useState } from 'react'
import { ShieldCheck, Loader2, Info } from 'lucide-react'
import DashboardLayout from '../components/Layout/DashboardLayout.jsx'
import Card from '../components/UI/Card.jsx'
import { Select } from '../components/UI/FormField.jsx'
import { getAdminProfiles, updateAdminProfile } from '../utils/db.js'
import { formatDateTime } from '../utils/format.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Administrators() {
  const { user, refetchProfile } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const refresh = () => {
    setLoading(true)
    getAdminProfiles().then(setAdmins).finally(() => setLoading(false))
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

  return (
    <DashboardLayout title="Administrators">
      <div className="space-y-5">
        <Card className="!p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold font-display text-slate-800 dark:text-white">Administrator Accounts</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              To add a new administrator, create their login in Supabase (Authentication → Users → Add user). The moment they log in for the first time, they'll appear here automatically as a regular Admin — promote them to Super Admin below if needed.
            </p>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-primary-50/60 dark:bg-slate-800/50 border-b border-primary-100 dark:border-slate-700">
                    <th className="px-4 py-3 font-semibold">Display Name</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                        {a.display_name} {a.id === user.id && <span className="text-[10px] text-primary-600">(you)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Select value={a.role} onChange={(e) => handleRoleChange(a, e.target.value)} disabled={busyId === a.id} className="!py-1.5 !text-xs">
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={a.status} onChange={(e) => handleStatusChange(a, e.target.value)} disabled={busyId === a.id} className="!py-1.5 !text-xs">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {a.last_login ? formatDateTime(a.last_login) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="!p-4 flex gap-3 !bg-blue-50/60 dark:!bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Deactivating an admin here does not delete their login — it only blocks their access. To fully remove someone, delete their user from Supabase Authentication → Users.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  )
}
