import { z } from 'zod';

export const CreateProcedureSchema = z.object({
<<<<<<< HEAD
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  default_cost: z.number().min(0).default(0),
  category: z.string().optional().nullable(),
  duration_minutes: z.number().int().min(1).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
=======
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
>>>>>>> 0486079 (Edit files staff and procedures)
});

export const UpdateProcedureSchema = CreateProcedureSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const ListProceduresSchema = z.object({
  category: z.string().optional(),
  is_active: z.coerce.boolean().optional(), // ✅ استخدام التحويل الأصلي المتوافق مع Fastify-Zod Compiler
  search: z.string().optional().transform(val => val?.trim()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});