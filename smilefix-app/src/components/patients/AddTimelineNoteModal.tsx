import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Stethoscope, CalendarDays, ClipboardList, Pill, ScanLine } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import type { MedicalHistoryEntry } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type NoteType = MedicalHistoryEntry['type']

interface AddTimelineNoteModalProps {
  open: boolean
  onClose: () => void
  patientId: string
  onSave: (entry: MedicalHistoryEntry) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: NoteType; label: string; icon: React.ReactNode }[] = [
  { value: 'note',         label: 'General Note',   icon: <FileText size={14} /> },
  { value: 'treatment',    label: 'Treatment',       icon: <Stethoscope size={14} /> },
  { value: 'diagnosis',    label: 'Diagnosis',       icon: <ClipboardList size={14} /> },
  { value: 'prescription', label: 'Prescription',    icon: <Pill size={14} /> },
  { value: 'appointment',  label: 'Appointment',     icon: <CalendarDays size={14} /> },
  { value: 'xray',         label: 'X-Ray / Imaging', icon: <ScanLine size={14} /> },
]

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'active',    label: 'Active / Ongoing' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending',   label: 'Pending' },
]

const DOCTOR_OPTIONS = [
  { value: 'Dr. Smith',    label: 'Dr. Smith — Orthodontist' },
  { value: 'Dr. Peterson', label: 'Dr. Peterson — Endodontist' },
  { value: 'Dr. Lee',      label: 'Dr. Lee — Periodontist' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function AddTimelineNoteModal({ open, onClose, patientId, onSave }: AddTimelineNoteModalProps) {
  const { t } = useTranslation()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    type:        'note' as NoteType,
    title:       '',
    description: '',
    doctor:      'Dr. Smith',
    date:        today,
    status:      'completed',
    cost:        '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const errs: Partial<Record<keyof typeof form, string>> = {}
    if (!form.title.trim())       errs.title       = t('common.required')
    if (!form.description.trim()) errs.description = t('common.required')
    if (!form.date)               errs.date        = t('common.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const entry: MedicalHistoryEntry = {
      id:          `h${Date.now()}`,
      patientId,
      type:        form.type,
      title:       form.title.trim(),
      description: form.description.trim(),
      doctor:      form.doctor,
      date:        form.date,
      status:      form.status as MedicalHistoryEntry['status'],
      cost:        form.cost ? Number(form.cost) : undefined,
    }
    onSave(entry)
    handleClose()
  }

  const handleClose = () => {
    setForm({ type: 'note', title: '', description: '', doctor: 'Dr. Smith', date: today, status: 'completed', cost: '' })
    setErrors({})
    onClose()
  }

  // Type selector pill buttons
  const selectedTypeCfg = TYPE_OPTIONS.find((o) => o.value === form.type)!

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('patients.addNote') ?? 'Add Timeline Note'}
      description="Record a clinical note, treatment, diagnosis or prescription to the patient's history."
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">

        {/* Type selector — full width pill row */}
        <div className="col-span-full sm:col-span-2">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
            {t('common.type') ?? 'Type'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('type', opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.875rem',
                  borderRadius: 9999,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: form.type === opt.value
                    ? '1.5px solid var(--color-primary)'
                    : '1.5px solid var(--color-outline-variant)',
                  background: form.type === opt.value
                    ? 'rgba(0,105,111,0.08)'
                    : 'var(--color-surface-container-low)',
                  color: form.type === opt.value
                    ? 'var(--color-primary)'
                    : 'var(--color-on-surface-variant)',
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title — full width */}
        <FormField label={t('common.title') ?? 'Title'} required error={errors.title} className="col-span-full sm:col-span-2">
          <Input
            placeholder={`e.g. ${selectedTypeCfg.label} summary…`}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </FormField>

        {/* Doctor + Date — side by side */}
        <FormField label={t('common.doctor') ?? 'Doctor'}>
          <Select
            options={DOCTOR_OPTIONS}
            value={form.doctor}
            onChange={(e) => set('doctor', e.target.value)}
          />
        </FormField>
        <FormField label={t('common.date') ?? 'Date'} required error={errors.date}>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </FormField>

        {/* Status + Cost — side by side */}
        <FormField label={t('common.status') ?? 'Status'}>
          <Select
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          />
        </FormField>
        <FormField label={`${t('treatments.price') ?? 'Cost'} ($) — optional`}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.cost}
            onChange={(e) => set('cost', e.target.value)}
          />
        </FormField>

        {/* Description — full width */}
        <FormField label={t('treatments.description') ?? 'Description'} required error={errors.description} className="col-span-full sm:col-span-2">
          <Textarea
            placeholder="Describe the clinical findings, procedure performed, or notes for this entry…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
          />
        </FormField>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={handleClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} leftIcon={<FileText size={14} />}>
          {t('patients.addNote') ?? 'Save Note'}
        </Button>
      </div>
    </Modal>
  )
}
