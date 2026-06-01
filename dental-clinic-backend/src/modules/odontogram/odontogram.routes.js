import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getOdontogramHandler,
  createOdontogramHandler,
  updateToothHandler,
  getOdontogramHistoryHandler,
  updateBatchHandler, // تأكد من استيراد الـ Handler الجديد هنا
} from './odontogram.controller.js';

export async function odontogramRoutes(fastify) {
  // GET /api/v1/patients/:patientId/odontogram
  fastify.get('/:patientId/odontogram', { preHandler: [authenticate, authorize('odontogram:read')] }, getOdontogramHandler);

  // POST /api/v1/patients/:patientId/odontogram  — initialise a blank chart
  fastify.post('/:patientId/odontogram', { preHandler: [authenticate, authorize('odontogram:create')] }, createOdontogramHandler);

  // GET /api/v1/patients/:patientId/odontogram/history
  // MUST be registered before the PATCH /:toothNumber route
  fastify.get('/:patientId/odontogram/history', { preHandler: [authenticate, authorize('odontogram:read')] }, getOdontogramHistoryHandler);

  // PATCH /api/v1/patients/:patientId/odontogram/batch
  // تمت إضافة هذا المسار ليدعم التحديث الجماعي الذي تحتاجه في OdontogramPage.tsx
  fastify.patch('/:patientId/odontogram/batch', { preHandler: [authenticate, authorize('odontogram:update')] }, updateBatchHandler);

  // PATCH /api/v1/patients/:patientId/odontogram/:toothNumber
  fastify.patch('/:patientId/odontogram/:toothNumber', { preHandler: [authenticate, authorize('odontogram:update')] }, updateToothHandler);
}