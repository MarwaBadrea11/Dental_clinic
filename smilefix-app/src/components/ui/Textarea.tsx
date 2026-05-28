import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, fullWidth = true, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-semibold tracking-wide uppercase text-[var(--color-on-surface-variant)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={4}
          className={cn(
            'w-full bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]',
            'border border-[var(--color-outline-variant)] rounded-[var(--radius-DEFAULT)]',
            'px-3 py-2 text-sm placeholder:text-[var(--color-outline)]',
            'transition-all duration-200 resize-y',
            'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20',
            error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
