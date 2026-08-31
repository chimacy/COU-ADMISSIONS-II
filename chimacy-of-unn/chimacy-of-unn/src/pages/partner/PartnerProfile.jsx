import React, { useEffect, useState } from 'react'
import { Save, Loader2, UserCircle } from 'lucide-react'
import DashboardLayout from '../../components/Layout/DashboardLayout.jsx'
import Card from '../../components/UI/Card.jsx'
import { Input } from '../../components/UI/FormField.jsx'
import { getMyProfile, updateMyDisplayName } from '../../utils/db.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatDateTime } from '../../utils/format.js'

export default function PartnerProfile() {
  const { user, refetchProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMyProfile().then((p) => { setProfile(p); setDisplayName(p?.display_name || '') }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateMyDisplayName(displayName)
      await refetchProfile()
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
      <DashboardLayout title="Profile">
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-lg space-y-5">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <UserCircle className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold font-display text-slate-800">My Profile</h3>
          </div>

          <div className="space-y-4">
            <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Email" value={user?.email || ''} disabled />
            <Input label="Role" value="Partner" disabled />
            <Input label="Last Login" value={profile?.last_login ? formatDateTime(profile.last_login) : '-'} disabled />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
