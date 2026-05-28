import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { Appointment } from '@/types'

interface TimeSlotProps {
  hour: number
  appointments: Appointment[]
  onSlotClick?: (hour: number) => void
  onSlotAddClick?: (startTime: string) => void
  onAppointmentClick?: (a: Appointment) => void
}

const statusColors: Record<string, string> = {
  scheduled:    'bg-[var(--color-primary-container)]/40 border-[var(--color-primary)] text-[var(--color-primary)]',
  confirmed:    'bg-[var(--color-secondary-container)]/40 border-[var(--color-secondary)] text-[var(--color-secondary)]',
  'in-progress':'bg-amber-50 border-amber-400 text-amber-700',
  completed:    'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]',
  cancelled:    'bg-[var(--color-error-container)]/30 border-[var(--color-error)] text-[var(--color-error)] opacity-60',
  'no-show':    'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] opacity-50',
}

export function TimeSlot({ hour, appointments, onSlotClick, onSlotAddClick, onAppointmentClick }: TimeSlotProps) {
  const { t } = useTranslation()
  const label = `${String(hour).padStart(2, '0')}:00`
  const endLabel = `${String(hour + 1).padStart(2, '0')}:00`
  const hasAppts = appointments.length > 0

  return (
    <div className="flex gap-2 min-h-[56px] group">
      {/* Hour label */}
      <div className="w-14 shrink-0 pt-1 text-right">
        <span className="text-[11px] font-medium text-[var(--color-outline)]">{label}</span>
      </div>

      {/* Slot area */}
      <div
        className={cn(
          'flex-1 border-t border-[var(--color-outline-variant)]/20 pt-1 pb-1 relative',
          !hasAppts && 'hover:bg-[var(--color-primary-container)]/5 transition-colors rounded-[var(--radius-DEFAULT)]'
        )}
      >
        {!hasAppts && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span
              className="text-[11px] font-semibold text-[var(--color-primary)] hover:text-[#61bec5] transition-colors cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation()
                if (onSlotAddClick) {
                  onSlotAddClick(label)
                } else {
                  onSlotClick?.(hour)
                }
              }}
            >
              + {t('calendar.addAppointment')} {label}
            </span>
          </div>
        )}
        <div className="space-y-1">
          {appointments.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              onClick={(e) => { e.stopPropagation(); onAppointmentClick?.(a) }}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-DEFAULT)]',
                'border-l-2 cursor-pointer transition-all duration-150',
                'hover:shadow-sm hover:translate-x-0.5',
                statusColors[a.status] ?? statusColors.scheduled
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{a.patientName}</p>
                <p className="text-[10px] opacity-80 truncate">{a.treatment} · {a.startTime}–{a.endTime}</p>
              </div>
              {a.chair && (
                <span className="text-[10px] font-bold opacity-60 shrink-0">C{a.chair}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
