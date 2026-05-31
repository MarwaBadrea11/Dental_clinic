// ─────────────────────────────────────────────────────────────────────────────
// Procedure Catalogue Service
// Endpoints:
//   GET   /procedures          — list catalogue entries
//   POST  /procedures          — create a new catalogue entry
//   PATCH /procedures/:id      — update a catalogue entry
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { Treatment, TreatmentCategory } from '@/types'

// ── Backend shape ─────────────────────────────────────────────────────────────

export interface BackendProcedure {
  id: string
  code: string
  name: string
  description: string | null
  default_cost: string | number
  category: string | null
  is_active: boolean
  duration_minutes: number | null
  icon: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface CreateProcedurePayload {
  code: string
  name: string
  description?: string | null
  default_cost: number
  category?: string | null
  duration_minutes?: number | null
  icon?: string | null
  color?: string | null
}

interface ListResponse {
  data: BackendProcedure[]
  total: number
  page: number
  limit: number
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function mapProcedureToTreatment(p: BackendProcedure): Treatment {
  return {
    id: p.id,
    name: p.name,
    category: (p.category ?? 'Preventive') as TreatmentCategory,
    duration: p.duration_minutes ?? 0,
    price: Number(p.default_cost),
    description: p.description ?? undefined,
    icon: p.icon ?? '🦷',
    color: p.color ?? '#00696f',
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Fetch all active catalogue entries (up to 100). */
export async function fetchProcedures(): Promise<Treatment[]> {
  const result = await apiClient.get<BackendProcedure[] | ListResponse>('/procedures?is_active=true&limit=100')
  // The list endpoint wraps data in { data, total, page, limit }
  const rows = Array.isArray(result) ? result : (result as ListResponse).data
  return rows.map(mapProcedureToTreatment)
}

/** Create a new catalogue entry and return it as a Treatment. */
export async function createProcedure(payload: CreateProcedurePayload): Promise<Treatment> {
  const proc = await apiClient.post<BackendProcedure>('/procedures', payload)
  return mapProcedureToTreatment(proc)
}

/** Update an existing catalogue entry. */
export async function updateProcedure(
  id: string,
  payload: Partial<CreateProcedurePayload> & { is_active?: boolean },
): Promise<Treatment> {
  const proc = await apiClient.patch<BackendProcedure>(`/procedures/${id}`, payload)
  return mapProcedureToTreatment(proc)
}
