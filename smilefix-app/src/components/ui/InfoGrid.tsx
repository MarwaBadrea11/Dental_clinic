import { cn } from '@/utils/cn'

/**
 * InfoGrid — renders a responsive grid of label/value pairs.
 * Used in patient details, staff profiles, etc.
 */
export interface InfoItem {
  label: string
  value: React.ReactNode
  span?: 1 | 2
}

interface InfoGridProps {
  items: InfoItem[]
  cols?: 1 | 2 | 3 | 4
  className?: string
}

const colsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function InfoGrid({ items, cols = 2, className }: InfoGridProps) {
  return (
    <div
      className={cn('info-grid grid gap-4 sm:gap-x-6', colsClass[cols] ?? colsClass[2], className)}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn('min-w-0', item.span === 2 && 'sm:col-span-2')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-0.5">
            {item.label}
          </p>
          <div className="text-sm font-medium text-[var(--color-on-surface)] break-words">
            {item.value ?? <span className="text-[var(--color-outline)] italic">Not provided</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
