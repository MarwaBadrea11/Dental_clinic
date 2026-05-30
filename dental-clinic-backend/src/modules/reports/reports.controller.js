import { ReportsService } from './reports.service.js';
import {
  FinancialReportSchema,
  InventoryReportSchema,
  PayrollReportSchema,
  AuditLogQuerySchema,
  ExportQuerySchema,
} from './reports.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new ReportsService(request.server.db);
}

function validate(schema, data, reply) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    reply.status(422).send(errorResponse('Validation failed', { fields }));
    return null;
  }
  return result.data;
}

// ─── Financial ──────────────────────────────────────────────────────────────

export async function getFinancialReportHandler(request, reply) {
  const params = validate(FinancialReportSchema, request.query, reply);
  if (!params) return;

  const data = await getService(request).getFinancialReport(params, request.user?.sub);
  return reply.send(successResponse(data));
}

export async function exportFinancialReportHandler(request, reply) {
  const params = validate(FinancialReportSchema, request.query, reply);
  if (!params) return;
  const { format } = validate(ExportQuerySchema, request.query, reply) ?? { format: 'pdf' };

  const svc  = getService(request);
  const data = await svc.getFinancialReport(params, request.user?.sub);
  return _sendExport(reply, svc, 'financial', data, format);
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export async function getInventoryReportHandler(request, reply) {
  const params = validate(InventoryReportSchema, request.query, reply);
  if (!params) return;

  const data = await getService(request).getInventoryReport(params, request.user?.sub);
  return reply.send(successResponse(data));
}

export async function exportInventoryReportHandler(request, reply) {
  const params = validate(InventoryReportSchema, request.query, reply);
  if (!params) return;
  const { format } = validate(ExportQuerySchema, request.query, reply) ?? { format: 'pdf' };

  const svc  = getService(request);
  const data = await svc.getInventoryReport(params, request.user?.sub);
  return _sendExport(reply, svc, 'inventory', data, format);
}

// ─── Payroll ────────────────────────────────────────────────────────────────

export async function getPayrollReportHandler(request, reply) {
  const params = validate(PayrollReportSchema, request.query, reply);
  if (!params) return;

  const data = await getService(request).getPayrollReport(params, request.user?.sub);
  return reply.send(successResponse(data));
}

export async function exportPayrollReportHandler(request, reply) {
  const params = validate(PayrollReportSchema, request.query, reply);
  if (!params) return;
  const { format } = validate(ExportQuerySchema, request.query, reply) ?? { format: 'pdf' };

  const svc  = getService(request);
  const data = await svc.getPayrollReport(params, request.user?.sub);
  return _sendExport(reply, svc, 'payroll', data, format);
}

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export async function getAuditLogsHandler(request, reply) {
  const params = validate(AuditLogQuerySchema, request.query, reply);
  if (!params) return;

  const result = await getService(request).getAuditLogs(params);
  return reply.send(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
}

// ─── Export helper ───────────────────────────────────────────────────────────

async function _sendExport(reply, svc, type, data, format) {
  if (format === 'xlsx') {
    const buf = await svc.exportExcel(type, data);
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${type}-report.xlsx"`)
      .send(buf);
  }

  // Default: PDF
  const buf = await svc.exportPdf(type, data);
  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${type}-report.pdf"`)
    .send(buf);
}
