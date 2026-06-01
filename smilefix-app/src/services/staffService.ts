// ─────────────────────────────────────────────────────────────────────────────
// Staff Service — /api/v1/staff
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient, API_BASE } from './apiClient'
import { getAccessToken } from './authService'
import type { StaffMember, AttendanceRecord, EmployeeRole, EmployeeStatus } from '@/types'

// ── Backend shapes ────────────────────────────────────────────────────────────

export interface BackendStaffMember {
  id: string
  full_name: string
  role: EmployeeRole
  phone: string
  email: string
  shift_start: string | null
  shift_end: string | null
  base_salary: string | number
  status: EmployeeStatus
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface BackendAttendanceLog {
  id: string
  staff_id: string
  log_date: string
  check_in: string | null
  check_out: string | null
  status: AttendanceRecord['status']
  notes: string | null
  full_name?: string
  role?: string
  created_at: string
  updated_at: string
}

export interface BackendSalaryRecord {
  id: string
  staff_id: string
  month: number
  year: number
  base_salary: string | number
  bonus: string | number
  deductions: string | number
  net_salary: string | number
  notes: string | null
  full_name?: string
  role?: string
  created_at: string
  updated_at: string
}

export interface CreateStaffPayload {
  full_name: string
  role: EmployeeRole
  phone: string
  email: string
  shift_start?: string | null
  shift_end?: string | null
  base_salary: number
  status?: EmployeeStatus
}

export type UpdateStaffPayload = Partial<CreateStaffPayload>

export interface CreateAttendancePayload {
  staff_id: string
  log_date: string
  check_in?: string | null
  check_out?: string | null
  status: AttendanceRecord['status']
  notes?: string | null
}

export interface CreateSalaryPayload {
  staff_id: string
  month: number
  year: number
  base_salary: number
  bonus?: number
  deductions?: number
  notes?: string | null
}

// ── Mappers ───────────────────────────────────────────────────────────────────

export function mapStaffMember(b: BackendStaffMember): StaffMember {
  const [firstName, ...rest] = b.full_name.split(' ')
  const lastName = rest.join(' ') || ''
  return {
    id: b.id,
    employeeCode: `EMP-${b.id.slice(0, 6).toUpperCase()}`,
    firstName,
    lastName,
    role: b.role,
    email: b.email,
    phone: b.phone,
    status: b.status,
    joinDate: b.created_at.split('T')[0],
    salary: Number(b.base_salary),
    shift: b.shift_start ? 'morning' : undefined,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  }
}

export function mapAttendanceLog(b: BackendAttendanceLog): AttendanceRecord {
  return {
    id: b.id,
    employeeId: b.staff_id,
    date: b.log_date,
    checkIn: b.check_in ?? undefined,
    checkOut: b.check_out ?? undefined,
    status: b.status,
    notes: b.notes ?? undefined,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchStaff(params?: {
  search?: string
  role?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{ staff: StaffMember[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.role)   qs.set('role',   params.role)
  if (params?.status) qs.set('status', params.status)
  if (params?.limit)  qs.set('limit',  String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))

  const query = qs.toString() ? `?${qs}` : ''

  // Use raw fetch to access both json.data (array) and json.meta (total),
  // since apiClient already unwraps json.data and discards json.meta.
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}/staff${query}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const json = await res.json()
  const rows: BackendStaffMember[] = Array.isArray(json.data) ? json.data : []
  const total: number = json.meta?.total ?? rows.length
  return { staff: rows.map(mapStaffMember), total }
}

export async function fetchStaffById(id: string): Promise<StaffMember> {
  const b = await apiClient.get<BackendStaffMember>(`/staff/${id}`)
  return mapStaffMember(b)
}

export async function createStaffMember(payload: CreateStaffPayload): Promise<StaffMember> {
  const b = await apiClient.post<BackendStaffMember>('/staff', payload)
  return mapStaffMember(b)
}

export async function updateStaffMember(id: string, payload: UpdateStaffPayload): Promise<StaffMember> {
  const b = await apiClient.put<BackendStaffMember>(`/staff/${id}`, payload)
  return mapStaffMember(b)
}

export async function deleteStaffMember(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/staff/${id}`)
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function fetchAttendance(params?: {
  staff_id?: string
  date?: string
  from_date?: string
  to_date?: string
}): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams()
  if (params?.staff_id)  qs.set('staff_id',  params.staff_id)
  if (params?.date)      qs.set('date',      params.date)
  if (params?.from_date) qs.set('from_date', params.from_date)
  if (params?.to_date)   qs.set('to_date',   params.to_date)

  const query = qs.toString() ? `?${qs}` : ''
  const rows = await apiClient.get<BackendAttendanceLog[]>(`/staff/attendance${query}`)
  return Array.isArray(rows) ? rows.map(mapAttendanceLog) : []
}

export async function logAttendance(payload: CreateAttendancePayload): Promise<AttendanceRecord> {
  const b = await apiClient.post<BackendAttendanceLog>('/staff/attendance', payload)
  return mapAttendanceLog(b)
}

export async function updateAttendanceLog(id: string, payload: Partial<CreateAttendancePayload>): Promise<AttendanceRecord> {
  const b = await apiClient.put<BackendAttendanceLog>(`/staff/attendance/${id}`, payload)
  return mapAttendanceLog(b)
}

export async function deleteAttendanceLog(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/staff/attendance/${id}`)
}

// ── Salary Records ────────────────────────────────────────────────────────────

export async function fetchSalaryRecords(params?: {
  staff_id?: string
  month?: number
  year?: number
}): Promise<BackendSalaryRecord[]> {
  const qs = new URLSearchParams()
  if (params?.staff_id) qs.set('staff_id', params.staff_id)
  if (params?.month)    qs.set('month',    String(params.month))
  if (params?.year)     qs.set('year',     String(params.year))

  const query = qs.toString() ? `?${qs}` : ''
  const rows = await apiClient.get<BackendSalaryRecord[]>(`/staff/salary${query}`)
  return Array.isArray(rows) ? rows : []
}

export async function createSalaryRecord(payload: CreateSalaryPayload): Promise<BackendSalaryRecord> {
  return apiClient.post<BackendSalaryRecord>('/staff/salary', payload)
}

export async function updateSalaryRecord(id: string, payload: Partial<CreateSalaryPayload>): Promise<BackendSalaryRecord> {
  return apiClient.put<BackendSalaryRecord>(`/staff/salary/${id}`, payload)
}

export async function deleteSalaryRecord(id: string): Promise<void> {
  await apiClient.delete<unknown>(`/staff/salary/${id}`)
}

export async function fetchMonthlySalarySummary(year: number, month: number): Promise<{
  year: number
  month: number
  records: BackendSalaryRecord[]
  total_payroll: number
}> {
  return apiClient.get(`/staff/salary/summary/${year}/${month}`)
}

// ── Dashboard Stats ─────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<{
  total: number
  active: number
  onLeave: number
  presentToday: number
}> {
  return apiClient.get('/staff/dashboard-stats')
}
