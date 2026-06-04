// ─────────────────────────────────────────────────────────────────────────────
// Notification Service — /api/v1/notifications
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { NotifItem, NotifSeverity, NotifCategory } from '@/store/notificationStore'

// ── Backend shapes ────────────────────────────────────────────────────────────

type BackendNotifType = 'system' | 'appointment' | 'inventory' | 'finance' | 'schedule'

interface BackendNotification {
  id: string
  userId: string | null
  type: BackendNotifType
  severity: NotifSeverity
  title: string
  message: string
  actionLabel: string | null
  actionRoute: string | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  notifications: BackendNotification[]
  unreadCount: number
  total: number
}

interface UnreadCountResponse {
  unreadCount: number
}

// ── Type → category mapping ───────────────────────────────────────────────────

const TYPE_TO_CATEGORY: Record<BackendNotifType, Exclude<NotifCategory, 'all'>> = {
  system:      'system',
  appointment: 'schedule',
  inventory:   'inventory',
  finance:     'critical',
  schedule:    'schedule',
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapNotification(b: BackendNotification): NotifItem {
  return {
    id:              b.id,
    category:        TYPE_TO_CATEGORY[b.type] ?? 'system',
    severity:        b.severity,
    title:           b.title,
    message:         b.message,
    time:            formatRelativeTime(b.createdAt),
    read:            b.isRead,
    actionLabel:     b.actionLabel  ?? undefined,
    actionRoute:     b.actionRoute  ?? undefined,
    // actionHandlerId is a frontend-only concept — not stored on backend
    actionHandlerId: undefined,
  }
}

/** Converts an ISO timestamp to a human-readable relative string */
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins  <  1)  return 'Just now'
  if (mins  < 60)  return `${mins} min${mins === 1 ? '' : 's'} ago`
  if (hours < 24)  return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// ── API calls ─────────────────────────────────────────────────────────────────

export interface ListNotificationsParams {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

/**
 * Fetch paginated notifications + unread count for the current user.
 */
export async function fetchNotifications(
  params: ListNotificationsParams = {},
): Promise<{ notifications: NotifItem[]; unreadCount: number; total: number }> {
  const qs = new URLSearchParams()
  if (params.unreadOnly) qs.set('unreadOnly', 'true')
  if (params.limit  != null) qs.set('limit',  String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs}` : ''

  const result = await apiClient.get<ListResponse>(`/notifications${query}`)
  return {
    notifications: result.notifications.map(mapNotification),
    unreadCount:   result.unreadCount,
    total:         result.total,
  }
}

/**
 * Lightweight poll — only fetches the unread count.
 * Used by the Topbar badge without loading the full list.
 */
export async function fetchUnreadCount(): Promise<number> {
  const result = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
  return result.unreadCount
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`, {})
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all', {})
}

/**
 * Delete a notification.
 */
export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`)
}

// ── Preferences ───────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  appointmentReminders: boolean
  newPatients:          boolean
  paymentAlerts:        boolean
  lowInventory:         boolean
  systemUpdates:        boolean
  weeklyReports:        boolean
  smsNotifications:     boolean
  emailDigest:          boolean
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  appointmentReminders: true,
  newPatients:          true,
  paymentAlerts:        true,
  lowInventory:         true,
  systemUpdates:        false,
  weeklyReports:        true,
  smsNotifications:     false,
  emailDigest:          true,
}

/**
 * Fetch the current user's notification preferences.
 */
export async function fetchPreferences(): Promise<NotificationPreferences> {
  return apiClient.get<NotificationPreferences>('/notifications/preferences')
}

/**
 * Persist a (partial) preferences update for the current user.
 */
export async function savePreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return apiClient.put<NotificationPreferences>('/notifications/preferences', prefs)
}
