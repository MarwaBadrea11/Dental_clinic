export class StaffRepository {
  constructor(db) {
    this.db = db;
  }

  findAll({ search, role, status, limit = 50, offset = 0 } = {}) {
    const q = this.db('staff')
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');

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

  async count({ search, role, status } = {}) {
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

    const result = await q.first();
    return result;
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
    const [member] = await this.db('staff').where({ id }).update(data).returning('*');
    return member;
  }

  async softDelete(id) {
    const [member] = await this.db('staff')
      .where({ id })
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .returning('*');
    return member;
  }

  findAttendance({ staff_id, date, from_date, to_date, limit = 50, offset = 0 } = {}) {
    const q = this.db('attendance_logs')
      .join('staff', 'attendance_logs.staff_id', 'staff.id')
      .select('attendance_logs.*', 'staff.full_name', 'staff.role')
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
    // Use an upsert so a duplicate (staff_id, log_date) updates instead of failing
    const [log] = await this.db('attendance_logs')
      .insert(data)
      .onConflict(['staff_id', 'log_date'])
      .merge()
      .returning('*');
    return log;
  }

  async updateAttendance(id, data) {
    const [log] = await this.db('attendance_logs').where({ id }).update(data).returning('*');
    return log;
  }

  async deleteAttendance(id) {
    await this.db('attendance_logs').where({ id }).delete();
  }

  findSalaryRecords({ staff_id, month, year, limit = 50, offset = 0 } = {}) {
    const q = this.db('salary_records')
      .join('staff', 'salary_records.staff_id', 'staff.id')
      .select('salary_records.*', 'staff.full_name', 'staff.role')
      .orderBy('salary_records.year', 'desc')
      .orderBy('salary_records.month', 'desc');

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
      .select('salary_records.*', 'staff.full_name', 'staff.role', 'staff.status')
      .orderBy('staff.full_name');
  }

  async getDashboardStats() {
    const localTime = new Date(new Date().getTime() + 3 * 3600 * 1000);
    const today = localTime.toISOString().split('T')[0];
    
    const [totalRow, activeRow, onLeaveRow, presentTodayRow] = await Promise.all([
      this.db('staff').whereNull('deleted_at').count('id as total').first(),
      this.db('staff').whereNull('deleted_at').where({ status: 'active' }).count('id as total').first(),
      this.db('staff').whereNull('deleted_at').where({ status: 'on-leave' }).count('id as total').first(),
      this.db('attendance_logs')
        .where('log_date', today)
        .where('status', 'present')
        .count('id as total')
        .first(),
    ]);

    return {
      total: Number(totalRow?.total || 0),
      active: Number(activeRow?.total || 0),
      onLeave: Number(onLeaveRow?.total || 0),
      presentToday: Number(presentTodayRow?.total || 0),
    };
  }
}