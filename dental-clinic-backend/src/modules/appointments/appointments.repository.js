export class AppointmentsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * الفحص الشامل لمنع تعارض مواعيد الأطباء وتداخل حجز الكراسي داخل العيادة
   */
  async findConflict({ dentist_id, chair_number, scheduled_at, duration_minutes, excludeId }) {
    const newStart = new Date(scheduled_at);
    const newEnd = new Date(newStart.getTime() + duration_minutes * 60 * 1000);

    const q = this.db('appointments')
      .whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
      .where('scheduled_at', '<', newEnd)
      .whereRaw(`(scheduled_at + (duration_minutes * interval '1 minute')) > ?`, [newStart])
      .where((builder) => {
        builder.where({ dentist_id }).orWhere({ chair_number });
      });

    if (excludeId) {
      q.whereNot({ id: excludeId });
    }

    return q.first();
  }

  /**
   * إنشاء موعد جديد في قاعدة البيانات مع إرجاع بيانات المريض والطبيب مباشرةً
   * حتى لا تظهر الـ UUID بدلاً من الأسماء عند إضافة موعد جديد في الواجهة
   */
  async create(data) {
    const [inserted] = await this.db('appointments').insert(data).returning('id');
    return this.findById(inserted.id);
  }

  /**
   * جلب موعد واحد بالمعرف مع بيانات المريض والطبيب
   */
  findById(id) {
    return this.db('appointments as a')
      .leftJoin('patients as p', 'a.patient_id', 'p.id')
      .leftJoin('users as u', 'a.dentist_id', 'u.id')
      .select(
        'a.*',
        'p.first_name as patient_first_name',
        'p.last_name as patient_last_name',
        'p.phone as patient_phone',
        'u.username as dentist_username'
      )
      .where('a.id', id)
      .first();
  }

  /**
   * تحديث بيانات موعد قائم
   */
  async update(id, data) {
    const [appointment] = await this.db('appointments')
      .where({ id })
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*');
    return appointment;
  }

  /**
   * حذف موعد نهائياً
   */
  async delete(id) {
    return this.db('appointments').where({ id }).delete();
  }

  /**
   * جلب المواعيد مع الفلترة وعمل الـ leftJoins لجلب بيانات المريض والطبيب للواجهة
   */
  listWithFilters({ date, start_date, end_date, dentist_id, patient_id }) {
    const q = this.db('appointments as a')
      .leftJoin('patients as p', 'a.patient_id', 'p.id')
      .leftJoin('users as u', 'a.dentist_id', 'u.id')
      .select(
        'a.*',
        'p.first_name as patient_first_name',
        'p.last_name as patient_last_name',
        'p.phone as patient_phone',
        'u.username as dentist_username'
      )
      .orderBy('a.scheduled_at', 'asc');

    if (date) {
      q.whereRaw(`DATE(a.scheduled_at AT TIME ZONE 'UTC') = ?`, [date]);
    } else if (start_date && end_date) {
      q.whereRaw(`DATE(a.scheduled_at AT TIME ZONE 'UTC') BETWEEN ? AND ?`, [start_date, end_date]);
    }

    if (dentist_id) q.where('a.dentist_id', dentist_id);
    if (patient_id) q.where('a.patient_id', patient_id);

    return q;
  }
}