import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Package, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import type { InventoryItem } from '@/types'

interface InventoryStatsProps {
  items: InventoryItem[]
  delay?: number
  className?: string
}

export function InventoryStats({ items, delay = 0, className }: InventoryStatsProps) {
  const { t } = useTranslation()
  const inStock    = items.filter((i) => i.status === 'in-stock').length
  const lowStock   = items.filter((i) => i.status === 'low-stock').length
  const outOfStock = items.filter((i) => i.status === 'out-of-stock').length
  const expired    = items.filter((i) => i.status === 'expired').length
  const totalValue = items.reduce((s, i) => s + i.quantity * (i.costPrice ?? i.price), 0)

  const stats = [
    { label: t('inventory.inStock'),    value: inStock,    icon: <Package size={18} />,      color: 'text-[var(--color-secondary)]',  bg: 'bg-[var(--color-secondary-container)]/20', glow: '' },
    { label: t('inventory.lowStock'),   value: lowStock,   icon: <AlertTriangle size={18} />, color: 'text-amber-600',                 bg: 'bg-amber-100',                             glow: '' },
    { label: t('inventory.outOfStock'), value: outOfStock, icon: <XCircle size={18} />,       color: 'text-[var(--color-error)]',      bg: 'bg-[var(--color-error-container)]',        glow: 'shadow-[0_0_16px_rgba(186,26,26,0.1)]' },
    { label: t('inventory.expired'),    value: expired,    icon: <Clock size={18} />,         color: 'text-[var(--color-on-surface-variant)]', bg: 'bg-[var(--color-surface-container-high)]', glow: '' },
  ]

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: delay + i * 0.07 }}
          className={cn(
            'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
            'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
            s.glow, 'p-4'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              {s.label}
            </p>
            <div className={cn('w-8 h-8 rounded-[var(--radius-DEFAULT)] flex items-center justify-center', s.bg, s.color)}>
              {s.icon}
            </div>
          </div>
          <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
        </motion.div>
      ))}

      {/* Total value card — spans full width on mobile, 4 cols on lg */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay + 0.28 }}
        className={cn(
          'col-span-2 lg:col-span-4',
          'bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-lg)]',
          'border border-[var(--color-outline-variant)]/20 shadow-[var(--shadow-card)]',
          'p-4 flex items-center justify-between'
        )}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            {t('inventory.totalValue')}
          </p>
          <p className="text-2xl font-bold text-[var(--color-primary)] mt-0.5">{formatCurrency(totalValue)}</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--color-on-surface)]">{items.length}</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{t('inventory.totalItems')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--color-on-surface)]">
              {new Set(items.map((i) => i.category)).size}
            </p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{t('treatments.categories')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--color-on-surface)]">
              {new Set(items.map((i) => i.supplierName).filter(Boolean)).size}
            </p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">{t('inventory.suppliers')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
