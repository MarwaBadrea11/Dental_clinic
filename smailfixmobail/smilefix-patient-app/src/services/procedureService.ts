// ─────────────────────────────────────────────
// Procedure Service
// Wraps: GET /procedures
// Returns the catalog of dental procedures to
// populate the service picker in BookingScreen.
//
// DB column reference (procedure_catalog table):
//   id, code, name, description, default_cost,
//   category, is_active, duration_minutes,
//   icon, color, created_at, updated_at
// ─────────────────────────────────────────────
import { api } from './api';

// ── Response shape — matches actual DB columns ─
export interface BackendProcedure {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  /** Price column in DB is default_cost */
  default_cost: number;
  /** Duration column in DB is duration_minutes */
  duration_minutes: number | null;
  category?: string | null;
  is_active: boolean;
  icon?: string | null;
  color?: string | null;
}

/**
 * The backend wraps the paginated list in:
 *   successResponse(result.data, { total, page, limit })
 * So api.get unwraps .data → the procedures array directly.
 */
export async function fetchProcedures(): Promise<BackendProcedure[]> {
  const result = await api.get<BackendProcedure[] | { data: BackendProcedure[] }>('/procedures');

  // Guard: handle both array and { data: [] } shapes
  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).data)) return (result as any).data;
  return [];
}
