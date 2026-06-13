import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell, CheckCheck, Filter, AlertTriangle, Package,
  CheckCircle2, CalendarX, Upload, CreditCard, Shield, Clock,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { NotificationWidget } from '@/components/dashboard'
import type { NotificationAlert } from '@/components/dashboard'
import { RestockOrderModal } from '@/components/inventory'
import { useInventoryStore } from '@/store/inventoryStore'
import { useNotificationStore } from '@/store/notificationStore'
import type { NotifItem, NotifCategory } from '@/store/notificationStore'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

// ── Helpers ───────────────────────────────────────────────────────────────────

const severityBadge = {
  error: 'error', warning: 'warning', success: 'success', info: 'primary', neutral: 'neutral',
} as const

const ACTIVITY_LOG = [
  { icon: <Upload size={16} />,       actor: 'Dr. Miller', action: 'Archived Patient Record #8892',    time: '12:44 PM', color: 'secondary' as const },
  { icon: <Shield size={16} />,       actor: 'System',     action: 'Financial Integrity Verification', time: '10:15 AM', color: 'primary' as const },
  { icon: <CheckCircle2 size={16} />, actor: 'Admin',      action: 'New Staff Credential Provisioning',time: '09:02 AM', color: 'tertiary' as const },
]

/** Map each notification id to a lucide icon element */
function getNotifIcon(id: string, severity: NotifItem['severity']) {
  const icons: Record<string, React.ReactNode> = {
    n1: <AlertTriangle size={18} />,
    n2: <Package size={18} />,
    n3: <CheckCircle2 size={18} />,
    n4: <CalendarX size={18} />,
    n5: <Upload size={18} />,
    n6: <CreditCard size={18} />,
    n7: <Shield size={18} />,
    n8: <Clock size={18} />,
  }
  const fallbacks: Record<NotifItem['severity'], React.ReactNode> = {
    error:   <AlertTriangle size={18} />,
    warning: <Package size={18} />,
    success: <CheckCircle2 size={18} />,
    info:    <Upload size={18} />,
    neutral: <Bell size={18} />,
  }
  return icons[id] ?? fallbacks[severity]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate  = useNavigate()
  const { t }     = useTranslation()

  // ── Store ──────────────────────────────────────────────────────────────────
  const { notifications, markRead, markAllRead, updateNotification, load } =
    useNotificationStore()

  // Re-fetch from API when the page mounts (in case the layout poll hasn't fired yet)
  useEffect(() => { load() }, [load])

  // ── Inventory (for restock modal) ─────────────────────────────────────────
  const { items: inventoryItems, restockItem } = useInventoryStore()
  const lowStockItem =
    inventoryItems.find((i) => i.id === 'i2') ??
    inventoryItems.find((i) => i.status === 'low-stock' || i.status === 'out-of-stock')

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all')
  const [restockOpen, setRestockOpen]        = useState(false)

  const n2Ordered = notifications.find((n) => n.id === 'n2')?.actionLabel === 'notifications.ordered'

  // ── Alert panel data (top-4 unread only) ──────────────────────────────────
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const priorityAlerts: NotificationAlert[] = notifications
    .filter((n) => !n.read && !dismissedAlerts.has(n.id))
    .slice(0, 4)
    .map((n) => ({
      id:           n.id,
      severity:     n.severity,
      title:        t(n.title, { defaultValue: n.title }),
      message:      t(n.message, { defaultValue: n.message }),
      actionLabel:  n.actionLabel ? t(n.actionLabel, { defaultValue: n.actionLabel }) : undefined,
      dismissible:  true,
      onAction:     buildOnAction(n),
    }))

  function buildOnAction(n: NotifItem): (() => void) | undefined {
    if (!n.actionLabel) return undefined
    if (n.actionHandlerId === 'openRestock') {
      return n2Ordered ? undefined : () => setRestockOpen(true)
    }
    if (n.actionHandlerId === 'sendReminders') {
      return () => {
        // Future: call reminders API. For now navigate to calendar.
        navigate(ROUTES.CALENDAR)
        markRead(n.id)
      }
    }
    if (n.actionRoute) {
      return () => {
        navigate(n.actionRoute!)
        markRead(n.id)
      }
    }
    return undefined
  }

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]))
    markRead(id)
  }

  // ── Restock confirm ────────────────────────────────────────────────────────
  const handleOrderConfirm = (itemId: string, quantity: number) => {
    restockItem(itemId, quantity)
    updateNotification('n2', {
      read: true,
      actionLabel: 'notifications.ordered',
      actionHandlerId: undefined,
    })
    setRestockOpen(false)
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered =
    activeCategory === 'all'
      ? notifications
      : notifications.filter((n) => n.category === activeCategory)

  const unreadCount = notifications.filter((n) => !n.read).length

  // ── Category tabs ──────────────────────────────────────────────────────────
  const CATEGORIES: { id: NotifCategory; label: string }[] = [
    { id: 'all',       label: t('notifications.all') },
    { id: 'critical',  label: t('notifications.critical') },
    { id: 'inventory', label: t('nav.inventory') },
    { id: 'schedule',  label: t('notifications.schedule') },
    { id: 'system',    label: t('notifications.system') },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        breadcrumb={[
          { label: t('nav.dashboard'), href: '/' },
          { label: t('nav.notifications') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck size={15} />}
              onClick={markAllRead}
            >
              {t('notifications.markAllRead')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Filter size={15} />}>
              {t('notifications.exportPDF')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 w-full">
        {/* Priority alerts widget */}
        <NotificationWidget
          alerts={priorityAlerts.map((a) =>
            a.id === 'n2'
              ? {
                  ...a,
                  actionLabel: n2Ordered
                    ? (t('notifications.ordered') ?? 'Ordered ✓')
                    : a.actionLabel,
                  onAction: n2Ordered ? undefined : () => setRestockOpen(true),
                }
              : a,
          )}
          title={t('notifications.smartNotifications')}
          badgeCount={priorityAlerts.length}
          onDismiss={dismissAlert}
          delay={0.1}
        />

        {/* Backup status + activity log */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Backup status card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
          >
            <div className="bg-[var(--color-primary)] rounded-[var(--radius-xl)] p-6 text-[var(--color-on-primary)] relative overflow-hidden h-full flex flex-col justify-between">
              <div className="absolute -right-4 -bottom-4 text-[120px] opacity-10 select-none pointer-events-none">🛡</div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={18} />
                  <h4 className="font-bold uppercase tracking-widest text-sm">{t('notifications.backupStatus')}</h4>
                </div>
                <p className="text-xl font-bold mb-1">{t('notifications.backupCompleted')}</p>
                <p className="text-sm opacity-80">{t('notifications.backupNext')}</p>
              </div>
              <div className="relative z-10 mt-6 flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <span className="text-[11px] font-bold whitespace-nowrap">{t('notifications.backupSecure')}</span>
              </div>
            </div>
          </motion.div>

          {/* Activity log */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="col-span-2"
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[var(--color-on-surface)]">{t('notifications.recentActivity')}</h4>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => navigate(ROUTES.REPORTS)}
                >
                  {t('notifications.fullLogViewer')}
                </Button>
              </div>
              <div className="space-y-3">
                {ACTIVITY_LOG.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + i * 0.07 }}
                    className="flex items-center justify-between py-2 border-b border-[var(--color-outline-variant)]/10 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          entry.color === 'primary'
                            ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
                            : entry.color === 'secondary'
                            ? 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]'
                            : 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]',
                        )}
                      >
                        {entry.icon}
                      </div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)]">{entry.action}</span>
                    </div>
                    <span className="text-[11px] text-[var(--color-outline)] whitespace-nowrap ml-4">
                      {entry.time} — {entry.actor}
                    </span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Full notification list */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="w-full"
        >
            <Card padding="none">
              {/* List header */}
              <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
                    <Bell size={16} />
                  </div>
                  <h3 className="font-semibold text-[var(--color-on-surface)]">{t('notifications.allNotifications')}</h3>
                  {unreadCount > 0 && (
                    <Badge variant="error" size="sm">
                      {unreadCount} {t('notifications.unread')}
                    </Badge>
                  )}
                </div>
                {/* Category filter tabs */}
                <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-full p-1 overflow-x-auto tab-bar-scroll">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
                        activeCategory === cat.id
                          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm'
                          : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]',
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification rows */}
              <div className="divide-y divide-[var(--color-outline-variant)]/10">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">
                    {t('notifications.noNotifications')}
                  </div>
                ) : (
                  filtered.map((notif, i) => {
                    const isOrdered = notif.id === 'n2' && n2Ordered

                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                        onClick={() => markRead(notif.id)}
                        className={cn(
                          'flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-[var(--color-surface-container-high)]',
                          !notif.read && 'bg-[var(--color-primary-container)]/5',
                        )}
                      >
                        {/* Unread dot */}
                        <div className="mt-1 shrink-0">
                          {!notif.read
                            ? <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                            : <div className="w-2 h-2" />}
                        </div>

                        {/* Severity icon */}
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                            notif.severity === 'error'
                              ? 'bg-[var(--color-error-container)] text-[var(--color-error)]'
                              : notif.severity === 'warning'
                              ? 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]'
                              : notif.severity === 'success'
                              ? 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]'
                              : notif.severity === 'info'
                              ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
                              : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
                          )}
                        >
                          {getNotifIcon(notif.id, notif.severity)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm font-semibold',
                                !notif.read
                                  ? 'text-[var(--color-on-surface)]'
                                  : 'text-[var(--color-on-surface-variant)]',
                              )}
                            >
                              {t(notif.title, { defaultValue: notif.title })}
                            </p>
                            <span className="text-[11px] text-[var(--color-outline)] whitespace-nowrap shrink-0">
                              {notif.time}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 leading-relaxed">
                            {t(notif.message, { defaultValue: notif.message })}
                          </p>

                          {/* Action button */}
                          {notif.actionLabel && (
                            <button
                              disabled={isOrdered}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isOrdered) return
                                const handler = buildOnAction(notif)
                                handler?.()
                              }}
                              className={cn(
                                'mt-1.5 text-[11px] font-bold uppercase',
                                isOrdered
                                  ? 'text-[var(--color-secondary)] cursor-default'
                                  : 'text-[var(--color-primary)] hover:underline cursor-pointer',
                              )}
                            >
                              {isOrdered
                                ? (t('notifications.ordered') ?? 'Ordered ✓')
                                : t(notif.actionLabel, { defaultValue: notif.actionLabel })}
                            </button>
                          )}
                        </div>

                        {/* Severity badge */}
                        <div className="shrink-0 mt-0.5">
                          <Badge variant={severityBadge[notif.severity]} size="sm">
                            {notif.severity === 'error'
                              ? t('notifications.critical')
                              : notif.severity === 'warning'
                              ? 'Warning'
                              : notif.severity === 'success'
                              ? 'Success'
                              : notif.severity === 'info'
                              ? 'Info'
                              : t('notifications.system')}
                          </Badge>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </Card>
        </motion.div>
      </div>

      {/* Restock Order Modal */}
      {lowStockItem && (
        <RestockOrderModal
          open={restockOpen}
          onClose={() => setRestockOpen(false)}
          item={lowStockItem}
          onConfirm={handleOrderConfirm}
        />
      )}
    </div>
  )
}
