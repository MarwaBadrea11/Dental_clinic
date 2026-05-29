import { useEffect, useState } from 'react'
import { AppRouter } from '@/routes/AppRouter'
import { useAuthStore } from '@/store/authStore'
import { Loader } from '@/components/ui/Loader'

export default function App() {
  const rehydrate = useAuthStore((s) => s.rehydrate)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    rehydrate().finally(() => setReady(true))
  }, [])

  // Block render until session is restored — prevents flash redirect to /login
  if (!ready) return <Loader fullScreen label="" />

  return <AppRouter />
}
