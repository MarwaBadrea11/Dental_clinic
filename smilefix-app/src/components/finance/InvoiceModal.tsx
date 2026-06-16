import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer, Download, DollarSign, FileText, User } from 'lucide-react'
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
  autoOpenPayForm?: boolean
}

export function InvoiceViewModal({ invoice: inv, open, onClose, onStatusChange, onRecordPayment, autoOpenPayForm = false }: InvoiceViewModalProps) {
  const { t } = useTranslation()
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [showPayForm, setShowPayForm] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Pre-open the payment form when autoOpenPayForm is set (e.g. from "Mark as Paid" action)
  useEffect(() => {
    if (open && autoOpenPayForm) setShowPayForm(true)
    if (!open) setShowPayForm(false)
  }, [open, autoOpenPayForm])

  const handleDownload = async () => {
    if (!inv) return
    setIsDownloading(true)
    try {
      // ── Palette (safe hex — no CSS variables or oklab) ───────────────────
      const C = {
        bg:          '#ffffff',
        surface:     '#f5f5f5',
        border:      '#e0e0e0',
        primary:     '#0d9488',   // teal
        text:        '#1c1c1e',
        muted:       '#6b7280',
        error:       '#dc2626',
        secondary:   '#0891b2',
        headerBg:    '#f0fdf9',
      }

      const W = 680
      const PAD = 40
      const COL_W = W - PAD * 2

      // ── Measure text height helpers ──────────────────────────────────────
      // We'll do a two-pass render: first calc height, then draw.
      const LINE_H = 22
      const ITEM_ROW_H = 32

      const itemCount = inv.items.length
      const H =
        PAD +          // top padding
        56 +           // header (logo + invoice number row)
        16 +           // gap
        72 +           // 3-column info row
        16 +           // gap
        24 +           // "LINE ITEMS" label
        8  +           // gap
        38 +           // table header
        itemCount * ITEM_ROW_H +
        1  +           // border
        72 +           // totals block
        (inv.notes ? 60 : 0) +
        PAD            // bottom padding

      const canvas = document.createElement('canvas')
      const DPR = 2
      canvas.width  = W * DPR
      canvas.height = H * DPR
      const ctx = canvas.getContext('2d')!
      ctx.scale(DPR, DPR)

      // ── Helpers ──────────────────────────────────────────────────────────
      const rect = (x: number, y: number, w: number, h: number, r = 0, fill = C.bg, stroke?: string) => {
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, r)
        ctx.fillStyle = fill
        ctx.fill()
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
      }
      const text = (str: string, x: number, y: number, { size = 13, color = C.text, weight = 'normal', align = 'left' as CanvasTextAlign } = {}) => {
        ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`
        ctx.fillStyle = color
        ctx.textAlign = align
        ctx.fillText(str, x, y)
      }
      const line = (x1: number, y1: number, x2: number, y2: number, color = C.border) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke()
      }

      // ── Background ───────────────────────────────────────────────────────
      rect(0, 0, W, H, 0, C.bg)

      let y = PAD

      // ── Header row ───────────────────────────────────────────────────────
      // Logo box
      rect(PAD, y, 44, 44, 8, C.headerBg)
      ctx.font = 'bold 20px Inter, system-ui, sans-serif'
      ctx.fillStyle = C.primary
      ctx.textAlign = 'center'
      ctx.fillText('☆', PAD + 22, y + 29)

      // Invoice number + patient
      text(inv.invoiceNumber, PAD + 56, y + 16, { size: 16, weight: 'bold' })
      text(`${inv.patientName}${inv.patientCode ? ' · ' + inv.patientCode : ''}`, PAD + 56, y + 36, { size: 12, color: C.muted })

      // Status badge (top-right)
      const statusColors: Record<string, string> = {
        paid: '#16a34a', pending: '#d97706', overdue: '#dc2626',
        partial: '#2563eb', draft: '#6b7280', cancelled: '#6b7280',
      }
      const badgeColor = statusColors[inv.status] ?? C.muted
      const statusLabel = inv.status.charAt(0).toUpperCase() + inv.status.slice(1)
      ctx.font = 'bold 11px Inter, system-ui, sans-serif'
      const bW = ctx.measureText(statusLabel).width + 20
      rect(W - PAD - bW, y + 10, bW, 22, 11, badgeColor + '22')
      text(statusLabel, W - PAD - bW / 2, y + 25, { size: 11, weight: 'bold', color: badgeColor, align: 'center' })

      y += 56

      // ── Info cards row ───────────────────────────────────────────────────
      const cardW = (COL_W - 16) / 3
      const cards = [
        { label: 'INVOICE DATE', value: formatDate(inv.date) },
        { label: 'DUE DATE',     value: formatDate(inv.dueDate) || '—' },
        { label: 'CREATED BY',   value: inv.createdBy ? `Staff #${inv.createdBy.slice(0, 8)}` : 'System' },
      ]
      cards.forEach((card, i) => {
        const cx = PAD + i * (cardW + 8)
        rect(cx, y, cardW, 60, 8, C.surface)
        text(card.label, cx + 12, y + 18, { size: 9, color: C.muted, weight: 'bold' })
        text(card.value, cx + 12, y + 38, { size: 12, weight: '600' })
      })
      y += 76

      // ── Line items label ─────────────────────────────────────────────────
      text('LINE ITEMS', PAD, y + 14, { size: 9, color: C.muted, weight: 'bold' })
      y += 24

      // Table border
      rect(PAD, y, COL_W, 38 + itemCount * ITEM_ROW_H + 1, 8, C.bg, C.border)

      // Table header
      rect(PAD, y, COL_W, 38, 8, C.surface)
      // Only round top corners — re-draw bottom square
      rect(PAD, y + 20, COL_W, 18, 0, C.surface)

      const cols = [
        { label: 'DESCRIPTION', x: PAD + 16,           w: COL_W * 0.42 },
        { label: 'QTY',         x: PAD + COL_W * 0.45, w: COL_W * 0.12 },
        { label: 'UNIT PRICE',  x: PAD + COL_W * 0.59, w: COL_W * 0.18 },
        { label: 'TOTAL',       x: PAD + COL_W * 0.79, w: COL_W * 0.18 },
      ]
      cols.forEach((c) => text(c.label, c.x, y + 24, { size: 9, color: C.muted, weight: 'bold' }))
      y += 38

      // Rows
      inv.items.forEach((item, i) => {
        if (i > 0) line(PAD + 1, y, PAD + COL_W - 1, y)
        text(item.description,           cols[0].x, y + 21, { size: 12 })
        text(String(item.quantity),      cols[1].x, y + 21, { size: 12, color: C.muted })
        text(formatCurrency(item.unitPrice), cols[2].x, y + 21, { size: 12, color: C.muted })
        text(formatCurrency(item.total), cols[3].x, y + 21, { size: 12, weight: 'bold' })
        y += ITEM_ROW_H
      })
      y += 8

      // ── Totals ───────────────────────────────────────────────────────────
      const totX = PAD + COL_W - 200
      const totLabelX = totX + 10
      const totValX   = PAD + COL_W - 10

      const totalRows: { label: string; value: string; bold?: boolean; color?: string }[] = [
        { label: 'Subtotal',    value: formatCurrency(inv.total) },
        ...(inv.tax ? [{ label: 'Tax', value: formatCurrency(inv.tax) }] : []),
        { label: 'Total',       value: formatCurrency(inv.total),    bold: true, color: C.primary },
        { label: 'Paid',        value: formatCurrency(inv.paid),     bold: true, color: C.secondary },
      ]
      if (inv.total - inv.paid > 0) {
        totalRows.push({ label: 'Outstanding', value: formatCurrency(inv.total - inv.paid), bold: true, color: C.error })
      }

      line(totX, y, PAD + COL_W, y)
      y += 10
      totalRows.forEach((row) => {
        text(row.label, totLabelX, y + 16, { size: row.bold ? 13 : 12, color: row.color ?? C.muted })
        text(row.value, totValX,   y + 16, { size: row.bold ? 14 : 12, weight: row.bold ? 'bold' : 'normal', color: row.color ?? C.text, align: 'right' })
        y += LINE_H + 4
      })

      // ── Notes ────────────────────────────────────────────────────────────
      if (inv.notes) {
        y += 8
        rect(PAD, y, COL_W, 50, 8, C.surface)
        text('NOTES', PAD + 12, y + 16, { size: 9, color: C.muted, weight: 'bold' })
        text(inv.notes, PAD + 12, y + 34, { size: 12, color: C.muted })
        y += 58
      }

      // ── Footer line ──────────────────────────────────────────────────────
      y += 8
      line(PAD, y, W - PAD, y)

      // ── Trigger download ─────────────────────────────────────────────────
      const link = document.createElement('a')
      link.download = `${inv.invoiceNumber ?? 'invoice'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  // Built inside component so labels re-render on language change
  // Only statuses the backend allows setting via PATCH are offered
  const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
    { value: 'draft',   label: t('status.draft') },
    { value: 'pending', label: t('status.pending') },   // maps to ISSUED
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
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-1.5 rounded-[var(--radius-DEFAULT)] text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50"
            aria-label={t('common.download')}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: t('finance.invoiceDate'), value: formatDate(inv.date) },
          { label: t('finance.dueDate'),     value: formatDate(inv.dueDate) },
          { label: t('finance.createdBy'),   value: null, isUser: true },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-0.5">{item.label}</p>
            {item.isUser ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[var(--color-primary-container)]/30 flex items-center justify-center flex-shrink-0">
                  <User size={11} className="text-[var(--color-primary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-on-surface)] truncate">
                  {inv.createdBy ? `${t('finance.staffId')} #${inv.createdBy.slice(0, 8)}` : t('common.system')}
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-[var(--color-on-surface)]">{item.value}</p>
            )}
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
          {(() => {
            const rows: { label: string; value: string }[] = [
              { label: t('finance.subtotal'), value: formatCurrency(inv.total + (inv.discount ?? 0)) },
            ]
            if (inv.discount) rows.push({ label: t('finance.discount'), value: `-${formatCurrency(inv.discount)}` })
            if (inv.tax)      rows.push({ label: t('finance.tax'),      value: formatCurrency(inv.tax) })
            return rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-on-surface-variant)]">{row.label}</span>
                <span className="text-[var(--color-on-surface)]">{row.value}</span>
              </div>
            ))
          })()}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          {/* Status dropdown only for mutable states; computed states show as badge */}
          {onStatusChange && (inv.status === 'draft' || inv.status === 'pending') ? (
            <Select
              options={STATUS_OPTIONS}
              value={inv.status}
              onChange={(e) => onStatusChange(inv.id, e.target.value as InvoiceStatus)}
              fullWidth={false}
              className="text-xs py-1.5"
            />
          ) : (
            <InvoiceStatusBadge status={inv.status} size="sm" />
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
  onSave: (payload: {
    patient_id: string
    patientName: string
    patientCode: string
    due_date: string | null
    line_items: { description: string; quantity: number; unit_cost: number; total: number }[]
    tax_rate: number
  }) => void
  patients?: { id: string; name: string; code: string }[]
  isSaving?: boolean
}

export function InvoiceFormModal({ open, onClose, onSave, patients = [], isSaving = false }: InvoiceFormModalProps) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const dueDefault = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [dueDate, setDueDate] = useState(dueDefault)
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [items, setItems] = useState<Invoice['items']>([])
  const [notes, setNotes] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedPatientId('')
      setDueDate(dueDefault)
      setDescription('')
      setQty('1')
      setUnitPrice('')
      setItems([])
      setNotes('')
    }
  }, [open])

  const addItem = () => {
    if (!description || !unitPrice) return
    const q = parseInt(qty) || 1
    const u = parseFloat(unitPrice) || 0
    setItems((prev) => [...prev, { id: `li${Date.now()}`, description, quantity: q, unitPrice: u, total: q * u }])
    setDescription(''); setQty('1'); setUnitPrice('')
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const total = items.reduce((s, i) => s + i.total, 0)

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  const handleSave = () => {
    if (!selectedPatientId || items.length === 0) return
    onSave({
      patient_id: selectedPatientId,
      patientName: selectedPatient?.name ?? '',
      patientCode: selectedPatient?.code ?? '',
      due_date: dueDate || null,
      line_items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_cost: i.unitPrice,
        total: i.total,
      })),
      tax_rate: 0,
    })
    // NOTE: do NOT call onClose() here — the parent closes the modal
    // after the async save + re-fetch completes
  }

  const patientOptions = [
    { value: '', label: t('finance.selectPatient') },
    ...patients.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('finance.newInvoiceTitle')}
      description={t('finance.newInvoiceDesc')}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('common.patient')} required>
            <Select
              options={patientOptions}
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            />
          </FormField>
          <FormField label={t('finance.dueDate')}>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </div>

        {/* Line items */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-2">{t('finance.lineItems')}</p>
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-12 sm:col-span-5">
              <Input placeholder={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input type="number" placeholder={t('common.quantity')} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="col-span-4 sm:col-span-3">
              <Input type="number" placeholder={t('finance.unitPrice')} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
            <div className="col-span-4 sm:col-span-2">
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
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={!selectedPatientId || items.length === 0 || isSaving}>
            {isSaving ? t('common.loading') : t('finance.createInvoice')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
