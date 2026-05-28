import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Phone, Mail, Globe, Star, Package, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import type { Supplier } from '@/types'

interface SupplierCardProps {
  supplier: Supplier
  onClick?: (s: Supplier) => void
  delay?: number
  className?: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-outline-variant)]'}
        />
      ))}
    </div>
  )
}

export function SupplierCard({ supplier: s, onClick, delay = 0, className }: SupplierCardProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }}
      onClick={() => onClick?.(s)}
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
        <div className="flex items-center gap-3">
          {/* Avatar initials */}
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)] font-bold text-sm shrink-0">
            {s.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--color-on-surface)] leading-tight">{s.name}</p>
            {s.contactPerson && (
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">{s.contactPerson}</p>
            )}
          </div>
        </div>
        <Badge variant={s.status === 'active' ? 'success' : 'neutral'} dot size="sm">
          {s.status === 'active' ? t('status.active') : t('status.inactive')}
        </Badge>
      </div>

      {/* Category */}
      {s.category && (
        <div className="mb-3">
          <span className="px-2 py-0.5 bg-[var(--color-primary-container)]/15 text-[var(--color-primary)] text-[11px] font-semibold rounded-full">
            {s.category}
          </span>
        </div>
      )}

      {/* Contact info */}
      <div className="space-y-1.5 mb-3">
        {s.phone && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
            <Phone size={11} className="text-[var(--color-outline)] shrink-0" />
            {s.phone}
          </div>
        )}
        {s.email && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
            <Mail size={11} className="text-[var(--color-outline)] shrink-0" />
            <span className="truncate">{s.email}</span>
          </div>
        )}
        {s.website && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
            <Globe size={11} className="text-[var(--color-outline)] shrink-0" />
            {s.website}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-outline-variant)]/15">
        <div className="flex items-center gap-3">
          {s.rating !== undefined && <StarRating rating={s.rating} />}
          {s.totalOrders !== undefined && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)]">
              <Package size={10} className="text-[var(--color-outline)]" />
              {s.totalOrders} {t('inventory.orders')}
            </span>
          )}
        </div>
        {onClick && <ChevronRight size={14} className="text-[var(--color-outline)]" />}
      </div>
    </motion.div>
  )
}
