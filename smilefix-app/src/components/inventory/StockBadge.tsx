import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { StockStatus } from '@/types'

interface StockBadgeProps {
  status: StockStatus
  quantity?: number
  size?: 'sm' | 'md'
}

const styleMap: Record<StockStatus, { classes: string; dot: string }> = {
  'in-stock':    { classes: 'bg-[var(--color-secondary-container)]/30 text-[var(--color-secondary)]',                         dot: 'bg-[var(--color-secondary)]' },
  'low-stock':   { classes: 'bg-amber-100 text-amber-700',                                                                     dot: 'bg-amber-500' },
  'out-of-stock':{ classes: 'bg-[var(--color-error-container)] text-[var(--color-error)]',                                     dot: 'bg-[var(--color-error)]' },
  'expired':     { classes: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',                dot: 'bg-[var(--color-outline)]' },
}

export function StockBadge({ status, quantity, size = 'sm' }: StockBadgeProps) {
  const { t } = useTranslation()

  const labelMap: Record<StockStatus, string> = {
    'in-stock':    t('inventory.inStock'),
    'low-stock':   t('inventory.lowStock'),
    'out-of-stock':t('inventory.outOfStock'),
    'expired':     t('inventory.expired'),
  }

  const c = styleMap[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      c.classes
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
      {quantity !== undefined ? `${quantity} — ` : ''}{labelMap[status]}
    </span>
  )
}
