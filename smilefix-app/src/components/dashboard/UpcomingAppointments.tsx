import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface ScheduleItem {
  time: string
  patient: string
  treatment: string
  active?: boolean
  doctor?: string
}

interface UpcomingAppointmentsProps {
  items: ScheduleItem[]
  title?: string
  onViewAll?: () => void
  delay?: number
  className?: string
}

export function UpcomingAppointments({
  items, title, onViewAll, delay = 0, className,
}: UpcomingAppointmentsProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('dashboard.todaySchedule')
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      <Card padding="none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
              <CalendarDays size={16} />
            </div>
            <h3 className="font-semibold text-[var(--color-on-surface)]">{resolvedTitle}</h3>
          </div>
          <Badge variant="error" size="sm">{t('dashboard.live')}</Badge>
        </div>

        {/* Timeline */}
        <div className="p-6 space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: delay + i * 0.07 }}
              className="relative pl-6 border-l-2 ml-2"
              style={{ borderColor: item.active ? 'var(--color-secondary)' : 'var(--color-outline-variant)' }}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute -left-[9px] top-0 w-4 h-4 rounded-full',
                  item.active ? 'ring-4 ring-[var(--color-secondary)]/15' : ''
                )}
                style={{ background: item.active ? 'var(--color-secondary)' : 'var(--color-outline-variant)' }}
              />
              <div
                className={cn(
                  'p-3 rounded-[var(--radius-DEFAULT)] border border-[var(--color-outline-variant)]/10',
                  item.active ? 'bg-[var(--color-surface-container-low)]' : 'bg-[var(--color-surface)]'
                )}
              >
                <p className={cn(
                  'text-[11px] font-semibold',
                  item.active ? 'text-[var(--color-secondary)]' : 'text-[var(--color-on-surface-variant)]'
                )}>
                  {item.time}
                </p>
                <p className="font-semibold text-sm text-[var(--color-on-surface)]">{item.patient}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">{item.treatment}</p>
                {item.doctor && (
                  <p className="text-[10px] text-[var(--color-outline)] mt-0.5">{item.doctor}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button variant="outline" size="sm" fullWidth onClick={onViewAll}>
            {t('dashboard.openCalendar')}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
