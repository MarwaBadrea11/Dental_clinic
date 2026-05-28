import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { User, Phone, Heart, Shield, FileText } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { FormField } from '@/components/ui/FormField'
import { ImageUploadArea } from '@/components/ui/ImageUploadArea'
import type { Patient } from '@/types'

type PatientFormData = Omit<Patient, 'id' | 'patientCode' | 'createdAt'>

interface PatientFormProps {
  initialData?: Partial<PatientFormData>
  onSubmit: (data: PatientFormData) => void
  onCancel?: () => void
  loading?: boolean
  mode?: 'create' | 'edit'
}

export function PatientForm({ initialData, onSubmit, onCancel, loading = false, mode = 'create' }: PatientFormProps) {
  const { t } = useTranslation()

  // Options built inside component so labels re-render on language change
  const GENDER_OPTIONS = [
    { value: 'male',   label: t('patients.male') },
    { value: 'female', label: t('patients.female') },
    { value: 'other',  label: t('patients.other') },
  ]

  const BLOOD_OPTIONS = [
    { value: '', label: t('common.unknown') },
    ...['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({ value: v, label: v })),
  ]

  const STATUS_OPTIONS = [
    { value: 'active',   label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
    { value: 'pending',  label: t('status.pending') },
  ]

  const DOCTOR_OPTIONS = [
    { value: 'Dr. Smith',    label: 'Dr. Smith' },
    { value: 'Dr. Peterson', label: 'Dr. Peterson' },
    { value: 'Dr. Lee',      label: 'Dr. Lee' },
  ]

  const [form, setForm] = useState<Partial<PatientFormData>>({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
    phone: '', email: '', address: '', city: '',
    bloodType: undefined, allergies: [],
    status: 'active', balance: 0,
    assignedDoctor: 'Dr. Smith',
    ...initialData,
  })
  const [allergyInput, setAllergyInput] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData, string>>>({})

  const set = (key: keyof PatientFormData, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (!trimmed) return
    set('allergies', [...(form.allergies ?? []), trimmed])
    setAllergyInput('')
  }

  const removeAllergy = (a: string) =>
    set('allergies', (form.allergies ?? []).filter((x) => x !== a))

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!form.firstName?.trim()) errs.firstName = t('patients.firstNameRequired')
    if (!form.lastName?.trim())  errs.lastName  = t('patients.lastNameRequired')
    if (!form.phone?.trim())     errs.phone     = t('patients.phoneRequired')
    if (!form.dateOfBirth)       errs.dateOfBirth = t('patients.dobRequired')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form as PatientFormData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Information */}
      <SectionCard title={t('patients.personalInfo')} icon={<User size={15} />} delay={0}>
        <div className="flex flex-col sm:flex-row gap-6">
          <ImageUploadArea
            name={`${form.firstName || t('common.patient')} ${form.lastName || ''}`}
            size="lg"
            label={t('patients.photo')}
            className="shrink-0"
          />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('patients.firstName')} required error={errors.firstName}>
              <Input
                placeholder="Sarah"
                value={form.firstName ?? ''}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </FormField>
            <FormField label={t('patients.lastName')} required error={errors.lastName}>
              <Input
                placeholder="Miller"
                value={form.lastName ?? ''}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </FormField>
            <FormField label={t('patients.dateOfBirth')} required error={errors.dateOfBirth}>
              <Input
                type="date"
                value={form.dateOfBirth ?? ''}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            </FormField>
            <FormField label={t('patients.gender')}>
              <Select
                options={GENDER_OPTIONS}
                value={form.gender ?? 'male'}
                onChange={(e) => set('gender', e.target.value)}
              />
            </FormField>
            <FormField label={t('common.status')}>
              <Select
                options={STATUS_OPTIONS}
                value={form.status ?? 'active'}
                onChange={(e) => set('status', e.target.value as Patient['status'])}
              />
            </FormField>
            <FormField label={t('patients.assignedDoctor')}>
              <Select
                options={DOCTOR_OPTIONS}
                value={form.assignedDoctor ?? ''}
                onChange={(e) => set('assignedDoctor', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      {/* Contact Information */}
      <SectionCard title={t('patients.contactInfo')} icon={<Phone size={15} />} delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('common.phone')} required error={errors.phone}>
            <Input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
            />
          </FormField>
          <FormField label={t('common.email')}>
            <Input
              type="email"
              placeholder="patient@email.com"
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </FormField>
          <FormField label={t('common.address')}>
            <Input
              placeholder="123 Main Street"
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
            />
          </FormField>
          <FormField label={t('patients.city')}>
            <Input
              placeholder="Los Angeles"
              value={form.city ?? ''}
              onChange={(e) => set('city', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Medical Information */}
      <SectionCard title={t('patients.medicalInfo')} icon={<Heart size={15} />} delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('patients.bloodType')}>
            <Select
              options={BLOOD_OPTIONS}
              value={form.bloodType ?? ''}
              onChange={(e) => set('bloodType', e.target.value || undefined)}
            />
          </FormField>
          <div />
          <FormField label={t('patients.allergies')} className="col-span-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('patients.allergyPlaceholder')}
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() } }}
              />
              <Button type="button" variant="outline" size="md" onClick={addAllergy}>
                {t('patients.addAllergy')}
              </Button>
            </div>
            {(form.allergies ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.allergies ?? []).map((a) => (
                  <span
                    key={a}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-error-container)] text-[var(--color-error)] text-xs font-semibold rounded-full cursor-pointer hover:opacity-80"
                    onClick={() => removeAllergy(a)}
                  >
                    {a} ×
                  </span>
                ))}
              </div>
            )}
          </FormField>
        </div>
      </SectionCard>

      {/* Insurance */}
      <SectionCard title={t('patients.insuranceInfo')} icon={<Shield size={15} />} delay={0.15}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('patients.insuranceProvider')}>
            <Input
              placeholder="BlueCross, Aetna..."
              value={form.insuranceProvider ?? ''}
              onChange={(e) => set('insuranceProvider', e.target.value)}
            />
          </FormField>
          <FormField label={t('patients.policyNumber')}>
            <Input
              placeholder="BC-00000"
              value={form.insuranceNumber ?? ''}
              onChange={(e) => set('insuranceNumber', e.target.value)}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Emergency Contact */}
      <SectionCard title={t('patients.emergencyContact')} icon={<Phone size={15} />} delay={0.2}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label={t('common.name')}>
            <Input
              placeholder="John Doe"
              value={form.emergencyContact?.name ?? ''}
              onChange={(e) => set('emergencyContact', { ...form.emergencyContact, name: e.target.value })}
            />
          </FormField>
          <FormField label={t('patients.relationship')}>
            <Input
              placeholder="Spouse, Parent..."
              value={form.emergencyContact?.relation ?? ''}
              onChange={(e) => set('emergencyContact', { ...form.emergencyContact, relation: e.target.value })}
            />
          </FormField>
          <FormField label={t('common.phone')}>
            <Input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.emergencyContact?.phone ?? ''}
              onChange={(e) => set('emergencyContact', { ...form.emergencyContact, phone: e.target.value })}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Clinical Notes */}
      <SectionCard title={t('patients.clinicalNotes')} icon={<FileText size={15} />} delay={0.25}>
        <Textarea
          placeholder={t('patients.notes')}
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
        />
      </SectionCard>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-end gap-3 pt-2"
      >
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {mode === 'create' ? t('patients.registerNew') : t('common.save')}
        </Button>
      </motion.div>
    </form>
  )
}
