// ─────────────────────────────────────────────────────────────────────────────
// Note Service — /api/v1/patients/:patientId/notes
// Handles Medical History Timeline entries.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { MedicalHistoryEntry } from '@/types'

// ── Backend shape ─────────────────────────────────────────────────────────────

interface BackendNote {
  id: string
  patientId: string
  type: MedicalHistoryEntry['type']
  title: string
  description: string
  doctor: string
  date: string
  status: string
  cost?: number
  createdAt: string
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapNote(n: BackendNote): MedicalHistoryEntry {
  return {
    id:          n.id,
    patientId:   n.patientId,
    type:        n.type,
    title:       n.title,
    description: n.description,
    doctor:      n.doctor,
    date:        n.date,
    status:      n.status as MedicalHistoryEntry['status'],
    cost:        n.cost,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Fetch all timeline notes for a patient. */
export async function fetchNotes(patientId: string): Promise<MedicalHistoryEntry[]> {
  const rows = await apiClient.get<BackendNote[]>(`/patients/${patientId}/notes`)
  return Array.isArray(rows) ? rows.map(mapNote) : []
}

export interface CreateNotePayload {
  type:        MedicalHistoryEntry['type']
  title:       string
  description: string
  doctor:      string
  date:        string
  status:      string
  cost?:       number | null
}

/** Create a new timeline note for a patient. */
export async function createNote(
  patientId: string,
  payload: CreateNotePayload,
): Promise<MedicalHistoryEntry> {
  const row = await apiClient.post<BackendNote>(`/patients/${patientId}/notes`, payload)
  return mapNote(row)
}

/** Delete a timeline note. */
export async function deleteNote(patientId: string, noteId: string): Promise<void> {
  await apiClient.delete<unknown>(`/patients/${patientId}/notes/${noteId}`)
}
