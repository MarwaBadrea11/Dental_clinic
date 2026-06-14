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

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

const colorMap: Record<FeedColor, { bg: string; dot: string }> = {
  primary:   { bg: 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]',       dot: 'bg-[var(--color-primary)]' },
  secondary: { bg: 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]',   dot: 'bg-[var(--color-secondary)]' },
  tertiary:  { bg: 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]',     dot: 'bg-[var(--color-tertiary)]' },
  error:     { bg: 'bg-[var(--color-error-container)] text-[var(--color-error)]',              dot: 'bg-[var(--color-error)]' },
  neutral:   { bg: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]', dot: 'bg-[var(--color-outline)]' },
}

export function ActivityFeed({ items, title = 'Clinical Activity Log', delay = 0, className }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      <Card
        className="relative overflow-hidden"
        style={{
          background: 'var(--color-surface-container-high)',
          borderTop: '2px solid rgba(121,213,220,0.2)',
          boxShadow: '0 0 24px 0 rgba(0,105,111,0.07), var(--shadow-card)',
        }}
      >
        {/* Subtle ambient glow */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(121,213,220,0.4), transparent)' }}
        />

        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)] mb-5">
          {title}
        </p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: delay + 0.1 } },
          }}
          className="space-y-4"
        >
          {items.map((entry, i) => {
            const c = colorMap[entry.color]
            return (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  show:   { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
                }}
                className="flex gap-3 group"
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center gap-0 shrink-0">
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className={cn('w-8 h-8 rounded-xl flex items-center justify-center', c.bg)}
                  >
                    {entry.icon}
                  </motion.div>
                  {i < items.length - 1 && (
                    <div className="w-px flex-1 mt-1 bg-[var(--color-outline-variant)]/20 min-h-[10px]" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-xs text-[var(--color-on-surface)] leading-relaxed font-medium">
                    {entry.text}
                  </p>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 flex items-center gap-1">
                    <span
                      className={cn('inline-block w-1.5 h-1.5 rounded-full', c.dot)}
                    />
                    {entry.time}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </Card>
    </motion.div>
  )
}
