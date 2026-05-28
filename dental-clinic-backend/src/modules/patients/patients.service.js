import { ConflictError, NotFoundError } from '../../utils/errors.js';

export class PatientsService {
  /** @param {import('./patients.repository.js').PatientsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async create(dto) {
    const existing = await this.repo.findByNationalId(dto.national_id);
    if (existing) throw new ConflictError('A patient with this national ID already exists');

    return this.repo.create(dto);
  }

  async list(query = {}) {
    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = Number(query.offset) || 0;
    const search = query.search?.trim() || undefined;

    const [rows, countRow] = await Promise.all([
      this.repo.findAll({ search, limit, offset }),
      this.repo.count({ search }),
    ]);

    return { patients: rows, total: Number(countRow.total), limit, offset };
  }

  async update(id, dto) {
    const patient = await this.repo.findById(id);
    if (!patient) throw new NotFoundError('Patient not found');

    if (dto.national_id && dto.national_id !== patient.national_id) {
      const conflict = await this.repo.findByNationalId(dto.national_id);
      if (conflict) throw new ConflictError('A patient with this national ID already exists');
    }

    return this.repo.update(id, dto);
  }
}
