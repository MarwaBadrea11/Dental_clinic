import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, Calendar, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import {
  getEmployeeStatusBadgeVariant,
  getShiftTypeLabel,
  getStaffRoleLabel,
  getStaffStatusLabel,
} from '@/i18n/staffOptions'
import type { StaffMember } from '@/types'

interface EmployeeCardProps {
  member: StaffMember
  onClick?: (m: StaffMember) => void
  delay?: number
  className?: string
}

const roleColors: Record<string, string> = {
  doctor:       'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]',
  nurse:        'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]',
  receptionist: 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]',
  hygienist:    'bg-purple-100 text-purple-700',
  assistant:    'bg-amber-100 text-amber-700',
  admin:        'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
  manager:      'bg-[var(--color-error-container)] text-[var(--color-error)]',
}

export function EmployeeCard({ member: m, onClick, delay = 0, className }: EmployeeCardProps) {
  const { t } = useTranslation()
  const fullName = `${m.firstName} ${m.lastName}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      onClick={() => onClick?.(m)}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'p-5 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={fullName} src={m.avatar} size="md" ring />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">{fullName}</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{m.employeeCode}</p>
          </div>
        </div>
        <Badge variant={getEmployeeStatusBadgeVariant(m.status)} dot size="sm">
          {getStaffStatusLabel(t, m.status)}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', roleColors[m.role] ?? roleColors.admin)}>
          {getStaffRoleLabel(t, m.role)}
        </span>
        {m.specialty && (
          <span className="text-[11px] text-[var(--color-on-surface-variant)]">· {m.specialty}</span>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
          <Mail size={11} className="text-[var(--color-outline)] shrink-0" />
          <span className="truncate">{m.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
          <Phone size={11} className="text-[var(--color-outline)] shrink-0" />
          {m.phone}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
          <Calendar size={11} className="text-[var(--color-outline)] shrink-0" />
          {t('staff.joinDate')} {formatDate(m.joinDate)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-outline-variant)]/15">
        <span className="text-[11px] text-[var(--color-on-surface-variant)]">
          {m.department ?? t('staff.noDepartment')} · {m.shift ? getShiftTypeLabel(t, m.shift) : t('staff.noShift')}
        </span>
        {onClick && <ChevronRight size={14} className="text-[var(--color-outline)]" />}
      </div>
    </motion.div>
  )
}
