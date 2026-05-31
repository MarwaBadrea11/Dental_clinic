import { create } from 'zustand'
import type { Treatment, PatientTreatment, OdontogramRecord, ToothCondition } from '@/types'
import {
  fetchOdontogram,
  updateTooth,
  CONDITION_TO_STATUS,
} from '@/services/odontogramService'
import {
  fetchProcedures,
  createProcedure,
  updateProcedure,
  type CreateProcedurePayload,
} from '@/services/procedureService'

// ── Mock patient treatments (still local — no patient-treatment API yet) ──────

export const MOCK_PATIENT_TREATMENTS: PatientTreatment[] = [
  {
    id: 'pt1', patientId: '1', treatmentId: 't3', treatmentName: 'Root Canal Therapy',
    category: 'Endodontic', toothNumbers: [14], startDate: '2023-10-12', endDate: '2023-10-12',
    status: 'completed', doctor: 'Dr. Smith', cost: 1200,
    notes: 'Successful. Crown recommended within 3 months.',
    sessions: [
      { id: 's1', date: '2023-10-12', duration: 90, notes: 'Canal preparation and obturation completed.', doctor: 'Dr. Smith', completed: true },
    ],
  },
  {
    id: 'pt2', patientId: '1', treatmentId: 't5', treatmentName: 'Crown Placement',
    category: 'Prosthodontic', toothNumbers: [14], startDate: '2024-01-15',
    status: 'planned', doctor: 'Dr. Smith', cost: 1500,
    notes: 'Scheduled post root canal. Temporary crown in place.',
  },
  {
    id: 'pt3', patientId: '1', treatmentId: 't1', treatmentName: 'Dental Cleaning',
    category: 'Preventive', startDate: '2023-03-15', endDate: '2023-03-15',
    status: 'completed', doctor: 'Dr. Smith', cost: 150,
  },
  {
    id: 'pt4', patientId: '3', treatmentId: 't7', treatmentName: 'Braces Adjustment',
    category: 'Orthodontic', toothNumbers: [], startDate: '2022-06-01',
    status: 'in-progress', doctor: 'Dr. Smith', cost: 3600,
    notes: 'Monthly adjustments. Estimated completion: June 2024.',
    sessions: [
      { id: 's2', date: '2023-10-15', duration: 30, notes: 'Wire tightened, elastic changed.', doctor: 'Dr. Smith', completed: true },
      { id: 's3', date: '2023-11-15', duration: 30, notes: 'Good progress. Slight crowding resolved.', doctor: 'Dr. Smith', completed: true },
    ],
  },
]

// ── Mock odontogram ───────────────────────────────────────────────────────────

const buildDefaultTeeth = (): OdontogramRecord['teeth'] => {
  const teeth: OdontogramRecord['teeth'] = {}
  const allTeeth = [
    18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28,
    48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38,
  ]
  allTeeth.forEach((n) => {
    teeth[n] = { toothNumber: n, surfaces: {}, condition: 'healthy' }
  })
  return teeth
}

export const MOCK_ODONTOGRAM: OdontogramRecord = {
  id: 'od1', patientId: '1',
  createdAt: '2023-06-20', updatedAt: '2023-10-12',
  doctor: 'Dr. Smith',
  notes: 'Tooth #14 root canal completed. Crown pending. Mild calculus lower anteriors.',
  teeth: {
    ...buildDefaultTeeth(),
    14: { toothNumber: 14, surfaces: { occlusal: 'root-canal', buccal: 'crown' }, condition: 'root-canal', notes: 'RCT completed Oct 2023. Temp crown.', lastUpdated: '2023-10-12' },
    16: { toothNumber: 16, surfaces: { occlusal: 'filled' }, condition: 'filled', notes: 'Composite filling 2021.', lastUpdated: '2021-05-10' },
    36: { toothNumber: 36, surfaces: { occlusal: 'caries', mesial: 'caries' }, condition: 'caries', notes: 'Active caries. Treatment recommended.', lastUpdated: '2023-06-20' },
    38: { toothNumber: 38, surfaces: {}, condition: 'missing', notes: 'Extracted 2019.', lastUpdated: '2019-03-01' },
    48: { toothNumber: 48, surfaces: {}, condition: 'missing', notes: 'Extracted 2019.', lastUpdated: '2019-03-01' },
  },
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface TreatmentState {
  treatments: Treatment[]
  treatmentsLoading: boolean
  treatmentsError: string | null
  patientTreatments: PatientTreatment[]
  odontograms: OdontogramRecord[]
  odontogramLoading: boolean

  /** Load the procedure catalogue from the backend. */
  loadTreatments: () => Promise<void>
  /** Create a new catalogue entry via POST /procedures. */
  saveTreatment: (data: Omit<Treatment, 'id'>) => Promise<void>
  /** Update an existing catalogue entry via PATCH /procedures/:id. */
  editTreatment: (id: string, data: Omit<Treatment, 'id'>) => Promise<void>
  /** Soft-delete: sets is_active=false via PATCH /procedures/:id. */
  removeTreatment: (id: string) => Promise<void>
  /** Legacy in-memory helpers (still used by other parts of the app). */
  addTreatment: (t: Treatment) => void
  updateTreatment: (id: string, data: Partial<Treatment>) => void
  deleteTreatment: (id: string) => void
  getPatientTreatments: (patientId: string) => PatientTreatment[]
  getOdontogram: (patientId: string) => OdontogramRecord | undefined
  loadOdontogram: (patientId: string) => Promise<void>
  updateToothCondition: (patientId: string, toothNumber: number, condition: ToothCondition, notes?: string) => void
  syncToothToBackend: (patientId: string, toothNumber: number, condition: ToothCondition, notes?: string) => Promise<void>
  addPatientTreatment: (pt: PatientTreatment) => void
}

export const useTreatmentStore = create<TreatmentState>((set, get) => ({
  treatments: [],
  treatmentsLoading: false,
  treatmentsError: null,
  patientTreatments: MOCK_PATIENT_TREATMENTS,
  odontograms: [MOCK_ODONTOGRAM],
  odontogramLoading: false,

  // ── Catalogue API actions ───────────────────────────────────────────────────

  loadTreatments: async () => {
    set({ treatmentsLoading: true, treatmentsError: null })
    try {
      const data = await fetchProcedures()
      set({ treatments: data, treatmentsLoading: false })
    } catch (err) {
      console.error('[treatments] loadTreatments failed:', err)
      set({ treatmentsLoading: false, treatmentsError: 'Failed to load treatments' })
    }
  },

  saveTreatment: async (data) => {
    // Build a unique code: name → uppercase slug + timestamp suffix to avoid collisions
    const slug = data.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 14)
    const code = `${slug}_${Date.now().toString(36).toUpperCase()}`.slice(0, 20)

    const payload: CreateProcedurePayload = {
      code,
      name: data.name,
      description: data.description ?? null,
      default_cost: data.price,
      category: data.category,
      duration_minutes: data.duration,
      icon: data.icon ?? null,
      color: data.color ?? null,
    }

    const created = await createProcedure(payload)
    set((s) => ({ treatments: [created, ...s.treatments] }))
  },

  editTreatment: async (id, data) => {
    const payload: Partial<CreateProcedurePayload> = {
      name: data.name,
      description: data.description ?? null,
      default_cost: data.price,
      category: data.category,
      duration_minutes: data.duration,
      icon: data.icon ?? null,
      color: data.color ?? null,
    }

    const updated = await updateProcedure(id, payload)
    set((s) => ({
      treatments: s.treatments.map((t) => t.id === id ? updated : t),
    }))
  },

  removeTreatment: async (id) => {
    // Optimistic removal from UI, then soft-delete on the backend
    set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) }))
    try {
      await updateProcedure(id, { is_active: false })
    } catch (err) {
      // Rollback: reload the full list so the item reappears
      console.error('[treatments] removeTreatment failed, reloading:', err)
      const data = await fetchProcedures()
      set({ treatments: data })
      throw err
    }
  },

  // ── Legacy in-memory helpers ────────────────────────────────────────────────

  addTreatment: (t) => set((s) => ({ treatments: [t, ...s.treatments] })),
  updateTreatment: (id, data) =>
    set((s) => ({ treatments: s.treatments.map((t) => t.id === id ? { ...t, ...data } : t) })),
  deleteTreatment: (id) =>
    set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) })),
  getPatientTreatments: (patientId) =>
    get().patientTreatments.filter((pt) => pt.patientId === patientId),
  getOdontogram: (patientId) =>
    get().odontograms.find((o) => o.patientId === patientId),

  // ── Odontogram actions ──────────────────────────────────────────────────────

  loadOdontogram: async (patientId) => {
    set({ odontogramLoading: true })
    try {
      const record = await fetchOdontogram(patientId)
      set((s) => ({
        odontogramLoading: false,
        odontograms: [
          ...s.odontograms.filter((o) => o.patientId !== patientId),
          record,
        ],
      }))
    } catch (err) {
      console.error('[odontogram] loadOdontogram failed:', err)
      set({ odontogramLoading: false })
    }
  },

  updateToothCondition: (patientId, toothNumber, condition, notes) =>
    set((s) => ({
      odontograms: s.odontograms.map((o) =>
        o.patientId !== patientId ? o : {
          ...o,
          updatedAt: new Date().toISOString().split('T')[0],
          teeth: {
            ...o.teeth,
            [toothNumber]: {
              ...o.teeth[toothNumber],
              toothNumber,
              condition,
              notes: notes ?? o.teeth[toothNumber]?.notes,
              lastUpdated: new Date().toISOString().split('T')[0],
            },
          },
        }
      ),
    })),

  syncToothToBackend: async (patientId, toothNumber, condition, notes) => {
    get().updateToothCondition(patientId, toothNumber, condition, notes)
    await updateTooth(patientId, toothNumber, {
      status: CONDITION_TO_STATUS[condition] ?? 'HEALTHY',
      notes: notes ?? null,
    })
  },

  addPatientTreatment: (pt) =>
    set((s) => ({ patientTreatments: [pt, ...s.patientTreatments] })),
}))
