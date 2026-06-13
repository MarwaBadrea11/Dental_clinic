import { useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ExpandableSearchProps {
  /** Controlled value — bind your own state here */
  value: string
  /** Called on every keystroke */
  onChange: (value: string) => void
  /**
   * Rendering variant:
   * - `"expandable"` (default) — shows only an icon; expands left on hover/focus.
   *   Designed for compact toolbars like the Topbar.
   * - `"static"` — always shows the full input pill.
   *   Designed for page-level filter toolbars (Treatments, Patients, etc.).
   */
  variant?: 'expandable' | 'static'
  /** Input placeholder text */
  placeholder?: string
  /** Width (px) of the expanded input in `expandable` mode. Defaults to 220. */
  expandedWidth?: number
  /** Extra classes applied to the outermost wrapper */
  className?: string
  /** Accessible label for the search icon button */
  ariaLabel?: string
  /** Accessible label for the clear (X) button */
  clearAriaLabel?: string
  /** Called when the input receives focus */
  onFocus?: () => void
  /** Called when the input loses focus */
  onBlur?: () => void
}

/**
 * ExpandableSearch — universal search input component.
 *
 * ### `variant="expandable"` (Topbar / compact toolbars)
 * Shows only a search icon by default. On hover (or focus) it smoothly expands
 * to the LEFT, revealing the full input. Collapses on mouse-leave unless the
 * input has a value. Height is fixed at 36 px to match neighbouring icon buttons.
 *
 * ### `variant="static"` (page filter toolbars)
 * Always shows the full input pill — same visual style as `expandable` but
 * without any collapse behaviour. Use `className` to control width
 * (e.g. `"w-full sm:max-w-xs"`).
 */
export function ExpandableSearch({
  value,
  onChange,
  variant = 'expandable',
  placeholder = 'Search…',
  expandedWidth = 220,
  className,
  ariaLabel = 'Search',
  clearAriaLabel = 'Clear search',
  onFocus,
  onBlur,
}: ExpandableSearchProps) {
  // ── Expandable-only state ──────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = variant === 'static' || expanded || value.length > 0

  function handleMouseEnter() {
    if (variant !== 'expandable') return
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 310)
  }

  function handleMouseLeave() {
    if (variant !== 'expandable') return
    if (!value) setExpanded(false)
  }

  function handleClear() {
    onChange('')
    if (variant === 'expandable') {
      setExpanded(false)
      inputRef.current?.blur()
    } else {
      inputRef.current?.focus()
    }
  }

  // ── Static variant ─────────────────────────────────────────────────────────
  if (variant === 'static') {
    return (
      <div className={cn('relative flex items-center', className)}>
        {/* Search icon */}
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none"
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'w-full bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]',
            'border border-[var(--color-outline-variant)] rounded-full',
            'placeholder:text-[var(--color-outline)]',
            'pl-9 pr-8 py-2 text-sm',
            'transition-[border-color,box-shadow] duration-200',
            'hover:border-[var(--color-outline)]',
            'focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20',
          )}
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]',
              'transition-colors',
            )}
            aria-label={clearAriaLabel}
          >
            <X size={13} />
          </button>
        )}
      </div>
    )
  }

  // ── Expandable variant ─────────────────────────────────────────────────────
  return (
    <div
      className={cn('relative flex items-center justify-end', className)}
      style={{
        width: isOpen ? `${expandedWidth}px` : '36px',
        transition: 'width 0.3s ease-in-out',
        // Fixed height matches neighbouring p-2 + 20px-icon buttons (36px total)
        height: '36px',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget) && !value) {
          setExpanded(false)
        }
      }}
    >
      {/* Input pill — absolutely fills the wrapper */}
      <div
        className={cn(
          'absolute inset-0 flex items-center',
          'bg-[var(--color-surface-container-low)]',
          'border border-[var(--color-outline-variant)] rounded-full',
          'hover:border-[var(--color-outline)]',
          'focus-within:border-[var(--color-primary)]',
          'focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20',
          'transition-[opacity,border-color,box-shadow] duration-200',
        )}
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Search icon — absolutely centred on the left */}
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none"
        />

        {/* Input — pl-8 clears the icon, pr-7 clears the clear button */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'w-full h-full bg-transparent rounded-full',
            'text-sm text-[var(--color-on-surface)]',
            'placeholder:text-[var(--color-outline)]',
            'pl-8 pr-7',
            'focus:outline-none',
          )}
        />

        {/* Clear button — absolutely centred on the right */}
        {value && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2',
              'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]',
              'transition-colors',
            )}
            aria-label={clearAriaLabel}
            tabIndex={0}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Collapsed icon button — anchored to right edge */}
      <button
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2',
          'flex items-center justify-center w-9 h-9 rounded-full',
          'text-[var(--color-on-surface-variant)]',
          'hover:bg-[var(--color-primary-container)]/15',
          'transition-[opacity,background-color] duration-200',
          isOpen && 'opacity-0 pointer-events-none',
        )}
        aria-label={ariaLabel}
        tabIndex={isOpen ? -1 : 0}
        onFocus={() => {
          setExpanded(true)
          setTimeout(() => inputRef.current?.focus(), 310)
        }}
      >
        <Search size={18} />
      </button>
    </div>
  )
}
