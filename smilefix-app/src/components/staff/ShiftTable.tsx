import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'
import { getShiftTypeLabel, getStaffRoleLabel } from '@/i18n/staffOptions'
import type { StaffMember } from '@/types'

interface ShiftTableProps {
  staff: StaffMember[]
  delay?: number
  className?: string
}

// English keys used for data matching against workingDays store values
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const shiftColors = {
  morning:   'bg-[var(--color-primary-container)]/25 text-[var(--color-primary)]',
  afternoon: 'bg-[var(--color-secondary-container)]/25 text-[var(--color-secondary)]',
  evening:   'bg-[var(--color-tertiary-container)]/25 text-[var(--color-tertiary)]',
  'full-day':'bg-amber-100 text-amber-700',
  off:       'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]',
}

export function ShiftTable({ staff, delay = 0, className }: ShiftTableProps) {
  const { t, i18n } = useTranslation()

  // Generate locale-aware short day names (Mon=2025-01-06 is a Monday)
  const DAY_LABELS = DAY_KEYS.map((_, i) => {
    // Use a known Monday (2025-01-06) as anchor, offset by i
    const date = new Date(2025, 0, 6 + i)
    return new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(date)
  })
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-[var(--color-surface-container-low)]">
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)]/20 w-48">
              {t('nav.staff')}
            </th>
            {DAY_LABELS.map((label, i) => (
              <th key={DAY_KEYS[i]} className="px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)]/20 text-center">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-outline-variant)]/10">
          {staff.map((m, i) => (
            <motion.tr
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: delay + i * 0.04 }}
              className="hover:bg-[var(--color-surface-container-high)] transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={`${m.firstName} ${m.lastName}`} size="xs" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-on-surface)]">{m.firstName} {m.lastName}</p>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)]">{getStaffRoleLabel(t, m.role)}</p>
                  </div>
                </div>
              </td>
              {DAY_KEYS.map((d) => {
                const works = m.workingDays?.includes(d)
                const shift = works ? (m.shift ?? 'morning') : 'off'
                const cfg = shiftColors[shift]
                return (
                  <td key={d} className="px-2 py-3 text-center">
                    <span className={cn('inline-block px-2 py-0.5 rounded text-[10px] font-semibold', cfg)}>
                      {works ? getShiftTypeLabel(t, shift) : '—'}
                    </span>
                  </td>
                )
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
