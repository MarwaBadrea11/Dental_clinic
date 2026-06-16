export class SettingsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * Return all 7 working-hours rows ordered by day_of_week (0–6).
   */
  async getWorkingHours() {
    return this.db('clinic_working_hours')
      .orderBy('day_of_week', 'asc')
      .select('*');
  }

  /**
   * Upsert the full working-hours schedule.
   * `rows` is an array of 7 objects, one per weekday.
   *
   * @param {Array<{
   *   day_of_week: number,
   *   is_open: boolean,
   *   morning_start: string|null,
   *   morning_end: string|null,
   *   evening_start: string|null,
   *   evening_end: string|null,
   * }>} rows
   */
  async upsertWorkingHours(rows) {
    // PostgreSQL UPSERT on the unique day_of_week constraint
    await this.db.raw(
      `INSERT INTO clinic_working_hours
         (day_of_week, is_open, morning_start, morning_end, evening_start, evening_end, updated_at)
       VALUES ${rows.map(() => '(?, ?, ?, ?, ?, ?, NOW())').join(', ')}
       ON CONFLICT (day_of_week)
       DO UPDATE SET
         is_open       = EXCLUDED.is_open,
         morning_start = EXCLUDED.morning_start,
         morning_end   = EXCLUDED.morning_end,
         evening_start = EXCLUDED.evening_start,
         evening_end   = EXCLUDED.evening_end,
         updated_at    = NOW()`,
      rows.flatMap((r) => [
        r.day_of_week,
        r.is_open,
        r.morning_start ?? null,
        r.morning_end   ?? null,
        r.evening_start ?? null,
        r.evening_end   ?? null,
      ]),
    );
    return this.getWorkingHours();
  }

  /**
   * Return the singleton clinic info row (id = 1).
   */
  async getClinicInfo() {
    const row = await this.db('clinic_info').where({ id: 1 }).first();
    if (row) return row;

    const [created] = await this.db('clinic_info')
      .insert({ id: 1 })
      .returning('*');
    return created;
  }

  /**
   * Update the singleton clinic info row.
   * @param {Record<string, unknown>} data
   */
  async updateClinicInfo(data) {
    const [row] = await this.db('clinic_info')
      .where({ id: 1 })
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    if (row) return row;

    const [created] = await this.db('clinic_info')
      .insert({ id: 1, ...data })
      .returning('*');
    return created;
  }
}
