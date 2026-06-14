import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface QuickAction {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'tertiary'
}

interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
  delay?: number
  /** When true, children participate in a parent grid and stretch to equal height. */
  stretch?: boolean
}

export function QuickActions({ actions, className, delay = 0, stretch = false }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        stretch
          ? 'contents'
          : cn(
              'grid gap-3 sm:gap-4',
              actions.length === 1 && 'grid-cols-1',
              actions.length === 2 && 'grid-cols-2',
              actions.length === 3 && 'grid-cols-1 sm:grid-cols-3',
              actions.length >= 4 && 'grid-cols-2 sm:grid-cols-4',
            ),
        className,
      )}
    >
      {actions.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: delay + i * 0.06 }}
          className={stretch ? 'h-full min-h-0' : undefined}
        >
          <Button
            variant={action.variant ?? 'primary'}
            size="lg"
            fullWidth
            onClick={action.onClick}
            className={cn(
              'flex-col gap-1.5 text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95',
              stretch ? 'h-full min-h-0 py-6' : 'h-20',
            )}
          >
            <span className="text-xl">{action.icon}</span>
            {action.label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  )
}
