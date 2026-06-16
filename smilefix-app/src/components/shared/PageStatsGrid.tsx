import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface PageStatItem {
  label: string
  value: string | number
  icon: React.ReactNode
  /** Text color for label value */
  color: string
  /** Icon container background */
  bg: string
  /** Optional extra classes on the icon wrapper (e.g. animate-spin) */
  iconClassName?: string
  glow?: string
}

interface PageStatsGridProps {
  stats: PageStatItem[]
  delay?: number
  className?: string
}

export function PageStatsGrid({ stats, delay = 0, className }: PageStatsGridProps) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: delay + i * 0.07 }}
          className={cn(
            'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
            'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
            s.glow,
            'p-4',
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] leading-snug pe-2">
              {s.label}
            </p>
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                s.bg,
                s.color,
                s.iconClassName,
              )}
            >
              {s.icon}
            </div>
          </div>
          <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
        </motion.div>
      ))}
    </div>
  )
}
