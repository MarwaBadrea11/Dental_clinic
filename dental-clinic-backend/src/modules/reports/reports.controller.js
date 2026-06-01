import { ReportsService } from './reports.service.js';
import { successResponse } from '../../utils/response.js';

function getService(request) {
  return new ReportsService(request.db || request.server.db);
}

export async function getFinancialReportHandler(request, reply) {
  const data = await getService(request).getFinancialReport(request.query, request.user?.sub);
  return reply.send(successResponse(data));
}

export async function exportFinancialReportHandler(request, reply) {
  const { format = 'pdf', ...params } = request.query;
  const svc = getService(request);
  const data = await svc.getFinancialReport(params, request.user?.sub);
  return _sendExport(reply, svc, 'financial', data, format);
}

export async function getInventoryReportHandler(request, reply) {
  const data = await getService(request).getInventoryReport(request.query, request.user?.sub);
  return reply.send(successResponse(data));
}

export async function exportInventoryReportHandler(request, reply) {
  const { format = 'pdf', ...params } = request.query;
  const svc = getService(request);
  const data = await svc.getInventoryReport(params, request.user?.sub);
  return _sendExport(reply, svc, 'inventory', data, format);
}

export async function getPayrollReportHandler(request, reply) {
  const data = await getService(request).getPayrollReport(request.query, request.user?.sub);
  return reply.send(successResponse(data));
}

export async function exportPayrollReportHandler(request, reply) {
  const { format = 'pdf', ...params } = request.query;
  const svc = getService(request);
  const data = await svc.getPayrollReport(params, request.user?.sub);
  return _sendExport(reply, svc, 'payroll', data, format);
}

export async function getAuditLogsHandler(request, reply) {
  const result = await getService(request).getAuditLogs(request.query);
  return reply.send(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
}

async function _sendExport(reply, svc, type, data, format) {
  if (format === 'xlsx') {
    const buf = await svc.exportExcel(type, data);
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${type}-report-${Date.now()}.xlsx"`)
      .send(buf);
  }

  const buf = await svc.exportPdf(type, data);
  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${type}-report-${Date.now()}.pdf"`)
    .send(buf);
}