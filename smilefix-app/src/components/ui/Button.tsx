import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import type { Size, Variant } from '@/types'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[#005a5f] shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-primary)]',
  secondary:
    'bg-[var(--color-secondary-fixed)] text-[var(--color-on-secondary-fixed)] hover:bg-[var(--color-secondary-fixed-dim)]',
  tertiary:
    'bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] hover:bg-[var(--color-tertiary-fixed-dim)]',
  ghost:
    'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/20',
  outline:
    'bg-transparent border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-container)]/10',
  danger:
    'bg-[var(--color-error)] text-[var(--color-on-error)] hover:bg-[#9e1515]',
}

const sizeStyles: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs rounded-[var(--radius-sm)]',
  sm: 'px-3 py-1.5 text-sm rounded-[var(--radius-DEFAULT)]',
  md: 'px-4 py-2 text-sm rounded-[var(--radius-DEFAULT)]',
  lg: 'px-6 py-3 text-base rounded-[var(--radius-md)]',
  xl: 'px-8 py-4 text-lg rounded-[var(--radius-lg)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.97 }}
        transition={{ duration: 0.15 }}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold',
          'transition-all duration-200 cursor-pointer select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
