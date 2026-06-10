import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { getToothConditionLabel } from '@/i18n/patientOdontogramOptions'
import type { ToothCondition } from '@/types'

interface ToothDiagramProps {
  toothNumber: number
  displayNumber: number
  condition: ToothCondition
  isSelected?: boolean
  isUpper?: boolean
  onClick?: (toothNumber: number) => void
  size?: 'sm' | 'md'
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
  const { t } = useTranslation()
  const conditionLabel = getToothConditionLabel(t, condition)

  const conditionStroke: Record<ToothCondition, string> = {
    healthy:     'var(--color-outline-variant)',
    caries:      'var(--color-error)',
    filled:      'var(--color-secondary)',
    crown:       'var(--color-tertiary)',
    missing:     'var(--color-outline)',
    implant:     '#9d4edd',
    bridge:      '#d97706',
    'root-canal':'#ea580c',
    extraction:  'var(--color-error)',
    fracture:    '#ca8a04',
  }

  const conditionFill: Record<ToothCondition, string> = {
    healthy:     '#ffffff',
    caries:      '#ffdad6',
    filled:      '#b6eadd',
    crown:       '#c7e7ff',
    missing:     'var(--color-surface-container-high)',
    implant:     '#e8d5ff',
    bridge:      '#fef3c7',
    'root-canal':'#fde8d8',
    extraction:  'var(--color-surface-container-high)',
    fracture:    '#fef9c3',
  }

  const fill = conditionFill[condition]
  const strokeColor = conditionStroke[condition]
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
      title={t('odontogram.toothTooltip', {
        palmer: displayNumber,
        fdi: toothNumber,
        condition: conditionLabel,
      })}
    >
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

      <svg
        width={dim}
        height={dim}
        viewBox="0 0 40 40"
        className={cn('transition-all duration-200', isSelected && 'drop-shadow-md')}
        aria-label={t('odontogram.toothAria', { number: displayNumber })}
      >
        {isMissing ? (
          <>
            <rect x="4" y="4" width="32" height="32" rx="6"
              fill={fill} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="12" y1="12" x2="28" y2="28" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
            <line x1="28" y1="12" x2="12" y2="28" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect
              x="4" y="4" width="32" height="32" rx="6"
              fill={fill}
              stroke={isSelected ? 'var(--color-primary)' : strokeColor}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {condition === 'crown' && (
              <path d="M10 8 L20 4 L30 8 L30 16 L10 16 Z" fill="var(--color-tertiary)" opacity="0.4" />
            )}
            {condition === 'root-canal' && (
              <line x1="20" y1="8" x2="20" y2="32" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
            )}
            {condition === 'implant' && (
              <>
                <line x1="20" y1="4"  x2="20" y2="36" stroke="#9d4edd" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="14" y1="12" x2="26" y2="12" stroke="#9d4edd" strokeWidth="1.5" />
                <line x1="14" y1="20" x2="26" y2="20" stroke="#9d4edd" strokeWidth="1.5" />
                <line x1="14" y1="28" x2="26" y2="28" stroke="#9d4edd" strokeWidth="1.5" />
              </>
            )}
            {condition === 'caries' && (
              <circle cx="20" cy="20" r="6" fill="var(--color-error)" opacity="0.5" />
            )}
            {condition === 'filled' && (
              <rect x="12" y="12" width="16" height="16" rx="3" fill="var(--color-secondary)" opacity="0.4" />
            )}
            {condition === 'fracture' && (
              <path d="M20 6 L16 16 L22 16 L18 34" fill="none" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {condition === 'bridge' && (
              <path d="M4 20 Q20 10 36 20" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
            )}
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
