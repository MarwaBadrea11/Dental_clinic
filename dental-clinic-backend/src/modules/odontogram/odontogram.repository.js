export class OdontogramRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findByPatient(patient_id) {
    return this.db('odontogram').where({ patient_id }).first();
  }

  async upsert(patient_id, teeth, userId) {
    const existing = await this.findByPatient(patient_id);

    if (existing) {
      const [row] = await this.db('odontogram')
        .where({ patient_id })
        .update({ teeth: JSON.stringify(teeth), last_updated_by: userId, updated_at: new Date() })
        .returning('*');
      return row;
    }

    const [row] = await this.db('odontogram')
      .insert({ patient_id, teeth: JSON.stringify(teeth), last_updated_by: userId })
      .returning('*');
    return row;
  }

  async appendHistory({ patient_id, tooth_number, previous_state, new_state, changed_by, treatment_plan_id }) {
    const [row] = await this.db('odontogram_history')
      .insert({
        patient_id,
        tooth_number,
        previous_state: JSON.stringify(previous_state),
        new_state: JSON.stringify(new_state),
        changed_by,
        treatment_plan_id: treatment_plan_id ?? null,
      })
      .returning('*');
    return row;
  }

  getHistory(patient_id, tooth_number) {
    const q = this.db('odontogram_history')
      .where({ patient_id })
      .orderBy('created_at', 'desc');

    if (tooth_number) q.where({ tooth_number });

    return q;
  }
}
