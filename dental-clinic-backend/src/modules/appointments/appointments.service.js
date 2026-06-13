import { AppError } from '../../utils/errors.js';

export class AppointmentsService {
  /** @param {import('./appointments.repository.js').AppointmentsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  /**
   * تنفيذ عملية حجز الموعد بعد التحقق من توفر الطبيب والكرسي
   */
  async book(dto) {
    // التحقق من وجود تعارض (طبيب مشغول أو كرسي محجوز)
    const conflict = await this.repo.findConflict({
      dentist_id: dto.dentist_id,
      chair_number: dto.chair_number,
      scheduled_at: dto.scheduled_at,
      duration_minutes: dto.duration_minutes,
    });

    if (conflict) {
      const conflictType = conflict.dentist_id === dto.dentist_id ? 'Dentist' : 'Chair';
      throw new AppError(
        400,
        `${conflictType} is already booked for this time. Please choose a different slot.`,
        'APPOINTMENT_CONFLICT'
      );
    }

    return this.repo.create(dto);
  }

  /**
   * جلب موعد واحد بالمعرف
   */
  async getById(id) {
    return this.repo.findById(id);
  }

  /**
   * تحديث موعد قائم مع التحقق من التعارض إذا تغير الوقت أو الكرسي
   */
  async updateById(id, dto) {
    // إذا تغير الوقت أو الكرسي، نتحقق من التعارض
    if (dto.scheduled_at || dto.chair_number || dto.duration_minutes) {
      const existing = await this.repo.findById(id);
      if (!existing) return null;

      const conflict = await this.repo.findConflict({
        dentist_id: dto.dentist_id ?? existing.dentist_id,
        chair_number: dto.chair_number ?? existing.chair_number,
        scheduled_at: dto.scheduled_at ?? existing.scheduled_at,
        duration_minutes: dto.duration_minutes ?? existing.duration_minutes,
        excludeId: id,
      });

      if (conflict) {
        const conflictType = conflict.dentist_id === (dto.dentist_id ?? existing.dentist_id) ? 'Dentist' : 'Chair';
        throw new AppError(
          400,
          `${conflictType} is already booked for this time. Please choose a different slot.`,
          'APPOINTMENT_CONFLICT'
        );
      }
    }

    return this.repo.update(id, dto);
  }

  /**
   * حذف موعد بالمعرف
   */
  async deleteById(id) {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    await this.repo.delete(id);
    return true;
  }

  /**
   * جلب قائمة المواعيد مع حساب الإحصائيات المطلوبة لواجهة التقويم (Stats Cards).
   * يُشغَّل auto-transition أولاً لتحديث أي مواعيد انتهت قبل الإرجاع.
   */
  async list(query = {}) {
    // Auto-mark any appointments whose end time has passed as COMPLETED
    await this.repo.autoTransitionPastAppointments();

    const appointments = await this.repo.listWithFilters({
      date: query.date,
      start_date: query.start_date,
      end_date: query.end_date,
      dentist_id: query.dentist_id,
      patient_id: query.patient_id,
    });

    // تاريخ اليوم بصيغة نصية للمقارنة
    const todayStr = new Date().toISOString().split('T')[0];

    // حساب الإحصائيات لكروت الواجهة (image_0a40c6.jpg)
    const stats = appointments.reduce((acc, app) => {
      const appDate = new Date(app.scheduled_at).toISOString().split('T')[0];
      
      if (appDate === todayStr) acc.today++;
      if (app.status === 'CONFIRMED') acc.confirmed++;
      if (app.status === 'SCHEDULED') acc.pending++;
      
      return acc;
    }, { 
      today: 0, 
      thisWeek: appointments.length, 
      confirmed: 0, 
      pending: 0 
    });

    return {
      stats,
      appointments
    };
  }
}