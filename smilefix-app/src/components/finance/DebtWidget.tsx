import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, User } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard'
import { Avatar } from '@/components/ui/Avatar'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Invoice } from '@/types'

interface DebtWidgetProps {
  invoices: Invoice[]
  title?: string
  delay?: number
  className?: string
  onViewInvoice?: (inv: Invoice) => void
}

export function DebtWidget({ invoices, title, delay = 0, className, onViewInvoice }: DebtWidgetProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('finance.outstandingDebts')
  const debtInvoices = invoices
    .filter((i) => i.status === 'overdue' || i.status === 'partial' || i.status === 'pending')
    .sort((a, b) => (b.total - b.paid) - (a.total - a.paid))
    .slice(0, 6)

  const totalDebt = debtInvoices.reduce((s, i) => s + (i.total - i.paid), 0)

  return (
    <SectionCard
      title={resolvedTitle}
      icon={<AlertTriangle size={15} />}
      subtitle={`${formatCurrency(totalDebt)} ${t('finance.outstanding')}`}
      delay={delay}
      className={className}
    >
      {debtInvoices.length === 0 ? (
        <p className="text-sm text-[var(--color-secondary)] text-center py-4 font-medium">
          ✓ {t('finance.noOutstandingDebts')}
        </p>
      ) : (
        <div className="space-y-3">
          {debtInvoices.map((inv, i) => {
            const outstanding = inv.total - inv.paid
            const daysPast = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: delay + i * 0.06 }}
                onClick={() => onViewInvoice?.(inv)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-[var(--radius-DEFAULT)]',
                  'bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/10',
                  'transition-colors duration-150',
                  onViewInvoice && 'cursor-pointer hover:bg-[var(--color-surface-container-high)]'
                )}
              >
                <Avatar name={inv.patientName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-on-surface)] truncate">{inv.patientName}</p>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)]">
                    {inv.invoiceNumber} · {t('finance.dueDate')} {formatDate(inv.dueDate)}
                    {daysPast > 0 && <span className="text-[var(--color-error)] ml-1">({daysPast}{t('inventory.daysOverdue')})</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[var(--color-error)]">{formatCurrency(outstanding)}</p>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
