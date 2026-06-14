import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Radio } from 'lucide-react'
import { Card } from '@/components/ui/Card'
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

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

export function UpcomingAppointments({
  items, title, onViewAll, delay = 0, className,
}: UpcomingAppointmentsProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('dashboard.todaySchedule')

  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      <Card
        padding="none"
        style={{
          borderTop: '2px solid rgba(121,213,220,0.28)',
          boxShadow: '0 0 24px 0 rgba(0,105,111,0.09), var(--shadow-card)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
              <CalendarDays size={15} />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-on-surface)]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {resolvedTitle}
            </h3>
          </div>
          {/* Live badge */}
          <motion.div
            animate={{ opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: 'rgba(186,26,26,0.1)',
              color: 'var(--color-error)',
              border: '1px solid rgba(186,26,26,0.2)',
            }}
          >
            <Radio size={9} />
            {t('dashboard.live')}
          </motion.div>
        </div>

        {/* Timeline */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: delay + 0.15 } },
          }}
          className="p-5 space-y-4"
        >
          {items.length === 0 ? (
            <p className="text-xs text-[var(--color-on-surface-variant)] text-center py-4">
              {t('dashboard.noAppointments') ?? 'No appointments scheduled.'}
            </p>
          ) : (
            items.map((item, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  show:   { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
                }}
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                className="relative pl-7 ml-2"
                style={{
                  borderLeft: `2px solid ${item.active ? 'var(--color-secondary)' : 'var(--color-outline-variant)'}`,
                }}
              >
                {/* Timeline dot */}
                <motion.div
                  className={cn(
                    'absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-[var(--color-surface-container-lowest)]',
                    item.active ? 'ring-4 ring-[var(--color-secondary)]/20' : '',
                  )}
                  style={{
                    background: item.active ? 'var(--color-secondary)' : 'var(--color-outline-variant)',
                    boxShadow: item.active ? '0 0 10px 2px rgba(53,103,93,0.35)' : 'none',
                  }}
                  animate={item.active ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div
                  className={cn(
                    'p-3 rounded-[var(--radius-md)] border transition-colors duration-150',
                    item.active
                      ? 'bg-[var(--color-secondary-container)]/10 border-[var(--color-secondary)]/20'
                      : 'bg-[var(--color-surface)] border-[var(--color-outline-variant)]/10',
                  )}
                >
                  <p className={cn(
                    'text-[10px] font-bold uppercase tracking-widest mb-0.5',
                    item.active ? 'text-[var(--color-secondary)]' : 'text-[var(--color-on-surface-variant)]',
                  )}>
                    {item.time}
                  </p>
                  <p className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">{item.patient}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{item.treatment}</p>
                  {item.doctor && (
                    <p className="text-[10px] text-[var(--color-outline)] mt-1">{item.doctor}</p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={onViewAll}
            className="transition-all duration-200 hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
          >
            {t('dashboard.openCalendar')}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
