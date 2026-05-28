export class PatientsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findAll({ search, limit = 20, offset = 0 } = {}) {
    const q = this.db('patients').whereNull('deleted_at').orderBy('created_at', 'desc');
    if (search) {
      q.where((b) =>
        b
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
          .orWhereILike('national_id', `%${search}%`)
      );
    }
    return q.limit(limit).offset(offset);
  }

  count({ search } = {}) {
    const q = this.db('patients').whereNull('deleted_at').count('id as total');
    if (search) {
      q.where((b) =>
        b
          .whereILike('first_name', `%${search}%`)
          .orWhereILike('last_name', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
          .orWhereILike('national_id', `%${search}%`)
      );
    }
    return q.first();
  }

  findById(id) {
    return this.db('patients').where({ id }).whereNull('deleted_at').first();
  }

  findByNationalId(national_id) {
    return this.db('patients').where({ national_id }).whereNull('deleted_at').first();
  }

  async create(data) {
    const [patient] = await this.db('patients').insert(data).returning('*');
    return patient;
  }

  async update(id, data) {
    const [patient] = await this.db('patients')
      .where({ id })
      .whereNull('deleted_at')
      .update(data)
      .returning('*');
    return patient;
  }
}
