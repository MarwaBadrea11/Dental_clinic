// ─────────────────────────────────────────────
// Patient Service
// Wraps: GET /patients/me
// Resolves the patient record linked to the
// currently logged-in user account.
// ─────────────────────────────────────────────
import { api } from './api';
import type { Patient } from '../store/appStore';

// ── Backend patient shape ─────────────────────
export interface BackendPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  national_id: string;
  phone: string;
  email: string | null;
  address: string | null;
  blood_type: string | null;
  allergies: string[];
  medical_history: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch the patient record that matches the logged-in user account.
 * Returns null if the user has no linked patient record yet.
 *
 * @param accessToken  Pass the freshly-obtained token explicitly when calling
 *                     this before setAuthenticated() has stored it in the store.
 *                     If omitted, the token is read from the Zustand store as usual.
 */
export async function fetchMyPatient(accessToken?: string): Promise<BackendPatient | null> {
  try {
    const options = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined;
    return await api.get<BackendPatient>('/patients/me', options);
  } catch (err: any) {
    // 404 = no patient record found — not a crash, just unlinked
    if (err?.status === 404) return null;
    throw err;
  }
}

/**
 * Map a BackendPatient to the Patient shape the Zustand store expects.
 */
export function adaptPatient(bp: BackendPatient, fallbackEmail?: string): Patient {
  return {
    id:          bp.id,
    fullName:    `${bp.first_name} ${bp.last_name}`.trim(),
    phone:       bp.phone,
    nationalId:  bp.national_id,
    dateOfBirth: bp.date_of_birth,
    gender:      (bp.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
    email:       bp.email ?? fallbackEmail,
  };
}
