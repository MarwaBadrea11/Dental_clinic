/**
 * ReportsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates data fetching, snapshot caching, and export generation.
 *
 * Export strategy:
 *   - PDF  → pdfkit  (lightweight, no headless browser needed)
 *   - XLSX → exceljs (streaming-friendly)
 *
 * Install once:
 *   npm install pdfkit exceljs
 */

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ReportsRepository } from './reports.repository.js';
import { NotFoundError } from '../../utils/errors.js';

/** Cache TTL in minutes */
const CACHE_TTL_MINUTES = 30;

export class ReportsService {
  /**
   * @param {import('knex').Knex} db
   */
  constructor(db) {
    this.db   = db;
    this.repo = new ReportsRepository(db);
  }

  // ─── Cache helpers ─────────────────────────────────────────────────────────

  async _getCached(reportType, params) {
    const row = await this.db('report_snapshots')
      .where({ report_type: reportType })
      .whereRaw(`params = ?::jsonb`, [JSON.stringify(params)])
      .where('expires_at', '>', this.db.fn.now())
      .orderBy('created_at', 'desc')
      .first();
    return row?.data ?? null;
  }

  async _setCache(reportType, params, data, generatedBy) {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
    await this.db('report_snapshots').insert({
      report_type:  reportType,
      params:       JSON.stringify(params),
      data:         JSON.stringify(data),
      generated_by: generatedBy ?? null,
      expires_at:   expiresAt,
    });
    return data;
  }

  // ─── Report generators ─────────────────────────────────────────────────────

  async getFinancialReport(params, userId) {
    const cached = await this._getCached('FINANCIAL', params);
    if (cached) return cached;

    const data = await this.repo.financialSummary(params);
    return this._setCache('FINANCIAL', params, data, userId);
  }

  async getInventoryReport(params, userId) {
    const cached = await this._getCached('INVENTORY', params);
    if (cached) return cached;

    const data = await this.repo.inventorySummary(params);
    return this._setCache('INVENTORY', params, data, userId);
  }

  async getPayrollReport(params, userId) {
    if (!params.month) throw new NotFoundError('month param required (YYYY-MM)');

    const cached = await this._getCached('PAYROLL', params);
    if (cached) return cached;

    const data = await this.repo.payrollSummary(params);
    return this._setCache('PAYROLL', params, data, userId);
  }

  async getAuditLogs(params) {
    return this.repo.auditLogs(params);
  }

  // ─── PDF export ────────────────────────────────────────────────────────────

  /**
   * Returns a Buffer containing the PDF.
   * @param {'financial'|'inventory'|'payroll'} type
   * @param {object} data  - pre-fetched report data
   */
  async exportPdf(type, data) {
    return new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold')
         .text('SmileFix Dental Clinic', { align: 'center' });
      doc.fontSize(13).font('Helvetica')
         .text(`${type.toUpperCase()} REPORT`, { align: 'center' });
      doc.fontSize(9).fillColor('#666')
         .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // ── Body ────────────────────────────────────────────────────────────────
      if (type === 'financial') _renderFinancialPdf(doc, data);
      else if (type === 'inventory') _renderInventoryPdf(doc, data);
      else if (type === 'payroll') _renderPayrollPdf(doc, data);

      doc.end();
    });
  }

  // ─── Excel export ──────────────────────────────────────────────────────────

  /**
   * Returns a Buffer containing the XLSX workbook.
   * @param {'financial'|'inventory'|'payroll'} type
   * @param {object} data
   */
  async exportExcel(type, data) {
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'SmileFix';
    wb.created  = new Date();

    if (type === 'financial')  _buildFinancialSheet(wb, data);
    else if (type === 'inventory') _buildInventorySheet(wb, data);
    else if (type === 'payroll')   _buildPayrollSheet(wb, data);

    return wb.xlsx.writeBuffer();
  }
}

// ─── PDF renderers ─────────────────────────────────────────────────────────────

function _section(doc, title) {
  doc.moveDown(0.5)
     .fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e').text(title)
     .moveDown(0.3)
     .moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke()
     .moveDown(0.4)
     .font('Helvetica').fontSize(9).fillColor('#333');
}

function _kv(doc, label, value) {
  doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(String(value))
     .font('Helvetica');
}

function _renderFinancialPdf(doc, data) {
  const { totals, monthly, byMethod } = data;

  _section(doc, 'Summary');
  _kv(doc, 'Total Invoiced',    `$${Number(totals.total_invoiced).toFixed(2)}`);
  _kv(doc, 'Total Collected',   `$${Number(totals.total_collected).toFixed(2)}`);
  _kv(doc, 'Total Outstanding', `$${Number(totals.total_outstanding).toFixed(2)}`);
  _kv(doc, 'Invoice Count',     totals.invoice_count);

  _section(doc, 'Monthly Breakdown');
  monthly.forEach((m) => {
    doc.text(`${m.month}  |  Invoiced: $${Number(m.invoiced).toFixed(2)}  |  Collected: $${Number(m.collected).toFixed(2)}`);
  });

  _section(doc, 'Payment Methods');
  byMethod.forEach((m) => {
    doc.text(`${m.method}: $${Number(m.total).toFixed(2)} (${m.count} payments)`);
  });
}

function _renderInventoryPdf(doc, data) {
  const { summary, items } = data;

  _section(doc, 'Summary');
  _kv(doc, 'Total Items',       summary.total_items);
  _kv(doc, 'Total Stock Value', `$${Number(summary.total_stock_value ?? 0).toFixed(2)}`);
  _kv(doc, 'Low Stock Items',   summary.low_stock_count);
  _kv(doc, 'Out of Stock',      summary.out_of_stock_count);

  _section(doc, 'Items');
  items.forEach((i) => {
    const flag = i.is_low_stock ? ' ⚠ LOW' : '';
    doc.text(`${i.name} (${i.sku ?? '—'})  |  Qty: ${i.quantity} ${i.unit}  |  Value: $${Number(i.stock_value ?? 0).toFixed(2)}${flag}`);
  });
}

function _renderPayrollPdf(doc, data) {
  const { month, totals, records } = data;

  _section(doc, `Payroll — ${month}`);
  _kv(doc, 'Headcount',        totals.headcount);
  _kv(doc, 'Total Base',       `$${Number(totals.total_base).toFixed(2)}`);
  _kv(doc, 'Total Bonuses',    `$${Number(totals.total_bonuses).toFixed(2)}`);
  _kv(doc, 'Total Deductions', `$${Number(totals.total_deductions).toFixed(2)}`);
  _kv(doc, 'Total Net',        `$${Number(totals.total_net).toFixed(2)}`);

  _section(doc, 'Staff Detail');
  records.forEach((r) => {
    doc.text(`${r.full_name ?? r.username} (${r.role})  |  Base: $${Number(r.base_salary).toFixed(2)}  |  Net: $${Number(r.net_salary).toFixed(2)}  |  ${r.status}`);
  });
}

// ─── Excel builders ────────────────────────────────────────────────────────────

function _headerRow(sheet, cols) {
  const row = sheet.addRow(cols);
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
}

function _buildFinancialSheet(wb, data) {
  const { totals, monthly, byMethod, topProcedures } = data;

  // Summary sheet
  const s1 = wb.addWorksheet('Summary');
  _headerRow(s1, ['Metric', 'Value']);
  s1.addRow(['Total Invoiced',    Number(totals.total_invoiced)]);
  s1.addRow(['Total Collected',   Number(totals.total_collected)]);
  s1.addRow(['Total Outstanding', Number(totals.total_outstanding)]);
  s1.addRow(['Invoice Count',     Number(totals.invoice_count)]);

  // Monthly sheet
  const s2 = wb.addWorksheet('Monthly');
  _headerRow(s2, ['Month', 'Invoiced', 'Collected']);
  monthly.forEach((m) => s2.addRow([m.month, Number(m.invoiced), Number(m.collected)]));

  // Payment methods
  const s3 = wb.addWorksheet('Payment Methods');
  _headerRow(s3, ['Method', 'Total', 'Count']);
  byMethod.forEach((m) => s3.addRow([m.method, Number(m.total), Number(m.count)]));

  // Top procedures
  const s4 = wb.addWorksheet('Top Procedures');
  _headerRow(s4, ['Procedure', 'Revenue', 'Occurrences']);
  topProcedures.forEach((p) => s4.addRow([p.procedure_name, Number(p.revenue), Number(p.occurrences)]));
}

function _buildInventorySheet(wb, data) {
  const { summary, items } = data;

  const s1 = wb.addWorksheet('Summary');
  _headerRow(s1, ['Metric', 'Value']);
  s1.addRow(['Total Items',       Number(summary.total_items)]);
  s1.addRow(['Total Stock Value', Number(summary.total_stock_value ?? 0)]);
  s1.addRow(['Low Stock Items',   Number(summary.low_stock_count)]);
  s1.addRow(['Out of Stock',      Number(summary.out_of_stock_count)]);

  const s2 = wb.addWorksheet('Items');
  _headerRow(s2, ['Name', 'SKU', 'Category', 'Qty', 'Unit', 'Unit Cost', 'Stock Value', 'Low Stock?']);
  items.forEach((i) => s2.addRow([
    i.name, i.sku ?? '', i.category ?? '', i.quantity, i.unit,
    Number(i.unit_cost), Number(i.stock_value ?? 0), i.is_low_stock ? 'YES' : 'no',
  ]));
}

function _buildPayrollSheet(wb, data) {
  const { month, totals, records } = data;

  const s1 = wb.addWorksheet(`Payroll ${month}`);
  _headerRow(s1, ['Name', 'Role', 'Base Salary', 'Bonuses', 'Deductions', 'Net Salary', 'Status']);
  records.forEach((r) => s1.addRow([
    r.full_name ?? r.username, r.role,
    Number(r.base_salary), Number(r.bonuses), Number(r.deductions), Number(r.net_salary),
    r.status,
  ]));

  // Totals row
  s1.addRow([]);
  const totRow = s1.addRow(['TOTALS', '', Number(totals.total_base), Number(totals.total_bonuses), Number(totals.total_deductions), Number(totals.total_net), '']);
  totRow.font = { bold: true };
}
