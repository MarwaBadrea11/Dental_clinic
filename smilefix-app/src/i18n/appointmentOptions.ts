import type { TFunction } from 'i18next'
import type { AppointmentStatus } from '@/types'

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
]

export const appointmentStatusKey: Record<AppointmentStatus, string> = {
  scheduled:     'appointments.status.scheduled',
  confirmed:     'appointments.status.confirmed',
  'in-progress': 'appointments.status.inProgress',
  completed:     'appointments.status.completed',
  cancelled:     'appointments.status.cancelled',
  'no-show':     'appointments.status.noShow',
}

/** Backend treatment values — sent to API unchanged; labels are translated. */
export const APPOINTMENT_TREATMENT_VALUES = [
  'Dental Cleaning',
  'Composite Filling',
  'Root Canal Therapy',
  'Crown Placement',
  'Teeth Whitening',
  'Braces Adjustment',
  'Tooth Extraction',
  'Periodontal Scaling',
  'X-Ray Series',
  'Consultation',
] as const

export type AppointmentTreatmentValue = (typeof APPOINTMENT_TREATMENT_VALUES)[number]

export const appointmentTreatmentKey: Record<AppointmentTreatmentValue, string> = {
  'Dental Cleaning':     'appointments.treatments.dentalCleaning',
  'Composite Filling':   'appointments.treatments.compositeFilling',
  'Root Canal Therapy':  'appointments.treatments.rootCanalTherapy',
  'Crown Placement':     'appointments.treatments.crownPlacement',
  'Teeth Whitening':     'appointments.treatments.teethWhitening',
  'Braces Adjustment':   'appointments.treatments.bracesAdjustment',
  'Tooth Extraction':    'appointments.treatments.toothExtraction',
  'Periodontal Scaling': 'appointments.treatments.periodontalScaling',
  'X-Ray Series':        'appointments.treatments.xRaySeries',
  'Consultation':        'appointments.treatments.consultation',
}

export function getAppointmentStatusLabel(t: TFunction, status: string | undefined | null) {
  if (!status || typeof t !== 'function') return status ?? '—'
  const key = appointmentStatusKey[status as AppointmentStatus]
  if (!key) return status
  const translated = t(key)
  return translated === key ? status : translated
}

export function buildAppointmentStatusSelectOptions(t: TFunction) {
  if (typeof t !== 'function') return []

  return APPOINTMENT_STATUSES.map((status) => ({
    value: status,
    label: getAppointmentStatusLabel(t, status),
  }))
}

export function getAppointmentTreatmentLabel(t: TFunction, value: string | undefined | null) {
  if (!value || typeof t !== 'function') return value ?? '—'
  const key = appointmentTreatmentKey[value as AppointmentTreatmentValue]
  if (!key) return value
  const translated = t(key)
  return translated === key ? value : translated
}

export function buildAppointmentTreatmentSelectOptions(t: TFunction) {
  if (typeof t !== 'function') return []

  return APPOINTMENT_TREATMENT_VALUES.map((value) => ({
    value,
    label: getAppointmentTreatmentLabel(t, value),
  }))
}

export function formatAppointmentDuration(t: TFunction, minutes: number) {
  if (typeof t !== 'function') return `${minutes} min`
  return t('appointments.durationMinutes', { count: minutes })
}

/** Locale-aware short weekday labels (Sun–Sat). */
export function getWeekdayShortLabels(language: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2025, 0, 5 + i)
    return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date)
  })
}
