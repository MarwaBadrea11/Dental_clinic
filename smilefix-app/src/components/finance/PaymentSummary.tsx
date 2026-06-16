import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CreditCard, Banknote, Building2, FileCheck, CheckCircle2 } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import type { Payment, PaymentMethod } from '@/types'

interface PaymentSummaryProps {
  payments: Payment[]
  delay?: number
  className?: string
}

// Styles only — labels are built inside the component via t()
const methodStyles: Record<PaymentMethod, { icon: React.ReactNode; color: string; bg: string }> = {
  cash:           { icon: <Banknote size={15} />,    color: 'text-[var(--color-secondary)]', bg: 'bg-[var(--color-secondary-container)]/20' },
  card:           { icon: <CreditCard size={15} />,  color: 'text-[var(--color-primary)]',   bg: 'bg-[var(--color-primary-container)]/20' },
  insurance:      { icon: <FileCheck size={15} />,   color: 'text-[var(--color-tertiary)]',  bg: 'bg-[var(--color-tertiary-container)]/20' },
  'bank-transfer':{ icon: <Building2 size={15} />,   color: 'text-purple-600',               bg: 'bg-purple-100' },
  check:          { icon: <CheckCircle2 size={15} />, color: 'text-amber-600',               bg: 'bg-amber-100' },
}

export function PaymentSummary({ payments, delay = 0, className }: PaymentSummaryProps) {
  const { t } = useTranslation()

  const methodLabels: Record<PaymentMethod, string> = {
    cash:           t('finance.cash'),
    card:           t('finance.card'),
    insurance:      t('finance.insurance'),
    'bank-transfer':t('finance.bankTransfer'),
    check:          t('finance.check'),
  }

  // Group by method
  const byMethod = payments.reduce<Record<string, { count: number; total: number }>>((acc, p) => {
    if (!acc[p.method]) acc[p.method] = { count: 0, total: 0 }
    acc[p.method].count++
    acc[p.method].total += p.amount
    return acc
  }, {})

  const grandTotal = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <SectionCard title={t('finance.paymentMethods')} icon={<CreditCard size={15} />} delay={delay} className={className}>
      <div className="space-y-3">
        {Object.entries(byMethod).map(([method, data], i) => {
          const cfg = methodStyles[method as PaymentMethod]
          // Guard: if a payment method comes back from the server that isn't in our
          // styles map (e.g. a future method or a casing mismatch), skip it gracefully
          // instead of crashing with "Cannot read properties of undefined" (minified: "a is not a function")
          if (!cfg) return null
          const label = methodLabels[method as PaymentMethod] ?? method
          const pct = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0
          return (
            <motion.div
              key={method}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: delay + i * 0.06 }}
              className="flex items-center gap-3"
            >
              <div className={cn('w-8 h-8 rounded-[var(--radius-DEFAULT)] flex items-center justify-center shrink-0', cfg.bg, cfg.color)}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--color-on-surface)]">{label}</span>
                  <span className="text-xs font-bold text-[var(--color-on-surface)]">{formatCurrency(data.total)}</span>
                </div>
                <div className="w-full bg-[var(--color-surface-container-high)] h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: delay + i * 0.06 + 0.2 }}
                    className={cn('h-full rounded-full', cfg.color.replace('text-', 'bg-'))}
                  />
                </div>
              </div>
              <span className="text-[11px] text-[var(--color-on-surface-variant)] shrink-0 w-8 text-right">
                {Math.round(pct)}%
              </span>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/15 flex items-center justify-between">
        <span className="text-xs text-[var(--color-on-surface-variant)]">{payments.length} {t('finance.totalPayments')}</span>
        <span className="text-sm font-bold text-[var(--color-primary)]">{formatCurrency(grandTotal)}</span>
      </div>
    </SectionCard>
  )
}
