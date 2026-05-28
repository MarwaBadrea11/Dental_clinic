import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, fullWidth = true, className, id, ...props }, ref) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full appearance-none bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]',
              'border border-[var(--color-outline-variant)] rounded-[var(--radius-DEFAULT)]',
              'px-3 py-2 pr-9 text-sm',
              'transition-all duration-200 cursor-pointer',
              'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20',
              error && 'border-[var(--color-error)]',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none"
          />
        </div>
        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{hint}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
