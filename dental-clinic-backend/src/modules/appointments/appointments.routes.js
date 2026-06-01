import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { bookAppointmentHandler, listAppointmentsHandler } from './appointments.controller.js';

/**
 * تعريف مسارات موديول المواعيد لـ Fastify
 * @param {import('fastify').FastifyInstance} fastify 
 */
export async function appointmentsRoutes(fastify) {
  
  /**
   * مسار حجز موعد جديد
   * الصلاحية المطلوبة: appointments:* (عادةً للمسؤول، موظف الاستقبال، أو الطبيب)
   */
  fastify.post('/', { 
    preHandler: [
      authenticate, 
      authorize('appointments:*')
    ] 
  }, bookAppointmentHandler);

  /**
   * مسار جلب قائمة المواعيد والإحصائيات للتقويم
   * الصلاحية المطلوبة: appointments:read
   */
  fastify.get('/', { 
    preHandler: [
      authenticate, 
      authorize('appointments:read')
    ] 
  }, listAppointmentsHandler);
}