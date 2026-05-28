import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AnalyticsWidgetProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  color?: 'primary' | 'secondary' | 'tertiary' | 'error'
  delay?: number
  className?: string
}

const colorMap = {
  primary:   { text: 'text-[var(--color-primary)]',   bg: 'bg-[var(--color-primary-container)]/20' },
  secondary: { text: 'text-[var(--color-secondary)]', bg: 'bg-[var(--color-secondary-container)]/20' },
  tertiary:  { text: 'text-[var(--color-tertiary)]',  bg: 'bg-[var(--color-tertiary-container)]/20' },
  error:     { text: 'text-[var(--color-error)]',     bg: 'bg-[var(--color-error-container)]' },
}

export function AnalyticsWidget({
  label, value, change, changeLabel, icon,
  color = 'primary', delay = 0, className,
}: AnalyticsWidgetProps) {
  const { t } = useTranslation()
  const c = colorMap[color]
  const isPositive = (change ?? 0) > 0
  const isNeutral = change === 0 || change === undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'p-5', className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
        <div className={cn('w-9 h-9 rounded-[var(--radius-DEFAULT)] flex items-center justify-center', c.bg, c.text)}>
          {icon}
        </div>
      </div>
      <p className={cn('text-2xl font-bold mb-2', c.text)}>{value}</p>
      {change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold',
          isNeutral ? 'text-[var(--color-on-surface-variant)]' :
          isPositive ? 'text-[var(--color-secondary)]' : 'text-[var(--color-error)]'
        )}>
          {isNeutral ? <Minus size={12} /> : isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? '+' : ''}{change}% {changeLabel ?? t('finance.vsLastMonth')}
        </div>
      )}
    </motion.div>
  )
}
