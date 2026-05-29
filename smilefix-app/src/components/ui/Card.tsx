import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, className, hover = false, padding = 'lg', onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: 'var(--shadow-card-hover)' } : {}}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20',
        'shadow-[var(--shadow-card)]',
        paddingStyles[padding],
        hover && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, icon, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--color-on-surface)] text-base leading-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
