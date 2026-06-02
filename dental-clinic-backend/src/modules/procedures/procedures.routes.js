import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  CreateProcedureSchema,
  UpdateProcedureSchema,
} from './procedures.schema.js';
import {
  getProcedureHandler,
  listProceduresHandler,
  createProcedureHandler,
  updateProcedureHandler,
  deleteProcedureHandler,
} from './procedures.controller.js';

export async function proceduresRoutes(fastify) {
  // جلب قائمة العمليات (الكتالوج)
  fastify.get('/', {
    preHandler: [authenticate, authorize('invoices:read')],
  }, listProceduresHandler);

  // جلب عملية محددة بناءً على الـ ID
  fastify.get('/:id', {
    preHandler: [authenticate, authorize('invoices:read')],
  }, getProcedureHandler);

  // إضافة عملية جديدة للكتالوج
  fastify.post('/', {
    preHandler: [authenticate, authorize('invoices:*')],
    schema: { body: CreateProcedureSchema },
  }, createProcedureHandler);

  // تعديل بيانات عملية
  fastify.patch('/:id', {
    preHandler: [authenticate, authorize('invoices:*')],
    schema: { body: UpdateProcedureSchema },
  }, updateProcedureHandler);

  // حذف عملية من الكتالوج
  fastify.delete('/:id', {
    preHandler: [authenticate, authorize('invoices:*')],
  }, deleteProcedureHandler);
}