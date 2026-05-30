// ─────────────────────────────────────────────────────────────────────────────
// Odontogram Service
// Endpoints:
//   GET    /patients/:patientId/odontogram
//   PATCH  /patients/:patientId/odontogram/:toothNumber
//   GET    /patients/:patientId/odontogram/history
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { OdontogramRecord, ToothRecord, ToothCondition } from '@/types'

// ── Backend shapes ────────────────────────────────────────────────────────────

export type BackendToothStatus =
  | 'HEALTHY' | 'DECAYED' | 'FILLED' | 'MISSING' | 'CROWNED' | 'IMPLANT' | 'BRIDGE'

export type BackendToothSurface = 'M' | 'D' | 'O' | 'B' | 'L' | 'I'

export interface BackendToothState {
  status: BackendToothStatus
  notes: string | null
  surfaces: BackendToothSurface[]
}

export interface BackendOdontogram {
  patient_id: string
  teeth: Record<string, BackendToothState>
  updated_at: string | null
}

export interface BackendOdontogramHistoryEntry {
  id: string
  patient_id: string
  tooth_number: string
  previous_state: BackendToothState
  new_state: BackendToothState
  changed_by: string | null
  treatment_plan_id: string | null
  created_at: string
}

export interface UpdateToothPayload {
  status: BackendToothStatus
  notes?: string | null
  surfaces?: BackendToothSurface[]
  treatment_plan_id?: string | null
}

// ── Status mapping ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<BackendToothStatus, ToothCondition> = {
  HEALTHY:  'healthy',
  DECAYED:  'caries',
  FILLED:   'filled',
  MISSING:  'missing',
  CROWNED:  'crown',
  IMPLANT:  'implant',
  BRIDGE:   'bridge',
}

export const CONDITION_TO_STATUS: Record<ToothCondition, BackendToothStatus> = {
  healthy:    'HEALTHY',
  caries:     'DECAYED',
  filled:     'FILLED',
  missing:    'MISSING',
  crown:      'CROWNED',
  implant:    'IMPLANT',
  bridge:     'BRIDGE',
  'root-canal': 'FILLED',  // closest mapping; extend enum if needed
  extraction: 'MISSING',
  fracture:   'DECAYED',
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function mapOdontogram(patientId: string, backend: BackendOdontogram): OdontogramRecord {
  const teeth: OdontogramRecord['teeth'] = {}

  for (const [fdiKey, state] of Object.entries(backend.teeth)) {
    const toothNumber = parseInt(fdiKey, 10)
    if (isNaN(toothNumber)) continue

    teeth[toothNumber] = {
      toothNumber,
      condition: STATUS_MAP[state.status] ?? 'healthy',
      surfaces: {},
      notes: state.notes ?? undefined,
      lastUpdated: backend.updated_at ?? undefined,
    } satisfies ToothRecord
  }

  return {
    id: patientId,
    patientId,
    createdAt: backend.updated_at ?? new Date().toISOString(),
    updatedAt: backend.updated_at ?? new Date().toISOString(),
    teeth,
    doctor: '',
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchOdontogram(patientId: string): Promise<OdontogramRecord> {
  const data = await apiClient.get<BackendOdontogram>(`/patients/${patientId}/odontogram`)
  return mapOdontogram(patientId, data)
}

export async function createOdontogram(patientId: string): Promise<OdontogramRecord> {
  const data = await apiClient.post<BackendOdontogram>(`/patients/${patientId}/odontogram`, {})
  return mapOdontogram(patientId, data)
}

export async function updateTooth(
  patientId: string,
  toothNumber: string | number,
  payload: UpdateToothPayload,
): Promise<BackendToothState & { tooth_number: string; updated_at: string }> {
  return apiClient.patch(
    `/patients/${patientId}/odontogram/${toothNumber}`,
    payload,
  )
}

export async function fetchOdontogramHistory(
  patientId: string,
  toothNumber?: string | number,
): Promise<BackendOdontogramHistoryEntry[]> {
  const qs = toothNumber ? `?tooth_number=${toothNumber}` : ''
  return apiClient.get(`/patients/${patientId}/odontogram/history${qs}`)
}
