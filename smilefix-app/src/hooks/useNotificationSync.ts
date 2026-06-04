import { useEffect, useRef } from 'react'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'

const POLL_INTERVAL_MS = 60_000 // refresh badge count every 60 seconds

/**
 * useNotificationSync
 *
 * Call this once at the app root (MainLayout or App).
 * - On mount (after login): loads the full notification list from the API.
 * - Every POLL_INTERVAL_MS: refreshes the unread badge count silently.
 * - Cleans up the interval on unmount / logout.
 */
export function useNotificationSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const load                = useNotificationStore((s) => s.load)
  const refreshUnreadCount  = useNotificationStore((s) => s.refreshUnreadCount)
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear the interval if the user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial full load
    load()

    // Poll badge count every minute (lightweight — single DB count query)
    intervalRef.current = setInterval(() => {
      refreshUnreadCount()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isAuthenticated, load, refreshUnreadCount])
}
