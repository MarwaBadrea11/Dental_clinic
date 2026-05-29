import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumb?: Array<{ label: string; href?: string }>
  className?: string
}

export function PageHeader({ title, subtitle, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}
    >
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 mb-1.5" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--color-outline)] text-xs">/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-xs text-[var(--color-on-surface-variant)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1
          className="text-2xl font-bold text-[var(--color-on-surface)] leading-tight"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  )
}
