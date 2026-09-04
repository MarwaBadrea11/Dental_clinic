import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Loader } from '@/components/ui/Loader'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

// ── Lazy pages ────────────────────────────────────────────────────────────────
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'))
const PatientsPage       = lazy(() => import('@/pages/PatientsPage'))
const AddPatientPage     = lazy(() => import('@/pages/AddPatientPage'))
const PatientDetailPage  = lazy(() => import('@/pages/PatientDetailPage'))
const EditPatientPage    = lazy(() => import('@/pages/EditPatientPage'))
const OdontogramPage     = lazy(() => import('@/pages/OdontogramPage'))
const CalendarPage       = lazy(() => import('@/pages/CalendarPage'))
const TreatmentsPage     = lazy(() => import('@/pages/TreatmentsPage'))
const FinancePage        = lazy(() => import('@/pages/FinancePage'))
const InventoryPage      = lazy(() => import('@/pages/InventoryPage'))
const LabOrdersPage      = lazy(() => import('@/pages/LabOrdersPage'))
const SuppliersPage      = lazy(() => import('@/pages/SuppliersPage'))
const StaffPage          = lazy(() => import('@/pages/StaffPage'))
const ReportsPage        = lazy(() => import('@/pages/ReportsPage'))
const NotificationsPage  = lazy(() => import('@/pages/NotificationsPage'))
const SettingsPage       = lazy(() => import('@/pages/SettingsPage'))
const LoginPage          = lazy(() => import('@/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'))

// ── Guards ────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />
  return <>{children}</>
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loader fullScreen label="Loading..." />}>
      {children}
    </Suspense>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PageWrapper>{children}</PageWrapper>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        {/* Auth */}
        <Route path={ROUTES.LOGIN}           element={<PublicOnlyRoute><PageWrapper><LoginPage /></PageWrapper></PublicOnlyRoute>} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<PublicOnlyRoute><PageWrapper><ForgotPasswordPage /></PageWrapper></PublicOnlyRoute>} />

        {/* Dashboard */}
        <Route path="/"                      element={<Protected><DashboardPage /></Protected>} />

        {/* Patients */}
        <Route path={ROUTES.PATIENTS}        element={<Protected><PatientsPage /></Protected>} />
        <Route path={ROUTES.PATIENT_NEW}     element={<Protected><AddPatientPage /></Protected>} />
        <Route path="/patients/:id"          element={<Protected><PatientDetailPage /></Protected>} />
        <Route path="/patients/:id/edit"     element={<Protected><EditPatientPage /></Protected>} />
        <Route path="/patients/:id/odontogram" element={<Protected><OdontogramPage /></Protected>} />

        {/* Other modules */}
        <Route path={ROUTES.CALENDAR}        element={<Protected><CalendarPage /></Protected>} />
        <Route path={ROUTES.TREATMENTS}      element={<Protected><TreatmentsPage /></Protected>} />
        <Route path={ROUTES.FINANCE}         element={<Protected><FinancePage /></Protected>} />
        <Route path={ROUTES.INVENTORY}       element={<Protected><InventoryPage /></Protected>} />
        <Route path={ROUTES.LAB}            element={<Protected><LabOrdersPage /></Protected>} />
        <Route path={ROUTES.SUPPLIERS}     element={<Protected><SuppliersPage /></Protected>} />
        <Route path={ROUTES.STAFF}           element={<Protected><StaffPage /></Protected>} />
        <Route path={ROUTES.REPORTS}         element={<Protected><ReportsPage /></Protected>} />
        <Route path={ROUTES.NOTIFICATIONS}   element={<Protected><NotificationsPage /></Protected>} />
        <Route path={ROUTES.SETTINGS}        element={<Protected><SettingsPage /></Protected>} />

        {/* 404 */}
        <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
      </Routes>
    </HashRouter>
  )
}
