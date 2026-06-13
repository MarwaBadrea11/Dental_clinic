// ─────────────────────────────────────────────
// Settings Service — clinic working hours
// ─────────────────────────────────────────────
import { api } from './api';

export interface WorkingHoursDay {
  dayOfWeek:    number        // 0 = Sunday … 6 = Saturday
  isOpen:       boolean
  morningStart: string | null // 'HH:mm' or null
  morningEnd:   string | null
  eveningStart: string | null
  eveningEnd:   string | null
}

/** Fetch the full 7-day clinic schedule. No auth required. */
export async function fetchWorkingHours(): Promise<WorkingHoursDay[]> {
  return api.get<WorkingHoursDay[]>('/settings/working-hours');
}

/**
 * Generate 30-minute time slots between two HH:mm strings.
 * e.g. generateSlots('09:00', '13:00') → ['09:00','09:30',…,'12:30']
 * Returns [] if either value is null/empty.
 */
export function generateSlots(start: string | null, end: string | null): string[] {
  if (!start || !end) return [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const h   = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    slots.push(`${h}:${min}`);
  }
  return slots;
}
