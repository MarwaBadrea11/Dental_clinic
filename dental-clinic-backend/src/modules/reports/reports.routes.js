import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getFinancialReportHandler,
  exportFinancialReportHandler,
  getInventoryReportHandler,
  exportInventoryReportHandler,
  getPayrollReportHandler,
  exportPayrollReportHandler,
  getAuditLogsHandler,
} from './reports.controller.js';

/**
 * All routes are prefixed with /api/v1/reports (registered in app.js).
 *
 * GET  /reports/financial              → JSON financial summary
 * GET  /reports/financial/export       → PDF or XLSX (?format=pdf|xlsx)
 * GET  /reports/inventory              → JSON inventory summary
 * GET  /reports/inventory/export       → PDF or XLSX
 * GET  /reports/payroll                → JSON payroll summary (?month=YYYY-MM)
 * GET  /reports/payroll/export         → PDF or XLSX
 * GET  /reports/audit-logs             → paginated audit log
 */
export async function reportsRoutes(fastify) {
  // Financial
  fastify.get('/financial',        { preHandler: [authenticate, authorize('finance:*')] }, getFinancialReportHandler);
  fastify.get('/financial/export', { preHandler: [authenticate, authorize('finance:*')] }, exportFinancialReportHandler);

  // Inventory
  fastify.get('/inventory',        { preHandler: [authenticate, authorize('inventory:read')] }, getInventoryReportHandler);
  fastify.get('/inventory/export', { preHandler: [authenticate, authorize('inventory:read')] }, exportInventoryReportHandler);

  // Payroll
  fastify.get('/payroll',          { preHandler: [authenticate, authorize('staff:*')] }, getPayrollReportHandler);
  fastify.get('/payroll/export',   { preHandler: [authenticate, authorize('staff:*')] }, exportPayrollReportHandler);

  // Audit logs — ADMIN only
  fastify.get('/audit-logs',       { preHandler: [authenticate, authorize('*')] }, getAuditLogsHandler);
}
