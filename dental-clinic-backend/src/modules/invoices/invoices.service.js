import { AppError, NotFoundError } from '../../utils/errors.js';

export class InvoicesService {
  /** @param {import('./invoices.repository.js').InvoicesRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async list(query) {
    await this.repo.markOverdue();
    return this.repo.list(query);
  }

  async getById(id) {
    const invoice = await this.repo.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    const payments = await this.repo.getPaymentsWithRefunds(id);
    return { ...invoice, payments };
  }

  async create(dto, actorId) {
    const subtotal = dto.line_items.reduce((sum, li) => sum + li.total, 0);
    const taxAmount = +(subtotal * dto.tax_rate).toFixed(2);
    const totalAmount = +(subtotal + taxAmount).toFixed(2);

    return this.repo.create({
      patient_id: dto.patient_id,
      appointment_id: dto.appointment_id ?? null,
      treatment_plan_id: dto.treatment_plan_id ?? null,
      line_items: JSON.stringify(dto.line_items),
      subtotal,
      tax_rate: dto.tax_rate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: 0,
      status: 'DRAFT',
      due_date: dto.due_date ?? null,
      notes: dto.notes ?? null, // الحقل المضاف لدعم حفظ ملاحظات الفاتورة الجديدة
      issued_by: actorId,
    });
  }

  async update(id, dto) {
    const invoice = await this.repo.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');

    if (['PAID', 'CANCELLED'].includes(invoice.status)) {
      throw new AppError(400, `Cannot modify a ${invoice.status.toLowerCase()} invoice`, 'INVOICE_LOCKED');
    }

    const updateData = { ...dto };

    if (dto.line_items) {
      const subtotal = dto.line_items.reduce((sum, li) => sum + li.total, 0);
      const taxRate = dto.tax_rate ?? Number(invoice.tax_rate);
      const taxAmount = +(subtotal * taxRate).toFixed(2);
      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total_amount = +(subtotal + taxAmount).toFixed(2);
      updateData.line_items = JSON.stringify(dto.line_items);
    }

    if (dto.status === 'ISSUED' && invoice.status === 'DRAFT') {
      updateData.issued_at = new Date().toISOString();
    }

    return this.repo.update(id, updateData);
  }

  async recordPayment(invoiceId, dto, actorId) {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found');

    if (['PAID', 'CANCELLED', 'DRAFT'].includes(invoice.status)) {
      throw new AppError(400, `Cannot record payment on a ${invoice.status.toLowerCase()} invoice`, 'INVOICE_NOT_PAYABLE');
    }

    const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid);
    if (dto.amount > outstanding + 0.001) {
      throw new AppError(422, 'Payment amount exceeds outstanding balance', 'OVERPAYMENT');
    }

    const payment = await this.repo.recordPayment({
      invoice_id: invoiceId,
      amount: dto.amount,
      method: dto.method,
      reference: dto.reference ?? null,
      notes: dto.notes ?? null,
      paid_at: dto.paid_at ?? new Date().toISOString(),
      recorded_by: actorId,
    });

    const totalPaid = await this.repo.sumPayments(invoiceId);
    const newStatus = totalPaid >= Number(invoice.total_amount) - 0.001 ? 'PAID' : 'PARTIALLY_PAID';

    await this.repo.update(invoiceId, { amount_paid: totalPaid, status: newStatus });

    return payment;
  }

  async listPayments(invoiceId) {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found');
    return this.repo.getPaymentsWithRefunds(invoiceId);
  }

  async refundPayment(invoiceId, paymentId, dto, actorId) {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice not found');

    const payments = await this.repo.getPayments(invoiceId);
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new NotFoundError('Payment not found on this invoice');

    const alreadyRefunded = await this.repo.sumRefunds(paymentId);
    const refundable = Number(payment.amount) - alreadyRefunded;

    if (dto.amount > refundable + 0.001) {
      throw new AppError(422, `Refund amount exceeds refundable balance of ${refundable.toFixed(2)}`, 'REFUND_EXCEEDS_PAYMENT');
    }

    const refund = await this.repo.recordRefund({
      payment_id: paymentId,
      invoice_id: invoiceId,
      amount: dto.amount,
      reason: dto.reason,
      refunded_by: actorId,
    });

    const totalPaid = await this.repo.sumPayments(invoiceId);
    const allRefunds = await this.repo.sumAllRefundsForInvoice(invoiceId);

    const netPaid = Math.max(0, totalPaid - allRefunds);
    const total = Number(invoice.total_amount);
    const newStatus = netPaid <= 0 ? 'ISSUED' : netPaid >= total - 0.001 ? 'PAID' : 'PARTIALLY_PAID';

    await this.repo.update(invoiceId, { amount_paid: netPaid, status: newStatus });

    return refund;
  }

  async getPatientDebt(patientId) {
    const outstanding = await this.repo.patientDebt(patientId);
    return { patient_id: patientId, outstanding_balance: outstanding };
  }

  async listByPatient(patientId, query) {
    await this.repo.markOverdue();
    return this.repo.listByPatient(patientId, query);
  }

  async getFinanceSummary(query) {
    await this.repo.markOverdue();
    
    // جلب الحسابات والرسوم البيانية المحسنة
    const summary = await this.repo.financeSummary(query);
    
    // جلب آخر 5 فواتير وعرضها بشكل مباشر في الواجهة
    const recentInvoices = await this.repo.list({ page: 1, limit: 5 });
    
    // جلب بيانات الحسابات المعلقة والمستحقة للمرضى للجدول السفلي المالي
    const outstandingDebts = await this.repo.db('invoices as i')
      .join('patients as p', 'i.patient_id', 'p.id')
      .whereIn('i.status', ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'])
      .orderBy('i.total_amount', 'desc')
      .limit(5)
      .select(
        'i.id as invoice_id',
        this.repo.db.raw("p.first_name || ' ' || p.last_name as patient_name"),
        'i.total_amount',
        'i.amount_paid',
        this.repo.db.raw('(i.total_amount - i.amount_paid) as balance'),
        'i.status'
      );

    return {
      ...summary,
      recent_invoices: recentInvoices.data,
      outstanding_debts: outstandingDebts
    };
  }
}