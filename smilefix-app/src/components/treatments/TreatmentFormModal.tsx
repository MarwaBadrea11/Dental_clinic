import { useState } from 'react'
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
  onSave: (data: Omit<Treatment, 'id'>) => void
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

// ── Component ─────────────────────────────────────────────────────────────────

export function TreatmentFormModal({
  open,
  onClose,
  onSave,
  initialData,
  loading = false,
}: TreatmentFormModalProps) {
  const { t } = useTranslation()

  const [form, setForm] = useState<FormState>({
    name:        initialData?.name        ?? '',
    category:    initialData?.category    ?? 'Preventive',
    duration:    String(initialData?.duration ?? ''),
    price:       String(initialData?.price    ?? ''),
    description: initialData?.description ?? '',
    icon:        initialData?.icon        ?? '🦷',
    color:       initialData?.color       ?? '#00696f',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim())                          errs.name     = t('common.required')
    if (!form.duration || Number(form.duration) <= 0) errs.duration = t('common.required')
    if (!form.price    || Number(form.price)    <= 0) errs.price    = t('common.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      name:        form.name.trim(),
      category:    form.category,
      duration:    Number(form.duration),
      price:       Number(form.price),
      description: form.description.trim() || undefined,
      icon:        form.icon,
      color:       form.color,
    })
    onClose()
  }

  const isEdit = Boolean(initialData?.id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('treatments.editTreatment') ?? 'Edit Treatment' : t('treatments.addTreatment')}
      description={isEdit ? undefined : 'Fill in the details to add a new treatment to the catalogue.'}
      size="lg"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">

        {/* Name — full width */}
        <FormField label={t('common.name') ?? 'Name'} required error={errors.name} className="col-span-2">
          <Input
            placeholder="e.g. Dental Cleaning"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        {/* Category + Icon — side by side */}
        <FormField label={t('common.category') ?? 'Category'}>
          <Select
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => set('category', e.target.value as TreatmentCategory)}
          />
        </FormField>
        <FormField label="Icon">
          <Select
            options={ICON_OPTIONS}
            value={form.icon}
            onChange={(e) => set('icon', e.target.value)}
          />
        </FormField>

        {/* Duration + Price — side by side */}
        <FormField label={`${t('treatments.duration')} (min)`} required error={errors.duration}>
          <Input
            type="number"
            min="1"
            placeholder="60"
            value={form.duration}
            onChange={(e) => set('duration', e.target.value)}
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
          />
        </FormField>

        {/* Color picker — full width */}
        <FormField label="Color" className="col-span-2">
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                style={{ background: c }}
                className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 focus:outline-none ${
                  form.color === c ? 'ring-2 ring-offset-2 ring-[var(--color-on-surface)] scale-110' : ''
                }`}
                aria-label={`Select color ${c}`}
              />
            ))}
            {/* Custom color input */}
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border border-[var(--color-outline-variant)] bg-transparent p-0"
              title="Custom color"
            />
            {/* Preview swatch */}
            <div
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${form.color}20`, color: form.color, border: `1px solid ${form.color}40` }}
            >
              <span>{form.icon}</span>
              <span>{form.name || 'Preview'}</span>
            </div>
          </div>
        </FormField>

        {/* Description — full width */}
        <FormField label={t('treatments.description')} className="col-span-2">
          <Textarea
            placeholder="Brief description of the procedure..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
          />
        </FormField>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} loading={loading}>
          {isEdit ? t('calendar.saveChanges') ?? 'Save Changes' : t('treatments.addTreatment')}
        </Button>
      </div>
    </Modal>
  )
}
