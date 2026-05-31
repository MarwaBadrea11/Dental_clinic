import { z } from 'zod';

export const CreateProcedureSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  default_cost: z.number().min(0).default(0),
  category: z.string().optional().nullable(),
  duration_minutes: z.number().int().min(1).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export const UpdateProcedureSchema = CreateProcedureSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const ListProceduresSchema = z.object({
  category: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
