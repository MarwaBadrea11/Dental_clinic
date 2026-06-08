// ─────────────────────────────────────────────
// Procedure Service
// Wraps: GET /procedures
// Returns the catalog of dental procedures to
// populate the service picker in BookingScreen.
// ─────────────────────────────────────────────
import { api } from './api';

// ── Response shape ────────────────────────────
export interface BackendProcedure {
  id: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  default_duration_minutes: number;
  default_price: number;
  category?: string | null;
  is_active: boolean;
}

export interface ProcedureListResponse {
  procedures: BackendProcedure[];
  total?: number;
}

/**
 * Fetch the active procedure catalog.
 * Used to populate the "Select Service" step in BookingScreen.
 */
export async function fetchProcedures(): Promise<BackendProcedure[]> {
  const result = await api.get<ProcedureListResponse | BackendProcedure[]>('/procedures');

  // Backend may return the array directly or wrapped in { procedures: [] }
  if (Array.isArray(result)) return result;
  return result.procedures ?? [];
}
