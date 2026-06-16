import { z } from 'zod';

export const ClinicInfoSchema = z.object({
  name: z.string().min(1, 'Clinic name is required').max(200),
  phone: z.string().max(30).optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
});
