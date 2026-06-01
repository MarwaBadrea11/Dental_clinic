import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  createPatientHandler,
  getPatientHandler,
  listPatientsHandler,
  updatePatientHandler,
  deletePatientHandler,
} from './patients.controller.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function patientsRoutes(fastify) {
  // إعداد الصلاحيات المشتركة للعمليات التي تتطلب تعديلاً
  const writePermissions = [authenticate, authorize('patients:*')];
  
  // إعداد الصلاحيات للقراءة فقط
  const readPermissions = [authenticate, authorize('patients:read')];

  // مسار إنشاء مريض جديد
  fastify.post('/', { preHandler: writePermissions }, createPatientHandler);

  // مسار جلب قائمة المرضى (مع دعم الـ Query Params للبحث والترقيم)
  fastify.get('/', { preHandler: readPermissions }, listPatientsHandler);

  // مسار جلب بيانات مريض محدد
  fastify.get('/:id', { preHandler: readPermissions }, getPatientHandler);

  // مسار تعديل بيانات مريض موجود
  fastify.put('/:id', { preHandler: writePermissions }, updatePatientHandler);

  // مسار حذف مريض (Soft Delete)
  fastify.delete('/:id', { preHandler: writePermissions }, deletePatientHandler);
}