import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import type { Treatment, TreatmentCategory } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: TreatmentCategory; label: string }[] = [
  { value: 'Preventive',    label: 'Preventive' },
  { value: 'Restorative',   label: 'Restorative' },
  { value: 'Endodontic',    label: 'Endodontic' },
  { value: 'Periodontic',   label: 'Periodontic' },
  { value: 'Prosthodontic', label: 'Prosthodontic' },
  { value: 'Orthodontic',   label: 'Orthodontic' },
  { value: 'Oral Surgery',  label: 'Oral Surgery' },
  { value: 'Cosmetic',      label: 'Cosmetic' },
]

const ICON_OPTIONS = [
  { value: '🦷', label: '🦷 Tooth' },
  { value: '⚕',  label: '⚕ Medical' },
  { value: '🔧', label: '🔧 Filling' },
  { value: '🔬', label: '🔬 Scaling' },
  { value: '👑', label: '👑 Crown' },
  { value: '✨', label: '✨ Whitening' },
  { value: '🔩', label: '🔩 Braces' },
  { value: '✂',  label: '✂ Surgery' },
  { value: '🩻', label: '🩻 X-Ray' },
  { value: '📐', label: '📐 Aligner' },
]

const COLOR_PRESETS = [
  '#00696f', '#35675d', '#2c6484', '#ba1a1a',
  '#9d4edd', '#f4a261', '#e76f51', '#6d6875',
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface TreatmentFormModalProps {
  open: boolean
  onClose: () => void
  /** Called with form data — must be async; modal stays open until it resolves/rejects. */
  onSave: (data: Omit<Treatment, 'id'>) => Promise<void>
  initialData?: Partial<Treatment>
  loading?: boolean
}

type FormState = {
  name: string
  category: TreatmentCategory
  duration: string
  price: string
  description: string
  icon: string
  color: string
}

function buildInitialForm(initialData?: Partial<Treatment>): FormState {
  return {
    name:        initialData?.name        ?? '',
    category:    initialData?.category    ?? 'Preventive',
    duration:    initialData?.duration != null ? String(initialData.duration) : '',
    price:       initialData?.price    != null ? String(initialData.price)    : '',
    description: initialData?.description ?? '',
    icon:        initialData?.icon        ?? '🦷',
    color:       initialData?.color       ?? '#00696f',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TreatmentFormModal({
  open,
  onClose,
  onSave,
  initialData,
  loading = false,
}: TreatmentFormModalProps) {
  const { t } = useTranslation()

  const [form, setForm] = useState<FormState>(() => buildInitialForm(initialData))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Reset form whenever the modal opens (or initialData changes)
  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(initialData))
      setErrors({})
      setApiError(null)
    }
  }, [open, initialData])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim())                              errs.name     = t('common.required')
    if (!form.duration || Number(form.duration) <= 0)   errs.duration = t('common.required')
    if (!form.price    || Number(form.price)    <  0)   errs.price    = t('common.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)
    try {
      await onSave({
        name:        form.name.trim(),
        category:    form.category,
        duration:    Number(form.duration),
        price:       Number(form.price),
        description: form.description.trim() || undefined,
        icon:        form.icon,
        color:       form.color,
      })
      // onSave resolves → close the modal
      onClose()
    } catch (err: unknown) {
      // Show the error inside the modal so the user can correct and retry
      setApiError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isEdit = Boolean(initialData?.id)
  const isBusy = submitting || loading

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('treatments.editTreatment') ?? 'Edit Treatment' : t('treatments.addTreatment')}
      description={isEdit ? undefined : 'Fill in the details to add a new treatment to the catalogue.'}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">

        {/* Name — full width */}
        <FormField label={t('common.name') ?? 'Name'} required error={errors.name} className="col-span-full sm:col-span-2">
          <Input
            placeholder="e.g. Dental Cleaning"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            disabled={isBusy}
          />
        </FormField>

        {/* Category + Icon */}
        <FormField label={t('common.category') ?? 'Category'}>
          <Select
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => set('category', e.target.value as TreatmentCategory)}
            disabled={isBusy}
          />
        </FormField>
        <FormField label="Icon">
          <Select
            options={ICON_OPTIONS}
            value={form.icon}
            onChange={(e) => set('icon', e.target.value)}
            disabled={isBusy}
          />
        </FormField>

        {/* Duration + Price */}
        <FormField label={`${t('treatments.duration')} (min)`} required error={errors.duration}>
          <Input
            type="number"
            min="1"
            placeholder="60"
            value={form.duration}
            onChange={(e) => set('duration', e.target.value)}
            disabled={isBusy}
          />
        </FormField>
        <FormField label={`${t('treatments.price')} ($)`} required error={errors.price}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="150.00"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            disabled={isBusy}
          />
        </FormField>

        {/* Color picker */}
        <FormField label="Color" className="col-span-full sm:col-span-2">
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                style={{ background: c }}
                disabled={isBusy}
                className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 focus:outline-none ${
                  form.color === c ? 'ring-2 ring-offset-2 ring-[var(--color-on-surface)] scale-110' : ''
                }`}
                aria-label={`Select color ${c}`}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              disabled={isBusy}
              className="w-7 h-7 rounded-full cursor-pointer border border-[var(--color-outline-variant)] bg-transparent p-0"
              title="Custom color"
            />
            <div
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${form.color}20`, color: form.color, border: `1px solid ${form.color}40` }}
            >
              <span>{form.icon}</span>
              <span>{form.name || 'Preview'}</span>
            </div>
          </div>
        </FormField>

        {/* Description */}
        <FormField label={t('treatments.description')} className="col-span-full sm:col-span-2">
          <Textarea
            placeholder="Brief description of the procedure..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            disabled={isBusy}
          />
        </FormField>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="mt-4 px-3 py-2.5 rounded-[var(--radius-DEFAULT)] bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{apiError}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose} disabled={isBusy}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} loading={isBusy}>
          {isEdit ? t('calendar.saveChanges') ?? 'Save Changes' : t('treatments.addTreatment')}
        </Button>
      </div>
    </Modal>
  )
}
