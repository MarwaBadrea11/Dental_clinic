// ─────────────────────────────────────────────────────────────────────────────
// Patient search hook — TanStack Query wrapper for global header search
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { searchPatients } from '@/services/patientService'
import type { Patient } from '@/types'
import { ApiError } from '@/services/apiClient'

export const patientSearchKeys = {
  all:   ['patients', 'search'] as const,
  query: (q: string) => ['patients', 'search', q] as const,
}

interface UsePatientSearchOptions {
  enabled?: boolean
  limit?: number
}

/** Fetches patients matching a debounced search query. */
export function usePatientSearch(query: string, options: UsePatientSearchOptions = {}) {
  const { enabled = true, limit = 8 } = options
  const trimmed = query.trim()

  return useQuery<Patient[], ApiError>({
    queryKey: patientSearchKeys.query(trimmed),
    queryFn:  () => searchPatients(trimmed, limit),
    enabled:  enabled && trimmed.length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
