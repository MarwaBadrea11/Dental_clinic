import { create } from 'zustand'
import type { StaffMember, AttendanceRecord } from '@/types'
import {
  fetchStaff,
  fetchStaffById,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  fetchAttendance,
  logAttendance,
  updateAttendanceLog,
  deleteAttendanceLog,
  fetchSalaryRecords,
  createSalaryRecord,
  updateSalaryRecord,
  deleteSalaryRecord,
  fetchMonthlySalarySummary,
  type CreateStaffPayload,
  type UpdateStaffPayload,
  type CreateAttendancePayload,
  type CreateSalaryPayload,
  type BackendSalaryRecord,
} from '@/services/staffService'

// ── Store ─────────────────────────────────────────────────────────────────────

interface StaffState {
  staff: StaffMember[]
  attendance: AttendanceRecord[]
  salaryRecords: BackendSalaryRecord[]
  loading: boolean
  error: string | null

  // Sync helpers
  getStaffById: (id: string) => StaffMember | undefined
  getAttendanceByDate: (date: string) => AttendanceRecord[]
  getTodayAttendance: () => AttendanceRecord[]

  // API actions — Staff
  loadStaff: (params?: { search?: string; role?: string; status?: string }) => Promise<void>
  addStaff: (payload: CreateStaffPayload) => Promise<StaffMember>
  editStaff: (id: string, payload: UpdateStaffPayload) => Promise<StaffMember>
  removeStaff: (id: string) => Promise<void>

  // API actions — Attendance
  loadAttendance: (params?: { staff_id?: string; date?: string; from_date?: string; to_date?: string }) => Promise<void>
  addAttendance: (payload: CreateAttendancePayload) => Promise<AttendanceRecord>
  editAttendance: (id: string, payload: Partial<CreateAttendancePayload>) => Promise<AttendanceRecord>
  removeAttendance: (id: string) => Promise<void>

  // API actions — Salary
  loadSalaryRecords: (params?: { staff_id?: string; month?: number; year?: number }) => Promise<void>
  addSalaryRecord: (payload: CreateSalaryPayload) => Promise<BackendSalaryRecord>
  editSalaryRecord: (id: string, payload: Partial<CreateSalaryPayload>) => Promise<BackendSalaryRecord>
  removeSalaryRecord: (id: string) => Promise<void>
}

const todayStr = () => new Date().toISOString().split('T')[0]

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: [],
  attendance: [],
  salaryRecords: [],
  loading: false,
  error: null,

  // ── Sync helpers ───────────────────────────────────────────────────────────

  getStaffById: (id) => get().staff.find((m) => m.id === id),

  getAttendanceByDate: (date) => get().attendance.filter((a) => a.date === date),

  getTodayAttendance: () => get().attendance.filter((a) => a.date === todayStr()),

  // ── Staff API actions ──────────────────────────────────────────────────────

  loadStaff: async (params) => {
    set({ loading: true, error: null })
    try {
      const { staff } = await fetchStaff(params)
      set({ staff, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load staff' })
    }
  },

  addStaff: async (payload) => {
    const member = await createStaffMember(payload)
    set((s) => ({ staff: [member, ...s.staff] }))
    return member
  },

  editStaff: async (id, payload) => {
    const member = await updateStaffMember(id, payload)
    set((s) => ({ staff: s.staff.map((m) => (m.id === id ? member : m)) }))
    return member
  },

  removeStaff: async (id) => {
    const previous = get().staff
    set((s) => ({ staff: s.staff.filter((m) => m.id !== id) }))
    try {
      await deleteStaffMember(id)
    } catch (err) {
      set({ staff: previous })
      throw err
    }
  },

  // ── Attendance API actions ─────────────────────────────────────────────────

  loadAttendance: async (params) => {
    set({ loading: true, error: null })
    try {
      const records = await fetchAttendance(params)
      set({ attendance: records, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load attendance' })
    }
  },

  addAttendance: async (payload) => {
    const record = await logAttendance(payload)
    set((s) => {
      // Replace if same staff+date already exists, otherwise prepend
      const exists = s.attendance.some(
        (a) => a.employeeId === record.employeeId && a.date === record.date
      )
      return {
        attendance: exists
          ? s.attendance.map((a) =>
              a.employeeId === record.employeeId && a.date === record.date ? record : a
            )
          : [record, ...s.attendance],
      }
    })
    return record
  },

  editAttendance: async (id, payload) => {
    const record = await updateAttendanceLog(id, payload)
    set((s) => ({ attendance: s.attendance.map((a) => (a.id === id ? record : a)) }))
    return record
  },

  removeAttendance: async (id) => {
    const previous = get().attendance
    set((s) => ({ attendance: s.attendance.filter((a) => a.id !== id) }))
    try {
      await deleteAttendanceLog(id)
    } catch (err) {
      set({ attendance: previous })
      throw err
    }
  },

  // ── Salary API actions ─────────────────────────────────────────────────────

  loadSalaryRecords: async (params) => {
    set({ loading: true, error: null })
    try {
      const records = await fetchSalaryRecords(params)
      set({ salaryRecords: records, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load salary records' })
    }
  },

  addSalaryRecord: async (payload) => {
    const record = await createSalaryRecord(payload)
    set((s) => ({ salaryRecords: [record, ...s.salaryRecords] }))
    return record
  },

  editSalaryRecord: async (id, payload) => {
    const record = await updateSalaryRecord(id, payload)
    set((s) => ({ salaryRecords: s.salaryRecords.map((r) => (r.id === id ? record : r)) }))
    return record
  },

  removeSalaryRecord: async (id) => {
    const previous = get().salaryRecords
    set((s) => ({ salaryRecords: s.salaryRecords.filter((r) => r.id !== id) }))
    try {
      await deleteSalaryRecord(id)
    } catch (err) {
      set({ salaryRecords: previous })
      throw err
    }
  },
}))
