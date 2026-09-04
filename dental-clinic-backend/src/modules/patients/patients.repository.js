/**
 * Patients Repository (TX-01: Multi-Tenancy Pilot)
 * 
 * All methods now require clinicId parameter for data isolation.
 * This prevents cross-clinic data leaks.
 */

export class PatientsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // جلب جميع المرضى مع تصفية المحذوفين
  // TX-01: Added clinicId parameter
  findAll({ search, limit = 20, offset = 0, clinicId } = {}) {
    const q = this.db('patients')
      .where({ clinic_id: clinicId })  // TX-01: Clinic isolation
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
  // TX-01: Added clinicId parameter
  count({ search, clinicId } = {}) {
    const q = this.db('patients')
      .where({ clinic_id: clinicId })  // TX-01: Clinic isolation
      .whereNull('deleted_at')
      .count('id as total');
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

  // TX-01: Added clinicId parameter
  findById(id, clinicId) {
    return this.db('patients')
      .where({ id, clinic_id: clinicId })  // TX-01: Clinic isolation
      .whereNull('deleted_at')
      .first();
  }

  // TX-01: Added clinicId parameter
  findByNationalId(national_id, clinicId) {
    return this.db('patients')
      .where({ national_id, clinic_id: clinicId })  // TX-01: Clinic isolation
      .whereNull('deleted_at')
      .first();
  }

  // إنشاء مريض جديد مع إرجاع البيانات المحفوظة
  // TX-01: Auto-assigns clinic_id
  async create(data, clinicId) {
    const [patient] = await this.db('patients')
      .insert({
        ...data,
        clinic_id: clinicId,  // TX-01: Auto-assign clinic
      })
      .returning('*');
    return patient;
  }

  // تحديث بيانات المريض مع تحديث طابع الـ updated_at تلقائياً
  // TX-01: Added clinicId parameter to prevent cross-clinic updates
  async update(id, data, clinicId) {
    const [patient] = await this.db('patients')
      .where({ id, clinic_id: clinicId })  // TX-01: Clinic isolation
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return patient;
  }

  // الحذف المنطقي (Soft Delete)
  // TX-01: Added clinicId parameter to prevent cross-clinic deletes
  async delete(id, clinicId) {
    return this.db('patients')
      .where({ id, clinic_id: clinicId })  // TX-01: Clinic isolation
      .update({
        deleted_at: this.db.fn.now(),
        status: 'inactive',
      });
  }
}