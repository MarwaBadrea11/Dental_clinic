import { AppError } from '../../utils/errors.js';

export class NotesService {
  /** @param {import('./notes.repository.js').NotesRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  /**
   * Return all notes for a patient.
   * @param {string} patientId
   */
  async listByPatient(patientId) {
    const rows = await this.repo.findByPatient(patientId);
    return rows.map((r) => this.#format(r));
  }

  /**
   * Create a new note for a patient.
   * @param {string} patientId
   * @param {object} payload
   * @param {string|null} createdBy  - user id from JWT
   */
  async create(patientId, payload, createdBy = null) {
    const row = await this.repo.create({
      patient_id:  patientId,
      type:        payload.type        ?? 'note',
      title:       payload.title,
      description: payload.description,
      doctor:      payload.doctor,
      date:        payload.date,
      status:      payload.status      ?? 'completed',
      cost:        payload.cost        ?? null,
      created_by:  createdBy,
    });
    return this.#format(row);
  }

  /**
   * Delete a note, verifying it belongs to the given patient.
   * @param {string} patientId
   * @param {string} noteId
   */
  async delete(patientId, noteId) {
    const note = await this.repo.findById(noteId);
    if (!note) throw new AppError('Note not found', 404);
    if (note.patient_id !== patientId) throw new AppError('Note does not belong to this patient', 403);
    await this.repo.delete(noteId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Map DB row → API shape (camelCase, matching MedicalHistoryEntry on the frontend) */
  #format(row) {
    return {
      id:          row.id,
      patientId:   row.patient_id,
      type:        row.type,
      title:       row.title,
      description: row.description,
      doctor:      row.doctor,
      date:        row.date instanceof Date
                     ? row.date.toISOString().split('T')[0]
                     : String(row.date).split('T')[0],
      status:      row.status,
      cost:        row.cost !== null && row.cost !== undefined ? Number(row.cost) : undefined,
      createdAt:   row.created_at,
    };
  }
}
