import { ConflictError, NotFoundError } from '../../utils/errors.js';

export class ProceduresService {
  /** @param {import('./procedures.repository.js').ProceduresRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async list(query) {
    return this.repo.list(query);
  }

  async getById(id) {
    const proc = await this.repo.findById(id);
    if (!proc) {
      throw new NotFoundError('Requested dental procedure was not found');
    }
    return proc;
  }

  async create(dto) {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) {
      throw new ConflictError(`Procedure code '${dto.code}' is already assigned to another procedure`);
    }
    return this.repo.create(dto);
  }

  async update(id, dto) {
    const proc = await this.repo.findById(id);
    if (!proc) {
      throw new NotFoundError('Requested dental procedure was not found');
    }

    if (dto.code && dto.code !== proc.code) {
      const existingCode = await this.repo.findByCode(dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictError(`Cannot update procedure. Code '${dto.code}' is already taken`);
      }
    }

    return this.repo.update(id, dto);
  }
}