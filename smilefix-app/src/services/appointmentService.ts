// ─────────────────────────────────────────────────────────────────────────────
// Appointment Service — POST /appointments, GET /appointments
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
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  // joined fields (from GET list)
  patient_first_name?: string
  patient_last_name?: string
  patient_phone?: string
  dentist_username?: string
}

export interface CreateAppointmentPayload {
  patient_id: string
  dentist_id: string
  scheduled_at: string          // ISO datetime with offset e.g. 2026-05-28T09:00:00+00:00
  duration_minutes?: number
  notes?: string | null
}

// ── Mapper: backend → frontend Appointment ───────────────────────────────────

export function mapAppointment(a: BackendAppointment): Appointment {
  const dt = new Date(a.scheduled_at)
  const date = dt.toISOString().split('T')[0]
  const startTime = dt.toTimeString().slice(0, 5)
  const endDt = new Date(dt.getTime() + a.duration_minutes * 60 * 1000)
  const endTime = endDt.toTimeString().slice(0, 5)

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
      : a.patient_id,
    doctorId: a.dentist_id,
    doctorName: a.dentist_username ?? a.dentist_id,
    date,
    startTime,
    endTime,
    treatment: a.notes ?? 'Appointment',
    status: statusMap[a.status] ?? 'scheduled',
    notes: a.notes ?? undefined,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchAppointments(params?: {
  date?: string
  dentist_id?: string
  patient_id?: string
}): Promise<Appointment[]> {
  const qs = new URLSearchParams()
  if (params?.date)       qs.set('date',       params.date)
  if (params?.dentist_id) qs.set('dentist_id', params.dentist_id)
  if (params?.patient_id) qs.set('patient_id', params.patient_id)

  const query = qs.toString() ? `?${qs}` : ''
  const list = await apiClient.get<BackendAppointment[]>(`/appointments${query}`)
  return list.map(mapAppointment)
}

export async function bookAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const a = await apiClient.post<BackendAppointment>('/appointments', payload)
  return mapAppointment(a)
}
