import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface ReportColumn<T> {
  key: keyof T | string
  header: string
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => React.ReactNode
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[]
  rows: T[]
  keyField: keyof T
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function ReportTable<T extends object>({
  columns, rows, keyField, loading, emptyMessage = 'No data', className,
}: ReportTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-[var(--color-on-surface-variant)]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-outline-variant)]/20">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider',
                  'text-[var(--color-on-surface-variant)] whitespace-nowrap',
                  col.align === 'right'  && 'text-right',
                  col.align === 'center' && 'text-center',
                  !col.align             && 'text-left',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={String((row as Record<string, unknown>)[keyField as string])}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="border-b border-[var(--color-outline-variant)]/10 hover:bg-[var(--color-surface-container-low)]/40 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-[var(--color-on-surface)]',
                    col.align === 'right'  && 'text-right tabular-nums',
                    col.align === 'center' && 'text-center',
                  )}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
