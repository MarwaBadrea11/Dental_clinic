import { AppError, NotFoundError } from '../../utils/errors.js';
import { VALID_FDI_TEETH } from './odontogram.schema.js';

/** Default state for a tooth not yet charted */
const DEFAULT_TOOTH = { status: 'HEALTHY', notes: null, surfaces: [] };

export class OdontogramService {
  /** @param {import('./odontogram.repository.js').OdontogramRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async getByPatient(patientId) {
    const record = await this.repo.findByPatient(patientId);

    // Build full 32-tooth chart, filling missing teeth with defaults
    const teeth = {};
    for (const t of VALID_FDI_TEETH) {
      teeth[t] = record?.teeth?.[t] ?? { ...DEFAULT_TOOTH };
    }

    return { patient_id: patientId, teeth, updated_at: record?.updated_at ?? null };
  }

  async initChart(patientId, userId) {
    const existing = await this.repo.findByPatient(patientId);
    if (existing) return null; // already exists — signal to caller
    return this.repo.upsert(patientId, {}, userId); // returns the raw inserted row
  }

  async updateTooth(patientId, toothNumber, dto, userId) {
    // Normalise: accept both number (14) and string ("14") from the route param
    const toothKey = String(toothNumber);

    if (!VALID_FDI_TEETH.includes(toothKey)) {
      throw new AppError(400, `Invalid tooth number '${toothKey}'. Use FDI notation (e.g. 11, 46).`, 'INVALID_TOOTH');
    }

    const record = await this.repo.findByPatient(patientId);
    const currentTeeth = record?.teeth ?? {};
    const previousState = currentTeeth[toothKey] ?? { ...DEFAULT_TOOTH };

    const newState = {
      status: dto.status,
      notes: dto.notes ?? null,
      surfaces: dto.surfaces ?? [],
    };

    // Write history before applying change
    await this.repo.appendHistory({
      patient_id: patientId,
      tooth_number: toothKey,
      previous_state: previousState,
      new_state: newState,
      changed_by: userId,
      treatment_plan_id: dto.treatment_plan_id ?? null,
    });

    const updatedTeeth = { ...currentTeeth, [toothKey]: newState };
    const odontogram = await this.repo.upsert(patientId, updatedTeeth, userId);

    return { tooth_number: toothKey, ...newState, updated_at: odontogram.updated_at };
  }

  getHistory(patientId, toothNumber) {
    return this.repo.getHistory(patientId, toothNumber);
  }
}
