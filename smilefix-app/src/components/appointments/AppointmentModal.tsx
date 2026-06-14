import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, User, Stethoscope, FileText, Hash } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import {
  buildAppointmentStatusSelectOptions,
  buildAppointmentTreatmentSelectOptions,
  getAppointmentTreatmentLabel,
} from '@/i18n/appointmentOptions'
import { cn } from '@/utils/cn'
import type { Appointment, AppointmentStatus } from '@/types'

// ── View Modal ────────────────────────────────────────────────────────────────

interface AppointmentViewModalProps {
  appointment: Appointment | null
  open: boolean
  onClose: () => void
  onEdit?: (a: Appointment) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: AppointmentStatus) => void
}

export function AppointmentViewModal({ appointment: a, open, onClose, onEdit, onDelete, onStatusChange }: AppointmentViewModalProps) {
  const { t, i18n } = useTranslation()
  if (!a) return null

  const STATUS_OPTIONS = buildAppointmentStatusSelectOptions(t)

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="-mx-6 -mt-6 h-1.5 mb-6 rounded-t-[var(--radius-xl)]" style={{ background: a.color ?? 'var(--color-primary)' }} />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-on-surface)]" style={{ fontFamily: 'Manrope, sans-serif' }}>{getAppointmentTreatmentLabel(t, a.treatment)}</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5">{a.treatmentCategory}</p>
          </div>
          <AppointmentStatusBadge status={a.status} size="md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: <User size={14} />,       label: t('common.patient'), value: `${a.patientName}${a.patientCode ? ` (${a.patientCode})` : ''}` },
            { icon: <Stethoscope size={14} />, label: t('common.doctor'),  value: a.doctorName },
            { icon: <Calendar size={14} />,    label: t('common.date'),    value: new Date(a.date + 'T00:00:00').toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            { icon: <Clock size={14} />,       label: t('calendar.time'),  value: `${a.startTime} – ${a.endTime}` },
            ...(a.chair ? [{ icon: <Hash size={14} />, label: t('calendar.chair'), value: `${t('calendar.chair')} ${a.chair}` }] : []),
          ].map((item) => (
            <div key={item.label} className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
              <div className="flex items-center gap-1.5 text-[var(--color-on-surface-variant)] mb-1">
                {item.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wide">{item.label}</span>
              </div>
              <p className="text-sm font-medium text-[var(--color-on-surface)]">{item.value}</p>
            </div>
          ))}
        </div>

        {a.notes && (
          <div className="bg-[var(--color-surface-container-low)] rounded-[var(--radius-DEFAULT)] p-3">
            <div className="flex items-center gap-1.5 text-[var(--color-on-surface-variant)] mb-1">
              <FileText size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{t('common.notes')}</span>
            </div>
            <p className="text-sm text-[var(--color-on-surface-variant)]">{a.notes}</p>
          </div>
        )}

        {onStatusChange && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-2">{t('calendar.updateStatus')}</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button key={s.value} onClick={() => onStatusChange(a.id, s.value)}
                  className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150',
                    a.status === s.value
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                      : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-container)]/20 hover:text-[var(--color-primary)]')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-outline-variant)]/15">
          {onDelete && <Button variant="danger" size="sm" onClick={() => { onDelete(a.id); onClose() }}>{t('common.delete')}</Button>}
          {onEdit && <Button variant="outline" size="sm" onClick={() => { onEdit(a); onClose() }}>{t('common.edit')}</Button>}
          <Button size="sm" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Types for API data ────────────────────────────────────────────────────────

interface DoctorOption {
  id: string
  label: string
}

interface PatientOption {
  id: string
  label: string
  code: string
}

// ── Backend response shapes (minimal) ────────────────────────────────────────

interface BackendUser {
  id: string
  username: string
  role: string
}

interface BackendPatient {
  id: string
  first_name: string
  last_name: string
  patient_code?: string
  national_id?: string
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────

interface AppointmentFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Appointment, 'id'>) => Promise<void>
  initialDate?: string
  initialData?: Partial<Appointment>
  loading?: boolean
}

export function AppointmentFormModal({
  open, onClose, onSave, initialDate, initialData, loading = false,
}: AppointmentFormModalProps) {
  const { t } = useTranslation()

  const STATUS_OPTIONS = buildAppointmentStatusSelectOptions(t)
  const TREATMENT_OPTIONS = buildAppointmentTreatmentSelectOptions(t)

  const CHAIR_OPTIONS = [1, 2, 3, 4].map((n) => ({ value: String(n), label: `${t('calendar.chair')} ${n}` }))

  // ── Real data from API ──────────────────────────────────────────────────────
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setDataLoading(true)

    const token = localStorage.getItem('smilefix_access_token') ?? ''
    const base = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002'}/api/v1`
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    Promise.all([
      // Fetch dentist users from the users table
      fetch(`${base}/auth/users?role=DENTIST`, { headers })
        .then((r) => r.json())
        .then((j) => (Array.isArray(j.data) ? (j.data as BackendUser[]) : []))
        .catch(() => [] as BackendUser[]),
      // Fetch patients list
      fetch(`${base}/patients?limit=200`, { headers })
        .then((r) => r.json())
        .then((j) => (Array.isArray(j.data) ? (j.data as BackendPatient[]) : []))
        .catch(() => [] as BackendPatient[]),
    ]).then(([doctorRows, patientRows]) => {
      setDoctors(
        doctorRows.map((u) => ({ id: u.id, label: u.username }))
      )
      setPatients(
        patientRows.map((p) => ({
          id: p.id,
          label: `${p.first_name} ${p.last_name}`,
          code: p.patient_code ?? p.national_id ?? '',
        }))
      )
    }).finally(() => setDataLoading(false))
  }, [open])

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    patientId:         initialData?.patientId   ?? '',
    patientName:       initialData?.patientName ?? '',
    patientCode:       initialData?.patientCode ?? '',
    doctorId:          initialData?.doctorId    ?? '',
    doctorName:        initialData?.doctorName  ?? '',
    date:              initialData?.date        ?? initialDate ?? new Date().toISOString().split('T')[0],
    startTime:         initialData?.startTime   ?? '09:00',
    endTime:           initialData?.endTime     ?? '10:00',
    treatment:         initialData?.treatment   ?? '',
    treatmentCategory: initialData?.treatmentCategory ?? '',
    status:            (initialData?.status     ?? 'scheduled') as AppointmentStatus,
    notes:             initialData?.notes       ?? '',
    chair:             initialData?.chair       ?? 1,
    color:             initialData?.color       ?? 'var(--color-primary)',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens with new initialData
  useEffect(() => {
    if (open) {
      setForm({
        patientId:         initialData?.patientId   ?? '',
        patientName:       initialData?.patientName ?? '',
        patientCode:       initialData?.patientCode ?? '',
        doctorId:          initialData?.doctorId    ?? '',
        doctorName:        initialData?.doctorName  ?? '',
        date:              initialData?.date        ?? initialDate ?? new Date().toISOString().split('T')[0],
        startTime:         initialData?.startTime   ?? '09:00',
        endTime:           initialData?.endTime     ?? '10:00',
        treatment:         initialData?.treatment   ?? '',
        treatmentCategory: initialData?.treatmentCategory ?? '',
        status:            (initialData?.status     ?? 'scheduled') as AppointmentStatus,
        notes:             initialData?.notes       ?? '',
        chair:             initialData?.chair       ?? 1,
        color:             initialData?.color       ?? 'var(--color-primary)',
      })
      setErrors({})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  // When a patient is selected from the dropdown, populate name + code + id
  const handlePatientChange = (id: string) => {
    const p = patients.find((x) => x.id === id)
    if (p) {
      setForm((f) => ({ ...f, patientId: p.id, patientName: p.label, patientCode: p.code }))
    } else {
      setForm((f) => ({ ...f, patientId: id }))
    }
    setErrors((e) => ({ ...e, patientId: '' }))
  }

  // When a doctor is selected, populate id + name
  const handleDoctorChange = (id: string) => {
    const d = doctors.find((x) => x.id === id)
    setForm((f) => ({ ...f, doctorId: id, doctorName: d?.label ?? id }))
    setErrors((e) => ({ ...e, doctorId: '' }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.patientId)  errs.patientId  = t('common.required')
    if (!form.doctorId)   errs.doctorId   = t('common.required')
    if (!form.treatment)  errs.treatment  = t('common.required')
    if (!form.date)       errs.date       = t('common.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    await onSave({ ...form })
  }

  // Build select options
  const doctorSelectOptions = [
    { value: '', label: dataLoading ? t('calendar.loadingDoctors') : t('calendar.selectDoctor') },
    ...doctors.map((d) => ({ value: d.id, label: d.label })),
  ]

  const patientSelectOptions = [
    { value: '', label: dataLoading ? t('calendar.loadingPatients') : t('calendar.selectPatient') },
    ...patients.map((p) => ({ value: p.id, label: `${p.label} (${p.code})` })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData?.id ? t('calendar.editAppointment') : t('calendar.newApptTitle')}
      description={t('calendar.newApptDesc')}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">

        {/* Patient — full width dropdown */}
        <FormField label={t('calendar.patientName')} required error={errors.patientId} className="col-span-full sm:col-span-2">
          <Select
            options={patientSelectOptions}
            value={form.patientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            disabled={dataLoading}
          />
        </FormField>

        {/* Patient Code (read-only, auto-filled) + Doctor */}
        <FormField label={t('calendar.patientCode')}>
          <Input
            placeholder={t('calendar.autoFilled')}
            value={form.patientCode}
            readOnly
            className="bg-[var(--color-surface-container-low)] cursor-default"
          />
        </FormField>
        <FormField label={t('common.doctor')} required error={errors.doctorId}>
          <Select
            options={doctorSelectOptions}
            value={form.doctorId}
            onChange={(e) => handleDoctorChange(e.target.value)}
            disabled={dataLoading}
          />
        </FormField>

        {/* Treatment — full width */}
        <FormField label={t('patients.treatment')} required error={errors.treatment} className="col-span-full sm:col-span-2">
          <Select
            options={[{ value: '', label: t('calendar.selectTreatment') }, ...TREATMENT_OPTIONS]}
            value={form.treatment}
            onChange={(e) => setField('treatment', e.target.value)}
          />
        </FormField>

        {/* Date + Chair */}
        <FormField label={t('common.date')} required error={errors.date}>
          <Input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
        </FormField>
        <FormField label={t('calendar.chair')}>
          <Select
            options={CHAIR_OPTIONS}
            value={String(form.chair)}
            onChange={(e) => setField('chair', Number(e.target.value))}
          />
        </FormField>

        {/* Start Time + End Time */}
        <FormField label={t('calendar.startTime')}>
          <Input type="time" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} />
        </FormField>
        <FormField label={t('calendar.endTime')}>
          <Input type="time" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} />
        </FormField>

        {/* Status — full width */}
        <FormField label={t('common.status')} className="col-span-full sm:col-span-2">
          <Select
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setField('status', e.target.value as AppointmentStatus)}
          />
        </FormField>

        {/* Notes — full width */}
        <FormField label={t('common.notes')} className="col-span-full sm:col-span-2">
          <Textarea
            placeholder={t('calendar.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={2}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[var(--color-outline-variant)]/15">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} loading={loading} disabled={dataLoading}>
          {initialData?.id ? t('calendar.saveChanges') : t('calendar.bookAppointment')}
        </Button>
      </div>
    </Modal>
  )
}
