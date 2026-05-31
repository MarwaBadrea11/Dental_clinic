import { z } from 'zod';

export const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unit_cost: z.number().min(0),
  total: z.number().min(0),
  procedure_id: z.string().uuid().optional().nullable(),
  tooth_number: z.string().max(3).optional().nullable(),
});

export const CreateInvoiceSchema = z.object({
  patient_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional().nullable(),
  treatment_plan_id: z.string().uuid().optional().nullable(),
  line_items: z.array(LineItemSchema).min(1),
  tax_rate: z.number().min(0).max(1).default(0),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional().nullable(), // مضاف لدعم واجهة الـ Modal
});

export const UpdateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  line_items: z.array(LineItemSchema).min(1).optional(),
  tax_rate: z.number().min(0).max(1).optional(),
});

export const ListInvoicesSchema = z.object({
  patient_id: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(), // مضاف لدعم شريط البحث في الجداول
});

export const RecordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'INSURANCE']),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paid_at: z.string().datetime({ offset: true }).optional(),
});

export const RecordRefundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});