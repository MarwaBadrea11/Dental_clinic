import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { Appointment } from '@/types'

interface CalendarCellProps {
  date: Date
  appointments: Appointment[]
  isSelected?: boolean
  isToday?: boolean
  onClick?: (date: Date) => void
}

const statusDot: Record<string, string> = {
  scheduled:    'bg-[var(--color-primary)]',
  confirmed:    'bg-[var(--color-secondary)]',
  'in-progress':'bg-amber-500',
  completed:    'bg-[var(--color-outline-variant)]',
  cancelled:    'bg-[var(--color-error)]',
  'no-show':    'bg-[var(--color-outline)]',
}

export function CalendarCell({ date, appointments, isSelected, isToday, onClick }: CalendarCellProps) {
  const { t } = useTranslation()
  const day = date.getDate()
  const visible = appointments.slice(0, 3)
  const overflow = appointments.length - 3

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      onClick={() => onClick?.(date)}
      className={cn(
        'min-h-[90px] p-2 rounded-[var(--radius-DEFAULT)] cursor-pointer transition-colors duration-150',
        'border border-transparent',
        isSelected
          ? 'bg-[var(--color-primary-container)]/20 border-[var(--color-primary)]/40'
          : 'hover:bg-[var(--color-surface-container-high)]',
        isToday && !isSelected && 'border-[var(--color-primary)]/20'
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(
          'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold',
          isToday
            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
            : 'text-[var(--color-on-surface)]'
        )}>
          {day}
        </span>
        {appointments.length > 0 && (
          <span className="text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
            {appointments.length}
          </span>
        )}
      </div>

      {/* Appointment pills */}
      <div className="space-y-0.5">
        {visible.map((a) => (
          <div
            key={a.id}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate',
              'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
            )}
            style={{ borderLeft: `2px solid ${a.color ?? 'var(--color-primary)'}` }}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot[a.status])} />
            <span className="truncate">{a.patientName.split(' ')[0]}</span>
          </div>
        ))}
        {overflow > 0 && (
          <p className="text-[10px] text-[var(--color-on-surface-variant)] pl-1">+{overflow} {t('common.more')}</p>
        )}
      </div>
    </motion.div>
  )
}
