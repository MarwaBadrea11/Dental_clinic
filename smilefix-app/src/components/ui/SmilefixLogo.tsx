import { cn } from '@/utils/cn'

interface SmilefixLogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  className?: string
  light?: boolean
}

const sizeMap = {
  sm: { icon: 32, title: 'text-base', sub: 'text-[9px]' },
  md: { icon: 40, title: 'text-lg',   sub: 'text-[10px]' },
  lg: { icon: 56, title: 'text-2xl',  sub: 'text-xs' },
}

export function SmilefixLogo({ size = 'md', variant = 'full', className, light = false }: SmilefixLogoProps) {
  const s = sizeMap[size]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Icon */}
      <div
        className="rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{
          width: s.icon,
          height: s.icon,
          background: light ? 'rgba(255,255,255,0.2)' : 'var(--color-primary)',
          boxShadow: light ? 'none' : 'var(--shadow-glow-sm)',
        }}
      >
        <svg
          width={s.icon * 0.55}
          height={s.icon * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Tooth shape */}
          <path d="M12 2C8.5 2 5 5 5 9c0 2.5 1 4.5 2.5 6L9 22h6l1.5-7C18 13.5 19 11.5 19 9c0-4-3.5-7-7-7z" />
          <circle cx="12" cy="9" r="1.5" fill="white" stroke="none" />
        </svg>
      </div>

      {/* Wordmark */}
      {variant === 'full' && (
        <div>
          <h1
            className={cn(s.title, 'font-bold leading-none tracking-tight')}
            style={{
              fontFamily: 'Manrope, sans-serif',
              color: light ? 'white' : 'var(--color-primary)',
            }}
          >
            SmileFix
          </h1>
          <p
            className={cn(s.sub, 'font-semibold uppercase tracking-widest mt-0.5')}
            style={{ color: light ? 'rgba(255,255,255,0.65)' : 'var(--color-on-surface-variant)' }}
          >
            Dental Precision
          </p>
        </div>
      )}
    </div>
  )
}
