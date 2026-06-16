import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { Loader } from '@/components/ui/Loader'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'
import { licenseService } from '@/services/licenseService'

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
const ActivateAppPage    = lazy(() => import('@/pages/ActivateAppPage'))
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

function LicenseGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { forceLogout } = useAuthStore()

  // Compute this first so initial state can use it
  const isActivationPage = location.pathname === '/activate-app'

  // If the user just completed activation (flag written by ActivateAppPage),
  // skip the async license check entirely for this mount cycle. The flag is
  // cleared after first use so normal polling resumes on the next navigation.
  const justActivated = sessionStorage.getItem('license_just_activated') === 'true'
  if (justActivated) {
    sessionStorage.removeItem('license_just_activated')
  }

  // Start with isLoading=false when already on the activation page, or when we
  // know the license was just validated milliseconds ago — avoids a full-screen
  // loader blocking the very first protected render after activation.
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(
    justActivated ? true : null
  )
  const [isLoading, setIsLoading] = useState(
    !isActivationPage && !justActivated
  )
  const [hardwareMismatch, setHardwareMismatch] = useState(false)

  useEffect(() => {
    // Never call the license API while already on the activation page
    if (isActivationPage) {
      setIsLoading(false)
      return
    }

    // The just-activated case already has isLicenseValid=true and isLoading=false.
    // Still schedule a background re-check after a short delay so the first render
    // is not blocked, but the guard self-corrects if something is wrong.
    let cancelled = false
    let initialDelay: ReturnType<typeof setTimeout> | null = null

    async function checkLicense() {
      try {
        const result = await licenseService.checkLicenseStatus()
        if (cancelled) return

        // Hardware-bound license copied to another machine
        if (result.status === 'REVOKED' && result.hardwareMismatch === true) {
          forceLogout()
          localStorage.removeItem('license_activated')
          localStorage.removeItem('license_bypass')
          setHardwareMismatch(true)
          setIsLicenseValid(false)
          return
        }

        // Revoked for any other reason — clear session
        if (result.status === 'REVOKED') {
          forceLogout()
          localStorage.removeItem('license_activated')
          localStorage.removeItem('license_bypass')
        }

        setIsLicenseValid(result.valid && result.status === 'ACTIVE')
      } catch {
        // Network error: don't kick the user out — keep whatever validity we had
        if (!cancelled) {
          setIsLicenseValid((prev) => (prev === null ? false : prev))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (justActivated) {
      // Delay the first re-check by 2 s so the initial render is guaranteed to
      // complete before we potentially flip isLicenseValid based on a slow response.
      initialDelay = setTimeout(() => {
        if (!cancelled) checkLicense()
      }, 2000)
    } else {
      checkLicense()
    }

    // Re-verify every 5 minutes while the user is inside the app
    const intervalId = setInterval(checkLicense, 5 * 60 * 1000)
    return () => {
      cancelled = true
      if (initialDelay) clearTimeout(initialDelay)
      clearInterval(intervalId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isActivationPage, forceLogout])

  // Let the activation page render freely — it handles its own state
  if (isActivationPage) return <>{children}</>

  // Hardware mismatch: redirect with a security alert
  if (hardwareMismatch) {
    return (
      <Navigate
        to="/activate-app"
        state={{
          error: '❌ SECURITY ALERT: This software has been copied to another computer. License automatically revoked. Please contact support for a new hardware-bound license.',
          hardwareMismatch: true,
        }}
        replace
      />
    )
  }

  if (isLoading) {
    return <Loader fullScreen label="Verifying system license..." />
  }

  // License not active → go activate; no error message needed for a plain PENDING state
  if (isLicenseValid === false) {
    return <Navigate to="/activate-app" replace />
  }

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
    <LicenseGuard>
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>{children}</PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    </LicenseGuard>
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
        <Route path="/activate-app"          element={<PageWrapper><ActivateAppPage /></PageWrapper>} />

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
