import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ReportsRepository } from './reports.repository.js';

const CACHE_TTL_MINUTES = 30;

export class ReportsService {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
    this.repo = new ReportsRepository(db);
  }

  async _getCached(reportType, params) {
    try {
      const row = await this.db('report_snapshots')
        .where({ report_type: reportType })
        .whereRaw(`params = ?::jsonb`, [JSON.stringify(params)])
        .where('expires_at', '>', this.db.fn.now())
        .orderBy('created_at', 'desc')
        .first();
      return row?.data ? row.data : null;
    } catch {
      return null;
    }
  }

  async _setCache(reportType, params, data, generatedBy) {
    try {
      const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
      await this.db('report_snapshots').insert({
        report_type: reportType,
        params: JSON.stringify(params),
        data: JSON.stringify(data),
        generated_by: generatedBy || null,
        expires_at: expiresAt,
      });
    } catch (e) {
      console.warn('Cache write failed:', e.message);
    }
    return data;
  }

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

  // 🛠️ تم تعديل دالة Payroll لحماية البيانات من الـ Crash عند عدم وجود بيانات
  async getPayrollReport(params, userId) {
    const cached = await this._getCached('PAYROLL', params);
    if (cached) return cached;

    const rawData = await this.repo.payrollSummary(params);

    // بناء هيكلية آمنة تفادياً لـ Null / Undefined
    const safeData = {
      month: rawData?.month || params?.month || 'Current Period',
      totals: {
        headcount: rawData?.totals?.headcount || 0,
        total_base: rawData?.totals?.total_base || 0,
        total_bonuses: rawData?.totals?.total_bonuses || 0,
        total_deductions: rawData?.totals?.total_deductions || 0,
        total_net: rawData?.totals?.total_net || 0,
      },
      records: Array.isArray(rawData?.records) ? rawData.records : [],
    };

    return this._setCache('PAYROLL', params, safeData, userId);
  }

  async getAuditLogs(params) {
    return this.repo.auditLogs(params);
  }

  async exportPdf(type, data) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text('SmileFix Dental Clinic', { align: 'center' });
      doc.fontSize(13).font('Helvetica').text(`${type.toUpperCase()} REPORT`, { align: 'center' });
      doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      if (type === 'financial') _renderFinancialPdf(doc, data);
      else if (type === 'inventory') _renderInventoryPdf(doc, data);
      else if (type === 'payroll') _renderPayrollPdf(doc, data);

      doc.end();
    });
  }

  async exportExcel(type, data) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SmileFix';
    wb.created = new Date();

    if (type === 'financial') _buildFinancialSheet(wb, data);
    else if (type === 'inventory') _buildInventorySheet(wb, data);
    else if (type === 'payroll') _buildPayrollSheet(wb, data);

    return wb.xlsx.writeBuffer();
  }
}

// ─── PDF Renderers ─────────────────────────────────────────────────────────────
function _section(doc, title) {
  doc.moveDown(0.5)
     .fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e').text(title)
     .moveDown(0.3)
     .moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke()
     .moveDown(0.4)
     .font('Helvetica').fontSize(9).fillColor('#333');
}

function _kv(doc, label, value) {
  doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(String(value)).font('Helvetica');
}

function _renderFinancialPdf(doc, data) {
  const totals = data?.totals || {};
  const monthly = data?.monthly || [];
  const byMethod = data?.byMethod || [];

  _section(doc, 'Summary');
  _kv(doc, 'Total Invoiced', `$${Number(totals.total_invoiced || 0).toFixed(2)}`);
  _kv(doc, 'Total Collected', `$${Number(totals.total_collected || 0).toFixed(2)}`);
  _kv(doc, 'Total Outstanding', `$${Number(totals.total_outstanding || 0).toFixed(2)}`);
  _kv(doc, 'Invoice Count', totals.invoice_count || 0);

  _section(doc, 'Monthly Breakdown');
  monthly.forEach((m) => {
    doc.text(`${m.month}  |  Invoiced: $${Number(m.invoiced || 0).toFixed(2)}  |  Collected: $${Number(m.collected || 0).toFixed(2)}`);
  });

  _section(doc, 'Payment Methods');
  byMethod.forEach((m) => {
    doc.text(`${m.method}: $${Number(m.total || 0).toFixed(2)} (${m.count || 0} payments)`);
  });
}

function _renderInventoryPdf(doc, data) {
  const summary = data?.summary || {};
  const items = data?.items || [];

  _section(doc, 'Summary');
  _kv(doc, 'Total Items', summary.total_items || 0);
  _kv(doc, 'Total Stock Value', `$${Number(summary.total_stock_value ?? 0).toFixed(2)}`);
  _kv(doc, 'Low Stock Items', summary.low_stock_count || 0);
  _kv(doc, 'Out of Stock', summary.out_of_stock_count || 0);

  _section(doc, 'Items');
  items.forEach((i) => {
    const flag = i.is_low_stock ? ' [!] LOW STOCK' : '';
    doc.text(`${i.name} (${i.category || '—'})  |  Qty: ${i.quantity || 0} ${i.unit || ''}  |  Value: $${Number(i.stock_value ?? 0).toFixed(2)}${flag}`);
  });
}

// 🛠️ حماية دالة الـ PDF للـ Payroll
function _renderPayrollPdf(doc, data) {
  const month = data?.month || 'Current';
  const totals = data?.totals || {};
  const records = data?.records || [];

  _section(doc, `Payroll — ${month}`);
  _kv(doc, 'Headcount', totals.headcount || 0);
  _kv(doc, 'Total Base', `$${Number(totals.total_base || 0).toFixed(2)}`);
  _kv(doc, 'Total Bonuses', `$${Number(totals.total_bonuses || 0).toFixed(2)}`);
  _kv(doc, 'Total Deductions', `$${Number(totals.total_deductions || 0).toFixed(2)}`);
  _kv(doc, 'Total Net', `$${Number(totals.total_net || 0).toFixed(2)}`);

  _section(doc, 'Staff Detail');
  if (records.length === 0) {
    doc.text('No payroll records found for this period.');
  } else {
    records.forEach((r) => {
      doc.text(`${r.full_name || 'Staff'} (${r.role || '—'})  |  Base: $${Number(r.base_salary || 0).toFixed(2)}  |  Net: $${Number(r.net_salary || 0).toFixed(2)}`);
    });
  }
}

// ─── Excel Builders ────────────────────────────────────────────────────────────
function _headerRow(sheet, cols) {
  const row = sheet.addRow(cols);
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
}

function _buildFinancialSheet(wb, data) {
  const totals = data?.totals || {};
  const monthly = data?.monthly || [];
  const byMethod = data?.byMethod || [];
  const topProcedures = data?.topProcedures || [];

  const s1 = wb.addWorksheet('Summary');
  _headerRow(s1, ['Metric', 'Value']);
  s1.addRow(['Total Invoiced', Number(totals.total_invoiced || 0)]);
  s1.addRow(['Total Collected', Number(totals.total_collected || 0)]);
  s1.addRow(['Total Outstanding', Number(totals.total_outstanding || 0)]);
  s1.addRow(['Invoice Count', Number(totals.invoice_count || 0)]);

  const s2 = wb.addWorksheet('Monthly');
  _headerRow(s2, ['Month', 'Invoiced', 'Collected']);
  monthly.forEach((m) => s2.addRow([m.month, Number(m.invoiced || 0), Number(m.collected || 0)]));

  const s3 = wb.addWorksheet('Payment Methods');
  _headerRow(s3, ['Method', 'Total', 'Count']);
  byMethod.forEach((m) => s3.addRow([m.method, Number(m.total || 0), Number(m.count || 0)]));

  const s4 = wb.addWorksheet('Top Procedures');
  _headerRow(s4, ['Procedure', 'Revenue', 'Occurrences']);
  topProcedures.forEach((p) => s4.addRow([p.procedure_name, Number(p.revenue || 0), Number(p.occurrences || 0)]));
}

function _buildInventorySheet(wb, data) {
  const summary = data?.summary || {};
  const items = data?.items || [];

  const s1 = wb.addWorksheet('Summary');
  _headerRow(s1, ['Metric', 'Value']);
  s1.addRow(['Total Items', Number(summary.total_items || 0)]);
  s1.addRow(['Total Stock Value', Number(summary.total_stock_value || 0)]);
  s1.addRow(['Low Stock Items', Number(summary.low_stock_count || 0)]);
  s1.addRow(['Out of Stock', Number(summary.out_of_stock_count || 0)]);

  const s2 = wb.addWorksheet('Items');
  _headerRow(s2, ['Name', 'Category', 'Qty', 'Unit', 'Unit Cost', 'Stock Value', 'Low Stock?']);
  items.forEach((i) => s2.addRow([
    i.name, i.category || '', i.quantity || 0, i.unit || '',
    Number(i.unit_cost || 0), Number(i.stock_value || 0), i.is_low_stock ? 'YES' : 'NO'
  ]));
}

// 🛠️ حماية دالة الـ Excel للـ Payroll
function _buildPayrollSheet(wb, data) {
  const month = data?.month || 'Current';
  const totals = data?.totals || {};
  const records = data?.records || [];

  const s1 = wb.addWorksheet(`Payroll ${month}`);
  _headerRow(s1, ['Name', 'Role', 'Base Salary', 'Bonuses', 'Deductions', 'Net Salary']);
  
  records.forEach((r) => s1.addRow([
    r.full_name || 'Staff', r.role || '', Number(r.base_salary || 0), Number(r.bonuses || 0), Number(r.deductions || 0), Number(r.net_salary || 0)
  ]));

  s1.addRow([]);
  const totRow = s1.addRow(['TOTALS', '', Number(totals.total_base || 0), Number(totals.total_bonuses || 0), Number(totals.total_deductions || 0), Number(totals.total_net || 0)]);
  totRow.font = { bold: true };
}