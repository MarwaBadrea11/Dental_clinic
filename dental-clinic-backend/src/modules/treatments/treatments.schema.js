import { z } from 'zod';

const ProcedureLineSchema = z.object({
  procedure_id: z.string().uuid(),
  tooth_number: z.string().max(3).optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unit_cost: z.number().min(0),
  notes: z.string().optional().nullable(),
});

export const CreateTreatmentPlanSchema = z.object({
  patient_id: z.string().uuid(),
  dentist_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  procedures: z.array(ProcedureLineSchema).optional().default([]),
});

export const UpdateTreatmentPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  estimated_cost: z.number().min(0).optional().nullable(),
});

export const UpdateProcedureStatusSchema = z.object({
  status: z.enum(['PENDING', 'DONE', 'SKIPPED']),
  notes: z.string().optional().nullable(),
  performed_at: z.string().datetime({ offset: true }).optional().nullable(),
  tooth_number: z.string().max(3).optional().nullable(),
});

export const ListTreatmentPlansSchema = z.object({
  patient_id: z.string().uuid().optional(),
  dentist_id: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
