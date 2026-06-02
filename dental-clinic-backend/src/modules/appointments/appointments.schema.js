import { z } from 'zod';

// مخطط التحقق من البيانات عند حجز موعد جديد
export const CreateAppointmentSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID format'),
  dentist_id: z.string().uuid('Invalid dentist ID format'),
  treatment_plan_id: z.string().uuid('Invalid treatment plan ID format').optional().nullable(),
  // chair_number is optional from the frontend; defaults to '1' if omitted
  chair_number: z.string().min(1).optional().nullable().default('1'),
  treatment_name: z.string().max(255).optional().nullable(),
  scheduled_at: z.string().datetime({ offset: true, message: 'Must be a valid ISO 8601 datetime string' }),
  duration_minutes: z.number().int().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours'),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('SCHEDULED'),
  notes: z.string().optional().nullable(),
});

// مخطط التحقق من البيانات عند فلترة وجلب المواعيد للتقويم
export const ListAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  dentist_id: z.string().uuid('Invalid dentist ID format').optional(),
  patient_id: z.string().uuid('Invalid patient ID format').optional(),
});

// مخطط التحقق من البيانات عند تحديث موعد (جميع الحقول اختيارية)
export const UpdateAppointmentSchema = z.object({
  chair_number: z.string().min(1).optional().nullable(),
  treatment_name: z.string().max(255).optional().nullable(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional().nullable(),
  dentist_id: z.string().uuid().optional(),
  treatment_plan_id: z.string().uuid().optional().nullable(),
});

// مخطط التحقق من معرف الموعد في المسار
export const AppointmentIdParamSchema = z.object({
  id: z.string().uuid('Invalid appointment ID format'),
});
