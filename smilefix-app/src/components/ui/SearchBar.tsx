import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  /** Explicit max-width in CSS units, e.g. '28rem'. Defaults to '28rem'. */
  maxWidth?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  size = 'md',
  maxWidth = '28rem',
}: SearchBarProps) {
  const iconSize  = size === 'sm' ? 14 : 16
  const height    = size === 'sm' ? '2.25rem' : '2.75rem'
  const fontSize  = size === 'sm' ? '0.8125rem' : '0.9375rem'
  const padLeft   = size === 'sm' ? '2.25rem' : '2.75rem'
  const padRight  = size === 'sm' ? '2rem'    : '2.5rem'
  const padY      = size === 'sm' ? '0'       : '0'

  return (
    <div
      className={cn('relative flex items-center', className)}
      style={{ width: '100%', maxWidth }}
    >
      {/* Search icon */}
      <Search
        size={iconSize}
        style={{
          position: 'absolute',
          left: '0.875rem',
          color: 'var(--color-outline)',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      />

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height,
          paddingLeft: padLeft,
          paddingRight: padRight,
          paddingTop: padY,
          paddingBottom: padY,
          fontSize,
          background: 'var(--color-surface-container-lowest)',
          border: '1.5px solid var(--color-outline-variant)',
          borderRadius: '0.75rem',
          color: 'var(--color-on-surface)',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#61bec5'
          e.target.style.boxShadow   = '0 0 0 3px rgba(97,190,197,0.18)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-outline-variant)'
          e.target.style.boxShadow   = 'none'
        }}
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-outline)',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-on-surface)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-outline)')}
        >
          <X size={iconSize} />
        </button>
      )}
    </div>
  )
}
