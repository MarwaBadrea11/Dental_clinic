import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import type { ToothCondition } from '@/types'

interface ToothDiagramProps {
  toothNumber: number        // FDI number — used as data key
  displayNumber: number      // Palmer number 1–8 shown in the label
  condition: ToothCondition
  isSelected?: boolean
  isUpper?: boolean
  onClick?: (toothNumber: number) => void
  size?: 'sm' | 'md'
}

// Visual config per condition — same as original
const conditionStyle: Record<ToothCondition, { fill: string; stroke: string; label: string }> = {
  healthy:     { fill: '#ffffff',                              stroke: 'var(--color-outline-variant)', label: 'Healthy'   },
  caries:      { fill: '#ffdad6',                              stroke: 'var(--color-error)',            label: 'Caries'    },
  filled:      { fill: '#b6eadd',                              stroke: 'var(--color-secondary)',        label: 'Filled'    },
  crown:       { fill: '#c7e7ff',                              stroke: 'var(--color-tertiary)',         label: 'Crown'     },
  missing:     { fill: 'var(--color-surface-container-high)',  stroke: 'var(--color-outline)',          label: 'Missing'   },
  implant:     { fill: '#e8d5ff',                              stroke: '#9d4edd',                       label: 'Implant'   },
  bridge:      { fill: '#fef3c7',                              stroke: '#d97706',                       label: 'Bridge'    },
  'root-canal':{ fill: '#fde8d8',                              stroke: '#ea580c',                       label: 'RCT'       },
  extraction:  { fill: 'var(--color-surface-container-high)',  stroke: 'var(--color-error)',            label: 'Extracted' },
  fracture:    { fill: '#fef9c3',                              stroke: '#ca8a04',                       label: 'Fracture'  },
}

export function ToothDiagram({
  toothNumber,
  displayNumber,
  condition,
  isSelected,
  isUpper,
  onClick,
  size = 'md',
}: ToothDiagramProps) {
  const cfg = conditionStyle[condition]
  const isMissing = condition === 'missing' || condition === 'extraction'
  const dim = size === 'sm' ? 32 : 40

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.12 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      transition={{ duration: 0.15 }}
      onClick={() => onClick?.(toothNumber)}
      className={cn(
        'flex flex-col items-center gap-0.5',
        onClick && 'cursor-pointer',
        isUpper ? 'flex-col' : 'flex-col-reverse',
      )}
      title={`Tooth ${displayNumber} (FDI ${toothNumber}) — ${cfg.label}`}
    >
      {/* Palmer number label */}
      <span
        className={cn(
          'text-[9px] font-bold leading-none tabular-nums',
          isSelected
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)]',
        )}
      >
        {displayNumber}
      </span>

      {/* Square tooth SVG — original design */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        className={cn('transition-all duration-200', isSelected && 'drop-shadow-md')}
        aria-label={`Tooth ${displayNumber}`}
      >
        {isMissing ? (
          <>
            <rect x="4" y="4" width="32" height="32" rx="6"
              fill={cfg.fill} stroke={cfg.stroke} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="12" y1="12" x2="28" y2="28" stroke={cfg.stroke} strokeWidth="2" strokeLinecap="round" />
            <line x1="28" y1="12" x2="12" y2="28" stroke={cfg.stroke} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Tooth body */}
            <rect
              x="4" y="4" width="32" height="32" rx="6"
              fill={cfg.fill}
              stroke={isSelected ? 'var(--color-primary)' : cfg.stroke}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {/* Crown indicator */}
            {condition === 'crown' && (
              <path d="M10 8 L20 4 L30 8 L30 16 L10 16 Z" fill="var(--color-tertiary)" opacity="0.4" />
            )}
            {/* Root canal indicator */}
            {condition === 'root-canal' && (
              <line x1="20" y1="8" x2="20" y2="32" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
            )}
            {/* Implant indicator */}
            {condition === 'implant' && (
              <>
                <line x1="20" y1="4"  x2="20" y2="36" stroke="#9d4edd" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="14" y1="12" x2="26" y2="12" stroke="#9d4edd" strokeWidth="1.5" />
                <line x1="14" y1="20" x2="26" y2="20" stroke="#9d4edd" strokeWidth="1.5" />
                <line x1="14" y1="28" x2="26" y2="28" stroke="#9d4edd" strokeWidth="1.5" />
              </>
            )}
            {/* Caries dot */}
            {condition === 'caries' && (
              <circle cx="20" cy="20" r="6" fill="var(--color-error)" opacity="0.5" />
            )}
            {/* Filled indicator */}
            {condition === 'filled' && (
              <rect x="12" y="12" width="16" height="16" rx="3" fill="var(--color-secondary)" opacity="0.4" />
            )}
            {/* Fracture line */}
            {condition === 'fracture' && (
              <path d="M20 6 L16 16 L22 16 L18 34" fill="none" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {/* Bridge arc */}
            {condition === 'bridge' && (
              <path d="M4 20 Q20 10 36 20" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
            )}
            {/* Selection ring */}
            {isSelected && (
              <rect x="2" y="2" width="36" height="36" rx="7"
                fill="none" stroke="var(--color-primary)" strokeWidth="2" opacity="0.6" />
            )}
          </>
        )}
      </svg>
    </motion.div>
  )
}
