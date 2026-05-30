import { useEffect, useState } from 'react'
import { AppRouter } from '@/routes/AppRouter'
import { useAuthStore } from '@/store/authStore'
import { Loader } from '@/components/ui/Loader'

export default function App() {
  const rehydrate = useAuthStore((s) => s.rehydrate)
  const forceLogout = useAuthStore((s) => s.forceLogout)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    rehydrate().finally(() => setReady(true))
  }, [])

  // Listen for session-expired events fired by apiClient when refresh fails
  useEffect(() => {
    const handler = () => forceLogout()
    window.addEventListener('auth:session-expired', handler)
    return () => window.removeEventListener('auth:session-expired', handler)
  }, [forceLogout])

  // Block render until session is restored — prevents flash redirect to /login
  if (!ready) return <Loader fullScreen label="" />

  return <AppRouter />
}
