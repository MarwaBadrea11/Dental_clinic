/**
 * TX-04: ProceduresRepository with clinic isolation
 * All queries MUST filter by clinic_id to prevent cross-clinic data leaks
 */
export class ProceduresRepository {
  /** @param {import('knex').Knex} db */
  constructor(db, clinicId) {
    this.db = db;
    this.clinicId = clinicId;
  }

  async findById(id) {
    // OLD: return this.db('procedure_catalog').where({ id }).first();
    // NEW: Add clinic_id filter
    return this.db('procedure_catalog').where({ id, clinic_id: this.clinicId }).first();
  }

  async findByCode(code) {
    // OLD: return this.db('procedure_catalog').where({ code }).first();
    // NEW: Add clinic_id filter (code is unique per clinic, not globally)
    return this.db('procedure_catalog').where({ code, clinic_id: this.clinicId }).first();
  }

  async list({ category, is_active, search, page, limit }) {
    // OLD: const baseQuery = this.db('procedure_catalog');
    // NEW: Add clinic_id filter to base query
    const baseQuery = this.db('procedure_catalog').where({ clinic_id: this.clinicId });

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
    // OLD: Insert without clinic_id
    // NEW: Add clinic_id to insert
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
        clinic_id: this.clinicId, // TX-04: Enforce clinic ownership
      })
      .returning('*');
    return procedure;
  }

  async update(id, data) {
    // OLD: .where({ id })
    // NEW: Add clinic_id filter (can only update own clinic's procedures)
    const [procedure] = await this.db('procedure_catalog')
      .where({ id, clinic_id: this.clinicId })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return procedure;
  }

  async delete(id) {
    // OLD: .where({ id })
    // NEW: Add clinic_id filter (can only delete own clinic's procedures)
    const rowsDeleted = await this.db('procedure_catalog')
      .where({ id, clinic_id: this.clinicId })
      .del();
    return rowsDeleted > 0;
  }
}