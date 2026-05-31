export class InvoicesRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    return this.db('invoices').where({ id }).first();
  }

  async list({ patient_id, status, from, to, page, limit, search }) {
    const q = this.db('invoices as i')
      .join('patients as p', 'i.patient_id', 'p.id')
      .orderBy('i.created_at', 'desc')
      .select('i.*', this.db.raw("p.first_name || ' ' || p.last_name as patient_name"));

    if (patient_id) q.where('i.patient_id', patient_id);
    if (status) q.where('i.status', status);
    if (from) q.where('i.created_at', '>=', from);
    if (to) q.where('i.created_at', '<=', this.db.raw('?::timestamptz', [`${to}T23:59:59Z`]));

    if (search) {
      q.where(function() {
        this.where('i.invoice_number', 'ILIKE', `%${search}%`)
            .orWhere('p.first_name', 'ILIKE', `%${search}%`)
            .orWhere('p.last_name', 'ILIKE', `%${search}%`);
      });
    }

    const [{ count }] = await q.clone().clearSelect().count('i.id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }

  async create(data) {
    const [row] = await this.db('invoices').insert(data).returning('*');
    return row;
  }

  async update(id, data) {
    const [row] = await this.db('invoices').where({ id }).update(data).returning('*');
    return row;
  }

  getPayments(invoice_id) {
    return this.db('payments').where({ invoice_id }).orderBy('paid_at', 'asc');
  }

  async recordPayment(data) {
    const [row] = await this.db('payments').insert(data).returning('*');
    return row;
  }

  async sumPayments(invoice_id) {
    const [{ total }] = await this.db('payments').where({ invoice_id }).sum('amount as total');
    return Number(total ?? 0);
  }

  async patientDebt(patient_id) {
    const [{ total }] = await this.db('invoices')
      .where({ patient_id })
      .whereNotIn('status', ['PAID', 'CANCELLED'])
      .sum(this.db.raw('(total_amount - amount_paid) as total'));
    return Number(total ?? 0);
  }

  async financeSummary({ from, to }) {
    const q = this.db('invoices').whereNotIn('status', ['DRAFT', 'CANCELLED']);
    if (from) q.where('created_at', '>=', from);
    if (to) q.where('created_at', '<=', this.db.raw('?::timestamptz', [`${to}T23:59:59Z`]));

    const [totals] = await q.clone().select(
      this.db.raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
      this.db.raw('COALESCE(SUM(total_amount - amount_paid), 0) as total_outstanding'),
      this.db.raw("COUNT(id) FILTER (WHERE status IN ('ISSUED', 'PARTIALLY_PAID')) as open_invoices_count"),
      this.db.raw("COUNT(id) FILTER (WHERE status = 'OVERDUE') as overdue_invoices_count")
    );

    const monthlyRevenue = await this.db('invoices')
      .whereNotIn('status', ['DRAFT', 'CANCELLED'])
      .select(
        this.db.raw("TO_CHAR(created_at, 'Mon') as month"),
        this.db.raw('COALESCE(SUM(total_amount), 0) as revenue')
      )
      .groupByRaw("TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)")
      .orderByRaw("EXTRACT(MONTH FROM created_at) ASC");

    const methodBreakdown = await this.db('payments as p')
      .join('invoices as i', 'p.invoice_id', 'i.id')
      .whereNotIn('i.status', ['DRAFT', 'CANCELLED'])
      .modify((q) => {
        if (from) q.where('p.paid_at', '>=', from);
        if (to) q.where('p.paid_at', '<=', this.db.raw('?::timestamptz', [`${to}T23:59:59Z`]));
      })
      .groupBy('p.method')
      .select('p.method', this.db.raw('SUM(p.amount) as total'), this.db.raw('COUNT(p.id) as count'));

    const revenueNum = Number(totals.total_revenue);
    const outstandingNum = Number(totals.total_outstanding);
    const collected = revenueNum - outstandingNum;
    const collectionRate = revenueNum > 0 ? Math.round((collected / revenueNum) * 100) : 0;

    return {
      total_revenue: revenueNum,
      total_outstanding: outstandingNum,
      open_invoices_count: Number(totals.open_invoices_count),
      overdue_invoices_count: Number(totals.overdue_invoices_count),
      collection_rate: collectionRate,
      monthly_revenue: monthlyRevenue.map(m => ({
        month: m.month,
        revenue: Number(m.revenue),
        target: Number(m.revenue) * 0.95
      })),
      payment_methods: methodBreakdown.map((r) => ({ 
        method: r.method, 
        total: Number(r.total),
        count: Number(r.count)
      })),
    };
  }

  markOverdue() {
    return this.db('invoices')
      .whereIn('status', ['ISSUED', 'PARTIALLY_PAID'])
      .where('due_date', '<', this.db.raw('CURRENT_DATE'))
      .update({ status: 'OVERDUE' });
  }

  async getPaymentsWithRefunds(invoice_id) {
    const payments = await this.db('payments as p')
      .leftJoin('payment_refunds as r', 'r.payment_id', 'p.id')
      .where('p.invoice_id', invoice_id)
      .orderBy('p.paid_at', 'asc')
      .select(
        'p.*',
        this.db.raw(`
          COALESCE(
            json_agg(
              json_build_object(
                'id', r.id,
                'amount', r.amount,
                'reason', r.reason,
                'refunded_at', r.refunded_at
              )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) as refunds
        `)
      )
      .groupBy('p.id');

    return payments;
  }

  async recordRefund(data) {
    const [row] = await this.db('payment_refunds').insert(data).returning('*');
    return row;
  }

  async sumRefunds(payment_id) {
    const [{ total }] = await this.db('payment_refunds').where({ payment_id }).sum('amount as total');
    return Number(total ?? 0);
  }

  async sumAllRefundsForInvoice(invoice_id) {
    const [{ total }] = await this.db('payment_refunds').where({ invoice_id }).sum('amount as total');
    return Number(total ?? 0);
  }

  async listByPatient(patient_id, { page = 1, limit = 20, status } = {}) {
    const q = this.db('invoices').where({ patient_id }).orderBy('created_at', 'desc');
    if (status) q.where({ status });

    const [{ count }] = await q.clone().count('id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }
}