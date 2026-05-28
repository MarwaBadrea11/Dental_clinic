import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Stethoscope, FileText, Pill, ScanLine, CalendarDays, ClipboardList,
  Paperclip, DollarSign,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatDate, formatCurrency } from '@/utils/format'
import type { MedicalHistoryEntry } from '@/types'

interface MedicalTimelineProps {
  entries: MedicalHistoryEntry[]
  className?: string
}

type EntryType = MedicalHistoryEntry['type']

const typeIcons: Record<EntryType, { icon: React.ReactNode; color: string; bg: string }> = {
  treatment:   { icon: <Stethoscope size={15} />, color: 'text-[var(--color-primary)]',   bg: 'bg-[var(--color-primary-container)]/20' },
  diagnosis:   { icon: <ClipboardList size={15} />, color: 'text-[var(--color-tertiary)]', bg: 'bg-[var(--color-tertiary-container)]/20' },
  prescription:{ icon: <Pill size={15} />,          color: 'text-[var(--color-secondary)]',bg: 'bg-[var(--color-secondary-container)]/20' },
  note:        { icon: <FileText size={15} />,      color: 'text-[var(--color-outline)]',  bg: 'bg-[var(--color-surface-container-high)]' },
  xray:        { icon: <ScanLine size={15} />,      color: 'text-[var(--color-tertiary)]', bg: 'bg-[var(--color-tertiary-container)]/20' },
  appointment: { icon: <CalendarDays size={15} />,  color: 'text-[var(--color-primary)]',  bg: 'bg-[var(--color-primary-container)]/20' },
}

const statusVariant = {
  completed: 'success', active: 'secondary', scheduled: 'primary',
  pending: 'warning', cancelled: 'error', inactive: 'neutral',
} as const

export function MedicalTimeline({ entries, className }: MedicalTimelineProps) {
  const { t } = useTranslation()

  const typeLabels: Record<EntryType, string> = {
    treatment:    t('medicalHistory.treatment'),
    diagnosis:    t('medicalHistory.diagnosis'),
    prescription: t('medicalHistory.prescription'),
    note:         t('medicalHistory.note'),
    xray:         t('medicalHistory.xray'),
    appointment:  t('medicalHistory.appointment'),
  }

  const statusLabels: Record<string, string> = {
    completed: t('status.completed'),
    active:    t('status.active'),
    scheduled: t('status.scheduled'),
    pending:   t('status.pending'),
    cancelled: t('status.cancelled'),
    inactive:  t('status.inactive'),
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
        {t('patients.noHistory')}
      </div>
    )
  }

  // Sort newest first
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--color-outline-variant)]/30" />

      <div className="space-y-5">
        {sorted.map((entry, i) => {
          const cfg = typeIcons[entry.type]
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="relative flex gap-4"
            >
              {/* Icon dot */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10',
                'border-2 border-[var(--color-surface-container-lowest)]',
                cfg.bg, cfg.color
              )}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-md)] border border-[var(--color-outline-variant)]/15 p-4 shadow-[var(--shadow-card)]">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="neutral" size="sm">{typeLabels[entry.type]}</Badge>
                        {entry.status && (
                          <Badge variant={statusVariant[entry.status] ?? 'neutral'} dot size="sm">
                            {statusLabels[entry.status] ?? entry.status}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-[var(--color-on-surface)] mt-1.5">
                        {entry.title}
                      </h4>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                        {formatDate(entry.date)}
                      </p>
                      <p className="text-[11px] text-[var(--color-outline)] mt-0.5">{entry.doctor}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                    {entry.description}
                  </p>

                  {/* Footer: cost + attachments */}
                  {(entry.cost !== undefined || (entry.attachments && entry.attachments.length > 0)) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-outline-variant)]/10">
                      {entry.cost !== undefined && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-secondary)]">
                          <DollarSign size={11} />
                          {formatCurrency(entry.cost)}
                        </span>
                      )}
                      {entry.attachments && entry.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
                          <Paperclip size={11} />
                          {entry.attachments.length} {entry.attachments.length > 1 ? t('medicalHistory.attachments') : t('medicalHistory.attachment')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
