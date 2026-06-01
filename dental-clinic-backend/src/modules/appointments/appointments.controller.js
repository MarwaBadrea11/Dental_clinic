import { AppointmentsService } from './appointments.service.js';
import { AppointmentsRepository } from './appointments.repository.js';
import { CreateAppointmentSchema, ListAppointmentsSchema } from './appointments.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

/**
 * دالة مساعدة لإنشاء نسخة من الخدمة والمستودع لكل طلب
 */
function getService(request) {
  return new AppointmentsService(new AppointmentsRepository(request.server.db));
}

/**
 * دالة مساعدة للتحقق من صحة البيانات باستخدام Zod
 */
function parseValidation(schema, data, reply) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ 
      field: i.path.join('.'), 
      message: i.message 
    }));
    reply.status(422).send(errorResponse('Validation failed', { fields }));
    return null;
  }
  return parsed.data;
}

/**
 * متحكم عملية حجز موعد جديد
 */
export async function bookAppointmentHandler(request, reply) {
  const data = parseValidation(CreateAppointmentSchema, request.body, reply);
  if (!data) return;

  try {
    const appointment = await getService(request).book(data);
    return reply.status(201).send(successResponse(appointment));
  } catch (error) {
    // معالجة خطأ تعارض المواعيد المخصص المرسل من الـ Service
    if (error.code === 'APPOINTMENT_CONFLICT') {
      return reply.status(error.statusCode || 400).send(errorResponse(error.message));
    }

    // معالجة خطأ PostgreSQL في حال كان المعرف (UUID) للمريض أو الطبيب غير موجود في النظام
    if (error.code === '23503') {
      return reply.status(404).send(errorResponse('The provided Patient ID or Dentist ID does not exist in the system.'));
    }

    // تمرير أي أخطاء أخرى غير متوقعة لمعالج الأخطاء العام
    throw error;
  }
}

/**
 * متحكم جلب قائمة المواعيد والإحصائيات للتقويم
 */
export async function listAppointmentsHandler(request, reply) {
  const query = parseValidation(ListAppointmentsSchema, request.query, reply);
  if (!query) return;

  try {
    // جلب النتيجة التي تحتوي على { stats, appointments } معاً
    const result = await getService(request).list(query);
    return reply.status(200).send(successResponse(result));
  } catch (error) {
    throw error;
  }
}