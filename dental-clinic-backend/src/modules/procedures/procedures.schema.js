import { z } from 'zod';

export const CreateProcedureSchema = z.object({
  code: z.string()
    .min(1, 'Procedure code is required')
    .max(20, 'Code cannot exceed 20 characters')
    .transform(val => val.trim().toUpperCase()),
  name: z.string()
    .min(1, 'Procedure name is required')
    .max(200, 'Name cannot exceed 200 characters')
    .transform(val => val.trim()),
  description: z.string().max(1000).optional().nullable(),
  default_cost: z.number()
    .min(0, 'Cost cannot be negative')
    .default(0),
  category: z.enum([
    'Restorative', 'Consumables', 'Instruments', 'Medications', 
    'Protective Equipment', 'Impression Materials', 'Sterilization', 'Equipment'
  ], { errorMap: () => ({ message: 'Invalid category specified' }) }),
  duration_minutes: z.number().int().min(1, 'Duration must be at least 1 minute').default(30),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(7).regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format').optional().nullable(),
});

export const UpdateProcedureSchema = CreateProcedureSchema.partial().extend({
  is_active: z.boolean().optional(),
});