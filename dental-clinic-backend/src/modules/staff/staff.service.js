import { ConflictError, NotFoundError } from '../../utils/errors.js';

export class StaffService {
  constructor(repo) {
    this.repo = repo;
  }

  async list(query = {}) {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Number(query.offset) || 0;
    const search = query.search?.trim() || undefined;
    const role = query.role || undefined;
    const status = query.status || undefined;

    const [rows, countRow] = await Promise.all([
      this.repo.findAll({ search, role, status, limit, offset }),
      this.repo.count({ search, role, status }),
    ]);

    return { staff: rows, total: Number(countRow?.total || 0), limit, offset };
  }

  async getById(id) {
    const member = await this.repo.findById(id);
    if (!member) throw new NotFoundError('Staff member not found');
    return member;
  }

  async create(dto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictError('A staff member with this email already exists');
    return this.repo.create(dto);
  }

  async update(id, dto) {
    const member = await this.repo.findById(id);
    if (!member) throw new NotFoundError('Staff member not found');

    if (dto.email && dto.email !== member.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing) throw new ConflictError('A staff member with this email already exists');
    }

    return this.repo.update(id, dto);
  }

  async delete(id) {
    const member = await this.repo.findById(id);
    if (!member) throw new NotFoundError('Staff member not found');
    return this.repo.softDelete(id);
  }

  async listAttendance(query = {}) {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Number(query.offset) || 0;
    const staff_id = query.staff_id || undefined;
    const date = query.date || undefined;
    const from_date = query.from_date || undefined;
    const to_date = query.to_date || undefined;

    const attendance = await this.repo.findAttendance({ staff_id, date, from_date, to_date, limit, offset });
    return { attendance, limit, offset };
  }

  async logAttendance(dto) {
    const existing = await this.repo.findAttendanceByStaffAndDate(dto.staff_id, dto.log_date);
    if (existing) throw new ConflictError('Attendance log for this staff member and date already exists');
    return this.repo.createAttendance(dto);
  }

  async updateAttendance(id, dto) {
    const log = await this.repo.findAttendanceById(id);
    if (!log) throw new NotFoundError('Attendance log not found');
    return this.repo.updateAttendance(id, dto);
  }

  async deleteAttendance(id) {
    const log = await this.repo.findAttendanceById(id);
    if (!log) throw new NotFoundError('Attendance log not found');
    await this.repo.deleteAttendance(id);
    return { id };
  }

  async listSalaryRecords(query = {}) {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Number(query.offset) || 0;
    const staff_id = query.staff_id || undefined;
    const month = query.month ? Number(query.month) : undefined;
    const year = query.year ? Number(query.year) : undefined;

    const records = await this.repo.findSalaryRecords({ staff_id, month, year, limit, offset });
    return { records, limit, offset };
  }

  async createSalaryRecord(dto) {
    const existing = await this.repo.findSalaryByStaffMonthYear(dto.staff_id, dto.month, dto.year);
    if (existing) throw new ConflictError('A salary record for this staff member and month already exists');

    const net_salary = Math.round((Number(dto.base_salary) + Number(dto.bonus || 0) - Number(dto.deductions || 0)) * 100) / 100;
    return this.repo.createSalaryRecord({ ...dto, net_salary });
  }

  async updateSalaryRecord(id, dto) {
    const record = await this.repo.findSalaryRecordById(id);
    if (!record) throw new NotFoundError('Salary record not found');

    const base = dto.base_salary ?? record.base_salary;
    const bonus = dto.bonus ?? record.bonus;
    const deductions = dto.deductions ?? record.deductions;
    const net_salary = Math.round((Number(base) + Number(bonus) - Number(deductions)) * 100) / 100;

    return this.repo.updateSalaryRecord(id, { ...dto, net_salary });
  }

  async deleteSalaryRecord(id) {
    const record = await this.repo.findSalaryRecordById(id);
    if (!record) throw new NotFoundError('Salary record not found');
    await this.repo.deleteSalaryRecord(id);
    return { id };
  }

  async getMonthlySummary(year, month) {
    const records = await this.repo.getMonthlySalarySummary(year, month);
    const totalPayroll = records.reduce((sum, r) => sum + (Number(r.net_salary) || 0), 0);
    return {
      year,
      month,
      total_payroll: Math.round(totalPayroll * 100) / 100,
      records_count: records.length,
      records,
    };
  }

  async getDashboardStats() {
    return this.repo.getDashboardStats();
  }
}