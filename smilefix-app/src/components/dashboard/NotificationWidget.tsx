import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

type AlertSeverity = 'error' | 'warning' | 'success' | 'info' | 'neutral'

export interface NotificationAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  dismissible?: boolean
}

interface NotificationWidgetProps {
  alerts: NotificationAlert[]
  title?: string
  badgeCount?: number
  onDismiss?: (id: string) => void
  delay?: number
  className?: string
}

const severityStyles: Record<AlertSeverity, { border: string; bg: string; icon: string; text: string; titleColor: string }> = {
  error:   { border: 'border-[var(--color-error)]',     bg: 'bg-[var(--color-error-container)]/10',     icon: 'text-[var(--color-error)]',     text: 'text-[var(--color-on-error-container)]/80',     titleColor: 'text-[var(--color-on-error-container)]' },
  warning: { border: 'border-[var(--color-tertiary)]',  bg: 'bg-[var(--color-tertiary-container)]/10',  icon: 'text-[var(--color-tertiary)]',  text: 'text-[var(--color-on-tertiary-container)]/80',  titleColor: 'text-[var(--color-on-tertiary-container)]' },
  success: { border: 'border-[var(--color-secondary)]', bg: 'bg-[var(--color-secondary-container)]/10', icon: 'text-[var(--color-secondary)]', text: 'text-[var(--color-on-secondary-container)]/80', titleColor: 'text-[var(--color-on-secondary-container)]' },
  info:    { border: 'border-[var(--color-primary)]',   bg: 'bg-[var(--color-primary-container)]/10',   icon: 'text-[var(--color-primary)]',   text: 'text-[var(--color-on-surface-variant)]',        titleColor: 'text-[var(--color-on-surface)]' },
  neutral: { border: 'border-[var(--color-outline)]',   bg: 'bg-[var(--color-surface-container-high)]', icon: 'text-[var(--color-on-surface-variant)]', text: 'text-[var(--color-on-surface-variant)]', titleColor: 'text-[var(--color-on-surface)]' },
}

const severityIcons: Record<AlertSeverity, string> = {
  error:   '⚠',
  warning: '📦',
  success: '✓',
  info:    '📅',
  neutral: 'ℹ',
}

export function NotificationWidget({
  alerts, title = 'Smart Notifications', badgeCount, onDismiss, delay = 0, className,
}: NotificationWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      <Card>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)] text-base">
              ⚡
            </div>
            <h3 className="font-semibold text-[var(--color-on-surface)]">{title}</h3>
          </div>
          {badgeCount !== undefined && (
            <Badge variant="primary" size="sm">{badgeCount} PRIORITY ALERTS</Badge>
          )}
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {alerts.map((alert, i) => {
              const s = severityStyles[alert.severity]
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, delay: delay + i * 0.05 }}
                  className={cn(
                    'p-4 border-l-4 rounded-[var(--radius-DEFAULT)] flex gap-3 items-start relative',
                    s.border, s.bg
                  )}
                >
                  <span className={cn('text-lg shrink-0 mt-0.5', s.icon)}>
                    {severityIcons[alert.severity]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm', s.titleColor)}>{alert.title}</p>
                    <p className={cn('text-xs mt-0.5 leading-relaxed', s.text)}>{alert.message}</p>
                    {alert.actionLabel && (
                      <button
                        onClick={alert.onAction}
                        disabled={!alert.onAction}
                        className={cn(
                          'mt-2 text-[11px] font-bold uppercase transition-opacity',
                          s.icon,
                          alert.onAction
                            ? 'cursor-pointer hover:underline'
                            : 'cursor-default opacity-70'
                        )}
                      >
                        {alert.actionLabel}
                      </button>
                    )}
                  </div>
                  {alert.dismissible && onDismiss && (
                    <button
                      onClick={() => onDismiss(alert.id)}
                      className="shrink-0 p-0.5 rounded text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
