import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  dentist_id: z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(5).max(480).default(30),
  notes: z.string().optional().nullable(),
});

export const ListAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  dentist_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
});
