import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

// ── Accent palette ────────────────────────────────────────────────────────────
// Maps the accent name to the CSS-variable pair used in icon wrappers.
// 'primary' falls back to the existing teal brand color so all existing
// usages that don't pass an accent continue to look exactly as before.

export type CardAccent = 'primary' | 'purple' | 'orange'

const accentIconStyles: Record<CardAccent, string> = {
  primary: [
    'bg-[var(--color-primary-container)]/20',
    'text-[var(--color-primary)]',
  ].join(' '),

  purple: [
    'bg-[var(--color-secondary-container)]/20',
    'text-[var(--color-secondary)]',
  ].join(' '),

  orange: [
    'bg-[var(--color-tertiary-container)]/20',
    'text-[var(--color-tertiary)]',
  ].join(' '),
}

/** Subtle top-border accent stripe shown on <Card accent="…"> */
const accentBorderStyles: Record<CardAccent, string> = {
  primary: 'border-t-[var(--color-primary)]',
  purple:  'border-t-[var(--color-secondary)]',
  orange:  'border-t-[var(--color-tertiary)]',
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** When set, renders a 2px accent stripe along the top edge */
  accent?: CardAccent
  onClick?: () => void
  style?: React.CSSProperties
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  className,
  hover = false,
  padding = 'lg',
  accent,
  onClick,
  style,
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: 'var(--shadow-card-hover)' } : {}}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={style}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20',
        'shadow-[var(--shadow-card)]',
        // Accent top stripe — only when accent prop is provided
        accent && 'border-t-2',
        accent && accentBorderStyles[accent],
        paddingStyles[padding],
        hover && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

// ── CardHeader ───────────────────────────────────────────────────────────────

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  /** Controls the icon wrapper background + icon color. Defaults to 'primary'. */
  accent?: CardAccent
  className?: string
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  accent = 'primary',
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={cn(
              'w-9 h-9 rounded-[var(--radius-DEFAULT)] flex items-center justify-center shrink-0',
              accentIconStyles[accent],
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--color-on-surface)] text-base leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
