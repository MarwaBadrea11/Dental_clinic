// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Service — /api/v1/dashboard/*
// Types are the authoritative frontend contract. They mirror dashboard.types.ts
// on the backend — if the backend shape changes, update here too.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'

// ── Raw API response shapes (what the backend sends over the wire) ────────────

export interface DashboardStats {
  totalPatients: number
  patientsThisMonth: number
  todayAppointments: number
  pendingPayments: {
    total: number
    overdueCount: number
  }
  /** Percentage with one decimal place, e.g. 94.2 */
  clinicEfficiency: number
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

/** Raw row returned by GET /dashboard/recent-patients */
export interface RecentPatient {
  id: string
  first_name: string
  last_name: string
  national_id: string
  phone: string
  email: string | null
  last_visit: string | null           // ISO timestamp or null (no appointments yet)
  last_treatment: string | null
  appointment_status: AppointmentStatus | null
}

/** Raw row returned by GET /dashboard/today-schedule */
export interface ScheduleEntry {
  id: string
  scheduled_at: string                // ISO timestamp
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  patient_id: string
  patient_name: string                // "First Last"
  treatment_description: string
}

// ── Mapped UI types (consumed by dashboard components) ────────────────────────

/** Shape consumed by <AppointmentSummary patients={…} /> */
export interface DashboardPatientRow {
  id: string        // UUID — used for navigation to /patients/:id
  code: string      // national_id — displayed as "ID: SF-90210"
  name: string
  lastVisit: string
  treatment: string
  status: 'completed' | 'scheduled' | 'active' | 'cancelled' | 'pending'
}

/** Shape consumed by <UpcomingAppointments items={…} /> */
export interface DashboardScheduleItem {
  time: string
  patient: string
  treatment: string
  active: boolean
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapAppointmentStatus(s: AppointmentStatus | null): DashboardPatientRow['status'] {
  switch (s) {
    case 'COMPLETED':              return 'completed'
    case 'SCHEDULED':
    case 'CONFIRMED':              return 'scheduled'
    case 'IN_PROGRESS':            return 'active'
    case 'CANCELLED':              return 'cancelled'
    default:                       return 'pending'
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function mapRecentPatient(p: RecentPatient): DashboardPatientRow {
  return {
    id:        p.id,           // UUID — for /patients/:id navigation
    code:      p.national_id,  // display code shown in the table
    name:      `${p.first_name} ${p.last_name}`,
    lastVisit: formatDate(p.last_visit),
    treatment: p.last_treatment ?? 'General Visit',
    status:    mapAppointmentStatus(p.appointment_status),
  }
}

function mapScheduleEntry(e: ScheduleEntry, now: Date): DashboardScheduleItem {
  const start = new Date(e.scheduled_at)
  const end   = new Date(start.getTime() + e.duration_minutes * 60_000)
  return {
    time:      `${formatTime(e.scheduled_at)} – ${formatTime(end.toISOString())}`,
    patient:   e.patient_name,
    treatment: e.treatment_description,
    active:    start <= now && now <= end,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>('/dashboard/stats')
}

export async function fetchRecentPatients(): Promise<DashboardPatientRow[]> {
  const rows = await apiClient.get<RecentPatient[]>('/dashboard/recent-patients')
  return rows.map(mapRecentPatient)
}

export async function fetchTodaySchedule(): Promise<DashboardScheduleItem[]> {
  const entries = await apiClient.get<ScheduleEntry[]>('/dashboard/today-schedule')
  const now = new Date()
  return entries.map((e) => mapScheduleEntry(e, now))
}
