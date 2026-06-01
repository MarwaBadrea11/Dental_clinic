/**
 * ReportsRepository
 * All heavy, multi-table Knex queries for the reporting system.
 */
export class ReportsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // ─── Financial Report ──────────────────────────────────────────────────────

  async financialSummary({ from, to } = {}) {
    const base = this.db('invoices').whereNotIn('status', ['DRAFT', 'CANCELLED']);
    if (from) base.where('created_at', '>=', from);
    if (to)   base.where('created_at', '<=', `${to}T23:59:59Z`);

    const [totals] = await base.clone().select(
      this.db.raw('COALESCE(SUM(total_amount), 0)::float AS total_invoiced'),
      this.db.raw('COALESCE(SUM(amount_paid), 0)::float AS total_collected'),
      this.db.raw('COALESCE(SUM(total_amount - amount_paid), 0)::float AS total_outstanding'),
      this.db.raw('COUNT(*)::int AS invoice_count')
    );

    const monthly = await base.clone()
      .select(
        this.db.raw(`TO_CHAR(created_at, 'YYYY-MM') AS month`),
        this.db.raw('COALESCE(SUM(total_amount), 0)::float AS invoiced'),
        this.db.raw('COALESCE(SUM(amount_paid), 0)::float AS collected')
      )
      .groupByRaw(`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderByRaw(`TO_CHAR(created_at, 'YYYY-MM') ASC`);

    const byMethod = await this.db('payments as p')
      .join('invoices as i', 'p.invoice_id', 'i.id')
      .modify((q) => {
        if (from) q.where('p.paid_at', '>=', from);
        if (to)   q.where('p.paid_at', '<=', `${to}T23:59:59Z`);
      })
      .select('p.method')
      .select(this.db.raw('SUM(p.amount)::float as total'))
      .select(this.db.raw('COUNT(p.id)::int as count'))
      .groupBy('p.method')
      .orderBy('total', 'desc');

    const topProcedures = await this.db('invoices as i')
      .modify((q) => {
        if (from) q.where('i.created_at', '>=', from);
        if (to)   q.where('i.created_at', '<=', `${to}T23:59:59Z`);
      })
      .whereNotIn('i.status', ['DRAFT', 'CANCELLED'])
      .crossJoin(this.db.raw(`jsonb_array_elements(i.line_items) AS li`))
      .select(
        this.db.raw(`li->>'description' AS procedure_name`),
        this.db.raw(`SUM((li->>'total')::numeric)::float AS revenue`),
        this.db.raw(`COUNT(*)::int AS occurrences`)
      )
      .groupByRaw(`li->>'description'`)
      .orderBy('revenue', 'desc')
      .limit(10);

    return { totals, monthly, byMethod, topProcedures };
  }

  // ─── Inventory Report ──────────────────────────────────────────────────────

  async inventorySummary({ category, lowStockOnly } = {}) {
    const q = this.db('inventory as ii')
      .select(
        'ii.id', 'ii.material_name as name', 'ii.quantity', 'ii.unit',
        'ii.min_stock_alert as reorder_level', 'ii.unit_price as unit_cost',
        'ii.category',
        this.db.raw('(ii.quantity * ii.unit_price)::float AS stock_value'),
        this.db.raw('ii.quantity <= ii.min_stock_alert AS is_low_stock')
      )
      .whereNull('ii.deleted_at')
      .orderBy('ii.material_name');

    if (category) q.where('ii.category', category);
    if (lowStockOnly) q.whereRaw('ii.quantity <= ii.min_stock_alert');

    const items = await q;

    const [summary] = await this.db('inventory')
      .whereNull('deleted_at')
      .select(
        this.db.raw('COUNT(*)::int AS total_items'),
        this.db.raw('COALESCE(SUM(quantity * unit_price), 0)::float AS total_stock_value'),
        this.db.raw('COUNT(*) FILTER (WHERE quantity <= min_stock_alert)::int AS low_stock_count'),
        this.db.raw('COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock_count')
      );

    return { summary, items };
  }

  // ─── Payroll Report ────────────────────────────────────────────────────────

  async payrollSummary({ month }) {
    const [year, mon] = month.split('-');

    const records = await this.db('salary_records as sr')
      .join('staff as s', 'sr.staff_id', 's.id')
      .select(
        's.id as staff_id',
        's.full_name',
        's.email',
        's.role',
        'sr.base_salary',
        'sr.bonus as bonuses',
        'sr.deductions',
        this.db.raw('(sr.base_salary + sr.bonus - sr.deductions)::float AS net_salary'),
        'sr.month',
        'sr.year'
      )
      .whereNull('s.deleted_at')
      .where('sr.year', parseInt(year, 10))
      .where('sr.month', parseInt(mon, 10))
      .orderBy('s.role').orderBy('s.full_name');

    const [totals] = await this.db('salary_records')
      .where('year', parseInt(year, 10))
      .where('month', parseInt(mon, 10))
      .select(
        this.db.raw('COALESCE(SUM(base_salary), 0)::float AS total_base'),
        this.db.raw('COALESCE(SUM(bonus), 0)::float     AS total_bonuses'),
        this.db.raw('COALESCE(SUM(deductions), 0)::float  AS total_deductions'),
        this.db.raw('COALESCE(SUM(base_salary + bonus - deductions), 0)::float AS total_net'),
        this.db.raw('COUNT(*)::int AS headcount')
      );

    return { month, totals, records };
  }

  // ─── Audit Log Query ───────────────────────────────────────────────────────

  async auditLogs({ resource, resourceId, userId, action, from, to, page = 1, limit = 50 }) {
    const q = this.db('audit_logs as al')
      .leftJoin('users as u', 'al.user_id', 'u.id')
      .select(
        'al.id', 'al.action', 'al.resource', 'al.resource_id',
        'al.previous_value', 'al.new_value',
        'al.ip_address', 'al.created_at',
        'u.username as actor', 'u.role as actor_role'
      )
      .orderBy('al.created_at', 'desc');

    if (resource)   q.where('al.resource', resource);
    if (resourceId) q.where('al.resource_id', resourceId);
    if (userId)     q.where('al.user_id', userId);
    if (action)     q.where('al.action', action);
    if (from)       q.where('al.created_at', '>=', from);
    if (to)         q.where('al.created_at', '<=', `${to}T23:59:59Z`);

    const [{ count }] = await q.clone().clearSelect().clearOrder().count('al.id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }
}