/**
 * Select — fully custom, brand-aligned dropdown/select component.
 *
 * Replaces the native <select> element entirely. Keeps the same public API
 * as the old Select so every existing usage continues to work without changes.
 *
 * Features
 * ─────────
 * • No native browser styling (appearance-none is gone; there is no <select>)
 * • Animated floating menu with shadow-xl and brand border
 * • Teal/primary focus ring + open state border accent
 * • Soft teal hover on options (bg-[var(--color-primary-container)]/15)
 * • Keyboard accessible: ArrowUp/Down, Enter, Space, Escape, Tab
 * • Anchored dropdown list (relative trigger wrapper + absolute menu)
 * • Smart vertical positioning — flips up when not enough room below
 * • Text truncation for long labels; supports multi-line sublabel via `meta`
 * • Full RTL support via logical inset properties (inherits dir from ancestors)
 * • Dark-mode tokens respected automatically via CSS custom properties
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type KeyboardEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
  /** Optional secondary info shown below the label (e.g. phone, ID) */
  meta?: string
  disabled?: boolean
}

export interface SelectProps {
  /** Array of options to display in the list */
  options: SelectOption[]
  /** Currently selected value */
  value?: string
  /** Called when the user picks an option — mirrors native onChange signature */
  onChange?: (e: { target: { value: string } }) => void
  /** Placeholder text shown when no value is selected */
  placeholder?: string
  /** Visible label rendered above the trigger */
  label?: string
  /** Error message — turns border red and shows helper text */
  error?: string
  /** Hint text shown below the trigger when there is no error */
  hint?: string
  /** Whether the component fills its container (default: true) */
  fullWidth?: boolean
  /** Whether the component is disabled */
  disabled?: boolean
  /** id forwarded to the hidden input and the label's htmlFor */
  id?: string
  /** Extra classes applied to the outer wrapper */
  className?: string
  /**
   * Extra classes applied to the trigger button.
   * Mirrors the old `className` prop position so existing usages like
   * `<Select className="text-xs py-1.5" />` still work.
   */
  triggerClassName?: string
  /** Alias kept for backward-compat: old code passed className on the select element */
  // (see prop spreading below)
}

// ─── Menu positioning ─────────────────────────────────────────────────────────

interface MenuPlacement {
  maxHeight: number
  openUpward: boolean
}

function calcMenuPlacement(trigger: HTMLElement): MenuPlacement {
  const rect = trigger.getBoundingClientRect()
  const viewH = window.innerHeight
  const margin = 8
  const preferredHeight = 260
  const spaceBelow = viewH - rect.bottom - margin
  const spaceAbove = rect.top - margin
  const openUpward = spaceBelow < preferredHeight && spaceAbove > spaceBelow

  return {
    maxHeight: Math.max(
      120,
      openUpward
        ? Math.min(preferredHeight, spaceAbove)
        : Math.min(preferredHeight, spaceBelow, viewH - margin * 2)
    ),
    openUpward,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Select({
  options,
  value = '',
  onChange,
  placeholder = 'Select an option…',
  label,
  error,
  hint,
  fullWidth = true,
  disabled = false,
  id,
  className,        // kept for backward-compat — applied to trigger
  triggerClassName,
}: SelectProps) {
  const uid = useId()
  const inputId = id ?? uid

  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)

  // ── Open / close ────────────────────────────────────────────────────────────

  const openMenu = useCallback(() => {
    if (disabled) return
    if (triggerRef.current) setMenuPlacement(calcMenuPlacement(triggerRef.current))
    const idx = options.findIndex((o) => o.value === value && !o.disabled)
    setFocusedIndex(idx >= 0 ? idx : 0)
    setOpen(true)
  }, [disabled, options, value])

  const closeMenu = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const pickOption = useCallback(
    (opt: SelectOption) => {
      if (opt.disabled) return
      onChange?.({ target: { value: opt.value } })
      closeMenu()
    },
    [onChange, closeMenu]
  )

  // ── Reposition on scroll / resize while open ─────────────────────────────

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setMenuPlacement(calcMenuPlacement(triggerRef.current))
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  // ── Close on outside click ─────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      )
        return
      closeMenu()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeMenu])

  // ── Scroll focused item into view ─────────────────────────────────────────

  useEffect(() => {
    if (!open || focusedIndex < 0) return
    const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, open])

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      openMenu()
    }
  }

  const handleListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const enabledIndices = options.reduce<number[]>((acc, o, i) => {
      if (!o.disabled) acc.push(i)
      return acc
    }, [])
    const pos = enabledIndices.indexOf(focusedIndex)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(enabledIndices[Math.min(pos + 1, enabledIndices.length - 1)])
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(enabledIndices[Math.max(pos - 1, 0)])
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0) pickOption(options[focusedIndex])
        break
      case 'Escape':
      case 'Tab':
        e.preventDefault()
        closeMenu()
        break
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-semibold tracking-wide uppercase text-[var(--color-on-surface-variant)]"
        >
          {label}
        </label>
      )}

      {/* Trigger + anchored dropdown — relative wrapper keeps absolute menu aligned */}
      <div className={cn('relative w-full', !fullWidth && 'inline-block')}>
        <button
          ref={triggerRef}
          id={inputId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-label={label ?? placeholder}
          disabled={disabled}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            // Base layout
            'flex items-center justify-between gap-2',
            'w-full min-h-[2.375rem] px-3 py-2 text-sm text-start',
            // Background + border
            'bg-[var(--color-surface-container-low)]',
            'border rounded-[var(--radius-DEFAULT)]',
            'transition-all duration-200',
            // Default border
            !error && !open && 'border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]',
            // Open state — brand teal border + ring
            open && !error && 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20',
            // Error state
            error && 'border-[var(--color-error)] ring-2 ring-[var(--color-error)]/15',
            // Disabled
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            // Cursor
            !disabled && 'cursor-pointer',
            // Back-compat: className was historically applied to the <select> element
            className,
            triggerClassName
          )}
        >
          {/* Selected label / placeholder */}
          <span
            className={cn(
              'flex-1 min-w-0 truncate',
              selected
                ? 'text-[var(--color-on-surface)]'
                : 'text-[var(--color-outline)]'
            )}
          >
            {selected ? selected.label : placeholder}
          </span>

          {/* Chevron */}
          <ChevronDown
            size={15}
            className={cn(
              'shrink-0 text-[var(--color-outline)] transition-transform duration-200',
              open && 'rotate-180 text-[var(--color-primary)]'
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.94, y: menuPlacement?.openUpward ? 4 : -4 }}
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              exit={{ opacity: 0, scaleY: 0.94, y: menuPlacement?.openUpward ? 4 : -4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transformOrigin: menuPlacement?.openUpward ? 'bottom center' : 'top center',
              }}
              className={cn(
                'absolute z-50 w-full min-w-0',
                'inset-inline-start-0 end-auto',
                menuPlacement?.openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
              )}
            >
              <ul
                ref={listRef}
                id={`${inputId}-listbox`}
                role="listbox"
                aria-label={label ?? placeholder}
                tabIndex={-1}
                onKeyDown={handleListKeyDown}
                autoFocus
                className={cn(
                  'overflow-y-auto overscroll-contain',
                  'bg-[var(--color-surface-container-lowest)]',
                  'border border-[var(--color-outline-variant)]/30',
                  'rounded-[var(--radius-md)] shadow-[var(--shadow-modal)]',
                  'py-1 outline-none',
                  'focus:outline-none'
                )}
                style={{ maxHeight: menuPlacement?.maxHeight ?? 260 }}
              >
                {options.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-[var(--color-outline)] select-none">
                    No options
                  </li>
                )}
                {options.map((opt, i) => {
                  const isSelected = opt.value === value
                  const isFocused = i === focusedIndex

                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      onMouseEnter={() => !opt.disabled && setFocusedIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault() // keep trigger focused
                        pickOption(opt)
                      }}
                      className={cn(
                        'flex items-center justify-between gap-3',
                        'px-3 py-1.5 text-sm select-none',
                        'transition-colors duration-100',
                        // Cursor
                        opt.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                        // Hover / focus highlight — soft teal brand accent
                        isFocused && !opt.disabled
                          ? 'bg-[var(--color-primary-container)]/15 text-[var(--color-on-surface)]'
                          : 'text-[var(--color-on-surface)]',
                        // Selected item gets a slightly stronger tint
                        isSelected && !isFocused &&
                          'bg-[var(--color-primary-container)]/10 text-[var(--color-primary)]'
                      )}
                    >
                      {/* Label + optional meta */}
                      <span className="flex flex-col min-w-0">
                        <span className="truncate leading-snug">{opt.label}</span>
                        {opt.meta && (
                          <span className="truncate text-[11px] text-[var(--color-outline)] leading-tight mt-0.5">
                            {opt.meta}
                          </span>
                        )}
                      </span>

                      {/* Checkmark for the currently selected option */}
                      {isSelected && (
                        <Check
                          size={14}
                          className="shrink-0 text-[var(--color-primary)]"
                          strokeWidth={2.5}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error / hint */}
      {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{hint}</p>
      )}
    </div>
  )
}

// Keep default export for anyone importing it that way
export default Select
