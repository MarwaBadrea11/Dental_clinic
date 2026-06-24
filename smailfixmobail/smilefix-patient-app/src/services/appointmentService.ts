// ─────────────────────────────────────────────
// Appointment Service
// Wraps: POST   /appointments
//        GET    /appointments
//        GET    /appointments/:id
//        PATCH  /appointments/:id
// ─────────────────────────────────────────────
import { api } from './api';

// ── Appointment status values (mirrors backend enum) ─
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

// ── Response shape from the backend ──────────
export interface BackendAppointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  treatment_plan_id: string | null;
  chair_number: string | null;
  treatment_name: string | null;
  scheduled_at: string;         // ISO 8601
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (when backend includes them)
  dentist_username?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

// ── Request shape for creating an appointment ─
export interface CreateAppointmentRequest {
  patient_id: string;
  dentist_id: string;
  scheduled_at: string;         // ISO 8601 with timezone offset
  duration_minutes: number;
  status?: AppointmentStatus;
  treatment_name?: string | null;
  treatment_plan_id?: string | null;
  chair_number?: string | null;
  notes?: string | null;
}

// ── Request shape for updating an appointment ─
export interface UpdateAppointmentRequest {
  scheduled_at?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  treatment_name?: string | null;
  dentist_id?: string;
  treatment_plan_id?: string | null;
  chair_number?: string | null;
  notes?: string | null;
}

// ── Query params for listing appointments ─────
export interface ListAppointmentsParams {
  patient_id?: string;
  dentist_id?: string;
  date?: string;                // YYYY-MM-DD
  start_date?: string;          // YYYY-MM-DD
  end_date?: string;            // YYYY-MM-DD
}

// Backend list response — { appointments: [], stats: {} }
export interface AppointmentsListResponse {
  appointments: BackendAppointment[];
  stats?: {
    today?: number;
    thisWeek?: number;
    confirmed?: number;
    pending?: number;
    total?: number;
    scheduled?: number;
    completed?: number;
    cancelled?: number;
  };
}

// ── Helper: build query string ────────────────
function toQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
}

// ── Service functions ─────────────────────────

/**
 * Book a new appointment.
 * `scheduled_at` must be an ISO 8601 string with a timezone offset,
 * e.g. "2026-06-10T09:00:00+03:00"
 */
export async function createAppointment(
  data: CreateAppointmentRequest,
): Promise<BackendAppointment> {
  return api.post<BackendAppointment>('/appointments', data);
}

/**
 * Fetch appointments, optionally filtered by patient, dentist, or date range.
 */
export async function listAppointments(
  params: ListAppointmentsParams = {},
): Promise<AppointmentsListResponse> {
  const qs = toQueryString(params as Record<string, string | undefined>);
  return api.get<AppointmentsListResponse>(`/appointments${qs}`);
}

/**
 * Fetch a single appointment by its UUID.
 */
export async function getAppointment(id: string): Promise<BackendAppointment> {
  return api.get<BackendAppointment>(`/appointments/${id}`);
}

/**
 * Update an existing appointment (partial update).
 */
export async function updateAppointment(
  id: string,
  data: UpdateAppointmentRequest,
): Promise<BackendAppointment> {
  return api.patch<BackendAppointment>(`/appointments/${id}`, data);
}

/**
 * Hard-delete an appointment by ID.
 * Patients can only delete their own appointments.
 */
export async function deleteAppointment(id: string): Promise<void> {
  return api.delete<void>(`/appointments/${id}`);
}

/**
 * Convenience helper: combine a date string and time slot into the
 * ISO 8601 format the backend expects.
 *
 * @param date      'YYYY-MM-DD'
 * @param timeSlot  'HH:mm'
 * @param tzOffset  timezone offset string, default '+03:00' (Saudi Arabia)
 */
export function toScheduledAt(
  date: string,
  timeSlot: string,
  tzOffset = '+03:00',
): string {
  return `${date}T${timeSlot}:00${tzOffset}`;
}
