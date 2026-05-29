export class TreatmentsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const plan = await this.db('treatment_plans as tp')
      .where('tp.id', id)
      .select('tp.*')
      .first();
    if (!plan) return null;

    plan.procedures = await this.db('treatment_procedures as tpr')
      .join('procedure_catalog as pc', 'tpr.procedure_id', 'pc.id')
      .where('tpr.treatment_plan_id', id)
      .select('tpr.*', 'pc.name as procedure_name', 'pc.code as procedure_code');

    return plan;
  }

  async list({ patient_id, dentist_id, status, page, limit }) {
    const q = this.db('treatment_plans').orderBy('created_at', 'desc');

    if (patient_id) q.where({ patient_id });
    if (dentist_id) q.where({ dentist_id });
    if (status) q.where({ status });

    const [{ count }] = await q.clone().count('id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }

  async create(planData, procedures = []) {
    return this.db.transaction(async (trx) => {
      const [plan] = await trx('treatment_plans').insert(planData).returning('*');

      if (procedures.length > 0) {
        const rows = procedures.map((p) => ({ ...p, treatment_plan_id: plan.id }));
        plan.procedures = await trx('treatment_procedures').insert(rows).returning('*');
      } else {
        plan.procedures = [];
      }

      return plan;
    });
  }

  async update(id, data) {
    const [row] = await this.db('treatment_plans').where({ id }).update(data).returning('*');
    return row;
  }

  findProcedureById(id) {
    return this.db('treatment_procedures').where({ id }).first();
  }

  async updateProcedure(id, data) {
    const [row] = await this.db('treatment_procedures').where({ id }).update(data).returning('*');
    return row;
  }

  /** Recalculate estimated_cost from sum of (quantity * unit_cost) for all procedures */
  async recalcEstimatedCost(treatmentPlanId) {
    const [{ total }] = await this.db('treatment_procedures')
      .where({ treatment_plan_id: treatmentPlanId })
      .sum(this.db.raw('quantity * unit_cost as total'));

    await this.db('treatment_plans')
      .where({ id: treatmentPlanId })
      .update({ estimated_cost: total ?? 0 });
  }
}
