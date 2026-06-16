import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell, CheckCheck, AlertTriangle, Package,
  CheckCircle2, CalendarX, Upload, CreditCard, Shield, Clock, Sparkles,
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
  { icon: <Upload size={15} />,       actor: 'Dr. Miller', action: 'Archived Patient Record #8892',    time: '12:44 PM', color: 'secondary' as const },
  { icon: <Shield size={15} />,       actor: 'System',     action: 'Financial Integrity Verification', time: '10:15 AM', color: 'primary' as const },
  { icon: <CheckCircle2 size={15} />, actor: 'Admin',      action: 'New Staff Credential Provisioning',time: '09:02 AM', color: 'tertiary' as const },
]

/** Map notification category/severity → a lucide icon element */
function getNotifIcon(category: NotifItem['category'], severity: NotifItem['severity']) {
  const categoryIcons: Record<Exclude<NotifCategory, 'all'>, React.ReactNode> = {
    critical:  <AlertTriangle size={16} />,
    inventory: <Package size={16} />,
    schedule:  <CalendarX size={16} />,
    system:    <Shield size={16} />,
  }
  if (categoryIcons[category]) return categoryIcons[category]
  const fallbacks: Record<NotifItem['severity'], React.ReactNode> = {
    error:   <AlertTriangle size={16} />,
    warning: <Package size={16} />,
    success: <CheckCircle2 size={16} />,
    info:    <Upload size={16} />,
    neutral: <Bell size={16} />,
  }
  return fallbacks[severity]
}

// ── Severity icon bg styles ───────────────────────────────────────────────────
function iconBg(severity: NotifItem['severity'], unread: boolean) {
  if (severity === 'error')   return 'bg-[var(--color-error-container)]/40 text-[var(--color-error)]'
  if (severity === 'warning') return 'bg-[var(--color-tertiary-container)]/25 text-[var(--color-tertiary)]'
  if (severity === 'success') return 'bg-[var(--color-secondary-container)]/25 text-[var(--color-secondary)]'
  if (severity === 'info')    return unread
    ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
    : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]'
  return 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate  = useNavigate()
  const { t }     = useTranslation()

  const { notifications, markRead, markAllRead, updateNotification, load } =
    useNotificationStore()

  useEffect(() => { load() }, [load])

  const { items: inventoryItems, restockItem } = useInventoryStore()
  const lowStockItem =
    inventoryItems.find((i) => i.id === 'i2') ??
    inventoryItems.find((i) => i.status === 'low-stock' || i.status === 'out-of-stock')

  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all')
  const [restockOpen, setRestockOpen]        = useState(false)

  const restockNotif = notifications.find((n) => n.actionHandlerId === 'openRestock')
  const n2Ordered = restockNotif?.actionLabel === 'notifications.ordered'

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

    // ── 1. Explicit frontend handler ids (seed / local-only items) ────────
    if (n.actionHandlerId === 'openRestock') {
      return n2Ordered ? undefined : () => { navigate(ROUTES.LAB); markRead(n.id) }
    }
    if (n.actionHandlerId === 'sendReminders') {
      return () => { navigate(ROUTES.CALENDAR); markRead(n.id) }
    }

    // ── 2. Backend actionRoute — direct SPA navigation ────────────────────
    if (n.actionRoute) {
      return () => { navigate(n.actionRoute!); markRead(n.id) }
    }

    // ── 3. Fallback: infer handler from actionLabel key or raw string ──────
    // Backend notifications may carry a raw label with no route/handlerId.
    const label = n.actionLabel.toLowerCase()

    // Inventory / restock labels (any language)
    if (
      label.includes('order') ||
      label.includes('restock') ||
      label.includes('طلب') ||
      n.category === 'inventory'
    ) {
      return () => { navigate(ROUTES.LAB); markRead(n.id) }
    }

    // Appointment / calendar labels
    if (
      label.includes('appointment') ||
      label.includes('calendar') ||
      label.includes('reminder') ||
      label.includes('موعد') ||
      label.includes('schedule') ||
      n.category === 'schedule'
    ) {
      return () => { navigate(ROUTES.CALENDAR); markRead(n.id) }
    }

    // Finance labels
    if (
      label.includes('finance') ||
      label.includes('financial') ||
      label.includes('payment') ||
      label.includes('invoice') ||
      label.includes('مالي') ||
      n.category === 'critical'
    ) {
      return () => { navigate(ROUTES.FINANCE); markRead(n.id) }
    }

    // Report / log labels
    if (
      label.includes('report') ||
      label.includes('log') ||
      label.includes('download') ||
      label.includes('تقرير')
    ) {
      return () => { navigate(ROUTES.REPORTS); markRead(n.id) }
    }

    // Generic i18n key patterns (e.g. 'notifications.viewFinancial')
    if (n.actionLabel.startsWith('notifications.')) {
      const key = n.actionLabel.replace('notifications.', '')
      if (key.includes('financial') || key.includes('finance')) {
        return () => { navigate(ROUTES.FINANCE); markRead(n.id) }
      }
      if (key.includes('calendar') || key.includes('resolve') || key.includes('reminder')) {
        return () => { navigate(ROUTES.CALENDAR); markRead(n.id) }
      }
      if (key.includes('report') || key.includes('log') || key.includes('download')) {
        return () => { navigate(ROUTES.REPORTS); markRead(n.id) }
      }
      if (key.includes('order') || key.includes('restock') || key.includes('inventory')) {
        return () => { navigate(ROUTES.LAB); markRead(n.id) }
      }
    }

    // Last resort: just mark as read so the button does something visible
    return () => markRead(n.id)
  }

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]))
    markRead(id)
  }

  const handleOrderConfirm = (itemId: string, quantity: number) => {
    restockItem(itemId, quantity)
    if (restockNotif) {
      updateNotification(restockNotif.id, {
        read: true,
        actionLabel: 'notifications.ordered',
        actionHandlerId: undefined,
      })
    }
    setRestockOpen(false)
  }

  const filtered =
    activeCategory === 'all'
      ? notifications
      : notifications.filter((n) => n.category === activeCategory)

  const unreadCount = notifications.filter((n) => !n.read).length

  const CATEGORIES: { id: NotifCategory; label: string }[] = [
    { id: 'all',       label: t('notifications.all') },
    { id: 'critical',  label: t('notifications.critical') },
    { id: 'inventory', label: t('nav.inventory') },
    { id: 'schedule',  label: t('notifications.schedule') },
    { id: 'system',    label: t('notifications.system') },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
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
              leftIcon={<CheckCheck size={14} />}
              onClick={markAllRead}
            >
              {t('notifications.markAllRead')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Shield size={14} />}>
              {t('notifications.exportPDF')}
            </Button>
          </div>
        }
      />

      {/* ── Row 1: Smart Alerts + Backup Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Smart Notifications widget — 7/12 */}
        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <NotificationWidget
            alerts={priorityAlerts.map((a) =>
              restockNotif && a.id === restockNotif.id
                ? {
                    ...a,
                    actionLabel: n2Ordered
                      ? (t('notifications.ordered') ?? 'Ordered ✓')
                      : a.actionLabel,
                    onAction: n2Ordered ? undefined : () => { navigate(ROUTES.LAB); markRead(restockNotif.id) },
                  }
                : a,
            )}
            title={t('notifications.smartNotifications')}
            badgeCount={priorityAlerts.length}
            onDismiss={dismissAlert}
            delay={0.1}
          />
        </motion.div>

        {/* Backup status card — 5/12 */}
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <div className="h-full rounded-[var(--radius-xl)] bg-[var(--color-primary)] p-6 text-[var(--color-on-primary)] relative overflow-hidden flex flex-col justify-between min-h-[180px]">
            {/* Decorative glow blob */}
            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute right-4 bottom-4 text-[80px] leading-none opacity-[0.08] select-none pointer-events-none">🛡</div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                  <Shield size={15} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                  {t('notifications.backupStatus')}
                </span>
              </div>
              <p className="text-2xl font-bold font-[var(--font-display)] mb-1 leading-tight">
                {t('notifications.backupCompleted')}
              </p>
              <p className="text-sm opacity-70">{t('notifications.backupNext')}</p>
            </div>

            <div className="relative z-10 mt-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] opacity-60">Sync Progress</span>
                <span className="text-[11px] font-bold">{t('notifications.backupSecure')}</span>
              </div>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 2: Activity Log ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
                <Clock size={14} />
              </div>
              <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">
                {t('notifications.recentActivity')}
              </h4>
            </div>
            <Button variant="ghost" size="xs" onClick={() => navigate(ROUTES.REPORTS)}>
              {t('notifications.fullLogViewer')}
            </Button>
          </div>

          <div className="flex flex-col gap-0">
            {ACTIVITY_LOG.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.25 + i * 0.07 }}
                className={cn(
                  'flex items-center justify-between py-3 gap-4',
                  i < ACTIVITY_LOG.length - 1 && 'border-b border-[var(--color-outline-variant)]/20',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      entry.color === 'primary'
                        ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
                        : entry.color === 'secondary'
                        ? 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]'
                        : 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]',
                    )}
                  >
                    {entry.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-on-surface)] truncate">{entry.action}</p>
                    <p className="text-xs text-[var(--color-outline)] mt-0.5">{entry.actor}</p>
                  </div>
                </div>
                <span className="text-[11px] text-[var(--color-outline)] whitespace-nowrap shrink-0 bg-[var(--color-surface-container-low)] px-2 py-1 rounded-full">
                  {entry.time}
                </span>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Row 3: Full Notification List ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
      >
        <Card padding="none">
          {/* List header */}
          <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Title + badge */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
                  <Bell size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-on-surface)] leading-tight">
                    {t('notifications.allNotifications')}
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-[var(--color-outline)] mt-0.5">
                      {unreadCount} {t('notifications.unread')} · {notifications.length} total
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{
                      background: 'rgba(121,213,220,0.15)',
                      color: '#00696f',
                      border: '1px solid rgba(121,213,220,0.4)',
                      boxShadow: '0 0 8px 0 rgba(121,213,220,0.3)',
                    }}
                  >
                    <Sparkles size={10} />
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-full p-1 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap',
                      activeCategory === cat.id
                        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm'
                        : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]',
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notification rows */}
          <div>
            <AnimatePresence initial={false}>
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Bell size={32} className="mx-auto mb-3 text-[var(--color-outline-variant)]" />
                  <p className="text-sm text-[var(--color-on-surface-variant)]">
                    {t('notifications.noNotifications')}
                  </p>
                </div>
              ) : (
                filtered.map((notif, i) => {
                  const isOrdered = notif.actionHandlerId === undefined
                    && restockNotif?.id === notif.id
                    && notif.actionLabel === 'notifications.ordered'

                  const isUnread = !notif.read

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      onClick={() => markRead(notif.id)}
                      className={cn(
                        'group relative flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors duration-150',
                        'border-b border-[var(--color-outline-variant)]/15 last:border-b-0',
                        isUnread
                          ? 'hover:bg-[#79d5dc]/5'
                          : 'hover:bg-[var(--color-surface-container-low)]',
                      )}
                      style={isUnread ? {
                        background: 'linear-gradient(to right, rgba(121,213,220,0.06), transparent 60%)',
                      } : undefined}
                    >
                      {/* Neon left accent bar for unread */}
                      {isUnread && (
                        <div
                          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                          style={{
                            background: 'linear-gradient(to bottom, #79d5dc, #00696f)',
                            boxShadow: '0 0 6px 1px rgba(121,213,220,0.5)',
                          }}
                        />
                      )}

                      {/* Severity icon */}
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-150 group-hover:scale-105',
                          iconBg(notif.severity, isUnread),
                        )}
                      >
                        {getNotifIcon(notif.category, notif.severity)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 mb-0.5">
                          <p
                            className={cn(
                              'text-sm leading-snug',
                              isUnread
                                ? 'font-semibold text-[var(--color-on-surface)]'
                                : 'font-medium text-[var(--color-on-surface-variant)]',
                            )}
                          >
                            {t(notif.title, { defaultValue: notif.title })}
                          </p>
                          <span className="text-[11px] text-[var(--color-outline)] whitespace-nowrap shrink-0 mt-0.5">
                            {notif.time}
                          </span>
                        </div>

                        {/* Body text */}
                        <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                          {t(notif.message, { defaultValue: notif.message })}
                        </p>

                        {/* Action + badge row */}
                        <div className="flex items-center gap-3 mt-2">
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

                          {notif.actionLabel && (
                            <button
                              disabled={isOrdered}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isOrdered) return
                                buildOnAction(notif)?.()
                              }}
                              className={cn(
                                'text-[11px] font-bold uppercase tracking-wide transition-all',
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
                      </div>

                      {/* Unread dot indicator */}
                      <div className="shrink-0 mt-2">
                        {isUnread ? (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: '#79d5dc',
                              boxShadow: '0 0 6px 2px rgba(121,213,220,0.6)',
                            }}
                          />
                        ) : (
                          <div className="w-2 h-2" />
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

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
