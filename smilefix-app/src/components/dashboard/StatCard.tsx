import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

type StatColor = 'primary' | 'secondary' | 'tertiary' | 'error'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color?: StatColor
  trend?: string
  trendUp?: boolean
  progress?: number
  alert?: string
  badge?: string
  bgIcon?: React.ReactNode
  delay?: number
  className?: string
}

// Cinematic easing
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

const colorTokens: Record<StatColor, {
  text: string
  iconBg: string
  trendText: string
  glow: string
  progressBar: string
  accentBorder: string
}> = {
  primary: {
    text:        'text-[var(--color-primary)]',
    iconBg:      'bg-[var(--color-primary-container)]/25 text-[var(--color-primary)]',
    trendText:   'text-[var(--color-secondary)]',
    glow:        '0 0 20px 0 rgba(0,105,111,0.12)',
    progressBar: 'bg-gradient-to-r from-[var(--color-primary)] to-[#79d5dc]',
    accentBorder:'rgba(121,213,220,0.35)',
  },
  secondary: {
    text:        'text-[var(--color-secondary)]',
    iconBg:      'bg-[var(--color-secondary-container)]/25 text-[var(--color-secondary)]',
    trendText:   'text-[var(--color-secondary)]',
    glow:        '0 0 20px 0 rgba(53,103,93,0.12)',
    progressBar: 'bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-container)]',
    accentBorder:'rgba(53,103,93,0.3)',
  },
  tertiary: {
    text:        'text-[var(--color-tertiary)]',
    iconBg:      'bg-[var(--color-tertiary-container)]/25 text-[var(--color-tertiary)]',
    trendText:   'text-[var(--color-tertiary)]',
    glow:        '0 0 20px 0 rgba(44,100,132,0.12)',
    progressBar: 'bg-gradient-to-r from-[var(--color-tertiary)] to-[var(--color-tertiary-container)]',
    accentBorder:'rgba(44,100,132,0.3)',
  },
  error: {
    text:        'text-[var(--color-error)]',
    iconBg:      'bg-[var(--color-error-container)] text-[var(--color-error)]',
    trendText:   'text-[var(--color-error)]',
    glow:        '0 0 20px 0 rgba(186,26,26,0.10)',
    progressBar: 'bg-[var(--color-error)]',
    accentBorder:'rgba(186,26,26,0.25)',
  },
}

export function StatCard({
  label, value, icon, color = 'primary',
  trend, trendUp = true, progress, alert, badge, bgIcon,
  delay = 0, className,
}: StatCardProps) {
  const tokens = colorTokens[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT_EXPO }}
      whileHover={{
        y: -3,
        boxShadow: `0 12px 40px 0 rgba(0,105,111,0.14), ${tokens.glow}`,
        transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
      }}
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <Card
        className={cn('relative overflow-hidden flex flex-col justify-between', className)}
        style={{
          height: '9rem',
          borderTop: `2px solid ${tokens.accentBorder}`,
          boxShadow: `var(--shadow-card), ${tokens.glow}`,
        }}
      >
        {/* Decorative bg icon */}
        {bgIcon && (
          <div className={cn(
            'absolute -right-2 -bottom-2 opacity-[0.055] select-none pointer-events-none',
            tokens.text,
          )}>
            {bgIcon}
          </div>
        )}

        {/* Subtle gradient wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top right, ${tokens.accentBorder.replace(')', ', 0.06)')}, transparent 65%)`,
          }}
        />

        {/* Top row */}
        <div className="flex items-start justify-between relative z-10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)] mb-1.5">
              {label}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: delay + 0.15 }}
              className={cn('text-[2rem] font-extrabold leading-none tracking-tight', tokens.text)}
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {value}
            </motion.p>
          </div>
          <div className={cn('p-2.5 rounded-[var(--radius-md)] shrink-0 shadow-sm', tokens.iconBg)}>
            {icon}
          </div>
        </div>

        {/* Bottom row */}
        <div className="relative z-10">
          {trend && (
            <div className={cn('flex items-center gap-1 text-[11px] font-bold', tokens.trendText)}>
              {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{trend}</span>
            </div>
          )}
          {progress !== undefined && (
            <div className="space-y-1">
              <div className="w-full bg-[var(--color-surface-container-high)] h-1.5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.1, delay: delay + 0.35, ease: EASE_OUT_EXPO }}
                  className={cn('h-full rounded-full', tokens.progressBar)}
                />
              </div>
            </div>
          )}
          {alert && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-error)] font-semibold">
              <AlertCircle size={11} /> {alert}
            </div>
          )}
          {badge && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)]">
              <CheckCircle2 size={11} /> {badge}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
