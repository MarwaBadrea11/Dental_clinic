import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { AppointmentStatus } from '@/types'

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
  size?: 'sm' | 'md'
  dot?: boolean
}

const styleMap: Record<AppointmentStatus, { classes: string; dot: string }> = {
  scheduled:    { classes: 'bg-[var(--color-primary-container)]/25 text-[var(--color-primary)]',                                          dot: 'bg-[var(--color-primary)]' },
  confirmed:    { classes: 'bg-[var(--color-secondary-container)]/30 text-[var(--color-secondary)]',                                      dot: 'bg-[var(--color-secondary)]' },
  'in-progress':{ classes: 'bg-amber-100 text-amber-700',                                                                                  dot: 'bg-amber-500' },
  completed:    { classes: 'bg-[var(--color-secondary-container)]/30 text-[var(--color-secondary)]',                                      dot: 'bg-[var(--color-secondary)]' },
  cancelled:    { classes: 'bg-[var(--color-error-container)] text-[var(--color-error)]',                                                  dot: 'bg-[var(--color-error)]' },
  'no-show':    { classes: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',                             dot: 'bg-[var(--color-outline)]' },
}

export function AppointmentStatusBadge({ status, size = 'sm', dot = true }: AppointmentStatusBadgeProps) {
  const { t } = useTranslation()

  const labelMap: Record<AppointmentStatus, string> = {
    scheduled:    t('status.scheduled'),
    confirmed:    t('status.confirmed'),
    'in-progress':t('status.inProgress'),
    completed:    t('status.completed'),
    cancelled:    t('status.cancelled'),
    'no-show':    t('status.noShow'),
  }

  const c = styleMap[status]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      c.classes
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />}
      {labelMap[status]}
    </span>
  )
}
