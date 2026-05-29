export class ProceduresRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    return this.db('procedure_catalog').where({ id }).first();
  }

  findByCode(code) {
    return this.db('procedure_catalog').where({ code }).first();
  }

  async list({ category, is_active, search, page, limit }) {
    const q = this.db('procedure_catalog').orderBy('category').orderBy('name');

    if (category) q.where({ category });
    if (is_active !== undefined) q.where({ is_active: is_active === 'true' });
    if (search) {
      q.where((b) =>
        b.whereILike('name', `%${search}%`).orWhereILike('code', `%${search}%`)
      );
    }

    const offset = (page - 1) * limit;
    const [{ count }] = await q.clone().count('id as count');
    const data = await q.limit(limit).offset(offset);

    return { data, total: Number(count), page, limit };
  }

  async create(data) {
    const [row] = await this.db('procedure_catalog').insert(data).returning('*');
    return row;
  }

  async update(id, data) {
    const [row] = await this.db('procedure_catalog').where({ id }).update(data).returning('*');
    return row;
  }
}
