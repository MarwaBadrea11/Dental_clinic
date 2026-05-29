import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

type FeedColor = 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral'

export interface ActivityItem {
  icon: React.ReactNode
  color: FeedColor
  text: React.ReactNode
  time: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  title?: string
  delay?: number
  className?: string
}

const colorMap: Record<FeedColor, string> = {
  primary:   'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]',
  secondary: 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]',
  tertiary:  'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]',
  error:     'bg-[var(--color-error-container)] text-[var(--color-error)]',
  neutral:   'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
}

export function ActivityFeed({ items, title = 'Clinical Activity Log', delay = 0, className }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      <Card className="bg-[var(--color-surface-container-high)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-4">
          {title}
        </p>
        <div className="space-y-4">
          {items.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: delay + i * 0.06 }}
              className="flex gap-3"
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', colorMap[entry.color])}>
                {entry.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--color-on-surface)] leading-relaxed">{entry.text}</p>
                <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5">{entry.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
