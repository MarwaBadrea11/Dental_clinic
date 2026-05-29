import { ConflictError, NotFoundError } from '../../utils/errors.js';

export class ProceduresService {
  /** @param {import('./procedures.repository.js').ProceduresRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  list(query) {
    return this.repo.list(query);
  }

  async getById(id) {
    const proc = await this.repo.findById(id);
    if (!proc) throw new NotFoundError('Procedure not found');
    return proc;
  }

  async create(dto) {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) throw new ConflictError(`Procedure code '${dto.code}' already exists`);
    return this.repo.create(dto);
  }

  async update(id, dto) {
    const proc = await this.repo.findById(id);
    if (!proc) throw new NotFoundError('Procedure not found');
    return this.repo.update(id, dto);
  }
}
