import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
  label?: string
  className?: string
}

const sizeStyles = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
}

export function Loader({ size = 'md', fullScreen = false, label, className }: LoaderProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          'rounded-full border-[var(--color-primary-container)] border-t-[var(--color-primary)] animate-spin',
          sizeStyles[size]
        )}
      />
      {label && (
        <p className="text-sm text-[var(--color-on-surface-variant)]">{label}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-[var(--color-background)]/80 backdrop-blur-sm',
          className
        )}
      >
        {spinner}
      </motion.div>
    )
  }

  return <div className={cn('flex items-center justify-center p-8', className)}>{spinner}</div>
}
