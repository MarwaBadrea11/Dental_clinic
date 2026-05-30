/**
 * ReportsRepository
 * All heavy, multi-table Knex queries for the reporting system.
 * Each method returns plain JS objects — no business logic here.
 */
export class ReportsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // ─── Financial Report ──────────────────────────────────────────────────────

  /**
   * Income summary: total invoiced, total collected, outstanding, by month.
   * @param {{ from?: string, to?: string }} range
   */
  async financialSummary({ from, to } = {}) {
    const base = this.db('invoices').whereNotIn('status', ['DRAFT', 'CANCELLED']);
    if (from) base.where('created_at', '>=', from);
    if (to)   base.where('created_at', '<=', `${to}T23:59:59Z`);

    // Totals
    const [totals] = await base.clone().select(
      this.db.raw('COALESCE(SUM(total_amount), 0)  AS total_invoiced'),
      this.db.raw('COALESCE(SUM(amount_paid),  0)  AS total_collected'),
      this.db.raw('COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding'),
      this.db.raw('COUNT(*) AS invoice_count'),
    );

    // Monthly breakdown
    const monthly = await base.clone()
      .select(
        this.db.raw(`TO_CHAR(created_at, 'YYYY-MM') AS month`),
        this.db.raw('COALESCE(SUM(total_amount), 0)  AS invoiced'),
        this.db.raw('COALESCE(SUM(amount_paid),  0)  AS collected'),
      )
      .groupByRaw(`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderByRaw(`TO_CHAR(created_at, 'YYYY-MM') ASC`);

    // Payment method breakdown
    const byMethod = await this.db('payments as p')
      .join('invoices as i', 'p.invoice_id', 'i.id')
      .modify((q) => {
        if (from) q.where('p.paid_at', '>=', from);
        if (to)   q.where('p.paid_at', '<=', `${to}T23:59:59Z`);
      })
      .select('p.method')
      .sum('p.amount as total')
      .count('p.id as count')
      .groupBy('p.method')
      .orderBy('total', 'desc');

    // Top 10 procedures by revenue
    const topProcedures = await this.db('invoices as i')
      .modify((q) => {
        if (from) q.where('i.created_at', '>=', from);
        if (to)   q.where('i.created_at', '<=', `${to}T23:59:59Z`);
      })
      .whereNotIn('i.status', ['DRAFT', 'CANCELLED'])
      .crossJoin(this.db.raw(`jsonb_array_elements(i.line_items) AS li`))
      .select(
        this.db.raw(`li->>'description' AS procedure_name`),
        this.db.raw(`SUM((li->>'total')::numeric) AS revenue`),
        this.db.raw(`COUNT(*) AS occurrences`),
      )
      .groupByRaw(`li->>'description'`)
      .orderBy('revenue', 'desc')
      .limit(10);

    return { totals, monthly, byMethod, topProcedures };
  }

  // ─── Inventory Report ──────────────────────────────────────────────────────

  /**
   * Current stock levels with low-stock flagging.
   * @param {{ category?: string, lowStockOnly?: boolean }} opts
   */
  async inventorySummary({ category, lowStockOnly } = {}) {
    const q = this.db('inventory_items as ii')
      .leftJoin('inventory_categories as ic', 'ii.category_id', 'ic.id')
      .select(
        'ii.id', 'ii.name', 'ii.sku', 'ii.quantity', 'ii.unit',
        'ii.reorder_level', 'ii.unit_cost',
        this.db.raw('ii.quantity * ii.unit_cost AS stock_value'),
        this.db.raw('ii.quantity <= ii.reorder_level AS is_low_stock'),
        'ic.name as category',
      )
      .orderBy('ii.name');

    if (category)    q.where('ic.name', category);
    if (lowStockOnly) q.whereRaw('ii.quantity <= ii.reorder_level');

    const items = await q;

    const [summary] = await this.db('inventory_items')
      .select(
        this.db.raw('COUNT(*) AS total_items'),
        this.db.raw('SUM(quantity * unit_cost) AS total_stock_value'),
        this.db.raw('COUNT(*) FILTER (WHERE quantity <= reorder_level) AS low_stock_count'),
        this.db.raw('COUNT(*) FILTER (WHERE quantity = 0) AS out_of_stock_count'),
      );

    return { summary, items };
  }

  // ─── Payroll Report ────────────────────────────────────────────────────────

  /**
   * Staff salary summary for a given month (YYYY-MM).
   * Joins staff_profiles → payroll_records.
   * @param {{ month: string }} opts  e.g. { month: '2026-05' }
   */
  async payrollSummary({ month }) {
    const [year, mon] = month.split('-');

    const records = await this.db('payroll_records as pr')
      .join('users as u', 'pr.user_id', 'u.id')
      .leftJoin('staff_profiles as sp', 'pr.user_id', 'sp.user_id')
      .select(
        'u.id as user_id',
        'u.username',
        'u.email',
        'u.role',
        this.db.raw(`CONCAT(sp.first_name, ' ', sp.last_name) AS full_name`),
        'pr.base_salary',
        'pr.bonuses',
        'pr.deductions',
        this.db.raw('pr.base_salary + pr.bonuses - pr.deductions AS net_salary'),
        'pr.payment_date',
        'pr.status',
      )
      .whereRaw(`EXTRACT(YEAR  FROM pr.payment_date) = ?`, [year])
      .whereRaw(`EXTRACT(MONTH FROM pr.payment_date) = ?`, [mon])
      .orderBy('u.role').orderBy('full_name');

    const [totals] = await this.db('payroll_records as pr')
      .whereRaw(`EXTRACT(YEAR  FROM pr.payment_date) = ?`, [year])
      .whereRaw(`EXTRACT(MONTH FROM pr.payment_date) = ?`, [mon])
      .select(
        this.db.raw('COALESCE(SUM(base_salary), 0) AS total_base'),
        this.db.raw('COALESCE(SUM(bonuses), 0)     AS total_bonuses'),
        this.db.raw('COALESCE(SUM(deductions), 0)  AS total_deductions'),
        this.db.raw('COALESCE(SUM(base_salary + bonuses - deductions), 0) AS total_net'),
        this.db.raw('COUNT(*) AS headcount'),
      );

    return { month, totals, records };
  }

  // ─── Audit Log Query ───────────────────────────────────────────────────────

  /**
   * Paginated audit log for the reports UI.
   * Delegates to AuditService.query() — kept here for consistency.
   */
  async auditLogs({ resource, resourceId, userId, action, from, to, page = 1, limit = 50 }) {
    const q = this.db('audit_logs as al')
      .leftJoin('users as u', 'al.user_id', 'u.id')
      .select(
        'al.id', 'al.action', 'al.resource', 'al.resource_id',
        'al.previous_value', 'al.new_value',
        'al.ip_address', 'al.created_at',
        'u.username as actor', 'u.role as actor_role',
      )
      .orderBy('al.created_at', 'desc');

    if (resource)   q.where('al.resource', resource);
    if (resourceId) q.where('al.resource_id', resourceId);
    if (userId)     q.where('al.user_id', userId);
    if (action)     q.where('al.action', action);
    if (from)       q.where('al.created_at', '>=', from);
    if (to)         q.where('al.created_at', '<=', `${to}T23:59:59Z`);

    const [{ count }] = await q.clone().clearSelect().count('al.id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }
}
