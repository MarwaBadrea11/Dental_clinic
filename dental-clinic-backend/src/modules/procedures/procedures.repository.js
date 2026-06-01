export class ProceduresRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    return this.db('procedure_catalog').where({ id }).first();
  }

  async findByCode(code) {
    return this.db('procedure_catalog').where({ code }).first();
  }

  async list({ category, is_active, search, page, limit }) {
    const baseQuery = this.db('procedure_catalog');

    if (category) baseQuery.where({ category });
    if (is_active !== undefined) baseQuery.where({ is_active });
    if (search) {
      baseQuery.where((builder) =>
        builder.whereILike('name', `%${search}%`).orWhereILike('code', `%${search}%`)
      );
    }

<<<<<<< HEAD
    const offset = (page - 1) * limit;
    const [{ count }] = await q.clone().clearOrder().count('id as count');
    const data = await q.limit(limit).offset(offset);
=======
    const countResult = await baseQuery.clone().count('id as count');
    const total = Number(countResult[0]?.count || 0);
>>>>>>> 0486079 (Edit files staff and procedures)

    const offset = (page - 1) * limit;
    const data = await baseQuery
      .orderBy('category', 'asc')
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    return { data, total, page, limit };
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