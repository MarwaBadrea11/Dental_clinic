import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Phone, Mail, Calendar, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Patient } from '@/types'

interface PatientCardProps {
  patient: Patient
  onView?: (patient: Patient) => void
  delay?: number
  className?: string
}

export function PatientCard({ patient, onView, delay = 0, className }: PatientCardProps) {
  const { t } = useTranslation()
  const fullName = `${patient.firstName} ${patient.lastName}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'p-5 flex flex-col gap-4 cursor-pointer group',
        className
      )}
      onClick={() => onView?.(patient)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={fullName} src={patient.avatar} size="md" ring />
          <div>
            <p className="font-semibold text-sm text-[var(--color-on-surface)]">{fullName}</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">{patient.patientCode}</p>
          </div>
        </div>
        <StatusBadge status={patient.status} />
      </div>

      {/* Info rows */}
      <div className="space-y-1.5">
        {patient.phone && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
            <Phone size={12} className="shrink-0 text-[var(--color-outline)]" />
            {patient.phone}
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
            <Mail size={12} className="shrink-0 text-[var(--color-outline)]" />
            <span className="truncate">{patient.email}</span>
          </div>
        )}
        {patient.lastVisit && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
            <Calendar size={12} className="shrink-0 text-[var(--color-outline)]" />
            {t('patients.lastVisit')}: {formatDate(patient.lastVisit)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-outline-variant)]/15">
        {patient.balance !== undefined && patient.balance > 0 ? (
          <Badge variant="error" size="sm">{t('patients.owes')} {formatCurrency(patient.balance)}</Badge>
        ) : (
          <Badge variant="success" size="sm">{t('status.cleared')}</Badge>
        )}
        <span className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
          {t('common.view')} <ArrowRight size={12} />
        </span>
      </div>
    </motion.div>
  )
}
