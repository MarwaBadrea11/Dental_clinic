import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface ReportFiltersProps {
  onApply: (from: string, to: string) => void
  loading?: boolean
  className?: string
  /** Extra filter slots rendered to the right of the date pickers */
  extra?: React.ReactNode
}

export function ReportFilters({ onApply, loading, className, extra }: ReportFiltersProps) {
  const { t } = useTranslation()
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
          {t('reports.dateFrom')}
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-[var(--radius-DEFAULT)]',
            'border border-[var(--color-outline-variant)]/40',
            'bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30',
          )}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
          {t('reports.dateTo')}
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-[var(--radius-DEFAULT)]',
            'border border-[var(--color-outline-variant)]/40',
            'bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30',
          )}
        />
      </div>

      {extra}

      <Button
        size="sm"
        leftIcon={<Filter size={13} />}
        loading={loading}
        onClick={() => onApply(from, to)}
      >
        {t('common.apply')}
      </Button>
    </div>
  )
}

/** Minimal inline search input */
export function TableSearch({
  value, onChange, placeholder, className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('common.search')
  return (
    <div className={cn('relative', className)}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        className={cn(
          'pl-8 pr-3 py-1.5 text-sm w-full rounded-[var(--radius-DEFAULT)]',
          'border border-[var(--color-outline-variant)]/40',
          'bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30',
        )}
      />
    </div>
  )
}
