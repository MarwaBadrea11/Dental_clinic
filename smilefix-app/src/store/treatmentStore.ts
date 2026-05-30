import { create } from 'zustand'
import type { Treatment, PatientTreatment, OdontogramRecord, ToothCondition } from '@/types'
import {
  fetchOdontogram,
  updateTooth,
  CONDITION_TO_STATUS,
} from '@/services/odontogramService'

// ── Mock treatments catalogue ─────────────────────────────────────────────────

export const MOCK_TREATMENTS: Treatment[] = [
  { id: 't1',  name: 'Dental Cleaning',        category: 'Preventive',     duration: 60,  price: 150,  color: '#35675d', icon: '🦷', description: 'Professional prophylaxis including scaling, polishing and fluoride treatment.' },
  { id: 't2',  name: 'Composite Filling',      category: 'Restorative',    duration: 45,  price: 220,  color: '#00696f', icon: '🔧', description: 'Tooth-colored resin filling for cavities and minor fractures.' },
  { id: 't3',  name: 'Root Canal Therapy',     category: 'Endodontic',     duration: 90,  price: 1200, color: '#ba1a1a', icon: '⚕',  description: 'Complete removal of infected pulp tissue and canal sealing.' },
  { id: 't4',  name: 'Periodontal Scaling',    category: 'Periodontic',    duration: 75,  price: 350,  color: '#2c6484', icon: '🔬', description: 'Deep cleaning below the gumline to treat periodontal disease.' },
  { id: 't5',  name: 'Crown Placement',        category: 'Prosthodontic',  duration: 120, price: 1500, color: '#9d4edd', icon: '👑', description: 'Full ceramic or PFM crown fabrication and cementation.' },
  { id: 't6',  name: 'Teeth Whitening',        category: 'Cosmetic',       duration: 60,  price: 400,  color: '#f4a261', icon: '✨', description: 'In-office bleaching with 35% hydrogen peroxide gel and LED activation.' },
  { id: 't7',  name: 'Braces Adjustment',      category: 'Orthodontic',    duration: 30,  price: 150,  color: '#e76f51', icon: '🔩', description: 'Monthly wire tightening and bracket adjustment for orthodontic treatment.' },
  { id: 't8',  name: 'Tooth Extraction',       category: 'Oral Surgery',   duration: 45,  price: 280,  color: '#6d6875', icon: '🦷', description: 'Simple or surgical extraction with local anesthesia.' },
  { id: 't9',  name: 'Dental Implant',         category: 'Prosthodontic',  duration: 120, price: 3500, color: '#9d4edd', icon: '🔩', description: 'Titanium implant placement with osseointegration period.' },
  { id: 't10', name: 'Invisalign Checkup',     category: 'Orthodontic',    duration: 20,  price: 100,  color: '#e76f51', icon: '📐', description: 'Progress evaluation and new aligner tray fitting.' },
  { id: 't11', name: 'Full Mouth X-Ray',       category: 'Preventive',     duration: 20,  price: 180,  color: '#35675d', icon: '🩻', description: 'Complete radiographic survey of all teeth and supporting structures.' },
  { id: 't12', name: 'Gum Contouring',         category: 'Cosmetic',       duration: 60,  price: 600,  color: '#f4a261', icon: '✂',  description: 'Laser reshaping of gum tissue for aesthetic improvement.' },
]

// ── Mock patient treatments ───────────────────────────────────────────────────

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
  patientTreatments: PatientTreatment[]
  odontograms: OdontogramRecord[]
  odontogramLoading: boolean

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
  treatments: MOCK_TREATMENTS,
  patientTreatments: MOCK_PATIENT_TREATMENTS,
  odontograms: [MOCK_ODONTOGRAM],
  odontogramLoading: false,

  addTreatment: (t) => set((s) => ({ treatments: [t, ...s.treatments] })),
  updateTreatment: (id, data) =>
    set((s) => ({ treatments: s.treatments.map((t) => t.id === id ? { ...t, ...data } : t) })),
  deleteTreatment: (id) =>
    set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) })),
  getPatientTreatments: (patientId) =>
    get().patientTreatments.filter((pt) => pt.patientId === patientId),
  getOdontogram: (patientId) =>
    get().odontograms.find((o) => o.patientId === patientId),

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
    // Optimistic local update first
    get().updateToothCondition(patientId, toothNumber, condition, notes)
    await updateTooth(patientId, toothNumber, {
      status: CONDITION_TO_STATUS[condition] ?? 'HEALTHY',
      notes: notes ?? null,
    })
  },

  addPatientTreatment: (pt) =>
    set((s) => ({ patientTreatments: [pt, ...s.patientTreatments] })),
}))
