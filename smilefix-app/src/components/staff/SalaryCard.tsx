import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { DollarSign, TrendingUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import type { StaffMember } from '@/types'

interface SalaryCardProps {
  member: StaffMember
  delay?: number
  className?: string
}

export function SalaryCard({ member: m, delay = 0, className }: SalaryCardProps) {
  const { t } = useTranslation()
  const fullName = `${m.firstName} ${m.lastName}`
  const salary = m.salary ?? 0
  const annual = salary * 12

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'p-4', className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={fullName} src={m.avatar} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">{fullName}</p>
          <p className="text-[11px] text-[var(--color-on-surface-variant)] capitalize">{m.role}</p>
        </div>
        <div className="w-8 h-8 rounded-[var(--radius-DEFAULT)] bg-[var(--color-secondary-container)]/20 flex items-center justify-center text-[var(--color-secondary)]">
          <DollarSign size={14} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-2">
          <p className="text-[10px] text-[var(--color-on-surface-variant)] mb-0.5">{t('staff.monthly')}</p>
          <p className="text-sm font-bold text-[var(--color-secondary)]">{formatCurrency(salary)}</p>
        </div>
        <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-2">
          <p className="text-[10px] text-[var(--color-on-surface-variant)] mb-0.5">{t('staff.annual')}</p>
          <p className="text-sm font-bold text-[var(--color-on-surface)]">{formatCurrency(annual)}</p>
        </div>
      </div>
    </motion.div>
  )
}
