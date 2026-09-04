import { z } from 'zod';

const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
});

export const FinancialReportSchema = DateRangeSchema;

export const InventoryReportSchema = z.object({
  category: z.string().optional(),
  lowStockOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export const PayrollReportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM-DD format').optional(),
});

export const AuditLogQuerySchema = z.object({
  resource: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PERMISSION_DENIED']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const ExportQuerySchema = z.object({
  format: z.enum(['pdf', 'xlsx']).default('pdf'),
});