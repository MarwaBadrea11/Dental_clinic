import { ConflictError, NotFoundError } from '../../utils/errors.js';

export class PatientsService {
  /** @param {import('./patients.repository.js').PatientsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  // إنشاء مريض جديد مع التحقق من عدم تكرار الهوية الوطنية
  async create(dto) {
    const existing = await this.repo.findByNationalId(dto.national_id);
    if (existing) {
      throw new ConflictError('A patient with this national ID already exists');
    }

    // تنظيف البيانات (اختياري: إزالة المسافات الزائدة)
    const sanitizedData = {
      ...dto,
      first_name: dto.first_name.trim(),
      last_name: dto.last_name.trim(),
    };

    return this.repo.create(sanitizedData);
  }

  // جلب مريض بحسب الـ ID
  async getById(id) {
    const patient = await this.repo.findById(id);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    return patient;
  }

  // قائمة المرضى مع دعم البحث والترقيم
  async list(query = {}) {
    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = Number(query.offset) || 0;
    const search = query.search?.trim() || undefined;

    const [rows, countRow] = await Promise.all([
      this.repo.findAll({ search, limit, offset }),
      this.repo.count({ search }),
    ]);

    return { 
      patients: rows, 
      total: Number(countRow.total || 0), 
      limit, 
      offset 
    };
  }

  // تحديث بيانات المريض
  async update(id, dto) {
    const patient = await this.repo.findById(id);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    // التحقق من تكرار الهوية الوطنية في حال تم تغييرها
    if (dto.national_id && dto.national_id !== patient.national_id) {
      const conflict = await this.repo.findByNationalId(dto.national_id);
      if (conflict) {
        throw new ConflictError('A patient with this national ID already exists');
      }
    }

    return this.repo.update(id, dto);
  }

  // الحذف المنطقي
  async delete(id) {
    const patient = await this.repo.findById(id);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    
    return this.repo.delete(id);
  }
}