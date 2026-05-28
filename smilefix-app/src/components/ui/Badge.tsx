import { cn } from '@/utils/cn'
import type { Status } from '@/types'

type BadgeVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  primary:  'bg-[var(--color-primary-container)]/25 text-[var(--color-on-primary-container)]',
  secondary:'bg-[var(--color-secondary-container)]/30 text-[var(--color-on-secondary-container)]',
  tertiary: 'bg-[var(--color-tertiary-container)]/25 text-[var(--color-on-tertiary-container)]',
  success:  'bg-[var(--color-secondary-container)]/30 text-[var(--color-secondary)]',
  warning:  'bg-amber-100 text-amber-700',
  error:    'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]',
  neutral:  'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
}

const dotColors: Record<BadgeVariant, string> = {
  primary:  'bg-[var(--color-primary)]',
  secondary:'bg-[var(--color-secondary)]',
  tertiary: 'bg-[var(--color-tertiary)]',
  success:  'bg-[var(--color-secondary)]',
  warning:  'bg-amber-500',
  error:    'bg-[var(--color-error)]',
  neutral:  'bg-[var(--color-outline)]',
}

export function Badge({ children, variant = 'neutral', size = 'sm', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}

/** Maps a Status enum value to a Badge variant */
export function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { variant: BadgeVariant; label: string }> = {
    active:    { variant: 'success',   label: 'Active' },
    inactive:  { variant: 'neutral',   label: 'Inactive' },
    pending:   { variant: 'warning',   label: 'Pending' },
    completed: { variant: 'success',   label: 'Completed' },
    cancelled: { variant: 'error',     label: 'Cancelled' },
    scheduled: { variant: 'primary',   label: 'Scheduled' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} dot>{label}</Badge>
}
