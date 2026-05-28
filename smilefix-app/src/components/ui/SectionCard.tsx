import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

/**
 * SectionCard — a titled section container used throughout forms and detail pages.
 * Replaces repeated "card with header + divider + body" patterns.
 */
interface SectionCardProps {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  noPadding?: boolean
  delay?: number
}

export function SectionCard({
  title, subtitle, icon, action, children,
  className, bodyClassName, noPadding = false, delay = 0,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20',
        'shadow-[var(--shadow-card)]',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-outline-variant)]/15">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-sm text-[var(--color-on-surface)]">{title}</h3>}
              {subtitle && <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-6', bodyClassName)}>
        {children}
      </div>
    </motion.div>
  )
}
