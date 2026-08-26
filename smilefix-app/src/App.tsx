import { useEffect, useState } from 'react'
import { AppRouter } from '@/routes/AppRouter'
import { useAuthStore } from '@/store/authStore'
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

  // Block render only until auth session is restored — avoids flash redirect to /login
  if (!ready) return <Loader fullScreen label="" />

  return <AppRouter />
}
