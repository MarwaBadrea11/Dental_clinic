import { create } from 'zustand'
import type { StaffMember, AttendanceRecord } from '@/types'

const today = new Date().toISOString().split('T')[0]

export const MOCK_STAFF: StaffMember[] = [
  { id: 'e1', employeeCode: 'EMP-001', firstName: 'Alexander', lastName: 'Smith',    role: 'doctor',       specialty: 'Orthodontist',   email: 'a.smith@smilefix.com',    phone: '+1 (555) 100-0001', status: 'active',   joinDate: '2019-03-15', department: 'Clinical',     salary: 12000, shift: 'morning',   workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: 'e2', employeeCode: 'EMP-002', firstName: 'Rachel',    lastName: 'Peterson', role: 'doctor',       specialty: 'Endodontist',    email: 'r.peterson@smilefix.com', phone: '+1 (555) 100-0002', status: 'active',   joinDate: '2020-06-01', department: 'Clinical',     salary: 11500, shift: 'morning',   workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: 'e3', employeeCode: 'EMP-003', firstName: 'James',     lastName: 'Lee',      role: 'doctor',       specialty: 'Periodontist',   email: 'j.lee@smilefix.com',      phone: '+1 (555) 100-0003', status: 'active',   joinDate: '2021-01-10', department: 'Clinical',     salary: 11000, shift: 'afternoon', workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: 'e4', employeeCode: 'EMP-004', firstName: 'Maria',     lastName: 'Santos',   role: 'nurse',        specialty: undefined,        email: 'm.santos@smilefix.com',   phone: '+1 (555) 100-0004', status: 'active',   joinDate: '2020-09-20', department: 'Clinical',     salary: 4800,  shift: 'morning',   workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: 'e5', employeeCode: 'EMP-005', firstName: 'Kevin',     lastName: 'Brown',    role: 'assistant',    specialty: undefined,        email: 'k.brown@smilefix.com',    phone: '+1 (555) 100-0005', status: 'active',   joinDate: '2022-03-01', department: 'Clinical',     salary: 3600,  shift: 'morning',   workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: 'e6', employeeCode: 'EMP-006', firstName: 'Sophie',    lastName: 'Turner',   role: 'receptionist', specialty: undefined,        email: 's.turner@smilefix.com',   phone: '+1 (555) 100-0006', status: 'active',   joinDate: '2021-07-15', department: 'Front Desk',   salary: 3200,  shift: 'full-day',  workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { id: 'e7', employeeCode: 'EMP-007', firstName: 'Daniel',    lastName: 'Kim',      role: 'hygienist',    specialty: undefined,        email: 'd.kim@smilefix.com',      phone: '+1 (555) 100-0007', status: 'on-leave', joinDate: '2020-11-01', department: 'Clinical',     salary: 5200,  shift: 'morning',   workingDays: ['Mon','Tue','Wed','Thu'] },
  { id: 'e8', employeeCode: 'EMP-008', firstName: 'Linda',     lastName: 'Garcia',   role: 'admin',        specialty: undefined,        email: 'l.garcia@smilefix.com',   phone: '+1 (555) 100-0008', status: 'active',   joinDate: '2018-05-20', department: 'Administration',salary: 4200, shift: 'full-day',  workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
]

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att1', employeeId: 'e1', date: today, checkIn: '08:55', checkOut: undefined, status: 'present' },
  { id: 'att2', employeeId: 'e2', date: today, checkIn: '09:02', checkOut: undefined, status: 'present' },
  { id: 'att3', employeeId: 'e3', date: today, checkIn: '13:05', checkOut: undefined, status: 'present' },
  { id: 'att4', employeeId: 'e4', date: today, checkIn: '08:48', checkOut: undefined, status: 'present' },
  { id: 'att5', employeeId: 'e5', date: today, checkIn: '09:15', checkOut: undefined, status: 'late' },
  { id: 'att6', employeeId: 'e6', date: today, checkIn: '08:58', checkOut: undefined, status: 'present' },
  { id: 'att7', employeeId: 'e7', date: today, checkIn: undefined, checkOut: undefined, status: 'leave' },
  { id: 'att8', employeeId: 'e8', date: today, checkIn: '09:00', checkOut: undefined, status: 'present' },
]

interface StaffState {
  staff: StaffMember[]
  attendance: AttendanceRecord[]

  addStaff: (s: StaffMember) => void
  updateStaff: (id: string, data: Partial<StaffMember>) => void
  deleteStaff: (id: string) => void
  getStaffById: (id: string) => StaffMember | undefined
  getAttendanceByDate: (date: string) => AttendanceRecord[]
  getTodayAttendance: () => AttendanceRecord[]
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: MOCK_STAFF,
  attendance: MOCK_ATTENDANCE,

  addStaff: (s) => set((st) => ({ staff: [s, ...st.staff] })),
  updateStaff: (id, data) =>
    set((s) => ({ staff: s.staff.map((m) => m.id === id ? { ...m, ...data } : m) })),
  deleteStaff: (id) => set((s) => ({ staff: s.staff.filter((m) => m.id !== id) })),
  getStaffById: (id) => get().staff.find((m) => m.id === id),
  getAttendanceByDate: (date) => get().attendance.filter((a) => a.date === date),
  getTodayAttendance: () => get().attendance.filter((a) => a.date === today),
}))
