import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import type { TreatmentCategory } from '@/types'

interface ProcedureBadgeProps {
  category: TreatmentCategory
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

const categoryKey: Record<TreatmentCategory, string> = {
  'Preventive':    'treatments.cat_Preventive',
  'Restorative':   'treatments.cat_Restorative',
  'Endodontic':    'treatments.cat_Endodontic',
  'Periodontic':   'treatments.cat_Periodontic',
  'Prosthodontic': 'treatments.cat_Prosthodontic',
  'Orthodontic':   'treatments.cat_Orthodontic',
  'Oral Surgery':  'treatments.cat_OralSurgery',
  'Cosmetic':      'treatments.cat_Cosmetic',
}

export function ProcedureBadge({ category, size = 'sm', className }: ProcedureBadgeProps) {
  const { t } = useTranslation()
  const c = categoryConfig[category] ?? categoryConfig['Preventive']
  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
      c.color, c.bg, className
    )}>
      {t(categoryKey[category] ?? 'treatments.cat_Preventive')}
    </span>
  )
}
