import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface QuickAction {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  /** Controls which accent palette to use */
  variant?: 'primary' | 'secondary' | 'tertiary'
}

interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
  delay?: number
  /** When true, renders as `contents` so parent grid controls layout */
  stretch?: boolean
}

// ── Cinematic easing ──────────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

// ── Per-variant palette ───────────────────────────────────────────────────────
// Each variant defines:
//   gradient  — the soft frosted-glass tinted background
//   border    — the 1px accent hairline
//   iconRing  — the icon backdrop circle
//   iconColor — icon + text color
//   hoverGlow — box-shadow on hover
//   hoverBg   — slightly more opaque bg on hover (CSS string for inline style)
const PALETTE: Record<string, {
  gradient: string
  border: string
  iconRing: string
  iconColor: string
  hoverGlow: string
  hoverBg: string
}> = {
  primary: {
    gradient:  'linear-gradient(145deg, rgba(0,105,111,0.08) 0%, rgba(121,213,220,0.10) 100%)',
    border:    '1px solid rgba(121,213,220,0.30)',
    iconRing:  'rgba(0,105,111,0.10)',
    iconColor: 'var(--color-primary)',
    hoverGlow: '0 8px 32px 0 rgba(0,105,111,0.18), 0 0 18px 0 rgba(121,213,220,0.22)',
    hoverBg:   'linear-gradient(145deg, rgba(0,105,111,0.13) 0%, rgba(121,213,220,0.15) 100%)',
  },
  secondary: {
    gradient:  'linear-gradient(145deg, rgba(53,103,93,0.07) 0%, rgba(157,209,196,0.11) 100%)',
    border:    '1px solid rgba(157,209,196,0.32)',
    iconRing:  'rgba(53,103,93,0.10)',
    iconColor: 'var(--color-secondary)',
    hoverGlow: '0 8px 32px 0 rgba(53,103,93,0.18), 0 0 18px 0 rgba(157,209,196,0.24)',
    hoverBg:   'linear-gradient(145deg, rgba(53,103,93,0.12) 0%, rgba(157,209,196,0.18) 100%)',
  },
  tertiary: {
    gradient:  'linear-gradient(145deg, rgba(44,100,132,0.07) 0%, rgba(152,205,242,0.11) 100%)',
    border:    '1px solid rgba(152,205,242,0.32)',
    iconRing:  'rgba(44,100,132,0.10)',
    iconColor: 'var(--color-tertiary)',
    hoverGlow: '0 8px 32px 0 rgba(44,100,132,0.18), 0 0 18px 0 rgba(152,205,242,0.24)',
    hoverBg:   'linear-gradient(145deg, rgba(44,100,132,0.12) 0%, rgba(152,205,242,0.18) 100%)',
  },
}

export function QuickActions({ actions, className, delay = 0, stretch = false }: QuickActionsProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1, delayChildren: delay + 0.05 } },
      }}
      className={cn(
        stretch
          ? 'contents'
          : cn(
              'grid gap-4',
              actions.length === 1 && 'grid-cols-1',
              actions.length === 2 && 'grid-cols-2',
              actions.length === 3 && 'grid-cols-1 sm:grid-cols-3',
              actions.length >= 4 && 'grid-cols-2 sm:grid-cols-4',
            ),
        className,
      )}
    >
      {actions.map((action) => {
        const v = action.variant ?? 'primary'
        const p = PALETTE[v]

        return (
          <motion.button
            key={action.label}
            onClick={action.onClick}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.95 },
              show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
            }}
            whileHover={{
              y: -5,
              scale: 1.02,
              transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
            }}
            whileTap={{ scale: 0.97, y: 0 }}
            className={cn(
              'group relative flex flex-col items-center justify-center gap-3 w-full',
              'rounded-[var(--radius-xl)] cursor-pointer overflow-hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
              stretch ? 'h-full min-h-[120px] py-8' : 'h-[120px]',
            )}
            style={{
              background: p.gradient,
              border: p.border,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-card)',
            }}
            // Inline hover bg — done via CSS group + custom prop since framer handles scale/y
          >
            {/* Glass shine streak */}
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 55%)',
              }}
            />

            {/* Hover background intensifier */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-[var(--radius-xl)]"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ background: p.hoverBg }}
            />

            {/* Hover glow ring */}
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-[var(--radius-xl)]"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ boxShadow: p.hoverGlow }}
            />

            {/* Icon circle */}
            <motion.div
              className="relative z-10 flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                background: p.iconRing,
                color: p.iconColor,
              }}
              whileHover={{ scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <span className="flex items-center justify-center" style={{ color: p.iconColor }}>
                {action.icon}
              </span>
            </motion.div>

            {/* Label */}
            <span
              className="relative z-10 text-[11px] font-bold uppercase tracking-widest text-center leading-tight px-2"
              style={{ color: p.iconColor }}
            >
              {action.label}
            </span>
          </motion.button>
        )
      })}
    </motion.div>
  )
}
