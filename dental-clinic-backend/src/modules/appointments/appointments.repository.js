export class AppointmentsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * Find any overlapping appointment for the same dentist.
   * Overlap condition: existing.scheduled_at < new_end AND existing.scheduled_at + duration > new_start
   */
  findConflict({ dentist_id, scheduled_at, duration_minutes, excludeId }) {
    const newStart = new Date(scheduled_at);
    const newEnd = new Date(newStart.getTime() + duration_minutes * 60 * 1000);

    const q = this.db('appointments')
      .where({ dentist_id })
      .whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
      .whereRaw(`scheduled_at < ?`, [newEnd.toISOString()])
      .whereRaw(`(scheduled_at + (duration_minutes * interval '1 minute')) > ?`, [newStart.toISOString()])
      .first();

    if (excludeId) q.whereNot({ id: excludeId });

    return q;
  }

  async create(data) {
    const [appointment] = await this.db('appointments').insert(data).returning('*');
    return appointment;
  }

  listByDay({ date, dentist_id, patient_id }) {
    const q = this.db('appointments as a')
      .join('patients as p', 'a.patient_id', 'p.id')
      .join('users as u', 'a.dentist_id', 'u.id')
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
    }
    if (dentist_id) q.where('a.dentist_id', dentist_id);
    if (patient_id) q.where('a.patient_id', patient_id);

    return q;
  }
}
