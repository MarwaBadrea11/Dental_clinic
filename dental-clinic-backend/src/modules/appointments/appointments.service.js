import { AppError } from '../../utils/errors.js';

export class AppointmentsService {
  /** 
   * @param {import('./appointments.repository.js').AppointmentsRepository} repo
   * @param {import('knex').Knex} db - TX-03: For cross-clinic reference validation
   */
  constructor(repo, db) {
    this.repo = repo;
    this.db = db;
  }

  /**
   * TX-03: Validate that patient_id and dentist_id belong to the clinic_id
   * Prevents cross-clinic reference attacks (Clinic A user referencing Clinic B entities)
   */
  async validateClinicReferences(patient_id, dentist_id, clinic_id) {
    // Validate patient belongs to clinic
    const patient = await this.db('patients')
      .where({ id: patient_id, clinic_id })
      .select('id')
      .first();
    
    if (!patient) {
      throw new AppError(
        404,
        'Patient not found or does not belong to your clinic',
        'INVALID_PATIENT_REFERENCE'
      );
    }

    // Validate dentist belongs to clinic
    const dentist = await this.db('users')
      .where({ id: dentist_id, clinic_id, role: 'DENTIST' })
      .select('id')
      .first();
    
    if (!dentist) {
      throw new AppError(
        404,
        'Dentist not found or does not belong to your clinic',
        'INVALID_DENTIST_REFERENCE'
      );
    }
  }

  /**
   * تنفيذ عملية حجز الموعد بعد التحقق من توفر الطبيب والكرسي
   * TX-03: Now includes clinic_id and validates cross-clinic references
   */
  async book(dto, clinic_id) {
    // TX-03: Validate patient and dentist belong to the user's clinic
    await this.validateClinicReferences(dto.patient_id, dto.dentist_id, clinic_id);

    // التحقق من وجود تعارض (طبيب مشغول أو كرسي محجوز)
    const conflict = await this.repo.findConflict({
      dentist_id: dto.dentist_id,
      chair_number: dto.chair_number,
      scheduled_at: dto.scheduled_at,
      duration_minutes: dto.duration_minutes,
      clinic_id,  // TX-03: Filter conflicts by clinic
    });

    if (conflict) {
      const conflictType = conflict.dentist_id === dto.dentist_id ? 'Dentist' : 'Chair';
      throw new AppError(
        400,
        `${conflictType} is already booked for this time. Please choose a different slot.`,
        'APPOINTMENT_CONFLICT'
      );
    }

    // TX-03: Inject clinic_id into data before creating
    return this.repo.create({ ...dto, clinic_id });
  }

  /**
   * جلب موعد واحد بالمعرف
   * TX-03: Now includes clinic_id for isolation
   */
  async getById(id, clinic_id) {
    return this.repo.findById(id, clinic_id);
  }

  /**
   * تحديث موعد قائم مع التحقق من التعارض إذا تغير الوقت أو الكرسي
   * TX-03: Now includes clinic_id and validates cross-clinic references if IDs change
   */
  async updateById(id, dto, clinic_id) {
    // TX-03: Fetch existing appointment within clinic boundary
    const existing = await this.repo.findById(id, clinic_id);
    if (!existing) return null;

    // TX-03: If patient_id OR dentist_id is changing, validate they both belong to the clinic
    // Use OR (not else-if) to catch cases where both fields change
    if ((dto.patient_id && dto.patient_id !== existing.patient_id) || 
        (dto.dentist_id && dto.dentist_id !== existing.dentist_id)) {
      await this.validateClinicReferences(
        dto.patient_id ?? existing.patient_id, 
        dto.dentist_id ?? existing.dentist_id, 
        clinic_id
      );
    }

    // إذا تغير الوقت أو الكرسي، نتحقق من التعارض
    if (dto.scheduled_at || dto.chair_number || dto.duration_minutes || dto.dentist_id) {
      const conflict = await this.repo.findConflict({
        dentist_id: dto.dentist_id ?? existing.dentist_id,
        chair_number: dto.chair_number ?? existing.chair_number,
        scheduled_at: dto.scheduled_at ?? existing.scheduled_at,
        duration_minutes: dto.duration_minutes ?? existing.duration_minutes,
        excludeId: id,
        clinic_id,  // TX-03: Filter conflicts by clinic
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

    return this.repo.update(id, dto, clinic_id);
  }

  /**
   * حذف موعد بالمعرف
   * TX-03: Now includes clinic_id for isolation
   */
  async deleteById(id, clinic_id) {
    const existing = await this.repo.findById(id, clinic_id);
    if (!existing) return null;
    await this.repo.delete(id, clinic_id);
    return true;
  }

  /**
   * جلب قائمة المواعيد مع حساب الإحصائيات المطلوبة لواجهة التقويم (Stats Cards).
   * يُشغَّل auto-transition أولاً لتحديث أي مواعيد انتهت قبل الإرجاع.
   * TX-03: Now includes clinic_id for isolation
   */
  async list(query = {}, clinic_id) {
    // Auto-mark any appointments whose end time has passed as COMPLETED
    // TX-03: Only transition appointments within this clinic
    await this.repo.autoTransitionPastAppointments(clinic_id);

    const appointments = await this.repo.listWithFilters({
      date: query.date,
      start_date: query.start_date,
      end_date: query.end_date,
      dentist_id: query.dentist_id,
      patient_id: query.patient_id,
      clinic_id,  // TX-03: Filter by clinic
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