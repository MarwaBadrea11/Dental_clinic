import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import type { InventoryItem } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RestockOrderModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem
  onConfirm: (itemId: string, quantity: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RestockOrderModal({ open, onClose, item, onConfirm }: RestockOrderModalProps) {
  const { t } = useTranslation()

  // Default suggested quantity: fill up to maxStock, minimum 1
  const suggested = Math.max(1, (item.maxStock ?? item.minStock * 3) - item.quantity)
  const [qty, setQty] = useState(String(suggested))
  const [qtyError, setQtyError] = useState('')
  const [ordered, setOrdered] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = () => {
    const n = Number(qty)
    if (!qty || n <= 0 || !Number.isInteger(n)) {
      setQtyError(t('common.required') ?? 'Required')
      return
    }
    setQtyError('')
    setLoading(true)

    // Simulate a brief async dispatch
    setTimeout(() => {
      onConfirm(item.id, n)
      setLoading(false)
      setOrdered(true)
    }, 600)
  }

  const handleClose = () => {
    // Reset local state when modal is closed
    setQty(String(suggested))
    setQtyError('')
    setOrdered(false)
    setLoading(false)
    onClose()
  }

  const statusColor =
    item.status === 'out-of-stock' ? 'var(--color-error)' :
    item.status === 'low-stock'    ? 'var(--color-tertiary)' :
    'var(--color-secondary)'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={ordered ? (t('inventory.orderPlaced') ?? 'Order Placed') : (t('inventory.orderStock') ?? 'Order Stock')}
      size="md"
    >
      {ordered ? (
        /* ── Success state ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center gap-4 py-4 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[var(--color-secondary-container)]/20 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-[var(--color-secondary)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--color-on-surface)] text-base">
              {t('inventory.orderConfirmed') ?? 'Order Confirmed'}
            </p>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              {qty} × <span className="font-semibold">{item.name}</span>{' '}
              {t('inventory.orderSentTo') ?? 'has been sent to'}{' '}
              <span className="font-semibold">{item.supplierName ?? 'supplier'}</span>.
            </p>
          </div>
          <div className="w-full bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-1">
              {t('inventory.estimatedDelivery') ?? 'Estimated Delivery'}
            </p>
            <p className="text-sm font-semibold text-[var(--color-on-surface)]">
              {/* 3–5 business days from today */}
              {new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button onClick={handleClose} className="w-full mt-1">
            {t('common.close') ?? 'Close'}
          </Button>
        </motion.div>
      ) : (
        /* ── Order form ── */
        <div className="space-y-4">
          {/* Item summary card */}
          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-[var(--radius-DEFAULT)] border',
              item.status === 'out-of-stock'
                ? 'bg-[var(--color-error-container)]/10 border-[var(--color-error)]/30'
                : 'bg-[var(--color-tertiary-container)]/10 border-[var(--color-tertiary)]/30'
            )}
          >
            <div
              className="w-10 h-10 rounded-[var(--radius-DEFAULT)] flex items-center justify-center shrink-0"
              style={{ background: `${statusColor}18` }}
            >
              <Package size={20} style={{ color: statusColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">{item.name}</p>
              {item.sku && (
                <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">SKU: {item.sku}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: statusColor }}>
                  {item.status === 'out-of-stock'
                    ? (t('inventory.outOfStock') ?? 'Out of Stock')
                    : (t('inventory.lowStock') ?? 'Low Stock')}
                </span>
                <span className="text-[11px] text-[var(--color-on-surface-variant)]">
                  {t('inventory.currentStock') ?? 'Current'}: <strong>{item.quantity} {item.unit}</strong>
                </span>
                <span className="text-[11px] text-[var(--color-on-surface-variant)]">
                  {t('inventory.minStock') ?? 'Min'}: <strong>{item.minStock} {item.unit}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Supplier info */}
          {item.supplierName && (
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-[var(--color-on-surface-variant)]">
                {t('inventory.supplier') ?? 'Supplier'}
              </span>
              <span className="font-semibold text-[var(--color-on-surface)]">{item.supplierName}</span>
            </div>
          )}

          {/* Unit price */}
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-[var(--color-on-surface-variant)]">
              {t('inventory.unitPrice') ?? 'Unit Price'}
            </span>
            <span className="font-semibold text-[var(--color-secondary)]">
              ${item.price.toFixed(2)} / {item.unit}
            </span>
          </div>

          {/* Quantity input */}
          <FormField
            label={`${t('inventory.quantityToOrder') ?? 'Quantity to Order'} (${item.unit})`}
            required
            error={qtyError}
          >
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => {
                setQty(e.target.value)
                setQtyError('')
              }}
              placeholder={String(suggested)}
            />
          </FormField>

          {/* Estimated total */}
          {qty && Number(qty) > 0 && (
            <div className="flex items-center justify-between bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] px-4 py-3">
              <span className="text-sm text-[var(--color-on-surface-variant)]">
                {t('inventory.estimatedTotal') ?? 'Estimated Total'}
              </span>
              <span className="text-base font-bold text-[var(--color-primary)]">
                ${(Number(qty) * item.price).toFixed(2)}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-outline-variant)]/15">
            <Button variant="ghost" onClick={handleClose}>
              {t('common.cancel') ?? 'Cancel'}
            </Button>
            <Button onClick={handleConfirm} loading={loading} leftIcon={<Package size={14} />}>
              {t('inventory.placeOrder') ?? 'Place Order'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
