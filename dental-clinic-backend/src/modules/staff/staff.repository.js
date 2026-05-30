export class StaffRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // ── Staff CRUD ──────────────────────────────────────────────────────────────

  findAll({ search, role, status, limit = 50, offset = 0 } = {}) {
    const q = this.db('staff').whereNull('deleted_at').orderBy('created_at', 'desc');

    if (search) {
      q.where((b) =>
        b
          .whereILike('full_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
      );
    }
    if (role && role !== 'all') q.where('role', role);
    if (status && status !== 'all') q.where('status', status);

    return q.limit(limit).offset(offset);
  }

  count({ search, role, status } = {}) {
    const q = this.db('staff').whereNull('deleted_at').count('id as total');

    if (search) {
      q.where((b) =>
        b
          .whereILike('full_name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('phone', `%${search}%`)
      );
    }
    if (role && role !== 'all') q.where('role', role);
    if (status && status !== 'all') q.where('status', status);

    return q.first();
  }

  findById(id) {
    return this.db('staff').where({ id }).whereNull('deleted_at').first();
  }

  findByEmail(email) {
    return this.db('staff').where({ email }).whereNull('deleted_at').first();
  }

  async create(data) {
    const [member] = await this.db('staff').insert(data).returning('*');
    return member;
  }

  async update(id, data) {
    const [member] = await this.db('staff')
      .where({ id })
      .whereNull('deleted_at')
      .update(data)
      .returning('*');
    return member;
  }

  async softDelete(id) {
    const rows = await this.db('staff')
      .where({ id })
      .whereNull('deleted_at')
      .update({ deleted_at: this.db.fn.now() })
      .returning('*');
    return rows[0] ?? null;
  }

  // ── Attendance ──────────────────────────────────────────────────────────────

  findAttendance({ staff_id, date, from_date, to_date, limit = 50, offset = 0 } = {}) {
    const q = this.db('attendance_logs')
      .join('staff', 'attendance_logs.staff_id', 'staff.id')
      .select(
        'attendance_logs.*',
        'staff.full_name',
        'staff.role'
      )
      .orderBy('attendance_logs.log_date', 'desc');

    if (staff_id) q.where('attendance_logs.staff_id', staff_id);
    if (date) q.where('attendance_logs.log_date', date);
    if (from_date) q.where('attendance_logs.log_date', '>=', from_date);
    if (to_date) q.where('attendance_logs.log_date', '<=', to_date);

    return q.limit(limit).offset(offset);
  }

  findAttendanceById(id) {
    return this.db('attendance_logs').where({ id }).first();
  }

  findAttendanceByStaffAndDate(staff_id, log_date) {
    return this.db('attendance_logs').where({ staff_id, log_date }).first();
  }

  async createAttendance(data) {
    const [log] = await this.db('attendance_logs').insert(data).returning('*');
    return log;
  }

  async updateAttendance(id, data) {
    const [log] = await this.db('attendance_logs')
      .where({ id })
      .update(data)
      .returning('*');
    return log;
  }

  async deleteAttendance(id) {
    await this.db('attendance_logs').where({ id }).delete();
  }

  // ── Salary Records ──────────────────────────────────────────────────────────

  findSalaryRecords({ staff_id, month, year, limit = 50, offset = 0 } = {}) {
    const q = this.db('salary_records')
      .join('staff', 'salary_records.staff_id', 'staff.id')
      .select(
        'salary_records.*',
        'staff.full_name',
        'staff.role'
      )
      .orderBy([{ column: 'salary_records.year', order: 'desc' }, { column: 'salary_records.month', order: 'desc' }]);

    if (staff_id) q.where('salary_records.staff_id', staff_id);
    if (month) q.where('salary_records.month', month);
    if (year) q.where('salary_records.year', year);

    return q.limit(limit).offset(offset);
  }

  findSalaryRecordById(id) {
    return this.db('salary_records').where({ id }).first();
  }

  findSalaryByStaffMonthYear(staff_id, month, year) {
    return this.db('salary_records').where({ staff_id, month, year }).first();
  }

  async createSalaryRecord(data) {
    const [record] = await this.db('salary_records').insert(data).returning('*');
    return record;
  }

  async updateSalaryRecord(id, data) {
    const [record] = await this.db('salary_records')
      .where({ id })
      .update(data)
      .returning('*');
    return record;
  }

  async deleteSalaryRecord(id) {
    await this.db('salary_records').where({ id }).delete();
  }

  getMonthlySalarySummary(year, month) {
    return this.db('salary_records')
      .where({ year, month })
      .join('staff', 'salary_records.staff_id', 'staff.id')
      .select(
        'salary_records.*',
        'staff.full_name',
        'staff.role',
        'staff.status'
      )
      .orderBy('staff.full_name');
  }
}
