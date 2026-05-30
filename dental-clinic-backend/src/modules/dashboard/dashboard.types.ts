// ─── Stats ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  /** Total non-deleted patients in the system */
  totalPatients: number;
  /** Patients registered in the current calendar month */
  patientsThisMonth: number;
  /** Non-cancelled/no-show appointments scheduled for today */
  todayAppointments: number;
  pendingPayments: {
    /** Sum of (total_amount - amount_paid) across all OVERDUE invoices */
    total: number;
    /** Number of overdue invoices */
    overdueCount: number;
  };
  /**
   * Completed / total (non-cancelled) appointments in the last 30 days.
   * Expressed as a percentage with one decimal place, e.g. 94.2
   */
  clinicEfficiency: number;
}

// ─── Recent Patients ─────────────────────────────────────────────────────────

export type PatientAppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface RecentPatient {
  id: string;
  first_name: string;
  last_name: string;
  national_id: string;
  phone: string;
  email: string | null;
  /** ISO timestamp of the most recent non-cancelled appointment, or null */
  last_visit: string | null;
  /** Title of the linked treatment plan, or appointment notes, or 'General Visit' */
  last_treatment: string | null;
  /** Status of the most recent appointment */
  appointment_status: PatientAppointmentStatus | null;
}

// ─── Today's Schedule ────────────────────────────────────────────────────────

export interface ScheduleEntry {
  id: string;
  scheduled_at: string; // ISO timestamp
  duration_minutes: number;
  status: PatientAppointmentStatus;
  notes: string | null;
  patient_id: string;
  patient_name: string; // "First Last"
  /** Treatment plan title, appointment notes, or 'General Visit' */
  treatment_description: string;
}

// ─── API Response wrappers ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type DashboardStatsResponse   = ApiSuccess<DashboardStats>;
export type RecentPatientsResponse   = ApiSuccess<RecentPatient[]>;
export type TodayScheduleResponse    = ApiSuccess<ScheduleEntry[]>;
