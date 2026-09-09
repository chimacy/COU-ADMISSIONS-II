import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ConfigNeeded from './pages/ConfigNeeded.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { isSupabaseConfigured } from './lib/supabaseClient.js'

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

const Dashboard = lazyWithReload(() => import('./pages/Dashboard.jsx'))
const ClientRecords = lazyWithReload(() => import('./pages/ClientRecords.jsx'))
const Requests = lazyWithReload(() => import('./pages/Requests.jsx'))
const PricingDatabase = lazyWithReload(() => import('./pages/PricingDatabase.jsx'))
const RulesPage = lazyWithReload(() => import('./pages/RulesPage.jsx'))
const Administrators = lazyWithReload(() => import('./pages/Administrators.jsx'))
const PaymentAccounts = lazyWithReload(() => import('./pages/PaymentAccounts.jsx'))
const AggregateSettings = lazyWithReload(() => import('./pages/AggregateSettings.jsx'))
const Settings = lazyWithReload(() => import('./pages/Settings.jsx'))

const NewClient = lazyWithReload(() => import('./pages/NewClient.jsx'))
const GenerateQuotation = lazyWithReload(() => import('./pages/GenerateQuotation.jsx'))
const Checkout = lazyWithReload(() => import('./pages/Checkout.jsx'))
const Notifications = lazyWithReload(() => import('./pages/Notifications.jsx'))

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

function AdminHome() {
  const { isSuperAdmin, loading } = useAuth()
  if (loading) return <PageFallback />
  if (!isSuperAdmin) return <Navigate to="/partner" replace />
  return <Dashboard />
}

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
      {/* PERFORMANCE FIX: NotificationProvider now wraps the whole app ONCE,
          for its entire lifetime, instead of being re-created inside every
          single route - that used to tear down and re-open a Realtime
          WebSocket connection on every page navigation, which was the main
          cause of the app feeling sluggish. It now only
          subscribes/unsubscribes when you actually log in or out. */}
      <NotificationProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/check-eligibility" element={<Assessment />} />
            <Route path="/request-assistance" element={<Assessment />} />
            <Route path="/track-request" element={<TrackRequest />} />

            <Route path="/admin/login" element={<Login />} />

            <Route path="/admin" element={<ProtectedRoute><AdminHome /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute requireSuperAdmin><Requests /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute requireSuperAdmin><ClientRecords /></ProtectedRoute>} />
            <Route path="/admin/new-client" element={<ProtectedRoute requireSuperAdmin><NewClient /></ProtectedRoute>} />
            <Route path="/admin/quotation" element={<ProtectedRoute requireSuperAdmin><GenerateQuotation /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute requireSuperAdmin><Checkout /></ProtectedRoute>} />
            <Route path="/admin/notifications" element={<ProtectedRoute requireSuperAdmin><Notifications /></ProtectedRoute>} />
            <Route path="/admin/pricing" element={<ProtectedRoute requireSuperAdmin><PricingDatabase /></ProtectedRoute>} />
            <Route path="/admin/benchmarks" element={<ProtectedRoute requireSuperAdmin><PricingDatabase /></ProtectedRoute>} />
            <Route path="/admin/rules" element={<ProtectedRoute requireSuperAdmin><RulesPage /></ProtectedRoute>} />
            <Route
  path="/admin/payment-accounts"
  element={
    <ProtectedRoute requireSuperAdmin>
      <PaymentAccounts />
    </ProtectedRoute>
  }
/>
            <Route path="/admin/aggregate-settings" element={<ProtectedRoute requireSuperAdmin><AggregateSettings /></ProtectedRoute>} />
            <Route path="/admin/administrators" element={<ProtectedRoute requireSuperAdmin><Administrators /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireSuperAdmin><Settings /></ProtectedRoute>} />

            <Route path="/partner" element={<ProtectedRoute><PartnerHomeGuard /></ProtectedRoute>} />
            <Route path="/partner/new-client" element={<ProtectedRoute><NewClient /></ProtectedRoute>} />
            <Route path="/partner/eligibility-checker" element={<ProtectedRoute><GenerateQuotation /></ProtectedRoute>} />
            <Route path="/partner/my-clients" element={<ProtectedRoute><MyClients title="My Clients" /></ProtectedRoute>} />
            <Route path="/partner/my-requests" element={<ProtectedRoute><MyClients title="My Requests" /></ProtectedRoute>} />
            <Route path="/partner/pay-for-client" element={<ProtectedRoute><PayForClient /></ProtectedRoute>} />
            <Route path="/partner/commissions" element={<ProtectedRoute><PartnerCommissions /></ProtectedRoute>} />
            <Route path="/partner/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/partner/bank-details" element={<ProtectedRoute><PartnerBankDetails /></ProtectedRoute>} />
            <Route path="/partner/profile" element={<ProtectedRoute><PartnerProfile /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </NotificationProvider>
    </ErrorBoundary>
  )
}
