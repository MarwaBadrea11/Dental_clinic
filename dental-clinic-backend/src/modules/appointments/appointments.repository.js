export class AppointmentsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * الفحص الشامل لمنع تعارض مواعيد الأطباء وتداخل حجز الكراسي داخل العيادة
   * TX-03: Now filters by clinic_id
   */
  async findConflict({ dentist_id, chair_number, scheduled_at, duration_minutes, excludeId, clinic_id }) {
    const newStart = new Date(scheduled_at);
    const newEnd = new Date(newStart.getTime() + duration_minutes * 60 * 1000);

    const q = this.db('appointments')
      .where({ clinic_id })  // TX-03: Clinic isolation
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
   * TX-03: clinic_id is already in data, passed to findById
   */
  async create(data) {
    const [inserted] = await this.db('appointments').insert(data).returning('id');
    return this.findById(inserted.id, data.clinic_id);
  }

  /**
   * جلب موعد واحد بالمعرف مع بيانات المريض والطبيب
   * TX-03: Now filters by clinic_id
   */
  findById(id, clinic_id) {
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
      .where('a.clinic_id', clinic_id)  // TX-03: Clinic isolation
      .first();
  }

  /**
   * تحديث بيانات موعد قائم
   * TX-03: Now filters by clinic_id
   */
  async update(id, data, clinic_id) {
    const [appointment] = await this.db('appointments')
      .where({ id, clinic_id })  // TX-03: Clinic isolation
      .update({ ...data, updated_at: this.db.fn.now() })
      .returning('*');
    return appointment;
  }

  /**
   * حذف موعد نهائياً
   * TX-03: Now filters by clinic_id
   */
  async delete(id, clinic_id) {
    return this.db('appointments').where({ id, clinic_id }).delete();
  }

  /**
   * جلب المواعيد مع الفلترة وعمل الـ leftJoins لجلب بيانات المريض والطبيب للواجهة.
   * إذا أُرسل `upcoming_only: true` يُعيد فقط المواعيد التي لم يحنِ وقتها بعد
   * (مقارنة كاملة للتاريخ والوقت مقابل NOW() بالـ UTC).
   * TX-03: Now filters by clinic_id
   */
  listWithFilters({ date, start_date, end_date, dentist_id, patient_id, upcoming_only, clinic_id }) {
    const q = this.db('appointments as a')
      .where('a.clinic_id', clinic_id)  // TX-03: Clinic isolation - ALWAYS filter by clinic
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

    // ── Future-only filter: compare full timestamp against current UTC time ──
    if (upcoming_only) {
      q.where('a.scheduled_at', '>', this.db.raw(`NOW()`))
        .whereNotIn('a.status', ['CANCELLED', 'NO_SHOW', 'COMPLETED']);
    }

    if (dentist_id) q.where('a.dentist_id', dentist_id);
    if (patient_id) q.where('a.patient_id', patient_id);

    return q;
  }

  /**
   * Auto-transition SCHEDULED/CONFIRMED appointments that are now in the past
   * to a virtual 'PAST' status. Call this via a scheduled job or on every list request.
   *
   * SQL equivalent (run directly in PostgreSQL if you want a cron/trigger):
   *
   *   UPDATE appointments
   *   SET    status = 'COMPLETED', updated_at = NOW()
   *   WHERE  status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
   *     AND  scheduled_at + (duration_minutes * INTERVAL '1 minute') < NOW();
   *
   * TX-03: Now filters by clinic_id
   */
  async autoTransitionPastAppointments(clinic_id) {
    return this.db('appointments')
      .where({ clinic_id })  // TX-03: Clinic isolation
      .whereIn('status', ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'])
      .whereRaw(`scheduled_at + (duration_minutes * INTERVAL '1 minute') < NOW()`)
      .update({ status: 'COMPLETED', updated_at: this.db.fn.now() });
  }
}
