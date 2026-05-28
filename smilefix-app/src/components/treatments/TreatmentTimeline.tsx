import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProcedureBadge } from './ProcedureBadge'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatDate, formatCurrency } from '@/utils/format'
import type { PatientTreatment } from '@/types'

interface TreatmentTimelineProps {
  treatments: PatientTreatment[]
  className?: string
}

const statusConfig = {
  planned:     { icon: <Circle size={14} />,       color: 'text-[var(--color-on-surface-variant)]', line: 'border-[var(--color-outline-variant)]', badge: 'neutral' as const },
  'in-progress':{ icon: <Clock size={14} />,        color: 'text-amber-600',                         line: 'border-amber-400',                       badge: 'warning' as const },
  completed:   { icon: <CheckCircle2 size={14} />, color: 'text-[var(--color-secondary)]',           line: 'border-[var(--color-secondary)]',         badge: 'success' as const },
  cancelled:   { icon: <Circle size={14} />,       color: 'text-[var(--color-error)]',               line: 'border-[var(--color-error)]',             badge: 'error' as const },
}

export function TreatmentTimeline({ treatments, className }: TreatmentTimelineProps) {
  const { t } = useTranslation()

  if (treatments.length === 0) {
    return <p className="text-sm text-[var(--color-on-surface-variant)] py-6 text-center">{t('patients.noTreatments')}</p>
  }

  const sorted = [...treatments].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-[17px] top-0 bottom-0 w-px bg-[var(--color-outline-variant)]/30" />
      <div className="space-y-5">
        {sorted.map((pt, i) => {
          const cfg = statusConfig[pt.status]
          return (
            <motion.div
              key={pt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.06 }}
              className="relative flex gap-4"
            >
              {/* Icon */}
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10',
                'bg-[var(--color-surface-container-lowest)] border-2',
                cfg.line, cfg.color
              )}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div className="flex-1 bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-md)] border border-[var(--color-outline-variant)]/15 p-4 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <ProcedureBadge category={pt.category} />
                      <Badge variant={cfg.badge} dot size="sm">
                        {pt.status === 'in-progress' ? t('status.inProgress') : t(`status.${pt.status}`)}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-[var(--color-on-surface)]">{pt.treatmentName}</h4>
                    {pt.toothNumbers && pt.toothNumbers.length > 0 && (
                      <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
                        {pt.toothNumbers.length > 1 ? t('patients.teeth') : t('patients.tooth')}: #{pt.toothNumbers.join(', #')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{formatDate(pt.startDate)}</p>
                    <p className="text-[11px] text-[var(--color-outline)]">{pt.doctor}</p>
                  </div>
                </div>

                {pt.notes && (
                  <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed mb-2">{pt.notes}</p>
                )}

                {/* Sessions */}
                {pt.sessions && pt.sessions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--color-outline-variant)]/10 space-y-1">
                    {pt.sessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[11px] text-[var(--color-on-surface-variant)]">
                        <CheckCircle2 size={10} className="text-[var(--color-secondary)] shrink-0" />
                        <span>{formatDate(s.date)}</span>
                        <span className="text-[var(--color-outline)]">·</span>
                        <span className="truncate">{s.notes}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--color-outline-variant)]/10">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)]">
                    <DollarSign size={11} />{formatCurrency(pt.cost)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
