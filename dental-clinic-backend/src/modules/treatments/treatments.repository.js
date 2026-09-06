/**
 * TX-04: TreatmentsRepository with clinic isolation
 * All queries MUST filter by clinic_id to prevent cross-clinic data leaks
 */
export class TreatmentsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db, clinicId) {
    this.db = db;
    this.clinicId = clinicId;
  }

  async findById(id) {
    // OLD: const plan = await this.db('treatment_plans as tp').where('tp.id', id).select('tp.*').first();
    // NEW: Add clinic_id filter
    const plan = await this.db('treatment_plans as tp')
      .where('tp.id', id)
      .where('tp.clinic_id', this.clinicId)
      .select('tp.*')
      .first();
    if (!plan) return null;

    // OLD: plan.procedures = await this.db('treatment_procedures as tpr')...
    // NEW: Add clinic_id filter to procedures query
    plan.procedures = await this.db('treatment_procedures as tpr')
      .join('procedure_catalog as pc', 'tpr.procedure_id', 'pc.id')
      .where('tpr.treatment_plan_id', id)
      .where('tpr.clinic_id', this.clinicId)
      .select('tpr.*', 'pc.name as procedure_name', 'pc.code as procedure_code');

    return plan;
  }

  async list({ patient_id, dentist_id, status, page, limit }) {
    // OLD: const q = this.db('treatment_plans').orderBy('created_at', 'desc');
    // NEW: Add clinic_id filter to base query
    const q = this.db('treatment_plans')
      .where({ clinic_id: this.clinicId })
      .orderBy('created_at', 'desc');

    if (patient_id) q.where({ patient_id });
    if (dentist_id) q.where({ dentist_id });
    if (status) q.where({ status });

    // Clone query for count, but clear ORDER BY (not needed for count and causes PostgreSQL error)
    const [{ count }] = await q.clone().clearOrder().count('id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }

  async create(planData, procedures = []) {
    return this.db.transaction(async (trx) => {
      // OLD: Insert planData without clinic_id
      // NEW: Add clinic_id to insert
      const [plan] = await trx('treatment_plans')
        .insert({ ...planData, clinic_id: this.clinicId })
        .returning('*');

      if (procedures.length > 0) {
        // OLD: Insert procedures without clinic_id
        // NEW: Add clinic_id to each procedure line item
        const rows = procedures.map((p) => ({ 
          ...p, 
          treatment_plan_id: plan.id,
          clinic_id: this.clinicId, // TX-04: Enforce clinic ownership
        }));
        plan.procedures = await trx('treatment_procedures').insert(rows).returning('*');
      } else {
        plan.procedures = [];
      }

      return plan;
    });
  }

  async update(id, data) {
    // OLD: .where({ id })
    // NEW: Add clinic_id filter (can only update own clinic's plans)
    const [row] = await this.db('treatment_plans')
      .where({ id, clinic_id: this.clinicId })
      .update(data)
      .returning('*');
    return row;
  }

  findProcedureById(id) {
    // OLD: return this.db('treatment_procedures').where({ id }).first();
    // NEW: Add clinic_id filter
    return this.db('treatment_procedures')
      .where({ id, clinic_id: this.clinicId })
      .first();
  }

  async updateProcedure(id, data) {
    // OLD: .where({ id })
    // NEW: Add clinic_id filter (can only update own clinic's procedures)
    const [row] = await this.db('treatment_procedures')
      .where({ id, clinic_id: this.clinicId })
      .update(data)
      .returning('*');
    return row;
  }

  /** Recalculate estimated_cost from sum of (quantity * unit_cost) for all procedures */
  async recalcEstimatedCost(treatmentPlanId) {
    // OLD: Query without clinic_id filter
    // NEW: Add clinic_id filter to both queries
    const [{ total }] = await this.db('treatment_procedures')
      .where({ treatment_plan_id: treatmentPlanId, clinic_id: this.clinicId })
      .sum(this.db.raw('quantity * unit_cost'), { as: 'total' });

    await this.db('treatment_plans')
      .where({ id: treatmentPlanId, clinic_id: this.clinicId })
      .update({ estimated_cost: total ?? 0 });
  }
}
