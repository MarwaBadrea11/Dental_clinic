import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { InvoiceStatus } from '@/types'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  size?: 'sm' | 'md'
}

const styleMap: Record<InvoiceStatus, { classes: string; dot: string }> = {
  paid:    { classes: 'bg-[var(--color-secondary-container)]/30 text-[var(--color-secondary)]',                                dot: 'bg-[var(--color-secondary)]' },
  pending: { classes: 'bg-amber-100 text-amber-700',                                                                           dot: 'bg-amber-500' },
  overdue: { classes: 'bg-[var(--color-error-container)] text-[var(--color-error)]',                                           dot: 'bg-[var(--color-error)]' },
  partial: { classes: 'bg-[var(--color-tertiary-container)]/25 text-[var(--color-tertiary)]',                                  dot: 'bg-[var(--color-tertiary)]' },
  draft:   { classes: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',                      dot: 'bg-[var(--color-outline)]' },
}

export function InvoiceStatusBadge({ status, size = 'sm' }: InvoiceStatusBadgeProps) {
  const { t } = useTranslation()

  const labelMap: Record<InvoiceStatus, string> = {
    paid:    t('status.paid'),
    pending: t('status.pending'),
    overdue: t('status.overdue'),
    partial: t('status.partial'),
    draft:   t('status.draft'),
  }

  const c = styleMap[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      c.classes
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
      {labelMap[status]}
    </span>
  )
}
