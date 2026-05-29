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
  cols?: 2 | 3 | 4
  className?: string
}

export function InfoGrid({ items, cols = 2, className }: InfoGridProps) {
  const colCount = cols

  return (
    <div
      className={cn('info-grid', className)}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gap: '1rem 1.5rem' }}
    >
      {items.map((item, i) => (
        <div key={i} className="min-w-0" style={item.span === 2 ? { gridColumn: '1 / -1' } : undefined}>
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
