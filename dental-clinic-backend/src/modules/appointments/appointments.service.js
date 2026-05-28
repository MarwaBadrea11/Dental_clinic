import { AppError, NotFoundError } from '../../utils/errors.js';

export class AppointmentsService {
  /** @param {import('./appointments.repository.js').AppointmentsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async book(dto) {
    const conflict = await this.repo.findConflict({
      dentist_id: dto.dentist_id,
      scheduled_at: dto.scheduled_at,
      duration_minutes: dto.duration_minutes,
    });

    if (conflict) {
      throw new AppError(
        400,
        `Dentist already has an appointment from ${conflict.scheduled_at} for ${conflict.duration_minutes} minutes. Please choose a different time.`,
        'APPOINTMENT_CONFLICT'
      );
    }

    return this.repo.create(dto);
  }

  listDaily(query = {}) {
    return this.repo.listByDay({
      date: query.date,
      dentist_id: query.dentist_id,
      patient_id: query.patient_id,
    });
  }
}
