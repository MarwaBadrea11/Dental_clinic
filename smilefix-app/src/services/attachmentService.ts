// ─────────────────────────────────────────────────────────────────────────────
// Attachment Service — /api/v1/patients/:id/attachments
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE } from './apiClient'
import { getAccessToken } from './authService'
import type { Attachment } from '@/types'

// ── Backend shape ─────────────────────────────────────────────────────────────

export interface BackendAttachment {
  id: string
  patient_id: string
  treatment_plan_id: string | null
  appointment_id: string | null
  tooth_number: number | null
  type: 'PHOTO' | 'XRAY' | 'DOCUMENT'
  file_name: string
  storage_key: string
  mime_type: string
  file_size_bytes: number
  uploaded_by: string | null
  notes: string | null
  deleted_at: string | null
  created_at: string
}

// ── Mapper: backend → frontend Attachment ─────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mapType(backendType: BackendAttachment['type'], mimeType: string, fileName: string): Attachment['type'] {
  if (backendType === 'XRAY') return 'xray'
  if (backendType === 'PHOTO') return 'image'
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'document'
}

export function mapAttachment(a: BackendAttachment): Attachment {
  return {
    id:         a.id,
    name:       a.file_name,
    type:       mapType(a.type, a.mime_type, a.file_name),
    url:        `${API_BASE}/api/v1/patients/${a.patient_id}/attachments/${a.id}/download`,
    size:       formatBytes(a.file_size_bytes),
    uploadedAt: a.created_at.split('T')[0],
    uploadedBy: a.uploaded_by ?? 'Unknown',
  }
}

// ── Shared auth header helper ─────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/patients/:patientId/attachments
 * Returns all non-deleted attachments for a patient.
 */
export async function fetchAttachments(patientId: string): Promise<Attachment[]> {
  const res = await fetch(`${API_BASE}/api/v1/patients/${patientId}/attachments`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to load attachments')
  const json = await res.json()
  const rows: BackendAttachment[] = Array.isArray(json.data) ? json.data : []
  return rows.map(mapAttachment)
}

/**
 * POST /api/v1/patients/:patientId/attachments  (multipart/form-data)
 * Uploads one file and optional metadata fields.
 */
export async function uploadAttachment(
  patientId: string,
  file: File,
  meta?: {
    treatmentPlanId?: string
    appointmentId?: string
    toothNumber?: number
    notes?: string
  },
): Promise<Attachment> {
  const form = new FormData()
  form.append('file', file)
  if (meta?.treatmentPlanId) form.append('treatment_plan_id', meta.treatmentPlanId)
  if (meta?.appointmentId)   form.append('appointment_id',   meta.appointmentId)
  if (meta?.toothNumber)     form.append('tooth_number',     String(meta.toothNumber))
  if (meta?.notes)           form.append('notes',            meta.notes)

  const res = await fetch(`${API_BASE}/api/v1/patients/${patientId}/attachments`, {
    method: 'POST',
    headers: authHeaders(),   // no Content-Type — browser sets multipart boundary automatically
    body: form,
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Upload failed')
  }

  const json = await res.json()
  return mapAttachment(json.data as BackendAttachment)
}

/**
 * DELETE /api/v1/patients/:patientId/attachments/:attachmentId
 * Soft-deletes the attachment record and removes the physical file.
 */
export async function deleteAttachment(patientId: string, attachmentId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/patients/${patientId}/attachments/${attachmentId}`,
    { method: 'DELETE', headers: authHeaders() },
  )
  if (!res.ok && res.status !== 204) throw new Error('Delete failed')
}

/**
 * GET /api/v1/patients/:patientId/attachments/:attachmentId/download
 * Streams the file and triggers a browser download.
 */
export async function downloadAttachmentFile(
  patientId: string,
  attachmentId: string,
  fileName: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/patients/${patientId}/attachments/${attachmentId}/download`,
    { headers: authHeaders() },
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
