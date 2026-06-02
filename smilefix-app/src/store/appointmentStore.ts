import { create } from 'zustand'
import type { Appointment, AppointmentStatus } from '@/types'
import {
  fetchAppointments,
  bookAppointment,
  updateAppointment as apiUpdateAppointment,
  deleteAppointment as apiDeleteAppointment,
  type CreateAppointmentPayload,
  type UpdateAppointmentPayload,
  type AppointmentStats,
} from '@/services/appointmentService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date()
const d = (offset: number) => {
  const dt = new Date(today)
  dt.setDate(dt.getDate() + offset)
  return dt.toISOString().split('T')[0]
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1',  patientId: '3', patientName: 'Elena Rodriguez', patientCode: 'SF-77310', doctorId: 'd1', doctorName: 'Dr. Smith',    date: d(0),  startTime: '09:00', endTime: '10:30', treatment: 'Braces Adjustment',    treatmentCategory: 'Orthodontic',   status: 'in-progress', chair: 1, color: '#00696f' },
  { id: 'a2',  patientId: '4', patientName: 'Michael Chang',   patientCode: 'SF-66201', doctorId: 'd2', doctorName: 'Dr. Peterson', date: d(0),  startTime: '11:00', endTime: '12:00', treatment: 'Teeth Whitening',       treatmentCategory: 'Cosmetic',      status: 'confirmed',   chair: 2, color: '#35675d' },
  { id: 'a3',  patientId: '1', patientName: 'Sarah Miller',    patientCode: 'SF-90210', doctorId: 'd1', doctorName: 'Dr. Smith',    date: d(0),  startTime: '14:00', endTime: '15:30', treatment: 'Root Canal Follow-up',  treatmentCategory: 'Endodontic',    status: 'scheduled',   chair: 1, color: '#00696f' },
  { id: 'a4',  patientId: '2', patientName: 'James Wilson',    patientCode: 'SF-88421', doctorId: 'd3', doctorName: 'Dr. Lee',      date: d(0),  startTime: '16:00', endTime: '17:00', treatment: 'Dental Cleaning',       treatmentCategory: 'Preventive',    status: 'scheduled',   chair: 3, color: '#2c6484' },
  { id: 'a5',  patientId: '5', patientName: 'Olivia Thompson', patientCode: 'SF-55102', doctorId: 'd1', doctorName: 'Dr. Smith',    date: d(1),  startTime: '09:30', endTime: '10:30', treatment: 'Composite Filling',     treatmentCategory: 'Restorative',   status: 'confirmed',   chair: 1, color: '#00696f' },
  { id: 'a6',  patientId: '7', patientName: 'Priya Sharma',    patientCode: 'SF-33021', doctorId: 'd2', doctorName: 'Dr. Peterson', date: d(1),  startTime: '11:00', endTime: '12:30', treatment: 'Crown Placement',       treatmentCategory: 'Prosthodontic', status: 'confirmed',   chair: 2, color: '#35675d' },
  { id: 'a7',  patientId: '8', patientName: 'Robert Johnson',  patientCode: 'SF-22010', doctorId: 'd3', doctorName: 'Dr. Lee',      date: d(1),  startTime: '14:00', endTime: '15:00', treatment: 'Periodontal Scaling',   treatmentCategory: 'Periodontic',   status: 'scheduled',   chair: 3, color: '#2c6484' },
  { id: 'a8',  patientId: '6', patientName: 'David Park',      patientCode: 'SF-44033', doctorId: 'd1', doctorName: 'Dr. Smith',    date: d(2),  startTime: '10:00', endTime: '11:00', treatment: 'Extraction',            treatmentCategory: 'Oral Surgery',  status: 'scheduled',   chair: 1, color: '#00696f' },
  { id: 'a9',  patientId: '1', patientName: 'Sarah Miller',    patientCode: 'SF-90210', doctorId: 'd2', doctorName: 'Dr. Peterson', date: d(3),  startTime: '09:00', endTime: '10:00', treatment: 'X-Ray Series',          treatmentCategory: 'Preventive',    status: 'scheduled',   chair: 2, color: '#35675d' },
  { id: 'a10', patientId: '3', patientName: 'Elena Rodriguez', patientCode: 'SF-77310', doctorId: 'd1', doctorName: 'Dr. Smith',    date: d(-1), startTime: '10:00', endTime: '11:30', treatment: 'Braces Tightening',     treatmentCategory: 'Orthodontic',   status: 'completed',   chair: 1, color: '#00696f' },
  { id: 'a11', patientId: '2', patientName: 'James Wilson',    patientCode: 'SF-88421', doctorId: 'd3', doctorName: 'Dr. Lee',      date: d(-2), startTime: '14:00', endTime: '15:00', treatment: 'Consultation',          treatmentCategory: 'Preventive',    status: 'no-show',     chair: 3, color: '#2c6484' },
  { id: 'a12', patientId: '4', patientName: 'Michael Chang',   patientCode: 'SF-66201', doctorId: 'd2', doctorName: 'Dr. Peterson', date: d(-3), startTime: '11:00', endTime: '12:00', treatment: 'Implant Consultation',  treatmentCategory: 'Prosthodontic', status: 'completed',   chair: 2, color: '#35675d' },
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface AppointmentState {
  appointments: Appointment[]
  stats: AppointmentStats | null
  selectedDate: string
  viewMode: 'day' | 'week' | 'list'
  loading: boolean
  error: string | null

  addAppointment: (a: Appointment) => void
  updateAppointment: (id: string, data: Partial<Appointment>) => void
  deleteAppointment: (id: string) => void
  setSelectedDate: (date: string) => void
  setViewMode: (mode: 'day' | 'week' | 'list') => void
  getByDate: (date: string) => Appointment[]
  getByPatient: (patientId: string) => Appointment[]
  getByWeek: (startDate: string) => Appointment[]

  // API actions
  loadAppointments: (params?: {
    date?: string
    start_date?: string
    end_date?: string
    dentist_id?: string
    patient_id?: string
  }) => Promise<void>
  bookAppointment: (payload: CreateAppointmentPayload) => Promise<Appointment>
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>
  removeAppointment: (id: string) => Promise<void>
}

// Map frontend status (kebab-case) → backend status (UPPER_SNAKE)
const toBackendStatus = (s: AppointmentStatus): string => {
  const map: Record<AppointmentStatus, string> = {
    'scheduled':   'SCHEDULED',
    'confirmed':   'CONFIRMED',
    'in-progress': 'IN_PROGRESS',
    'completed':   'COMPLETED',
    'cancelled':   'CANCELLED',
    'no-show':     'NO_SHOW',
  }
  return map[s] ?? s.toUpperCase()
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  stats: null,
  selectedDate: d(0),
  viewMode: 'week',
  loading: false,
  error: null,

  addAppointment: (a) => set((s) => ({ appointments: [a, ...s.appointments] })),
  updateAppointment: (id, data) =>
    set((s) => ({ appointments: s.appointments.map((a) => a.id === id ? { ...a, ...data } : a) })),
  deleteAppointment: (id) =>
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setViewMode: (viewMode) => set({ viewMode }),
  getByDate: (date) => get().appointments.filter((a) => a.date === date),
  getByPatient: (patientId) => get().appointments.filter((a) => a.patientId === patientId),
  getByWeek: (startDate) => {
    const start = new Date(startDate)
    const end = new Date(startDate)
    end.setDate(end.getDate() + 6)
    return get().appointments.filter((a) => {
      const dt = new Date(a.date)
      return dt >= start && dt <= end
    })
  },

  // ── API actions ────────────────────────────────────────────────────────────

  loadAppointments: async (params) => {
    set({ loading: true, error: null })
    try {
      const { appointments, stats } = await fetchAppointments(params)
      set({ appointments, stats, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load appointments'
      set({ appointments: [], loading: false, error: message })
    }
  },

  bookAppointment: async (payload) => {
    const appointment = await bookAppointment(payload)
    // Reload full list so patient/doctor names (joined fields) are accurate
    // and stats stay in sync with the new record
    await get().loadAppointments()
    return appointment
  },

  updateAppointmentStatus: async (id, status) => {
    // Optimistic update
    get().updateAppointment(id, { status })
    try {
      const payload: UpdateAppointmentPayload = { status: toBackendStatus(status) }
      await apiUpdateAppointment(id, payload)
    } catch (err) {
      // Revert on failure — reload from server
      get().loadAppointments()
      throw err
    }
  },

  removeAppointment: async (id) => {
    // Optimistic remove
    get().deleteAppointment(id)
    try {
      await apiDeleteAppointment(id)
    } catch (err) {
      // Revert on failure — reload from server
      get().loadAppointments()
      throw err
    }
  },
}))
