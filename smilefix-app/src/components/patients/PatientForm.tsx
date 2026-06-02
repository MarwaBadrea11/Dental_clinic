import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { Patient } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PatientFormValues {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  nationalId: string
  phone: string
  city: string
  email: string
  status: 'active' | 'inactive' | 'pending'
  insuranceProvider: string
  insurancePolicyNumber: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
  clinicalNotes: string
  medicalHistory: string
}

interface PatientFormProps {
  initialData?: Patient
  onSubmit: (data: PatientFormValues) => void | Promise<void>
  loading?: boolean
}

type FormErrors = Partial<Record<keyof PatientFormValues, string>>

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDefaults(p?: Patient): PatientFormValues {
  return {
    firstName:                    p?.firstName ?? '',
    lastName:                     p?.lastName ?? '',
    dateOfBirth:                  p?.dateOfBirth ?? '',
    gender:                       p?.gender ?? 'male',
    nationalId:                   p?.patientCode ?? '',
    phone:                        p?.phone ?? '',
    city:                         p?.city ?? '',
    email:                        p?.email ?? '',
    status:                       p?.status === 'inactive' || p?.status === 'pending' ? p.status : 'active',
    insuranceProvider:            p?.insuranceProvider ?? '',
    insurancePolicyNumber:        p?.insurancePolicyNumber ?? '',
    emergencyContactName:         p?.emergencyContactName ?? p?.emergencyContact?.name ?? '',
    emergencyContactRelationship: p?.emergencyContactRelationship ?? p?.emergencyContact?.relation ?? '',
    emergencyContactPhone:        p?.emergencyContactPhone ?? p?.emergencyContact?.phone ?? '',
    clinicalNotes:                p?.clinicalNotes ?? '',
    medicalHistory:               p?.medicalHistory ?? p?.notes ?? '',
  }
}

function validate(form: PatientFormValues): FormErrors {
  const errs: FormErrors = {}
  if (!form.firstName.trim())  errs.firstName   = 'Required'
  if (!form.lastName.trim())   errs.lastName    = 'Required'
  if (!form.dateOfBirth)       errs.dateOfBirth = 'Required'
  if (!form.nationalId.trim()) errs.nationalId  = 'Required'
  if (!form.phone.trim())      errs.phone       = 'Required'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errs.email = 'Invalid email address'
  }
  return errs
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PatientForm({ initialData, onSubmit, loading }: PatientFormProps) {
  const [form, setForm] = useState<PatientFormValues>(() => buildDefaults(initialData))
  const [errors, setErrors] = useState<FormErrors>({})

  const set = <K extends keyof PatientFormValues>(key: K, value: PatientFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Personal Info ── */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          value={form.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          error={errors.firstName}
          required
        />
        <Input
          label="Last Name"
          value={form.lastName}
          onChange={(e) => set('lastName', e.target.value)}
          error={errors.lastName}
          required
        />
        <Input
          label="Date of Birth"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => set('dateOfBirth', e.target.value)}
          error={errors.dateOfBirth}
          required
        />
        <Select
          label="Gender"
          options={[
            { label: 'Male',   value: 'male' },
            { label: 'Female', value: 'female' },
            { label: 'Other',  value: 'other' },
          ]}
          value={form.gender}
          onChange={(e) => set('gender', e.target.value as PatientFormValues['gender'])}
        />
        <Input
          label="National ID"
          value={form.nationalId}
          onChange={(e) => set('nationalId', e.target.value)}
          error={errors.nationalId}
          required
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          error={errors.phone}
          required
        />
        <Input
          label="City"
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
        />
      </div>

      {/* ── Insurance ── */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-[var(--color-on-surface)]">Insurance Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Insurance Provider"
            value={form.insuranceProvider}
            onChange={(e) => set('insuranceProvider', e.target.value)}
          />
          <Input
            label="Policy Number"
            value={form.insurancePolicyNumber}
            onChange={(e) => set('insurancePolicyNumber', e.target.value)}
          />
        </div>
      </div>

      {/* ── Emergency Contact ── */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="font-semibold text-[var(--color-on-surface)]">Emergency Contact</h3>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Name"
            value={form.emergencyContactName}
            onChange={(e) => set('emergencyContactName', e.target.value)}
          />
          <Input
            label="Relationship"
            value={form.emergencyContactRelationship}
            onChange={(e) => set('emergencyContactRelationship', e.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            value={form.emergencyContactPhone}
            onChange={(e) => set('emergencyContactPhone', e.target.value)}
          />
        </div>
      </div>

      {/* ── Clinical ── */}
      <div className="border-t pt-4 space-y-4">
        <Textarea
          label="Clinical Notes"
          value={form.clinicalNotes}
          onChange={(e) => set('clinicalNotes', e.target.value)}
          rows={3}
        />
        <Textarea
          label="Medical History"
          value={form.medicalHistory}
          onChange={(e) => set('medicalHistory', e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Save Patient
      </Button>
    </form>
  )
}
