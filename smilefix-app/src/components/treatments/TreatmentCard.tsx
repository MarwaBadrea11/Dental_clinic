import { motion } from 'framer-motion'
import { Clock, DollarSign, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProcedureBadge } from './ProcedureBadge'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import type { Treatment } from '@/types'

interface TreatmentCardProps {
  treatment: Treatment
  onClick?: (t: Treatment) => void
  selected?: boolean
  delay?: number
  className?: string
}

export function TreatmentCard({ treatment: t, onClick, selected, delay = 0, className }: TreatmentCardProps) {
  const { t: i18n } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      onClick={() => onClick?.(t)}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border shadow-[var(--shadow-card)] p-5 transition-all duration-200',
        selected
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
          : 'border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary)]/30',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Icon + category */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xl shadow-sm"
          style={{ background: `${t.color}20`, border: `1px solid ${t.color}30` }}
        >
          {t.icon ?? '🦷'}
        </div>
        <ProcedureBadge category={t.category} />
      </div>

      {/* Name */}
      <h3 className="font-semibold text-sm text-[var(--color-on-surface)] mb-1 leading-tight">{t.name}</h3>
      {t.description && (
        <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed line-clamp-2 mb-3">{t.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-outline-variant)]/15">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
            <Clock size={11} className="text-[var(--color-outline)]" />
            {t.duration}{i18n('treatments.minutes')}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)]">
            <DollarSign size={11} />
            {formatCurrency(t.price)}
          </span>
        </div>
        {onClick && <ChevronRight size={14} className="text-[var(--color-outline)]" />}
      </div>
    </motion.div>
  )
}
