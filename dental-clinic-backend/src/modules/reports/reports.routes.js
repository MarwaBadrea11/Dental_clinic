import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { attachClinicContext } from '../../middleware/clinicContext.js';
import {
  FinancialReportSchema,
  InventoryReportSchema,
  PayrollReportSchema,
  AuditLogQuerySchema,
  ExportQuerySchema,
} from './reports.schema.js';
import {
  getFinancialReportHandler,
  exportFinancialReportHandler,
  getInventoryReportHandler,
  exportInventoryReportHandler,
  getPayrollReportHandler,
  exportPayrollReportHandler,
  getAuditLogsHandler,
} from './reports.controller.js';

export async function reportsRoutes(fastify) {
  // Financial - TX-06: clinic-isolated
  fastify.get('/financial', {
    preHandler: [authenticate, attachClinicContext, authorize('finance:*')],
    schema: { query: FinancialReportSchema }
  }, getFinancialReportHandler);

  fastify.get('/financial/export', {
    preHandler: [authenticate, attachClinicContext, authorize('finance:*')],
    schema: { query: FinancialReportSchema.merge(ExportQuerySchema) }
  }, exportFinancialReportHandler);

  // Inventory - TX-07: clinic-isolated
  fastify.get('/inventory', { 
    preHandler: [authenticate, attachClinicContext, authorize('inventory:read')],
    schema: { query: InventoryReportSchema }
  }, getInventoryReportHandler);

  fastify.get('/inventory/export', { 
    preHandler: [authenticate, attachClinicContext, authorize('inventory:read')],
    schema: { query: InventoryReportSchema.merge(ExportQuerySchema) }
  }, exportInventoryReportHandler);

  // Payroll
  fastify.get('/payroll', { 
    preHandler: [authenticate, authorize('staff:*')],
    schema: { query: PayrollReportSchema }
  }, getPayrollReportHandler);

  fastify.get('/payroll/export', { 
    preHandler: [authenticate, authorize('staff:*')],
    schema: { query: PayrollReportSchema.merge(ExportQuerySchema) }
  }, exportPayrollReportHandler);

  // Audit logs — ADMIN only
  fastify.get('/audit-logs', { 
    preHandler: [authenticate, authorize('*')],
    schema: { query: AuditLogQuerySchema }
  }, getAuditLogsHandler);
}