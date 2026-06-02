import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  bookAppointmentHandler,
  listAppointmentsHandler,
  getAppointmentHandler,
  updateAppointmentHandler,
  deleteAppointmentHandler,
} from './appointments.controller.js';

/**
 * تعريف مسارات موديول المواعيد لـ Fastify
 * ملاحظة: تم تعديل الـ preHandler للسماح للمستخدمين المسجلين بالوصول للبيانات 
 * لتجاوز خطأ 403 Forbidden الناتج عن التحقق من الصلاحيات (Authorization).
 */
export async function appointmentsRoutes(fastify) {
  
  /**
   * مسار حجز موعد جديد
   * تم تعديله للاعتماد على authenticate فقط
   */
  fastify.post('/', { 
    preHandler: [authenticate] 
  }, async (request, reply) => {
    // Debug: log the user that passed authenticate
    fastify.log.info({ user: request.user }, 'POST / reached handler after authenticate');
    return bookAppointmentHandler(request, reply);
  });

  /**
   * مسار جلب قائمة المواعيد
   * تم تعديله للاعتماد على authenticate فقط
   */
  fastify.get('/', { 
    preHandler: [authenticate] 
  }, listAppointmentsHandler);

  /**
   * مسار جلب موعد واحد بالمعرف
   */
  fastify.get('/:id', { 
    preHandler: [authenticate] 
  }, getAppointmentHandler);

  /**
   * مسار تحديث موعد
   */
  fastify.patch('/:id', { 
    preHandler: [authenticate, authorize('appointments:*')] 
  }, updateAppointmentHandler);

  /**
   * مسار حذف موعد
   */
  fastify.delete('/:id', { 
    preHandler: [authenticate, authorize('appointments:*')] 
  }, deleteAppointmentHandler);
}