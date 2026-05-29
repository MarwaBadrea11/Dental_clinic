// ─────────────────────────────────────────────────────────────────────────────
// Patient Service — POST /patients, GET /patients, PUT /patients/:id
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient'
import type { Patient } from '@/types'

// ── Backend shape ─────────────────────────────────────────────────────────────

export interface BackendPatient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  national_id: string
  phone: string
  email: string | null
  address: string | null
  blood_type: string | null
  allergies: string[]
  medical_history: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// The backend returns: { success, data: BackendPatient[], meta: { total, limit, offset } }
// apiClient unwraps this into: { items: BackendPatient[], total, limit, offset }
export interface ListPatientsResponse {
  items: BackendPatient[]
  total: number
  limit: number
  offset: number
}

export interface CreatePatientPayload {
  first_name: string
  last_name: string
  date_of_birth: string          // YYYY-MM-DD
  gender: 'male' | 'female' | 'other'
  national_id: string
  phone: string
  email?: string | null
  address?: string | null
  blood_type?: string | null
  allergies?: string[]
  medical_history?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}

export type UpdatePatientPayload = Partial<CreatePatientPayload>

// ── Mapper: backend → frontend Patient ───────────────────────────────────────

export function mapPatient(p: BackendPatient): Patient {
  return {
    id: p.id,
    patientCode: p.national_id,
    firstName: p.first_name,
    lastName: p.last_name,
    dateOfBirth: p.date_of_birth?.split('T')[0] ?? p.date_of_birth,
    gender: p.gender as Patient['gender'],
    phone: p.phone,
    email: p.email ?? undefined,
    address: p.address ?? undefined,
    bloodType: (p.blood_type as Patient['bloodType']) ?? undefined,
    allergies: p.allergies ?? [],
    emergencyContact: p.emergency_contact_name
      ? { name: p.emergency_contact_name, phone: p.emergency_contact_phone ?? '', relation: '' }
      : undefined,
    notes: p.medical_history ?? undefined,
    status: 'active',
    createdAt: p.created_at.split('T')[0],
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchPatients(params?: {
  search?: string
  limit?: number
  offset?: number
}): Promise<{ patients: Patient[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.search)  qs.set('search', params.search)
  if (params?.limit)   qs.set('limit',  String(params.limit))
  if (params?.offset)  qs.set('offset', String(params.offset))

  const query = qs.toString() ? `?${qs}` : ''

  // Use raw fetch to access both data (array) and meta (total/limit/offset)
  const { getAccessToken } = await import('./authService')
  const token = getAccessToken()
  const res = await fetch(`${(await import('./apiClient')).API_BASE}/patients${query}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = await res.json()
  const rows: BackendPatient[] = Array.isArray(json.data) ? json.data : []
  const total: number = json.meta?.total ?? rows.length
  return { patients: rows.map(mapPatient), total }
}

export async function fetchPatientById(id: string): Promise<Patient> {
  const p = await apiClient.get<BackendPatient>(`/patients/${id}`)
  return mapPatient(p)
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
  const p = await apiClient.post<BackendPatient>('/patients', payload)
  return mapPatient(p)
}

export async function updatePatient(id: string, payload: UpdatePatientPayload): Promise<Patient> {
  const p = await apiClient.put<BackendPatient>(`/patients/${id}`, payload)
  return mapPatient(p)
}

export async function deletePatient(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/patients/${id}`)
}

// ── Attachment download ───────────────────────────────────────────────────────

export async function downloadAttachment(patientId: string, attachmentId: string, fileName: string): Promise<void> {
  const { getAccessToken } = await import('./authService')
  const token = getAccessToken()

  const res = await fetch(
    `http://localhost:3000/api/v1/patients/${patientId}/attachments/${attachmentId}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  )

  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
