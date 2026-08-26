// ─────────────────────────────────────────────
// Dentist Service
// Wraps: GET /auth/dentists
// Patient-accessible endpoint — only requires
// a valid auth token, no extra permissions.
// ─────────────────────────────────────────────
import { api } from './api';

export interface BackendDentist {
  id: string;
  username: string;
  email: string;
  role: 'DENTIST';
}

/**
 * Fetch all active dentists.
 * Uses /auth/dentists — accessible to PATIENT role with only authentication.
 */
export async function fetchDentists(): Promise<BackendDentist[]> {
  const result = await api.get<BackendDentist[] | any>('/auth/dentists');
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}
