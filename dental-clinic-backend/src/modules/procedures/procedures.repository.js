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

    // حساب العدد الإجمالي للسجلات بناءً على الفلاتر المدخلة
    const countResult = await baseQuery.clone().count('id as count');
    const total = Number(countResult[0]?.count || 0);

    // حساب الـ Offset وجلب البيانات المحددة للصفحة الحالية
    const offset = (page - 1) * limit;
    const data = await baseQuery
      .orderBy('category', 'asc')
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  async create(data) {
    const [procedure] = await this.db('procedure_catalog')
      .insert({
        code: data.code,
        name: data.name,
        description: data.description,
        default_cost: data.default_cost,
        category: data.category,
        duration_minutes: data.duration_minutes,
        icon: data.icon,
        color: data.color,
      })
      .returning('*');
    return procedure;
  }

  async update(id, data) {
    const [procedure] = await this.db('procedure_catalog')
      .where({ id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return procedure;
  }

  async delete(id) {
    // Soft delete if column exists, otherwise hard delete based on your migration architecture
    // Given the context of archiving, we perform a hard delete or dynamic check here
    const rowsDeleted = await this.db('procedure_catalog').where({ id }).del();
    return rowsDeleted > 0;
  }
}