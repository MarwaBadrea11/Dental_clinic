// ─────────────────────────────────────────────────────────────────────────────
// Appointment Service — /api/v1/appointments
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { Appointment } from '@/types'

// ── Backend shape ─────────────────────────────────────────────────────────────

export interface BackendAppointment {
  id: string
  patient_id: string
  dentist_id: string
  scheduled_at: string          // ISO datetime
  duration_minutes: number
  chair_number: string | null
  treatment_name: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  // joined fields (from GET list / GET by id)
  patient_first_name?: string
  patient_last_name?: string
  patient_phone?: string
  patient_code?: string
  dentist_username?: string
}

export interface AppointmentStats {
  today: number
  thisWeek: number
  confirmed: number
  pending: number
}

export interface AppointmentListResponse {
  stats: AppointmentStats
  appointments: BackendAppointment[]
}

export interface CreateAppointmentPayload {
  patient_id: string
  dentist_id: string
  scheduled_at: string          // ISO datetime with offset e.g. 2026-05-28T09:00:00+00:00
  duration_minutes?: number
  chair_number?: string         // e.g. "1", "2", "3", "4"
  treatment_name?: string | null
  notes?: string | null
  status?: string
}

export interface UpdateAppointmentPayload {
  status?: string
  chair_number?: string
  treatment_name?: string | null
  scheduled_at?: string
  duration_minutes?: number
  notes?: string | null
  dentist_id?: string
}

// ── Mapper: backend → frontend Appointment ───────────────────────────────────

export function mapAppointment(a: BackendAppointment): Appointment {
  // Parse the ISO string that the backend returns. PostgreSQL TIMESTAMPTZ
  // comes back as an ISO string with the original offset preserved (e.g.
  // "2026-06-20T09:00:00+03:00"). new Date() converts it to a local Date,
  // so getHours()/getMinutes() give the time in the BROWSER's local timezone.
  // We want to display whatever timezone the browser is in — which is correct
  // as long as the browser and the clinic staff are in the same timezone.
  const dt = new Date(a.scheduled_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  // Local date string: YYYY-MM-DD in the browser timezone
  const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  // Local time: HH:MM in the browser timezone
  const startTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  const endDt = new Date(dt.getTime() + (a.duration_minutes ?? 30) * 60 * 1000)
  const endTime = `${pad(endDt.getHours())}:${pad(endDt.getMinutes())}`

  const statusMap: Record<string, Appointment['status']> = {
    SCHEDULED:   'scheduled',
    CONFIRMED:   'confirmed',
    IN_PROGRESS: 'in-progress',
    COMPLETED:   'completed',
    CANCELLED:   'cancelled',
    NO_SHOW:     'no-show',
  }

  return {
    id: a.id,
    patientId: a.patient_id,
    patientName: a.patient_first_name
      ? `${a.patient_first_name} ${a.patient_last_name ?? ''}`.trim()
      : 'Unknown Patient',
    patientCode: a.patient_code ?? undefined,
    doctorId: a.dentist_id,
    doctorName: a.dentist_username ?? 'Unknown Doctor',
    date,
    startTime,
    endTime,
    treatment: a.treatment_name ?? a.notes ?? 'Appointment',
    status: statusMap[a.status] ?? 'scheduled',
    notes: a.notes ?? undefined,
    chair: a.chair_number ? Number(a.chair_number) : undefined,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchAppointments(params?: {
  date?: string
  start_date?: string
  end_date?: string
  dentist_id?: string
  patient_id?: string
}): Promise<{ appointments: Appointment[]; stats: AppointmentStats }> {
  const qs = new URLSearchParams()
  if (params?.date)        qs.set('date',        params.date)
  if (params?.start_date)  qs.set('start_date',  params.start_date)
  if (params?.end_date)    qs.set('end_date',     params.end_date)
  if (params?.dentist_id)  qs.set('dentist_id',  params.dentist_id)
  if (params?.patient_id)  qs.set('patient_id',  params.patient_id)

  const query = qs.toString() ? `?${qs}` : ''
  // Backend returns { stats, appointments } wrapped in successResponse → { data: { stats, appointments } }
  const result = await apiClient.get<AppointmentListResponse>(`/appointments${query}`)
  return {
    appointments: result.appointments.map(mapAppointment),
    stats: result.stats,
  }
}

export async function bookAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const a = await apiClient.post<BackendAppointment>('/appointments', payload)
  return mapAppointment(a)
}

export async function updateAppointment(id: string, payload: UpdateAppointmentPayload): Promise<Appointment> {
  const a = await apiClient.patch<BackendAppointment>(`/appointments/${id}`, payload)
  return mapAppointment(a)
}

export async function deleteAppointment(id: string): Promise<void> {
  await apiClient.delete(`/appointments/${id}`)
}
