import { ConflictError, NotFoundError } from '../../utils/errors.js';

/**
 * Patients Service (TX-01: Multi-Tenancy Pilot)
 * 
 * All methods now require clinicId parameter for data isolation.
 */

export class PatientsService {
  /** @param {import('./patients.repository.js').PatientsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  // إنشاء مريض جديد مع التحقق من عدم تكرار الهوية الوطنية
  // TX-01: Added clinicId parameter
  async create(dto, clinicId) {
    const existing = await this.repo.findByNationalId(dto.national_id, clinicId);
    if (existing) {
      throw new ConflictError('A patient with this national ID already exists');
    }

    // تنظيف البيانات (اختياري: إزالة المسافات الزائدة)
    const sanitizedData = {
      ...dto,
      first_name: dto.first_name.trim(),
      last_name: dto.last_name.trim(),
    };

    return this.repo.create(sanitizedData, clinicId);
  }

  // جلب مريض بحسب الـ ID
  // TX-01: Added clinicId parameter
  async getById(id, clinicId) {
    const patient = await this.repo.findById(id, clinicId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    return patient;
  }

  // قائمة المرضى مع دعم البحث والترقيم
  // TX-01: Added clinicId parameter
  async list(query = {}, clinicId) {
    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = Number(query.offset) || 0;
    const search = query.search?.trim() || undefined;

    const [rows, countRow] = await Promise.all([
      this.repo.findAll({ search, limit, offset, clinicId }),
      this.repo.count({ search, clinicId }),
    ]);

    return { 
      patients: rows, 
      total: Number(countRow.total || 0), 
      limit, 
      offset 
    };
  }

  // تحديث بيانات المريض
  // TX-01: Added clinicId parameter
  async update(id, dto, clinicId) {
    const patient = await this.repo.findById(id, clinicId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    // التحقق من تكرار الهوية الوطنية في حال تم تغييرها
    if (dto.national_id && dto.national_id !== patient.national_id) {
      const conflict = await this.repo.findByNationalId(dto.national_id, clinicId);
      if (conflict) {
        throw new ConflictError('A patient with this national ID already exists');
      }
    }

    return this.repo.update(id, dto, clinicId);
  }

  // الحذف المنطقي
  // TX-01: Added clinicId parameter
  async delete(id, clinicId) {
    const patient = await this.repo.findById(id, clinicId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    
    return this.repo.delete(id, clinicId);
  }
}