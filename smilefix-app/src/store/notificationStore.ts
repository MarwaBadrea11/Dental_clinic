import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notificationService'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifSeverity = 'error' | 'warning' | 'success' | 'info' | 'neutral'
export type NotifCategory = 'all' | 'critical' | 'inventory' | 'system' | 'schedule'

export interface NotifItem {
  id: string
  category: Exclude<NotifCategory, 'all'>
  severity: NotifSeverity
  title: string
  message: string
  time: string
  read: boolean
  actionLabel?: string
  /** Optional SPA route for the action button */
  actionRoute?: string
  /** Frontend-only handler id (e.g. 'openRestock') — not persisted to backend */
  actionHandlerId?: string
}

// ── Seed data (shown before the first successful API fetch) ───────────────────
// These give the UI something to render immediately on first load or when
// the backend is unreachable.

const SEED_NOTIFICATIONS: NotifItem[] = [
  {
    id: 'seed-n1',
    category: 'critical',
    severity: 'error',
    title: 'notifications.criticalDebt',
    message: 'notifications.criticalDebtMsg',
    time: '5 mins ago',
    read: false,
    actionLabel: 'notifications.viewFinancial',
    actionRoute: '/finance',
  },
  {
    id: 'seed-n2',
    category: 'inventory',
    severity: 'warning',
    title: 'notifications.lowInventory',
    message: 'notifications.lowInventoryMsg',
    time: '18 mins ago',
    read: false,
    actionLabel: 'notifications.orderNow',
    actionRoute: '/lab',
  },
  {
    id: 'seed-n3',
    category: 'system',
    severity: 'success',
    title: 'notifications.archiveSuccess',
    message: 'notifications.archiveMsg',
    time: '2 hrs ago',
    read: false,
    actionLabel: 'notifications.downloadLog',
    actionRoute: '/reports',
  },
  {
    id: 'seed-n4',
    category: 'schedule',
    severity: 'neutral',
    title: 'notifications.scheduleConflict',
    message: 'notifications.scheduleConflictMsg',
    time: '3 hrs ago',
    read: false,
    actionLabel: 'notifications.resolveCalendar',
    actionRoute: '/calendar',
  },
  {
    id: 'seed-n5',
    category: 'system',
    severity: 'info',
    title: 'X-Ray Scans Uploaded',
    message: 'Dr. Peterson uploaded 4 new X-ray scans for patient ID-8821.',
    time: '4 hrs ago',
    read: true,
  },
  {
    id: 'seed-n6',
    category: 'critical',
    severity: 'success',
    title: 'Payment Confirmed',
    message: 'Billing Dept confirmed payment for invoice #9921-A. Amount: $850.00',
    time: '5 hrs ago',
    read: true,
  },
  {
    id: 'seed-n7',
    category: 'system',
    severity: 'info',
    title: 'New Staff Credential Provisioned',
    message: 'Admin provisioned access for Dr. Nguyen (Periodontist) — effective immediately.',
    time: '9 hrs ago',
    read: true,
  },
  {
    id: 'seed-n8',
    category: 'schedule',
    severity: 'warning',
    title: 'Appointment Reminder',
    message: '3 patients have not confirmed their appointments for tomorrow. Send reminders?',
    time: '1 day ago',
    read: true,
    actionLabel: 'notifications.sendReminders',
    actionHandlerId: 'sendReminders',
  },
]

// ── Store interface ───────────────────────────────────────────────────────────

interface NotificationState {
  notifications: NotifItem[]
  unreadCount: number
  isLoading: boolean
  /** True after at least one successful API fetch — switches away from seed data */
  hydrated: boolean

  // ── API-backed mutations ──────────────────────────────────────────────────
  load: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>

  // ── Local-only helpers (for frontend-only items like restock) ─────────────
  updateNotification: (id: string, patch: Partial<NotifItem>) => void
  addNotification: (item: Omit<NotifItem, 'id'>) => void
  _sync: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: SEED_NOTIFICATIONS,
      unreadCount:   SEED_NOTIFICATIONS.filter((n) => !n.read).length,
      isLoading:     false,
      hydrated:      false,

      // ── Load full list from API ──────────────────────────────────────────
      load: async () => {
        set({ isLoading: true })
        try {
          const { notifications, unreadCount } = await fetchNotifications({ limit: 100 })

          // Merge: keep frontend-only seed items that have actionHandlerId
          // (like 'openRestock') on top of the backend list, de-duped by id.
          const backendIds = new Set(notifications.map((n) => n.id))
          const localOnly  = get().notifications.filter(
            (n) => n.actionHandlerId && !backendIds.has(n.id),
          )

          set({
            notifications: [...localOnly, ...notifications],
            unreadCount:   unreadCount + localOnly.filter((n) => !n.read).length,
            isLoading:     false,
            hydrated:      true,
          })
        } catch {
          // Backend unreachable — keep whatever is in the store (seed or cached)
          set({ isLoading: false })
        }
      },

      // ── Lightweight poll for badge count ─────────────────────────────────
      refreshUnreadCount: async () => {
        try {
          const count = await fetchUnreadCount()
          // Add local-only unread items — those with actionHandlerId that aren't
          // in the backend list. Mirror the same de-dup logic used in load() to
          // avoid double-counting items that appear in both the store and backend.
          const all        = get().notifications
          const backendIds = new Set(all.filter((n) => !n.actionHandlerId).map((n) => n.id))
          const localUnread = all.filter(
            (n) => n.actionHandlerId && !backendIds.has(n.id) && !n.read,
          ).length
          set({ unreadCount: count + localUnread })
        } catch {
          // Non-critical — badge just keeps its last known value
        }
      },

      // ── Mark one read (optimistic + API) ──────────────────────────────────
      markRead: async (id) => {
        // Optimistic update
        set((s) => {
          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          )
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
        })
        // Sync to backend (seed ids like 'seed-n1' won't match a UUID — that's fine)
        try {
          if (!id.startsWith('seed-')) await markNotificationRead(id)
        } catch {
          // Non-critical — optimistic state is already correct
        }
      },

      // ── Mark all read (optimistic + API) ──────────────────────────────────
      markAllRead: async () => {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }))
        try {
          await markAllNotificationsRead()
        } catch {
          // Non-critical
        }
      },

      // ── Local-only helpers ────────────────────────────────────────────────
      updateNotification: (id, patch) => {
        set((s) => {
          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, ...patch } : n,
          )
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
        })
      },

      addNotification: (item) => {
        const id = `local-${Date.now()}`
        set((s) => {
          const notifications = [{ ...item, id }, ...s.notifications]
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
        })
      },

      _sync: () => {
        const { notifications } = get()
        set({ unreadCount: notifications.filter((n) => !n.read).length })
      },
    }),
    {
      name: 'notification-store',
      // Persist list + hydration flag so we don't flash seed data after reload
      partialize: (s) => ({
        notifications: s.notifications,
        hydrated:      s.hydrated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unreadCount = state.notifications.filter((n) => !n.read).length
          state.isLoading   = false
        }
      },
    },
  ),
)
