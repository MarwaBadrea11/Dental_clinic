import { motion } from 'framer-motion'
import { FileText, Calendar, User, ChevronRight } from 'lucide-react'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { cn } from '@/utils/cn'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Invoice } from '@/types'

interface InvoiceCardProps {
  invoice: Invoice
  onClick?: (inv: Invoice) => void
  delay?: number
  className?: string
}

export function InvoiceCard({ invoice: inv, onClick, delay = 0, className }: InvoiceCardProps) {
  const outstanding = inv.total - inv.paid
  const paidPct = inv.total > 0 ? (inv.paid / inv.total) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      onClick={() => onClick?.(inv)}
      className={cn(
        'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
        'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
        'p-5 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[var(--radius-DEFAULT)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
            <FileText size={16} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--color-on-surface)]">{inv.invoiceNumber}</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{inv.patientCode}</p>
          </div>
        </div>
        <InvoiceStatusBadge status={inv.status} />
      </div>

      {/* Patient + dates */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
          <User size={11} className="text-[var(--color-outline)] shrink-0" />
          {inv.patientName}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
          <Calendar size={11} className="text-[var(--color-outline)] shrink-0" />
          Due: {formatDate(inv.dueDate)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-[var(--color-on-surface-variant)]">Paid: {formatCurrency(inv.paid)}</span>
          <span className="font-semibold text-[var(--color-on-surface)]">{formatCurrency(inv.total)}</span>
        </div>
        <div className="w-full bg-[var(--color-surface-container-high)] h-1.5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${paidPct}%` }}
            transition={{ duration: 0.7, delay: delay + 0.2 }}
            className={cn(
              'h-full rounded-full',
              inv.status === 'paid' ? 'bg-[var(--color-secondary)]' :
              inv.status === 'overdue' ? 'bg-[var(--color-error)]' :
              'bg-[var(--color-primary)]'
            )}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-outline-variant)]/15">
        {outstanding > 0 ? (
          <span className="text-xs font-semibold text-[var(--color-error)]">
            Outstanding: {formatCurrency(outstanding)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-[var(--color-secondary)]">Fully paid ✓</span>
        )}
        {onClick && <ChevronRight size={14} className="text-[var(--color-outline)]" />}
      </div>
    </motion.div>
  )
}
