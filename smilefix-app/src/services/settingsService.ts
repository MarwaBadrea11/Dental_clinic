// ─────────────────────────────────────────────────────────────────────────────
// Settings Service — clinic working hours
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from './apiClient'

/** One row per weekday as returned by GET /settings/working-hours */
export interface WorkingHoursDay {
  dayOfWeek:    number        // 0 = Sunday … 6 = Saturday
  isOpen:       boolean
  morningStart: string | null // 'HH:mm' or null
  morningEnd:   string | null
  eveningStart: string | null
  eveningEnd:   string | null
  updatedAt?:   string
}

export const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

/** Fetch the full 7-day schedule from the backend. */
export async function fetchWorkingHours(): Promise<WorkingHoursDay[]> {
  return apiClient.get<WorkingHoursDay[]>('/settings/working-hours')
}

/** Persist the full 7-day schedule. Only ADMIN role can call this. */
export async function saveWorkingHours(
  schedule: WorkingHoursDay[],
): Promise<WorkingHoursDay[]> {
  return apiClient.put<WorkingHoursDay[]>('/settings/working-hours', { schedule })
}

// ── Slot generation helper (shared between web preview and mobile) ────────────

/**
 * Generate 30-minute time slots between `start` and `end` (HH:mm strings).
 * e.g. generateSlots('09:00', '13:00') → ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30']
 */
export function generateSlots(start: string | null, end: string | null): string[] {
  if (!start || !end) return []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin   = eh * 60 + em
  const slots: string[] = []
  for (let m = startMin; m < endMin; m += 30) {
    const h = Math.floor(m / 60).toString().padStart(2, '0')
    const min = (m % 60).toString().padStart(2, '0')
    slots.push(`${h}:${min}`)
  }
  return slots
}
