import { z } from 'zod';

export const activateLicenseSchema = {
  body: z.object({
    licenseKey: z.string().min(10, 'License key must be at least 10 characters'),
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
  }),
};

export const licenseStatusSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};