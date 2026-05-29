import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ minWidth: 0 }}
      className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary-container)]/15 flex items-center justify-center text-[var(--color-primary)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--color-on-surface)] mb-2">{title}</h3>
      {description && (
        <p
          className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-4"
          style={{ width: 'max-content', maxWidth: 'min(28rem, 90vw)' }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  )
}
