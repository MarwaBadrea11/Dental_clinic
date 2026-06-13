import { AppError } from '../../utils/errors.js';

// HH:mm regex
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SettingsService {
  /** @param {import('./settings.repository.js').SettingsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  /** Return working-hours as a camelCase array (safe for the frontend). */
  async getWorkingHours() {
    const rows = await this.repo.getWorkingHours();
    return rows.map(this.#format);
  }

  /**
   * Validate and persist a full working-hours schedule.
   * @param {any[]} schedule — 7-element array from the request body
   */
  async saveWorkingHours(schedule) {
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      throw new AppError(400, 'schedule must be an array of exactly 7 day objects');
    }

    const dbRows = schedule.map((day, idx) => {
      const dow = Number(day.dayOfWeek ?? day.day_of_week);
      if (isNaN(dow) || dow < 0 || dow > 6) {
        throw new AppError(400, `Day at index ${idx} has an invalid dayOfWeek (expected 0–6)`);
      }

      const isOpen = Boolean(day.isOpen ?? day.is_open);

      // Validate times only when the day is open
      if (isOpen) {
        for (const [field, val] of [
          ['morningStart', day.morningStart ?? day.morning_start],
          ['morningEnd',   day.morningEnd   ?? day.morning_end],
        ]) {
          if (val && !TIME_RE.test(val)) {
            throw new AppError(400, `Invalid time format for ${field} on day ${dow}: expected HH:mm`);
          }
        }
        // Evening shift fields are optional (shift can be disabled)
        for (const [field, val] of [
          ['eveningStart', day.eveningStart ?? day.evening_start],
          ['eveningEnd',   day.eveningEnd   ?? day.evening_end],
        ]) {
          if (val && !TIME_RE.test(val)) {
            throw new AppError(400, `Invalid time format for ${field} on day ${dow}: expected HH:mm`);
          }
        }
      }

      return {
        day_of_week:   dow,
        is_open:       isOpen,
        morning_start: isOpen ? (day.morningStart ?? day.morning_start ?? null) : null,
        morning_end:   isOpen ? (day.morningEnd   ?? day.morning_end   ?? null) : null,
        evening_start: isOpen ? (day.eveningStart ?? day.evening_start ?? null) : null,
        evening_end:   isOpen ? (day.eveningEnd   ?? day.evening_end   ?? null) : null,
      };
    });

    const saved = await this.repo.upsertWorkingHours(dbRows);
    return saved.map(this.#format);
  }

  // ── Private formatter ──────────────────────────────────────────────────────

  #format(row) {
    return {
      dayOfWeek:    row.day_of_week,
      isOpen:       row.is_open,
      morningStart: row.morning_start ?? null,
      morningEnd:   row.morning_end   ?? null,
      eveningStart: row.evening_start ?? null,
      eveningEnd:   row.evening_end   ?? null,
      updatedAt:    row.updated_at,
    };
  }
}
