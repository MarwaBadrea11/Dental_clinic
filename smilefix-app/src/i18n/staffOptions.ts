import type { TFunction } from 'i18next'
import type { EmployeeRole, EmployeeStatus, ShiftType } from '@/types'

export const EMPLOYEE_ROLES: EmployeeRole[] = [
  'doctor',
  'receptionist',
  'nurse',
  'hygienist',
  'assistant',
  'admin',
  'manager',
]

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['active', 'inactive', 'on-leave']

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half-day', 'leave'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const SHIFT_TYPES: ShiftType[] = ['morning', 'afternoon', 'evening', 'full-day', 'off']

export const staffRoleKey: Record<EmployeeRole, string> = {
  doctor:       'staff.roles.doctor',
  receptionist: 'staff.roles.receptionist',
  nurse:        'staff.roles.nurse',
  hygienist:    'staff.roles.hygienist',
  assistant:    'staff.roles.assistant',
  admin:        'staff.roles.admin',
  manager:      'staff.roles.manager',
}

export const staffStatusKey: Record<EmployeeStatus, string> = {
  active:   'staff.status.active',
  inactive: 'staff.status.inactive',
  'on-leave': 'staff.status.onLeave',
}

export const attendanceStatusKey: Record<AttendanceStatus, string> = {
  present:  'staff.attendanceStatus.present',
  absent:   'staff.attendanceStatus.absent',
  late:     'staff.attendanceStatus.late',
  'half-day': 'staff.attendanceStatus.halfDay',
  leave:    'staff.attendanceStatus.leave',
}

export const shiftTypeKey: Record<ShiftType, string> = {
  morning:   'staff.shifts.morning',
  afternoon: 'staff.shifts.afternoon',
  evening:   'staff.shifts.evening',
  'full-day':'staff.shifts.fullDay',
  off:       'staff.shifts.off',
}

function resolveRoleKey(role: string): string | undefined {
  if (!role) return undefined
  const direct = staffRoleKey[role as EmployeeRole]
  if (direct) return direct
  const match = EMPLOYEE_ROLES.find((r) => r.toLowerCase() === role.trim().toLowerCase())
  return match ? staffRoleKey[match] : undefined
}

export function getStaffRoleLabel(t: TFunction, role: string | undefined | null) {
  if (!role || typeof t !== 'function') return role ?? '—'
  const key = resolveRoleKey(role)
  if (!key) return role
  const translated = t(key)
  return translated === key ? role : translated
}

export function getStaffStatusLabel(t: TFunction, status: string | undefined | null) {
  if (!status || typeof t !== 'function') return status ?? '—'
  const key = staffStatusKey[status as EmployeeStatus]
  if (!key) return status
  const translated = t(key)
  return translated === key ? status : translated
}

export function getAttendanceStatusLabel(t: TFunction, status: string | undefined | null) {
  if (!status || typeof t !== 'function') return status ?? '—'
  const key = attendanceStatusKey[status as AttendanceStatus]
  if (!key) return status
  const translated = t(key)
  return translated === key ? status : translated
}

export function getShiftTypeLabel(t: TFunction, shift: string | undefined | null) {
  if (!shift || typeof t !== 'function') return shift ?? '—'
  const key = shiftTypeKey[shift as ShiftType]
  if (!key) return shift
  const translated = t(key)
  return translated === key ? shift : translated
}

export function buildStaffRoleSelectOptions(
  t: TFunction,
  { includeAll = false }: { includeAll?: boolean } = {},
) {
  if (typeof t !== 'function') return includeAll ? [{ value: 'all', label: 'All Roles' }] : []

  const options = EMPLOYEE_ROLES.map((role) => ({
    value: role,
    label: getStaffRoleLabel(t, role),
  }))

  return includeAll
    ? [{ value: 'all', label: t('staff.allRoles') }, ...options]
    : options
}

export function buildStaffStatusSelectOptions(
  t: TFunction,
  { includeAll = false, employmentOnly = true }: { includeAll?: boolean; employmentOnly?: boolean } = {},
) {
  if (typeof t !== 'function') return includeAll ? [{ value: 'all', label: 'All Statuses' }] : []

  const options = EMPLOYEE_STATUSES.map((status) => ({
    value: status,
    label: getStaffStatusLabel(t, status),
  }))

  return includeAll
    ? [{ value: 'all', label: t('staff.allStatuses') }, ...options]
    : options
}

export function buildAttendanceStatusSelectOptions(t: TFunction) {
  if (typeof t !== 'function') return []

  return ATTENDANCE_STATUSES.map((status) => ({
    value: status,
    label: getAttendanceStatusLabel(t, status),
  }))
}

/** Map validate() message strings to localized labels — validation logic unchanged. */
export function translateStaffFormError(t: TFunction, message?: string) {
  if (!message) return undefined
  if (message === 'Required') return t('common.required')
  return message
}

export function getEmployeeStatusBadgeVariant(
  status: EmployeeStatus,
): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'on-leave') return 'warning'
  return 'neutral'
}
