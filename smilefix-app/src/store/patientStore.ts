import { create } from 'zustand'
import type { Patient, MedicalHistoryEntry } from '@/types'
import {
  fetchPatients,
  fetchPatientById,
  createPatient,
  updatePatient,
  deletePatient as deletePatientApi,
  type CreatePatientPayload,
  type UpdatePatientPayload,
} from '@/services/patientService'

// ── Store ─────────────────────────────────────────────────────────────────────

interface PatientState {
  patients: Patient[]
  history: MedicalHistoryEntry[]
  selectedPatient: Patient | null
  loading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string

  // Actions
  setPatients: (patients: Patient[]) => void
  addPatient: (patient: Patient) => void
  updatePatient: (id: string, data: Partial<Patient>) => void
  deletePatient: (id: string) => void
  selectPatient: (patient: Patient | null) => void
  setLoading: (loading: boolean) => void
  setSearchQuery: (q: string) => void
  setStatusFilter: (f: string) => void
  getPatientById: (id: string) => Patient | undefined
  getHistoryByPatientId: (id: string) => MedicalHistoryEntry[]
  addHistoryEntry: (entry: MedicalHistoryEntry) => void

  // API actions
  loadPatients: (params?: { search?: string; limit?: number; offset?: number }) => Promise<void>
  loadPatientById: (id: string) => Promise<Patient>
  createPatient: (payload: CreatePatientPayload) => Promise<Patient>
  updatePatientById: (id: string, payload: UpdatePatientPayload) => Promise<Patient>
  deletePatientById: (id: string) => Promise<void>
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  history: [],
  selectedPatient: null,
  loading: false,
  error: null,
  searchQuery: '',
  statusFilter: 'all',

  setPatients: (patients) => set({ patients }),
  addPatient: (patient) => set((s) => ({ patients: [patient, ...s.patients] })),
  updatePatient: (id, data) =>
    set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
  deletePatient: (id) =>
    set((s) => ({ patients: s.patients.filter((p) => p.id !== id) })),
  selectPatient: (patient) => set({ selectedPatient: patient }),
  setLoading: (loading) => set({ loading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  getPatientById: (id) => get().patients.find((p) => p.id === id),
  getHistoryByPatientId: (id) => get().history.filter((h) => h.patientId === id),
  addHistoryEntry: (entry) => set((s) => ({ history: [entry, ...s.history] })),

  // ── API actions ────────────────────────────────────────────────────────────

  loadPatients: async (params) => {
    set({ loading: true, error: null })
    try {
      const { patients } = await fetchPatients(params)
      set({ patients, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load patients' })
    }
  },

  loadPatientById: async (id) => {
    // Return from cache if already loaded
    const cached = get().patients.find((p) => p.id === id)
    if (cached) return cached

    const patient = await fetchPatientById(id)
    // Merge into store without replacing the full list
    set((s) => ({
      patients: s.patients.some((p) => p.id === id)
        ? s.patients.map((p) => (p.id === id ? patient : p))
        : [patient, ...s.patients],
    }))
    return patient
  },

  createPatient: async (payload) => {
    const patient = await createPatient(payload)
    set((s) => ({ patients: [patient, ...s.patients] }))
    return patient
  },

  updatePatientById: async (id, payload) => {
    const patient = await updatePatient(id, payload)
    set((s) => ({ patients: s.patients.map((p) => (p.id === id ? patient : p)) }))
    return patient
  },

  deletePatientById: async (id) => {
    // Optimistic removal — revert on error
    const previous = get().patients
    set((s) => ({ patients: s.patients.filter((p) => p.id !== id) }))
    try {
      await deletePatientApi(id)
    } catch (err) {
      // Revert optimistic update on failure
      set({ patients: previous })
      throw err
    }
  },
}))
