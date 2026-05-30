export class DashboardRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /** Total non-deleted patients */
  async countPatients() {
    const { total } = await this.db('patients').whereNull('deleted_at').count('id as total').first();
    return Number(total);
  }

  /** Count of patients created this calendar month (for the +X% badge) */
  async countPatientsThisMonth() {
    const { total } = await this.db('patients')
      .whereNull('deleted_at')
      .whereRaw(`DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`)
      .count('id as total')
      .first();
    return Number(total);
  }

  /** Count of appointments scheduled for today */
  async countTodayAppointments() {
    const { total } = await this.db('appointments')
      .whereRaw(`DATE(scheduled_at AT TIME ZONE 'UTC') = CURRENT_DATE`)
      .whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
      .count('id as total')
      .first();
    return Number(total);
  }

  /**
   * Sum of (total_amount - amount_paid) for OVERDUE invoices.
   * Also returns the count of overdue invoices.
   */
  async pendingPaymentsSummary() {
    const row = await this.db('invoices')
      .where('status', 'OVERDUE')
      .select(
        this.db.raw('COALESCE(SUM(total_amount - amount_paid), 0) as total_overdue'),
        this.db.raw('COUNT(id) as overdue_count')
      )
      .first();
    return {
      totalOverdue: Number(row.total_overdue),
      overdueCount: Number(row.overdue_count),
    };
  }

  /**
   * Clinic efficiency: completed appointments / (all non-cancelled, non-no-show appointments)
   * scoped to the last 30 days to keep the metric meaningful.
   */
  async clinicEfficiency() {
    const row = await this.db('appointments')
      .whereRaw(`scheduled_at >= CURRENT_DATE - INTERVAL '30 days'`)
      .whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
      .select(
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed`),
        this.db.raw('COUNT(*) as total')
      )
      .first();

    const completed = Number(row.completed);
    const total = Number(row.total);
    if (total === 0) return 0;
    return Math.round((completed / total) * 1000) / 10; // one decimal place
  }

  /**
   * Latest 10 patients with their most recent appointment info.
   *
   * Uses LEFT JOIN LATERAL so that:
   * - Patients with NO appointments still appear (last_visit / last_treatment / appointment_status = null)
   * - The "most recent" non-cancelled appointment per patient is resolved in one pass
   * - No N+1 queries, no multi-column subquery bug
   */
  recentPatients() {
    return this.db
      .select(
        'p.id',
        'p.first_name',
        'p.last_name',
        'p.national_id',
        'p.phone',
        'p.email',
        'last_appt.scheduled_at as last_visit',
        'last_appt.treatment_title as last_treatment',
        'last_appt.status as appointment_status'
      )
      .from('patients as p')
      .joinRaw(`
        LEFT JOIN LATERAL (
          SELECT
            a2.scheduled_at,
            a2.status,
            COALESCE(tp2.title, a2.notes, 'General Visit') AS treatment_title
          FROM appointments a2
          LEFT JOIN treatment_plans tp2 ON tp2.appointment_id = a2.id
          WHERE a2.patient_id = p.id
            AND a2.status NOT IN ('CANCELLED', 'NO_SHOW')
          ORDER BY a2.scheduled_at DESC
          LIMIT 1
        ) last_appt ON true
      `)
      .whereNull('p.deleted_at')
      .orderBy('p.created_at', 'desc')
      .limit(10);
  }

  /**
   * Today's schedule: all appointments for today ordered by time,
   * with patient name and treatment description.
   */
  todaySchedule() {
    return this.db('appointments as a')
      .join('patients as p', 'a.patient_id', 'p.id')
      .leftJoin('treatment_plans as tp', 'tp.appointment_id', 'a.id')
      .select(
        'a.id',
        'a.scheduled_at',
        'a.duration_minutes',
        'a.status',
        'a.notes',
        this.db.raw(`p.first_name || ' ' || p.last_name as patient_name`),
        'p.id as patient_id',
        this.db.raw(`COALESCE(tp.title, a.notes, 'General Visit') as treatment_description`)
      )
      .whereRaw(`DATE(a.scheduled_at AT TIME ZONE 'UTC') = CURRENT_DATE`)
      .whereNotIn('a.status', ['CANCELLED', 'NO_SHOW'])
      .orderBy('a.scheduled_at', 'asc');
  }
}
