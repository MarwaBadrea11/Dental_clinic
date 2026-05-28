import { cn } from '@/utils/cn'

/**
 * FormField — wraps any input with a label, error, and hint.
 * Use this as the outer shell; pass Input/Select/Textarea as children.
 */
interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
  htmlFor?: string
}

export function FormField({ label, error, hint, required, className, children, htmlFor }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]"
        >
          {label}
          {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--color-on-surface-variant)]">{hint}</p>}
    </div>
  )
}
