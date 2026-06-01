export class PatientsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // جلب جميع المرضى مع تصفية المحذوفين
  findAll({ search, limit = 20, offset = 0 } = {}) {
    const q = this.db('patients')
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');

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

  // حساب العدد الكلي مع دعم البحث
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

  // إنشاء مريض جديد مع إرجاع البيانات المحفوظة
  async create(data) {
    const [patient] = await this.db('patients')
      .insert(data)
      .returning('*');
    return patient;
  }

  // تحديث بيانات المريض مع تحديث طابع الـ updated_at تلقائياً
  async update(id, data) {
    const [patient] = await this.db('patients')
      .where({ id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return patient;
  }

  // الحذف المنطقي (Soft Delete)
  async delete(id) {
    return this.db('patients')
      .where({ id })
      .update({
        deleted_at: this.db.fn.now(),
      });
  }
}