export class AttachmentsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findByPatientId(patientId) {
    return this.db('medical_images')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'desc');
  }

  async create(data) {
    const [row] = await this.db('medical_images').insert(data).returning('*');
    return row;
  }

  findById(id) {
    return this.db('medical_images').where({ id }).first();
  }

  async deleteById(id) {
    await this.db('medical_images').where({ id }).delete();
  }
}
