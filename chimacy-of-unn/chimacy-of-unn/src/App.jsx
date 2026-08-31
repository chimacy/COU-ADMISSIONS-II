import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ConfigNeeded from './pages/ConfigNeeded.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { isSupabaseConfigured } from './lib/supabaseClient.js'

// After a new deploy, a browser tab that's been open (or has an old cached
// page) may still be holding file names from the PREVIOUS build. This
// wrapper catches that specific failure and reloads the page ONE time
// automatically to pick up the current build.
function lazyWithReload(importer) {
  return lazy(async () => {
    const key = 'chimacy_chunk_reload_attempted'
    try {
      const mod = await importer()
      sessionStorage.removeItem(key)
      return mod
    } catch (err) {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true')
        window.location.reload()
        return { default: () => null }
      }
      throw err
    }
  })
}

const Landing = lazyWithReload(() => import('./pages/client/Landing.jsx'))
const Assessment = lazyWithReload(() => import('./pages/client/Assessment.jsx'))
const TrackRequest = lazyWithReload(() => import('./pages/client/TrackRequest.jsx'))

const Login = lazyWithReload(() => import('./pages/Login.jsx'))

// Super Admin only
const Dashboard = lazyWithReload(() => import('./pages/Dashboard.jsx'))
const ClientRecords = lazyWithReload(() => import('./pages/ClientRecords.jsx'))
const Requests = lazyWithReload(() => import('./pages/Requests.jsx'))
const PricingDatabase = lazyWithReload(() => import('./pages/PricingDatabase.jsx'))
const RulesPage = lazyWithReload(() => import('./pages/RulesPage.jsx'))
const Administrators = lazyWithReload(() => import('./pages/Administrators.jsx'))
const AggregateSettings = lazyWithReload(() => import('./pages/AggregateSettings.jsx'))
const Settings = lazyWithReload(() => import('./pages/Settings.jsx'))

// Shared operational pages (Super Admin mounts them under /admin/*,
// Partner mounts the SAME components under /partner/*)
const NewClient = lazyWithReload(() => import('./pages/NewClient.jsx'))
const GenerateQuotation = lazyWithReload(() => import('./pages/GenerateQuotation.jsx'))
const Checkout = lazyWithReload(() => import('./pages/Checkout.jsx'))
const Notifications = lazyWithReload(() => import('./pages/Notifications.jsx'))

// Partner only
const PartnerHome = lazyWithReload(() => import('./pages/partner/PartnerHome.jsx'))
const MyClients = lazyWithReload(() => import('./pages/partner/MyClients.jsx'))
const PayForClient = lazyWithReload(() => import('./pages/partner/PayForClient.jsx'))
const PartnerCommissions = lazyWithReload(() => import('./pages/partner/PartnerCommissions.jsx'))
const PartnerBankDetails = lazyWithReload(() => import('./pages/partner/PartnerBankDetails.jsx'))
const PartnerProfile = lazyWithReload(() => import('./pages/partner/PartnerProfile.jsx'))

const NotFound = lazyWithReload(() => import('./pages/NotFound.jsx'))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
    </div>
  )
}

function AdminArea({ children }) {
  return <NotificationProvider>{children}</NotificationProvider>
}

// "/admin" is the normal post-login landing spot for a Super Admin, but a
// Partner should never see it - they get redirected straight to their own
// home page instead of a blocked screen right after logging in.
function AdminHome() {
  const { isSuperAdmin, loading } = useAuth()
  if (loading) return <PageFallback />
  if (!isSuperAdmin) return <Navigate to="/partner" replace />
  return <Dashboard />
}

// Mirror redirect the other way: a Super Admin who somehow lands on
// "/partner" gets sent to their own dashboard instead.
function PartnerHomeGuard() {
  const { isSuperAdmin, loading } = useAuth()
  if (loading) return <PageFallback />
  if (isSuperAdmin) return <Navigate to="/admin" replace />
  return <PartnerHome />
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigNeeded />
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* -------- Public Client Portal -------- */}
          <Route path="/" element={<Landing />} />
          <Route path="/check-eligibility" element={<Assessment />} />
          <Route path="/request-assistance" element={<Assessment />} />
          <Route path="/track-request" element={<TrackRequest />} />

          {/* -------- Login (shared) -------- */}
          <Route path="/admin/login" element={<Login />} />

          {/* -------- Super Admin only -------- */}
          <Route path="/admin" element={<ProtectedRoute><AdminArea><AdminHome /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/requests" element={<ProtectedRoute requireSuperAdmin><AdminArea><Requests /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/clients" element={<ProtectedRoute requireSuperAdmin><AdminArea><ClientRecords /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/new-client" element={<ProtectedRoute requireSuperAdmin><AdminArea><NewClient /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/quotation" element={<ProtectedRoute requireSuperAdmin><AdminArea><GenerateQuotation /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute requireSuperAdmin><AdminArea><Checkout /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute requireSuperAdmin><AdminArea><Notifications /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute requireSuperAdmin><AdminArea><PricingDatabase /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/benchmarks" element={<ProtectedRoute requireSuperAdmin><AdminArea><PricingDatabase /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/rules" element={<ProtectedRoute requireSuperAdmin><AdminArea><RulesPage /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/aggregate-settings" element={<ProtectedRoute requireSuperAdmin><AdminArea><AggregateSettings /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/administrators" element={<ProtectedRoute requireSuperAdmin><AdminArea><Administrators /></AdminArea></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireSuperAdmin><AdminArea><Settings /></AdminArea></ProtectedRoute>} />

          {/* -------- Partner -------- */}
          <Route path="/partner" element={<ProtectedRoute><AdminArea><PartnerHomeGuard /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/new-client" element={<ProtectedRoute><AdminArea><NewClient /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/eligibility-checker" element={<ProtectedRoute><AdminArea><GenerateQuotation /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/my-clients" element={<ProtectedRoute><AdminArea><MyClients title="My Clients" /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/my-requests" element={<ProtectedRoute><AdminArea><MyClients title="My Requests" /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/pay-for-client" element={<ProtectedRoute><AdminArea><PayForClient /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/commissions" element={<ProtectedRoute><AdminArea><PartnerCommissions /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/notifications" element={<ProtectedRoute><AdminArea><Notifications /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/bank-details" element={<ProtectedRoute><AdminArea><PartnerBankDetails /></AdminArea></ProtectedRoute>} />
          <Route path="/partner/profile" element={<ProtectedRoute><AdminArea><PartnerProfile /></AdminArea></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
