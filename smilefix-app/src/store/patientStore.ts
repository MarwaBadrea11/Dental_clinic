import { create } from 'zustand'
import type { Patient, MedicalHistoryEntry } from '@/types'

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_PATIENTS: Patient[] = [
  {
    id: '1', patientCode: 'SF-90210', firstName: 'Sarah', lastName: 'Miller',
    dateOfBirth: '1985-03-14', gender: 'female', phone: '+1 (555) 234-5678',
    email: 'sarah.miller@email.com', address: '142 Maple Street', city: 'Los Angeles',
    bloodType: 'A+', allergies: ['Penicillin', 'Latex'],
    emergencyContact: { name: 'Tom Miller', phone: '+1 (555) 234-5679', relation: 'Spouse' },
    lastVisit: '2023-10-12', nextAppointment: '2024-01-15',
    assignedDoctor: 'Dr. Smith', insuranceProvider: 'BlueCross', insuranceNumber: 'BC-88421',
    status: 'active', balance: 0, createdAt: '2021-06-10',
    notes: 'Patient prefers morning appointments. Mild anxiety about procedures.',
  },
  {
    id: '2', patientCode: 'SF-88421', firstName: 'James', lastName: 'Wilson',
    dateOfBirth: '1992-07-22', gender: 'male', phone: '+1 (555) 345-6789',
    email: 'james.wilson@email.com', address: '88 Oak Avenue', city: 'Beverly Hills',
    bloodType: 'O+', allergies: [],
    emergencyContact: { name: 'Lisa Wilson', phone: '+1 (555) 345-6790', relation: 'Sister' },
    lastVisit: '2023-10-14', nextAppointment: '2024-01-20',
    assignedDoctor: 'Dr. Peterson', insuranceProvider: 'Aetna', insuranceNumber: 'AE-77310',
    status: 'active', balance: 1240, createdAt: '2022-01-15',
    notes: 'Overdue balance. Payment plan in discussion.',
  },
  {
    id: '3', patientCode: 'SF-77310', firstName: 'Elena', lastName: 'Rodriguez',
    dateOfBirth: '1998-11-05', gender: 'female', phone: '+1 (555) 456-7890',
    email: 'elena.r@email.com', address: '33 Palm Drive', city: 'Santa Monica',
    bloodType: 'B+', allergies: ['Aspirin'],
    emergencyContact: { name: 'Maria Rodriguez', phone: '+1 (555) 456-7891', relation: 'Mother' },
    lastVisit: '2023-10-15', nextAppointment: '2024-02-01',
    assignedDoctor: 'Dr. Smith', insuranceProvider: 'United Health', insuranceNumber: 'UH-66201',
    status: 'active', balance: 0, createdAt: '2020-09-03',
  },
  {
    id: '4', patientCode: 'SF-66201', firstName: 'Michael', lastName: 'Chang',
    dateOfBirth: '1979-04-18', gender: 'male', phone: '+1 (555) 567-8901',
    email: 'michael.chang@email.com', address: '7 Sunset Blvd', city: 'Hollywood',
    bloodType: 'AB-', allergies: ['Codeine'],
    emergencyContact: { name: 'Amy Chang', phone: '+1 (555) 567-8902', relation: 'Wife' },
    lastVisit: '2023-10-16', assignedDoctor: 'Dr. Lee',
    status: 'pending', balance: 350, createdAt: '2023-03-22',
  },
  {
    id: '5', patientCode: 'SF-55102', firstName: 'Olivia', lastName: 'Thompson',
    dateOfBirth: '2001-08-30', gender: 'female', phone: '+1 (555) 678-9012',
    email: 'olivia.t@email.com', address: '19 Willow Lane', city: 'Pasadena',
    bloodType: 'O-', allergies: [],
    lastVisit: '2023-09-28', assignedDoctor: 'Dr. Smith',
    status: 'active', balance: 0, createdAt: '2023-07-11',
  },
  {
    id: '6', patientCode: 'SF-44033', firstName: 'David', lastName: 'Park',
    dateOfBirth: '1965-12-01', gender: 'male', phone: '+1 (555) 789-0123',
    email: 'david.park@email.com', address: '55 Cedar Court', city: 'Burbank',
    bloodType: 'A-', allergies: ['Sulfa drugs', 'Ibuprofen'],
    lastVisit: '2023-08-10', assignedDoctor: 'Dr. Peterson',
    status: 'inactive', balance: 0, createdAt: '2019-04-05',
  },
  {
    id: '7', patientCode: 'SF-33021', firstName: 'Priya', lastName: 'Sharma',
    dateOfBirth: '1990-02-14', gender: 'female', phone: '+1 (555) 890-1234',
    email: 'priya.sharma@email.com', address: '101 Jasmine Way', city: 'Glendale',
    bloodType: 'B-', allergies: [],
    lastVisit: '2023-10-01', nextAppointment: '2024-01-08',
    assignedDoctor: 'Dr. Smith', insuranceProvider: 'Cigna', insuranceNumber: 'CG-33021',
    status: 'active', balance: 0, createdAt: '2021-11-20',
  },
  {
    id: '8', patientCode: 'SF-22010', firstName: 'Robert', lastName: 'Johnson',
    dateOfBirth: '1955-06-25', gender: 'male', phone: '+1 (555) 901-2345',
    email: 'robert.j@email.com', address: '200 Elm Street', city: 'Torrance',
    bloodType: 'O+', allergies: ['Amoxicillin'],
    lastVisit: '2023-07-20', assignedDoctor: 'Dr. Lee',
    status: 'active', balance: 180, createdAt: '2018-02-14',
  },
]

export const MOCK_HISTORY: MedicalHistoryEntry[] = [
  {
    id: 'h1', patientId: '1', date: '2023-10-12', type: 'treatment',
    title: 'Root Canal — Upper Right Molar (#14)',
    description: 'Completed root canal therapy on tooth #14. Patient tolerated procedure well. Post-op instructions given. Follow-up in 6 weeks.',
    doctor: 'Dr. Smith', cost: 1200, status: 'completed',
    attachments: [
      { id: 'a1', name: 'Pre-op X-Ray.jpg', type: 'xray', url: '', size: '2.4 MB', uploadedAt: '2023-10-12', uploadedBy: 'Dr. Smith' },
      { id: 'a2', name: 'Post-op X-Ray.jpg', type: 'xray', url: '', size: '2.1 MB', uploadedAt: '2023-10-12', uploadedBy: 'Dr. Smith' },
    ],
  },
  {
    id: 'h2', patientId: '1', date: '2023-08-05', type: 'prescription',
    title: 'Amoxicillin 500mg — 7-day course',
    description: 'Prescribed for post-extraction infection prevention. 3x daily with food.',
    doctor: 'Dr. Smith', cost: 45, status: 'completed',
  },
  {
    id: 'h3', patientId: '1', date: '2023-06-20', type: 'xray',
    title: 'Full Mouth X-Ray Series',
    description: 'Annual full-mouth radiographic survey. No significant pathology detected. Mild calculus buildup noted on lower anteriors.',
    doctor: 'Dr. Peterson', cost: 180, status: 'completed',
    attachments: [
      { id: 'a3', name: 'FMX-2023.pdf', type: 'pdf', url: '', size: '8.7 MB', uploadedAt: '2023-06-20', uploadedBy: 'Dr. Peterson' },
    ],
  },
  {
    id: 'h4', patientId: '1', date: '2023-03-15', type: 'treatment',
    title: 'Dental Cleaning & Polish',
    description: 'Routine prophylaxis. Scaling and polishing completed. Oral hygiene instructions reinforced.',
    doctor: 'Dr. Smith', cost: 150, status: 'completed',
  },
  {
    id: 'h5', patientId: '1', date: '2022-10-08', type: 'diagnosis',
    title: 'Diagnosis: Early-stage Periodontitis',
    description: 'Pocket depths 4-5mm in posterior regions. Recommended deep cleaning and improved home care routine.',
    doctor: 'Dr. Peterson', status: 'active',
  },
  {
    id: 'h6', patientId: '1', date: '2024-01-15', type: 'appointment',
    title: 'Upcoming: Crown Placement Follow-up',
    description: 'Scheduled follow-up for crown placement on tooth #14 post root canal.',
    doctor: 'Dr. Smith', cost: 800, status: 'scheduled',
  },
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface PatientState {
  patients: Patient[]
  history: MedicalHistoryEntry[]
  selectedPatient: Patient | null
  loading: boolean
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
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: MOCK_PATIENTS,
  history: MOCK_HISTORY,
  selectedPatient: null,
  loading: false,
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
}))
