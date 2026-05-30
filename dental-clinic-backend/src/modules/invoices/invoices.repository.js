export class InvoicesRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    return this.db('invoices').where({ id }).first();
  }

  async list({ patient_id, status, from, to, page, limit }) {
    const q = this.db('invoices').orderBy('created_at', 'desc');

    if (patient_id) q.where({ patient_id });
    if (status) q.where({ status });
    if (from) q.where('created_at', '>=', from);
    if (to) q.where('created_at', '<=', `${to}T23:59:59Z`);

    const [{ count }] = await q.clone().count('id as count');
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

  /** Sum of all payments for an invoice */
  async sumPayments(invoice_id) {
    const [{ total }] = await this.db('payments').where({ invoice_id }).sum('amount as total');
    return Number(total ?? 0);
  }

  /** Total outstanding across all non-paid/non-cancelled invoices for a patient */
  async patientDebt(patient_id) {
    const [{ total }] = await this.db('invoices')
      .where({ patient_id })
      .whereNotIn('status', ['PAID', 'CANCELLED'])
      .sum(this.db.raw('(total_amount - amount_paid) as total'));
    return Number(total ?? 0);
  }

  /** Revenue summary for a date range */
  async financeSummary({ from, to }) {
    const q = this.db('invoices').whereNotIn('status', ['DRAFT', 'CANCELLED']);
    if (from) q.where('created_at', '>=', from);
    if (to) q.where('created_at', '<=', `${to}T23:59:59Z`);

    const [totals] = await q.clone().select(
      this.db.raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
      this.db.raw('COALESCE(SUM(total_amount - amount_paid), 0) as total_outstanding')
    );

    const methodBreakdown = await this.db('payments as p')
      .join('invoices as i', 'p.invoice_id', 'i.id')
      .whereNotIn('i.status', ['DRAFT', 'CANCELLED'])
      .modify((q) => {
        if (from) q.where('p.paid_at', '>=', from);
        if (to) q.where('p.paid_at', '<=', `${to}T23:59:59Z`);
      })
      .groupBy('p.method')
      .select('p.method', this.db.raw('SUM(p.amount) as total'));

    return {
      total_revenue: Number(totals.total_revenue),
      total_outstanding: Number(totals.total_outstanding),
      payment_methods: methodBreakdown.map((r) => ({ method: r.method, total: Number(r.total) })),
    };
  }

  /** Mark overdue invoices — called on demand or via scheduled job */
  markOverdue() {
    return this.db('invoices')
      .whereIn('status', ['ISSUED', 'PARTIALLY_PAID'])
      .where('due_date', '<', this.db.raw('CURRENT_DATE'))
      .update({ status: 'OVERDUE' });
  }

  /** List all payments for an invoice, including any refunds */
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

  /** Record a refund against a payment */
  async recordRefund(data) {
    const [row] = await this.db('payment_refunds').insert(data).returning('*');
    return row;
  }

  /** Sum of all refunds for a payment */
  async sumRefunds(payment_id) {
    const [{ total }] = await this.db('payment_refunds').where({ payment_id }).sum('amount as total');
    return Number(total ?? 0);
  }

  /** Sum of all refunds across all payments for an invoice */
  async sumAllRefundsForInvoice(invoice_id) {
    const [{ total }] = await this.db('payment_refunds').where({ invoice_id }).sum('amount as total');
    return Number(total ?? 0);
  }

  /** All invoices for a patient with pagination */
  async listByPatient(patient_id, { page = 1, limit = 20, status } = {}) {
    const q = this.db('invoices').where({ patient_id }).orderBy('created_at', 'desc');
    if (status) q.where({ status });

    const [{ count }] = await q.clone().count('id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }
}
