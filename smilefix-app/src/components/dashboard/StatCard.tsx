import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

type StatColor = 'primary' | 'secondary' | 'tertiary' | 'error'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color?: StatColor
  /** Show a trend line e.g. "+12% this month" */
  trend?: string
  trendUp?: boolean
  /** Show a progress bar (0–100) */
  progress?: number
  /** Show an alert line */
  alert?: string
  /** Show a badge */
  badge?: string
  /** Decorative background icon (emoji or ReactNode) */
  bgIcon?: React.ReactNode
  delay?: number
  className?: string
}

const colorTokens: Record<StatColor, { text: string; iconBg: string; trendText: string }> = {
  primary:   { text: 'text-[var(--color-primary)]',   iconBg: 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]',   trendText: 'text-[var(--color-secondary)]' },
  secondary: { text: 'text-[var(--color-secondary)]', iconBg: 'bg-[var(--color-secondary-container)]/20 text-[var(--color-secondary)]', trendText: 'text-[var(--color-secondary)]' },
  tertiary:  { text: 'text-[var(--color-tertiary)]',  iconBg: 'bg-[var(--color-tertiary-container)]/20 text-[var(--color-tertiary)]',  trendText: 'text-[var(--color-tertiary)]' },
  error:     { text: 'text-[var(--color-error)]',     iconBg: 'bg-[var(--color-error-container)] text-[var(--color-error)]',           trendText: 'text-[var(--color-error)]' },
}

const progressBg: Record<StatColor, string> = {
  primary:   'bg-[var(--color-primary)]',
  secondary: 'bg-[var(--color-secondary)]',
  tertiary:  'bg-[var(--color-tertiary)]',
  error:     'bg-[var(--color-error)]',
}

export function StatCard({
  label, value, icon, color = 'primary',
  trend, trendUp = true, progress, alert, badge, bgIcon,
  delay = 0, className,
}: StatCardProps) {
  const tokens = colorTokens[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className={cn('relative overflow-hidden h-32 flex flex-col justify-between', className)}>
        {/* Decorative bg icon */}
        {bgIcon && (
          <div className={cn('absolute -right-2 -bottom-2 text-6xl opacity-[0.07] select-none pointer-events-none', tokens.text)}>
            {bgIcon}
          </div>
        )}

        {/* Top row */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1">
              {label}
            </p>
            <p className={cn('text-3xl font-bold leading-none', tokens.text)}>{value}</p>
          </div>
          <div className={cn('p-2 rounded-[var(--radius-md)]', tokens.iconBg)}>
            {icon}
          </div>
        </div>

        {/* Bottom row */}
        <div className="relative z-10">
          {trend && (
            <div className={cn('flex items-center gap-1 text-xs font-semibold', tokens.trendText)}>
              {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend}
            </div>
          )}
          {progress !== undefined && (
            <div className="w-full bg-[var(--color-surface-container-high)] h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: delay + 0.3, ease: 'easeOut' }}
                className={cn('h-full rounded-full', progressBg[color])}
              />
            </div>
          )}
          {alert && (
            <div className="flex items-center gap-1 text-xs text-[var(--color-error)] font-semibold">
              <AlertCircle size={12} /> {alert}
            </div>
          )}
          {badge && (
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
              <CheckCircle2 size={12} /> {badge}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
