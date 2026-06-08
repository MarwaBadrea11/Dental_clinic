// ─────────────────────────────────────────────
// Dentist Service
// Wraps: GET /auth/users?role=DENTIST
// Returns the list of active dentists to
// populate the doctor picker in BookingScreen.
// ─────────────────────────────────────────────
import { api } from './api';

// ── Response shape ────────────────────────────
export interface BackendDentist {
  id: string;
  username: string;
  email: string;
  role: 'DENTIST';
}

/**
 * Fetch all active dentists from the backend.
 * Maps to the Doctor shape used in the Zustand store.
 */
export async function fetchDentists(): Promise<BackendDentist[]> {
  return api.get<BackendDentist[]>('/auth/users?role=DENTIST');
}
