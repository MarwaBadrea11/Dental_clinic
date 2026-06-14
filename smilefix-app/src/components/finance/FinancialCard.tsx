import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/utils/cn'

type FinancialCardVariant = 'revenue' | 'outstanding' | 'overdue' | 'paid' | 'neutral'

interface FinancialCardProps {
  label: string
  value: string
  icon: React.ReactNode
  variant?: FinancialCardVariant
  trend?: string
  trendUp?: boolean
  subtitle?: string
  /** 0–100 progress bar */
  progress?: number
  delay?: number
  className?: string
}

const variantStyles: Record<FinancialCardVariant, { value: string; icon: string; glow: string; progress: string }> = {
  revenue:     { value: 'text-emerald-600 dark:text-emerald-400',     icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',     glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',  progress: 'bg-emerald-500' },
  outstanding: { value: 'text-orange-600 dark:text-orange-400',     icon: 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',       glow: 'shadow-[0_0_20px_rgba(249,115,22,0.12)]',  progress: 'bg-orange-500' },
  overdue:     { value: 'text-rose-600 dark:text-rose-400',         icon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',               glow: 'shadow-[0_0_20px_rgba(244,63,94,0.12)]',   progress: 'bg-rose-500' },
  paid:        { value: 'text-teal-600 dark:text-teal-400',         icon: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400',               glow: 'shadow-[0_0_20px_rgba(20,184,166,0.12)]',  progress: 'bg-teal-500' },
  neutral:     { value: 'text-[var(--color-on-surface)]',           icon: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]', glow: '',                                         progress: 'bg-[var(--color-outline)]' },
}

export function FinancialCard({
  label, value, icon, variant = 'neutral',
  trend, trendUp = true, subtitle, progress,
  delay = 0, className,
}: FinancialCardProps) {
  const s = variantStyles[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay }}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20',
        'shadow-[var(--shadow-card)]',
        s.glow,
        'p-5 flex flex-col justify-between min-h-[120px]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-1.5">
            {label}
          </p>
          <p className={cn('text-2xl font-bold leading-none', s.value)}>{value}</p>
          {subtitle && <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">{subtitle}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', s.icon)}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        {progress !== undefined && (
          <div className="w-full bg-[var(--color-surface-container-high)] h-1.5 rounded-full overflow-hidden mb-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.8, delay: delay + 0.3, ease: 'easeOut' }}
              className={cn('h-full rounded-full', s.progress)}
            />
          </div>
        )}
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-semibold', trendUp ? 'text-[var(--color-secondary)]' : 'text-[var(--color-error)]')}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  )
}
