import { useEffect, useState } from 'react'
import { AppRouter } from '@/routes/AppRouter'
import { useAuthStore } from '@/store/authStore'
import { licenseService } from '@/services/licenseService'
import { Loader } from '@/components/ui/Loader'

export default function App() {
  const rehydrate   = useAuthStore((s) => s.rehydrate)
  const forceLogout = useAuthStore((s) => s.forceLogout)
  const [ready, setReady] = useState(false)

  // Rehydrate auth session on mount
  useEffect(() => {
    rehydrate().finally(() => setReady(true))
  }, [rehydrate])

  // Listen for session-expired events from apiClient
  useEffect(() => {
    const handler = () => forceLogout()
    window.addEventListener('auth:session-expired', handler)
    return () => window.removeEventListener('auth:session-expired', handler)
  }, [forceLogout])

  // On startup, check for a hardware mismatch (software copied to another PC).
  // This runs fire-and-forget — it must NOT block rendering or prevent the
  // activation page from loading. PENDING / ACTIVE states are handled by LicenseGuard.
  useEffect(() => {
    async function checkHardwareMismatchOnBoot() {
      // Skip check if dev-bypass is active
      if (localStorage.getItem('license_bypass') === 'true') return

      try {
        const result = await licenseService.checkLicenseStatus()

        if (result.status === 'REVOKED' && result.hardwareMismatch === true) {
          // Nuke the session so the LicenseGuard redirects cleanly
          forceLogout()
          localStorage.removeItem('license_activated')
          localStorage.removeItem('license_bypass')
          sessionStorage.setItem('hardware_mismatch', 'true')
          sessionStorage.setItem(
            'hardware_mismatch_message',
            '❌ SECURITY ALERT: This software has been copied to another computer. License automatically revoked.'
          )
        }
      } catch {
        // Backend unreachable on boot — LicenseGuard will deal with it per-route
      }
    }

    checkHardwareMismatchOnBoot()
  }, [forceLogout])

  // Block render only until auth session is restored — avoids flash redirect to /login
  if (!ready) return <Loader fullScreen label="" />

  return <AppRouter />
}
