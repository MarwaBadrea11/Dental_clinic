import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

interface RevenueMetric {
  label: string
  value: string
  change?: string
  changeUp?: boolean
}

interface RevenueCardProps {
  title?: string
  metrics: RevenueMetric[]
  delay?: number
  className?: string
}

export function RevenueCard({ title = 'Performance Stats', metrics, delay = 0, className }: RevenueCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))` }}
    >
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: delay + i * 0.07 }}
        >
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-outline)] mb-1">
              {m.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold text-[var(--color-on-surface)] leading-none">{m.value}</span>
              {m.change && (
                <span className={cn(
                  'text-[11px] font-bold',
                  m.changeUp ? 'text-[var(--color-secondary)]' : 'text-[var(--color-error)]'
                )}>
                  {m.changeUp ? '↑' : '↓'} {m.change}
                </span>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
