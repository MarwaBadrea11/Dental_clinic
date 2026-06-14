import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'

export interface PatientRow {
  id: string
  code?: string
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
  onView?: (patientId: string) => void
  delay?: number
  className?: string
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

const statusVariant = {
  completed: 'success',
  scheduled: 'primary',
  active:    'secondary',
  cancelled: 'error',
  pending:   'warning',
} as const

export function AppointmentSummary({
  patients, title, onViewAll, onView, delay = 0, className,
}: AppointmentSummaryProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('dashboard.recentPatients')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      <Card
        padding="none"
        style={{
          borderTop: '2px solid rgba(121,213,220,0.28)',
          boxShadow: '0 0 28px 0 rgba(0,105,111,0.08), var(--shadow-card)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
              <Users size={15} />
            </div>
            <h3
              className="text-sm font-bold text-[var(--color-on-surface)]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {resolvedTitle}
            </h3>
            <span
              className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(121,213,220,0.12)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(121,213,220,0.3)',
              }}
            >
              {patients.length}
            </span>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              {t('common.viewAll')}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--color-surface-container-low)]">
                {[
                  t('common.patient'),
                  t('patients.lastVisit'),
                  t('patients.treatment'),
                  t('common.status'),
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.07, delayChildren: delay + 0.2 } },
              }}
              className="divide-y divide-[var(--color-outline-variant)]/10"
            >
              {patients.map((p) => (
                <motion.tr
                  key={p.id}
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    show:   { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO } },
                  }}
                  whileHover={{ backgroundColor: 'var(--color-surface-container-high)' }}
                  transition={{ duration: 0.15 }}
                  className="cursor-default"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <motion.div whileHover={{ scale: 1.08 }} transition={{ duration: 0.2 }}>
                        <Avatar name={p.name} src={p.avatar} size="sm" />
                      </motion.div>
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">{p.name}</p>
                        <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5">
                          ID: {p.code ?? p.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-on-surface-variant)]">{p.lastVisit}</td>
                  <td className="px-6 py-4">
                    <Badge variant="primary" size="sm">{p.treatment}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[p.status]} dot size="sm">
                      {t(`status.${p.status}`)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onView?.(p.id)}
                      className="hover:text-[var(--color-primary)] transition-colors duration-150"
                    >
                      {t('common.view')}
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  )
}
