import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, User, Stethoscope, ChevronRight } from 'lucide-react'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'
import { getAppointmentTreatmentLabel } from '@/i18n/appointmentOptions'
import type { Appointment } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  onClick?: (a: Appointment) => void
  compact?: boolean
  delay?: number
  className?: string
}

export function AppointmentCard({ appointment: a, onClick, compact = false, delay = 0, className }: AppointmentCardProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -1, boxShadow: 'var(--shadow-card-hover)' }}
      onClick={() => onClick?.(a)}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-md)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ background: a.color ?? 'var(--color-primary)' }} />

      <div className={cn('p-4', compact && 'p-3')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={a.patientName} size="sm" />
            <div>
              <p className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">{a.patientName}</p>
              {a.patientCode && <p className="text-[11px] text-[var(--color-on-surface-variant)]">{a.patientCode}</p>}
            </div>
          </div>
          <AppointmentStatusBadge status={a.status} />
        </div>

        {/* Treatment */}
        <div className="flex items-center gap-1.5 mb-2">
          <Stethoscope size={12} className="text-[var(--color-primary)] shrink-0" />
          <p className="text-xs font-medium text-[var(--color-on-surface)]">{getAppointmentTreatmentLabel(t, a.treatment)}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)]">
              <Clock size={11} className="text-[var(--color-outline)]" />
              {a.startTime} – {a.endTime}
            </span>
            {!compact && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)]">
                <User size={11} className="text-[var(--color-outline)]" />
                {a.doctorName}
              </span>
            )}
          </div>
          {onClick && <ChevronRight size={14} className="text-[var(--color-outline)]" />}
        </div>
      </div>
    </motion.div>
  )
}
