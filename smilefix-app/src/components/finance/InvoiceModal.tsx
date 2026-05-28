import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer, Download, DollarSign, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { formatDate, formatCurrency } from '@/utils/format'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types'

// ── View Modal ────────────────────────────────────────────────────────────────

interface InvoiceViewModalProps {
  invoice: Invoice | null
  open: boolean
  onClose: () => void
  onStatusChange?: (id: string, status: InvoiceStatus) => void
  onRecordPayment?: (invoiceId: string, amount: number, method: PaymentMethod) => void
}

export function InvoiceViewModal({ invoice: inv, open, onClose, onStatusChange, onRecordPayment }: InvoiceViewModalProps) {
  const { t } = useTranslation()
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [showPayForm, setShowPayForm] = useState(false)

  // Built inside component so labels re-render on language change
  const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
    { value: 'draft',   label: t('status.draft') },
    { value: 'pending', label: t('status.pending') },
    { value: 'paid',    label: t('status.paid') },
    { value: 'partial', label: t('status.partial') },
    { value: 'overdue', label: t('status.overdue') },
  ]

  const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
    { value: 'cash',          label: t('finance.cash') },
    { value: 'card',          label: t('finance.card') },
    { value: 'insurance',     label: t('finance.insurance') },
    { value: 'bank-transfer', label: t('finance.bankTransfer') },
    { value: 'check',         label: t('finance.check') },
  ]

  if (!inv) return null

  const outstanding = inv.total - inv.paid

  const handleRecordPayment = () => {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    onRecordPayment?.(inv.id, amount, payMethod)
    setPayAmount('')
    setShowPayForm(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="xl">
      {/* Invoice header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--color-primary-container)]/20 flex items-center justify-center text-[var(--color-primary)]">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-on-surface)]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {inv.invoiceNumber}
            </h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">{inv.patientName} · {inv.patientCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={inv.status} size="md" />
          <button className="p-1.5 rounded-[var(--radius-DEFAULT)] text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] transition-colors" aria-label={t('common.print')}>
            <Printer size={16} />
          </button>
          <button className="p-1.5 rounded-[var(--radius-DEFAULT)] text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] transition-colors" aria-label={t('common.download')}>
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: t('finance.invoiceDate'), value: formatDate(inv.date) },
          { label: t('finance.dueDate'),     value: formatDate(inv.dueDate) },
          { label: t('finance.createdBy'),   value: inv.createdBy ?? '—' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-0.5">{item.label}</p>
            <p className="text-sm font-medium text-[var(--color-on-surface)]">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Line items */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-2">{t('finance.lineItems')}</p>
        <div className="border border-[var(--color-outline-variant)]/20 rounded-[var(--radius-md)] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-surface-container-low)]">
              <tr>
                {[t('common.description'), t('common.quantity'), t('finance.unitPrice'), t('common.total')].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-outline-variant)]/10">
              {inv.items.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--color-surface-container-high)] transition-colors">
                  <td className="px-4 py-3 text-sm text-[var(--color-on-surface)]">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--color-on-surface)]">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-5">
        <div className="w-full sm:w-64 space-y-2">
          {[
            { label: t('finance.subtotal'), value: formatCurrency(inv.total + (inv.discount ?? 0)) },
            ...(inv.discount ? [{ label: t('finance.discount'), value: `-${formatCurrency(inv.discount)}` }] : []),
            ...(inv.tax      ? [{ label: t('finance.tax'),      value: formatCurrency(inv.tax) }]          : []),
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-on-surface-variant)]">{row.label}</span>
              <span className="text-[var(--color-on-surface)]">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-outline-variant)]/20">
            <span className="font-bold text-[var(--color-on-surface)]">{t('common.total')}</span>
            <span className="font-bold text-lg text-[var(--color-primary)]">{formatCurrency(inv.total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-secondary)]">{t('common.paid')}</span>
            <span className="text-sm font-semibold text-[var(--color-secondary)]">{formatCurrency(inv.paid)}</span>
          </div>
          {outstanding > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-error)]">{t('finance.outstanding')}</span>
              <span className="text-sm font-bold text-[var(--color-error)]">{formatCurrency(outstanding)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-1">{t('common.notes')}</p>
          <p className="text-sm text-[var(--color-on-surface-variant)]">{inv.notes}</p>
        </div>
      )}

      {/* Record payment form */}
      {showPayForm && outstanding > 0 && (
        <div className="bg-[var(--color-primary-container)]/10 border border-[var(--color-primary)]/20 rounded-[var(--radius-md)] p-4 mb-4">
          <p className="text-sm font-semibold text-[var(--color-on-surface)] mb-3">{t('finance.recordPayment')}</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('common.amount')}>
              <Input
                type="number"
                placeholder={`${t('finance.maxAmount')}: ${formatCurrency(outstanding)}`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </FormField>
            <FormField label={t('finance.method')}>
              <Select options={PAYMENT_METHOD_OPTIONS} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" leftIcon={<DollarSign size={13} />} onClick={handleRecordPayment}>
              {t('finance.confirmPayment')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPayForm(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <div className="flex items-center gap-2">
          {onStatusChange && (
            <Select
              options={STATUS_OPTIONS}
              value={inv.status}
              onChange={(e) => onStatusChange(inv.id, e.target.value as InvoiceStatus)}
              fullWidth={false}
              className="text-xs py-1.5"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {outstanding > 0 && !showPayForm && (
            <Button variant="outline" size="sm" leftIcon={<DollarSign size={13} />} onClick={() => setShowPayForm(true)}>
              {t('finance.recordPayment')}
            </Button>
          )}
          <Button size="sm" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Create Invoice Modal ──────────────────────────────────────────────────────

interface InvoiceFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (inv: Omit<Invoice, 'id'>) => void
  patients?: { id: string; name: string; code: string }[]
}

export function InvoiceFormModal({ open, onClose, onSave, patients = [] }: InvoiceFormModalProps) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const dueDefault = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const [patientName, setPatientName] = useState('')
  const [patientCode, setPatientCode] = useState('')
  const [date, setDate] = useState(today)
  const [dueDate, setDueDate] = useState(dueDefault)
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [items, setItems] = useState<Invoice['items']>([])
  const [notes, setNotes] = useState('')

  const addItem = () => {
    if (!description || !unitPrice) return
    const q = parseInt(qty) || 1
    const u = parseFloat(unitPrice) || 0
    setItems((prev) => [...prev, { id: `li${Date.now()}`, description, quantity: q, unitPrice: u, total: q * u }])
    setDescription(''); setQty('1'); setUnitPrice('')
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const total = items.reduce((s, i) => s + i.total, 0)

  const handleSave = () => {
    if (!patientName || items.length === 0) return
    const count = Math.floor(Math.random() * 900) + 100
    onSave({
      invoiceNumber: `INV-${new Date().getFullYear()}-${count}`,
      patientId: '', patientName, patientCode,
      date, dueDate, items, total, paid: 0,
      status: 'pending', notes,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('finance.newInvoiceTitle')}
      description={t('finance.newInvoiceDesc')}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('finance.patientName')} required>
            <Input placeholder="Sarah Miller" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </FormField>
          <FormField label={t('finance.patientCode')}>
            <Input placeholder="SF-00000" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} />
          </FormField>
          <FormField label={t('finance.invoiceDate')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label={t('finance.dueDate')}>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </div>

        {/* Line items */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-2">{t('finance.lineItems')}</p>
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-5">
              <Input placeholder={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Input type="number" placeholder={t('common.quantity')} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="col-span-3">
              <Input type="number" placeholder={t('finance.unitPrice')} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Button variant="outline" size="md" fullWidth onClick={addItem}>{t('finance.addLineItem')}</Button>
            </div>
          </div>
          {items.length > 0 && (
            <div className="border border-[var(--color-outline-variant)]/20 rounded-[var(--radius-DEFAULT)] overflow-hidden">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-outline-variant)]/10 last:border-0 text-sm">
                  <span className="flex-1 text-[var(--color-on-surface)]">{item.description}</span>
                  <span className="text-[var(--color-on-surface-variant)] mx-4">{item.quantity} × {formatCurrency(item.unitPrice)}</span>
                  <span className="font-semibold text-[var(--color-on-surface)] w-20 text-right">{formatCurrency(item.total)}</span>
                  <button onClick={() => removeItem(item.id)} className="ml-3 text-[var(--color-error)] hover:opacity-70 text-xs">✕</button>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-surface-container-low)]">
                <span className="text-sm font-bold text-[var(--color-on-surface)]">{t('common.total')}</span>
                <span className="text-sm font-bold text-[var(--color-primary)]">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <FormField label={t('common.notes')}>
          <Input placeholder={t('finance.optionalNotes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-outline-variant)]/15">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={!patientName || items.length === 0}>
            {t('finance.createInvoice')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
