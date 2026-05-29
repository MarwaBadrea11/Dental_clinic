import { AppError, NotFoundError } from '../../utils/errors.js';

export class InvoicesService {
  /** @param {import('./invoices.repository.js').InvoicesRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  list(query) {
    return this.repo.list(query);
  }

  async getById(id) {
    const invoice = await this.repo.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    const payments = await this.repo.getPayments(id);
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

    // Recalculate totals if line items changed
    if (dto.line_items) {
      const subtotal = dto.line_items.reduce((sum, li) => sum + li.total, 0);
      const taxRate = dto.tax_rate ?? Number(invoice.tax_rate);
      const taxAmount = +(subtotal * taxRate).toFixed(2);
      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total_amount = +(subtotal + taxAmount).toFixed(2);
      updateData.line_items = JSON.stringify(dto.line_items);
    }

    // Set issued_at when transitioning to ISSUED
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

    // Recalculate amount_paid and update status
    const totalPaid = await this.repo.sumPayments(invoiceId);
    const newStatus = totalPaid >= Number(invoice.total_amount) - 0.001 ? 'PAID' : 'PARTIALLY_PAID';

    await this.repo.update(invoiceId, { amount_paid: totalPaid, status: newStatus });

    return payment;
  }

  async getPatientDebt(patientId) {
    const outstanding = await this.repo.patientDebt(patientId);
    return { patient_id: patientId, outstanding_balance: outstanding };
  }

  async getFinanceSummary(query) {
    // Refresh overdue statuses before summarising
    await this.repo.markOverdue();
    return this.repo.financeSummary(query);
  }
}
