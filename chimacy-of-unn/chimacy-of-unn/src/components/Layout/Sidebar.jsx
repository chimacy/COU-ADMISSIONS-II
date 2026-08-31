import React, { memo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, Users, FileText, Database, Settings, GraduationCap,
  X, ScrollText, CreditCard, LogOut, Inbox, ShieldCheck, Calculator, Bell, Sparkles,
  Wallet, UserCircle,
} from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

// Super Admin sees everything.
const superAdminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/requests', label: 'Assistance Requests', icon: Inbox },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/new-client', label: 'New Client', icon: UserPlus },
  { to: '/admin/clients', label: 'Client Records', icon: Users },
  { to: '/admin/quotation', label: 'Eligibility Checker', icon: FileText },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/pricing', label: 'Pricing Database', icon: Database },
  { to: '/admin/rules', label: 'Rules', icon: ScrollText },
  { to: '/admin/aggregate-settings', label: 'Aggregate Settings', icon: Calculator },
  { to: '/admin/administrators', label: 'Partners & Admins', icon: ShieldCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

// Partner navigation - only their own operational tools, nothing
// business-wide. No Dashboard, no Assistance Requests, no Client Records.
const partnerLinks = [
  { to: '/partner', label: 'Dashboard', icon: UserPlus },
  { to: '/partner/new-client', label: 'Register New Client', icon: UserPlus },
  { to: '/partner/eligibility-checker', label: 'Eligibility Checker', icon: Sparkles },
  { to: '/partner/my-clients', label: 'My Clients', icon: Users },
  { to: '/partner/my-requests', label: 'My Requests', icon: Inbox },
  { to: '/partner/pay-for-client', label: 'Payment for Client', icon: CreditCard },
  { to: '/partner/commissions', label: 'My Commissions', icon: Wallet },
  { to: '/partner/notifications', label: 'Notifications', icon: Bell },
  { to: '/partner/bank-details', label: 'Payment/Bank Details', icon: Database },
  { to: '/partner/profile', label: 'Profile', icon: UserCircle },
]

function Sidebar({ open, onClose }) {
  const { settings } = useSettings()
  const {
    user, profile, isSuperAdmin, logout,
  } = useAuth()
  const navigate = useNavigate()

  const links = isSuperAdmin ? superAdminLinks : partnerLinks

  async function handleLogout() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 shrink-0 transform transition-transform duration-150 ease-out lg:translate-x-0 will-change-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full m-0 lg:m-3 lg:rounded-2xl glass-chrome !p-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-5 border-b border-primary-100/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-md shrink-0 brand-surface overflow-hidden">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt={settings.company_name} className="h-full w-full object-cover" loading="eager" decoding="async" />
                ) : (
                  <GraduationCap className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm leading-tight text-slate-800 truncate">{settings.company_name}</p>
                <p className="text-[11px] text-slate-500 leading-tight truncate">{settings.institution_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden btn-ghost !p-1.5 rounded-full shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {links.map(({
              to, label, icon: Icon, end,
            }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-100 ${
                    isActive
                      ? 'text-white brand-surface'
                      : 'text-slate-600 active:bg-primary-50'
                  }`}
              >
                <Icon className="shrink-0" size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-primary-100/60 space-y-3">
            {user?.email && (
              <div className="text-[11px] text-slate-500 px-1">
                <p className="truncate">Signed in as <strong>{profile?.display_name || user.email}</strong></p>
                {profile?.role && (
                  <span className="badge mt-1 bg-primary-50 text-primary-700 !text-[10px]">
                    {profile.role === 'super_admin' ? 'Super Admin' : 'Partner'}
                  </span>
                )}
              </div>
            )}
            <button onClick={handleLogout} className="btn-ghost w-full !justify-start text-red-600">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              &copy; {new Date().getFullYear()} {settings.company_name}
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

export default memo(Sidebar)
