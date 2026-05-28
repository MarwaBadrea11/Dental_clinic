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
}

export function QuickActions({ actions, className, delay = 0 }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn('grid gap-4', `grid-cols-${Math.min(actions.length, 4)}`, className)}
      style={{ gridTemplateColumns: `repeat(${Math.min(actions.length, 4)}, minmax(0, 1fr))` }}
    >
      {actions.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: delay + i * 0.06 }}
        >
          <Button
            variant={action.variant ?? 'primary'}
            size="lg"
            fullWidth
            onClick={action.onClick}
            className="flex-col h-20 gap-1.5 text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95"
          >
            <span className="text-xl">{action.icon}</span>
            {action.label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  )
}
