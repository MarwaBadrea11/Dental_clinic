import { z } from 'zod';

const STAFF_ROLES = ['doctor', 'receptionist', 'nurse', 'hygienist', 'assistant', 'admin', 'manager'];
const STAFF_STATUSES = ['active', 'inactive', 'on-leave'];
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half-day', 'leave'];

export const CreateStaffSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(STAFF_ROLES),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email'),
  shift_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:MM').optional().nullable(),
  shift_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:MM').optional().nullable(),
  base_salary: z.number().min(0).default(0),
  status: z.enum(STAFF_STATUSES).default('active'),
});

export const UpdateStaffSchema = CreateStaffSchema.partial();

export const CreateAttendanceSchema = z.object({
  staff_id: z.string().uuid(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  check_in: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  check_out: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  status: z.enum(ATTENDANCE_STATUSES).default('present'),
  notes: z.string().optional().nullable(),
});

export const UpdateAttendanceSchema = CreateAttendanceSchema.omit({ staff_id: true, log_date: true }).partial();

export const CreateSalaryRecordSchema = z.object({
  staff_id: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  base_salary: z.number().min(0),
  bonus: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});
