export class NotesRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * List all notes for a patient, newest first.
   * @param {string} patientId
   */
  async findByPatient(patientId) {
    return this.db('patient_notes')
      .where({ patient_id: patientId })
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .select('*');
  }

  /**
   * Create a new note.
   * @param {object} data
   */
  async create(data) {
    const [row] = await this.db('patient_notes').insert(data).returning('*');
    return row;
  }

  /**
   * Find a single note by id.
   * @param {string} id
   */
  async findById(id) {
    return this.db('patient_notes').where({ id }).first();
  }

  /**
   * Delete a note by id.
   * @param {string} id
   */
  async delete(id) {
    return this.db('patient_notes').where({ id }).delete();
  }
}
