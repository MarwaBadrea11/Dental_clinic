import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'

export interface PatientRow {
  id: string
  name: string
  lastVisit: string
  treatment: string
  status: 'completed' | 'scheduled' | 'active' | 'cancelled' | 'pending'
  avatar?: string
}

interface AppointmentSummaryProps {
  patients: PatientRow[]
  title?: string
  onViewAll?: () => void
  delay?: number
  className?: string
}

const statusVariant = {
  completed: 'success',
  scheduled: 'primary',
  active:    'secondary',
  cancelled: 'error',
  pending:   'warning',
} as const

export function AppointmentSummary({
  patients, title, onViewAll, delay = 0, className,
}: AppointmentSummaryProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('dashboard.recentPatients')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      <Card padding="none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/20 flex items-center justify-between">
          <h3 className="font-semibold text-[var(--color-on-surface)]">{resolvedTitle}</h3>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>{t('common.viewAll')}</Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-surface-container-low)]">
              <tr>
                {[
                  t('common.patient'),
                  t('patients.lastVisit'),
                  t('patients.treatment'),
                  t('common.status'),
                  '',
                ].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-outline-variant)]/10">
              {patients.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: delay + i * 0.05 }}
                  className="hover:bg-[var(--color-surface-container-high)] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} src={p.avatar} size="sm" />
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)]">{p.name}</p>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">ID: {p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{p.lastVisit}</td>
                  <td className="px-6 py-4">
                    <Badge variant="primary" size="sm">{p.treatment}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[p.status]} dot size="sm">
                      {t(`status.${p.status === 'active' ? 'active' : p.status === 'completed' ? 'completed' : p.status === 'scheduled' ? 'scheduled' : p.status === 'cancelled' ? 'cancelled' : 'pending'}`)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="xs">{t('common.view')}</Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  )
}
