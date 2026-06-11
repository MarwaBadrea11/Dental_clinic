import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { getTreatmentCategoryLabel, isKnownTreatmentCategory } from '@/i18n/treatmentCategoryOptions'
import type { TreatmentCategory } from '@/types'

interface ProcedureBadgeProps {
  category: string
  size?: 'sm' | 'md'
  className?: string
}

const categoryConfig: Record<TreatmentCategory, { color: string; bg: string }> = {
  'Preventive':    { color: 'text-[var(--color-secondary)]',  bg: 'bg-[var(--color-secondary-container)]/25' },
  'Restorative':   { color: 'text-[var(--color-primary)]',    bg: 'bg-[var(--color-primary-container)]/25' },
  'Endodontic':    { color: 'text-[var(--color-error)]',      bg: 'bg-[var(--color-error-container)]' },
  'Periodontic':   { color: 'text-[var(--color-tertiary)]',   bg: 'bg-[var(--color-tertiary-container)]/25' },
  'Prosthodontic': { color: 'text-purple-700',                bg: 'bg-purple-100' },
  'Orthodontic':   { color: 'text-orange-700',                bg: 'bg-orange-100' },
  'Oral Surgery':  { color: 'text-[var(--color-on-surface-variant)]', bg: 'bg-[var(--color-surface-container-high)]' },
  'Cosmetic':      { color: 'text-amber-700',                 bg: 'bg-amber-100' },
}

const defaultConfig = categoryConfig['Preventive']

export function ProcedureBadge({ category, size = 'sm', className }: ProcedureBadgeProps) {
  const { t } = useTranslation()
  const c = isKnownTreatmentCategory(category)
    ? categoryConfig[category]
    : defaultConfig

  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      c.color, c.bg, className
    )}>
      {getTreatmentCategoryLabel(t, category)}
    </span>
  )
}
