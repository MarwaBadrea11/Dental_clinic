import { AppError, NotFoundError } from '../../utils/errors.js';

export class TreatmentsService {
  /**
   * @param {import('./treatments.repository.js').TreatmentsRepository} repo
   * @param {import('../invoices/invoices.repository.js').InvoicesRepository} invoicesRepo
   */
  constructor(repo, invoicesRepo) {
    this.repo = repo;
    this.invoicesRepo = invoicesRepo;
  }

  list(query) {
    return this.repo.list(query);
  }

  async getById(id) {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError('Treatment plan not found');
    return plan;
  }

  async create(dto, actorId) {
    const { procedures, ...planData } = dto;

    // Snapshot unit_cost from catalog if not provided
    const procedureRows = procedures.map((p) => ({
      procedure_id: p.procedure_id,
      tooth_number: p.tooth_number ?? null,
      quantity: p.quantity ?? 1,
      unit_cost: p.unit_cost,
      notes: p.notes ?? null,
    }));

    const plan = await this.repo.create(planData, procedureRows);

    if (procedureRows.length > 0) {
      await this.repo.recalcEstimatedCost(plan.id);
    }

    return this.repo.findById(plan.id);
  }

  async update(id, dto, actorId) {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError('Treatment plan not found');

    if (plan.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot modify a cancelled treatment plan', 'PLAN_CANCELLED');
    }

    const updated = await this.repo.update(id, dto);

    // Auto-generate draft invoice when plan is marked COMPLETED
    if (dto.status === 'COMPLETED' && plan.status !== 'COMPLETED') {
      await this._generateInvoice(plan, actorId);
    }

    return updated;
  }

  async updateProcedure(planId, procedureId, dto, actorId) {
    const plan = await this.repo.findById(planId);
    if (!plan) throw new NotFoundError('Treatment plan not found');

    const procedure = await this.repo.findProcedureById(procedureId);
    if (!procedure || procedure.treatment_plan_id !== planId) {
      throw new NotFoundError('Procedure not found in this treatment plan');
    }

    const updateData = { ...dto };
    if (dto.status === 'DONE' && !dto.performed_at) {
      updateData.performed_at = new Date().toISOString();
    }
    if (dto.status === 'DONE' && actorId) {
      updateData.performed_by = actorId;
    }

    return this.repo.updateProcedure(procedureId, updateData);
  }

  /** Build and insert a DRAFT invoice from completed treatment plan procedures */
  async _generateInvoice(plan, actorId) {
    const fullPlan = await this.repo.findById(plan.id);
    const doneProcedures = (fullPlan.procedures ?? []).filter((p) => p.status !== 'SKIPPED');

    const lineItems = doneProcedures.map((p) => ({
      description: `${p.procedure_name}${p.tooth_number ? ` - Tooth ${p.tooth_number}` : ''}`,
      quantity: p.quantity,
      unit_cost: Number(p.unit_cost),
      total: p.quantity * Number(p.unit_cost),
    }));

    const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);

    await this.invoicesRepo.create({
      patient_id: plan.patient_id,
      treatment_plan_id: plan.id,
      appointment_id: plan.appointment_id ?? null,
      line_items: JSON.stringify(lineItems),
      subtotal,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: subtotal,
      amount_paid: 0,
      status: 'DRAFT',
      issued_by: actorId ?? null,
    });
  }
}
