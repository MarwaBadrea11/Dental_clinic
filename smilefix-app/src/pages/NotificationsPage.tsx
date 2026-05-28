import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Filter, AlertTriangle, Package, CheckCircle2, CalendarX, Upload, CreditCard, Shield, Clock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { NotificationWidget, RevenueCard, ChartCard } from '@/components/dashboard'
import type { NotificationAlert } from '@/components/dashboard'
import { RestockOrderModal } from '@/components/inventory'
import { useInventoryStore } from '@/store/inventoryStore'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

type NotifCategory = 'all' | 'critical' | 'inventory' | 'system' | 'schedule'

interface NotifItem {
  id: string
  category: NotifCategory
  severity: 'error' | 'warning' | 'success' | 'info' | 'neutral'
  icon: React.ReactNode
  title: string
  message: string
  time: string
  read: boolean
  actionLabel?: string
}

const severityBadge = { error: 'error', warning: 'warning', success: 'success', info: 'primary', neutral: 'neutral' } as const

const ACTIVITY_LOG = [
  { icon: <Upload size={16} />,       actor: 'Dr. Miller', action: 'Archived Patient Record #8892',    time: '12:44 PM', color: 'secondary' as const },
  { icon: <Shield size={16} />,       actor: 'System',     action: 'Financial Integrity Verification', time: '10:15 AM', color: 'primary' as const },
  { icon: <CheckCircle2 size={16} />, actor: 'Admin',      action: 'New Staff Credential Provisioning',time: '09:02 AM', color: 'tertiary' as const },
]

const PERFORMANCE_METRICS = [
  { label: 'Success Rate',   value: '98.4%', change: '2.1%', changeUp: true },
  { label: 'Avg. Wait Time', value: '12m',   change: '4m',   changeUp: false },
  { label: 'New Inquiries',  value: '142',   change: '18%',  changeUp: true },
]

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const ALL_NOTIFICATIONS: NotifItem[] = [
    { id: 'n1', category: 'critical',  severity: 'error',   icon: <AlertTriangle size={18} />, title: t('notifications.criticalDebt'),    message: t('notifications.criticalDebtMsg'),    time: '5 mins ago',  read: false, actionLabel: t('notifications.viewFinancial') },
    { id: 'n2', category: 'inventory', severity: 'warning', icon: <Package size={18} />,       title: t('notifications.lowInventory'),    message: t('notifications.lowInventoryMsg'),    time: '18 mins ago', read: false, actionLabel: t('notifications.orderNow') },
    { id: 'n3', category: 'system',    severity: 'success', icon: <CheckCircle2 size={18} />,  title: t('notifications.archiveSuccess'),  message: t('notifications.archiveMsg'),         time: '2 hrs ago',   read: false, actionLabel: t('notifications.downloadLog') },
    { id: 'n4', category: 'schedule',  severity: 'neutral', icon: <CalendarX size={18} />,     title: t('notifications.scheduleConflict'),message: t('notifications.scheduleConflictMsg'),time: '3 hrs ago',   read: false, actionLabel: t('notifications.resolveCalendar') },
    { id: 'n5', category: 'system',    severity: 'info',    icon: <Upload size={18} />,        title: 'X-Ray Scans Uploaded',             message: 'Dr. Peterson uploaded 4 new X-ray scans for patient ID-8821.', time: '4 hrs ago', read: true },
    { id: 'n6', category: 'critical',  severity: 'success', icon: <CreditCard size={18} />,    title: 'Payment Confirmed',                message: 'Billing Dept confirmed payment for invoice #9921-A. Amount: $850.00', time: '5 hrs ago', read: true },
    { id: 'n7', category: 'system',    severity: 'info',    icon: <Shield size={18} />,        title: 'New Staff Credential Provisioned', message: 'Admin provisioned access for Dr. Nguyen (Periodontist) — effective immediately.', time: '9 hrs ago', read: true },
    { id: 'n8', category: 'schedule',  severity: 'warning', icon: <Clock size={18} />,         title: 'Appointment Reminder',             message: '3 patients have not confirmed their appointments for tomorrow. Send reminders?', time: '1 day ago', read: true, actionLabel: t('notifications.sendReminders') },
  ]

  const PRIORITY_ALERTS: NotificationAlert[] = [
    { id: 'a1', severity: 'error',   title: t('notifications.criticalDebt'),    message: t('notifications.criticalDebtMsg'),    actionLabel: t('notifications.viewFinancial'),  dismissible: true },
    { id: 'a2', severity: 'warning', title: t('notifications.lowInventory'),    message: t('notifications.lowInventoryMsg'),    actionLabel: t('notifications.orderNow'),       dismissible: true },
    { id: 'a3', severity: 'success', title: t('notifications.archiveSuccess'),  message: t('notifications.archiveMsg'),         actionLabel: t('notifications.downloadLog'),    dismissible: true },
    { id: 'a4', severity: 'neutral', title: t('notifications.scheduleConflict'),message: t('notifications.scheduleConflictMsg'),actionLabel: t('notifications.resolveCalendar'),dismissible: true },
  ]

  const CATEGORIES: { id: NotifCategory; label: string }[] = [
    { id: 'all',       label: t('notifications.all') },
    { id: 'critical',  label: t('notifications.critical') },
    { id: 'inventory', label: t('nav.inventory') },
    { id: 'schedule',  label: t('notifications.schedule') },
    { id: 'system',    label: t('notifications.system') },
  ]

  const { items: inventoryItems, restockItem } = useInventoryStore()

  // The low-inventory item referenced in the alert (Composite Resin A2)
  const lowStockItem = inventoryItems.find((i) => i.id === 'i2') ?? inventoryItems.find((i) => i.status === 'low-stock' || i.status === 'out-of-stock')

  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all')
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS)
  const [alerts, setAlerts] = useState(PRIORITY_ALERTS)
  const [restockOpen, setRestockOpen] = useState(false)
  const [inventoryOrdered, setInventoryOrdered] = useState(false)

  const filtered = activeCategory === 'all' ? notifications : notifications.filter((n) => n.category === activeCategory)
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  const dismissAlert = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id))
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  const handleOrderConfirm = (itemId: string, quantity: number) => {
    restockItem(itemId, quantity)
    setInventoryOrdered(true)
    // Update the alert label and disable its action
    setAlerts((prev) => prev.map((a) =>
      a.id === 'a2'
        ? { ...a, actionLabel: t('notifications.ordered') ?? 'Ordered ✓', onAction: undefined }
        : a
    ))
    // Mark the matching notification as read
    setNotifications((prev) => prev.map((n) =>
      n.id === 'n2' ? { ...n, read: true, actionLabel: t('notifications.ordered') ?? 'Ordered ✓' } : n
    ))
  }

  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        breadcrumb={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.notifications') }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<CheckCheck size={15} />} onClick={markAllRead}>{t('notifications.markAllRead')}</Button>
            <Button variant="primary" size="sm" leftIcon={<Filter size={15} />}>{t('notifications.exportPDF')}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <NotificationWidget
            alerts={alerts.map((a) =>
              a.id === 'a2'
                ? {
                    ...a,
                    actionLabel: inventoryOrdered
                      ? (t('notifications.ordered') ?? 'Ordered ✓')
                      : a.actionLabel,
                    onAction: inventoryOrdered ? undefined : () => setRestockOpen(true),
                  }
                : a
            )}
            title={t('notifications.smartNotifications')}
            badgeCount={alerts.length}
            onDismiss={dismissAlert}
            delay={0.1}
          />
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-6">
          <ChartCard
            title={t('notifications.advancedReporting')}
            description={t('notifications.reportingDesc')}
            placeholder
            placeholderLabel={t('reports.treatmentDist')}
            placeholderSublabel={t('dashboard.treatmentDistDesc')}
            onGenerate={() => navigate(ROUTES.REPORTS)}
            delay={0.15}
            action={
              <select className="bg-[var(--color-surface-container-high)] border-none rounded-[var(--radius-DEFAULT)] text-xs font-semibold text-[var(--color-on-surface-variant)] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
                <option>{t('reports.last30Days')}</option>
                <option>{t('reports.lastQuarter')}</option>
                <option>{t('reports.thisYear')}</option>
              </select>
            }
          />
          <RevenueCard metrics={PERFORMANCE_METRICS} delay={0.2} />
        </div>

        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }}>
            <div className="bg-[var(--color-primary)] rounded-[var(--radius-xl)] p-6 text-[var(--color-on-primary)] relative overflow-hidden h-full flex flex-col justify-between">
              <div className="absolute -right-4 -bottom-4 text-[120px] opacity-10 select-none pointer-events-none">🛡</div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4"><Shield size={18} /><h4 className="font-bold uppercase tracking-widest text-sm">{t('notifications.backupStatus')}</h4></div>
                <p className="text-xl font-bold mb-1">{t('notifications.backupCompleted')}</p>
                <p className="text-sm opacity-80">{t('notifications.backupNext')}</p>
              </div>
              <div className="relative z-10 mt-6 flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1, delay: 0.4 }} className="h-full bg-white rounded-full" />
                </div>
                <span className="text-[11px] font-bold whitespace-nowrap">{t('notifications.backupSecure')}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }} className="col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[var(--color-on-surface)]">{t('notifications.recentActivity')}</h4>
                <Button variant="ghost" size="xs">{t('notifications.fullLogViewer')}</Button>
              </div>
              <div className="space-y-3">
                {ACTIVITY_LOG.map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: 0.3 + i * 0.07 }} className="flex items-center justify-between py-2 border-b border-[var(--color-outline-variant)]/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        entry.color === 'primary' ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]' :
                        entry.color === 'secondary' ? 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]' :
                        'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]')}>{entry.icon}</div>
                      <span className="text-sm font-medium text-[var(--color-on-surface)]">{entry.action}</span>
                    </div>
                    <span className="text-[11px] text-[var(--color-outline)] whitespace-nowrap ml-4">{entry.time} — {entry.actor}</span>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="col-span-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.35 }}>
            <Card padding="none">
              <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]"><Bell size={16} /></div>
                  <h3 className="font-semibold text-[var(--color-on-surface)]">{t('notifications.allNotifications')}</h3>
                  {unreadCount > 0 && <Badge variant="error" size="sm">{unreadCount} {t('notifications.unread')}</Badge>}
                </div>
                <div className="flex items-center gap-1 bg-[var(--color-surface-container-low)] rounded-full p-1">
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
                        activeCategory === cat.id ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]')}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[var(--color-outline-variant)]/10">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">{t('notifications.noNotifications')}</div>
                ) : (
                  filtered.map((notif, i) => (
                    <motion.div key={notif.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: i * 0.04 }} onClick={() => markRead(notif.id)}
                      className={cn('flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-[var(--color-surface-container-high)]', !notif.read && 'bg-[var(--color-primary-container)]/5')}>
                      <div className="mt-1 shrink-0">{!notif.read ? <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" /> : <div className="w-2 h-2" />}</div>
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        notif.severity === 'error' ? 'bg-[var(--color-error-container)] text-[var(--color-error)]' :
                        notif.severity === 'warning' ? 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]' :
                        notif.severity === 'success' ? 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]' :
                        notif.severity === 'info' ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]' :
                        'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]')}>{notif.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm font-semibold', !notif.read ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]')}>{notif.title}</p>
                          <span className="text-[11px] text-[var(--color-outline)] whitespace-nowrap shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 leading-relaxed">{notif.message}</p>
                        {notif.actionLabel && (
                          <button
                            disabled={notif.id === 'n2' && inventoryOrdered}
                            onClick={notif.id === 'n2' && !inventoryOrdered ? () => setRestockOpen(true) : undefined}
                            className={cn(
                              'mt-1.5 text-[11px] font-bold uppercase',
                              notif.id === 'n2' && inventoryOrdered
                                ? 'text-[var(--color-secondary)] cursor-default'
                                : 'text-[var(--color-primary)] hover:underline cursor-pointer'
                            )}
                          >
                            {notif.id === 'n2' && inventoryOrdered
                              ? (t('notifications.ordered') ?? 'Ordered ✓')
                              : notif.actionLabel}
                          </button>
                        )}
                      </div>
                      <div className="shrink-0 mt-0.5">
                        <Badge variant={severityBadge[notif.severity]} size="sm">
                          {notif.severity === 'error' ? t('notifications.critical') : notif.severity === 'warning' ? 'Warning' : notif.severity === 'success' ? 'Success' : notif.severity === 'info' ? 'Info' : t('notifications.system')}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Restock Order Modal — triggered by Low Inventory alert */}
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
