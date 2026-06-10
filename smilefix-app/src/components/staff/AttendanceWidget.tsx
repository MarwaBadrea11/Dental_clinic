import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, CheckCircle2, XCircle, AlertCircle, Umbrella } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'
import { getAttendanceStatusLabel, getStaffRoleLabel } from '@/i18n/staffOptions'
import type { AttendanceRecord, StaffMember } from '@/types'

interface AttendanceWidgetProps {
  attendance: AttendanceRecord[]
  staff: StaffMember[]
  delay?: number
  className?: string
}

const statusStyles = {
  present:   { icon: <CheckCircle2 size={14} />, color: 'text-[var(--color-secondary)]',         bg: 'bg-[var(--color-secondary-container)]/20' },
  absent:    { icon: <XCircle size={14} />,      color: 'text-[var(--color-error)]',              bg: 'bg-[var(--color-error-container)]' },
  late:      { icon: <AlertCircle size={14} />,  color: 'text-amber-600',                         bg: 'bg-amber-100' },
  'half-day':{ icon: <Clock size={14} />,        color: 'text-[var(--color-tertiary)]',           bg: 'bg-[var(--color-tertiary-container)]/20' },
  leave:     { icon: <Umbrella size={14} />,     color: 'text-[var(--color-on-surface-variant)]', bg: 'bg-[var(--color-surface-container-high)]' },
}

export function AttendanceWidget({ attendance, staff, delay = 0, className }: AttendanceWidgetProps) {
  const { t } = useTranslation()
  const present  = attendance.filter((a) => a.status === 'present').length
  const absent   = attendance.filter((a) => a.status === 'absent').length
  const late     = attendance.filter((a) => a.status === 'late').length
  const onLeave  = attendance.filter((a) => a.status === 'leave').length

  const statusLabels: Record<string, string> = {
    present:    getAttendanceStatusLabel(t, 'present'),
    absent:     getAttendanceStatusLabel(t, 'absent'),
    late:       getAttendanceStatusLabel(t, 'late'),
    'half-day': getAttendanceStatusLabel(t, 'half-day'),
    leave:      getAttendanceStatusLabel(t, 'leave'),
  }

  return (
    <SectionCard
      title={t('staff.todayAttendance')}
      icon={<Clock size={15} />}
      subtitle={`${present} ${t('staff.presentOf')} ${staff.length} ${t('staff.present')}`}
      delay={delay}
      className={className}
    >
      {/* Summary pills */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: t('staff.present'), value: present,  color: 'text-[var(--color-secondary)]',         bg: 'bg-[var(--color-secondary-container)]/20' },
          { label: t('staff.late'),    value: late,      color: 'text-amber-600',                         bg: 'bg-amber-100' },
          { label: t('staff.absent'),  value: absent,    color: 'text-[var(--color-error)]',              bg: 'bg-[var(--color-error-container)]' },
          { label: t('staff.leave'),   value: onLeave,   color: 'text-[var(--color-on-surface-variant)]', bg: 'bg-[var(--color-surface-container-high)]' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-[var(--radius-DEFAULT)] p-2 text-center', s.bg)}>
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-[var(--color-on-surface-variant)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance list */}
      <div className="space-y-2">
        {attendance.map((rec, i) => {
          const member = staff.find((s) => s.id === rec.employeeId)
          if (!member) return null
          const cfg = statusStyles[rec.status]
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: delay + i * 0.04 }}
              className="flex items-center gap-3 py-2 border-b border-[var(--color-outline-variant)]/10 last:border-0"
            >
              <Avatar name={`${member.firstName} ${member.lastName}`} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--color-on-surface)] truncate">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-[10px] text-[var(--color-on-surface-variant)]">{getStaffRoleLabel(t, member.role)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {rec.checkIn && (
                  <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">{rec.checkIn}</span>
                )}
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.bg, cfg.color)}>
                  {cfg.icon}
                  {statusLabels[rec.status] ?? rec.status}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </SectionCard>
  )
}
