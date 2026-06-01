import { z } from 'zod';

// مخطط التحقق من البيانات عند حجز موعد جديد
export const CreateAppointmentSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID format'),
  dentist_id: z.string().uuid('Invalid dentist ID format'),
  treatment_plan_id: z.string().uuid('Invalid treatment plan ID format').optional().nullable(),
  chair_number: z.string().min(1, 'Chair selection is required'),
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