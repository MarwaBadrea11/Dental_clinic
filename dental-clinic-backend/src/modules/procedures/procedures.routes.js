import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { attachClinicContext } from '../../middleware/clinicContext.js';
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
  // TX-04: All routes use clinicContext for isolation
  // NOTE: Currently uses invoices:* permissions (known issue - see TX04_PHASE_SUMMARY.md)
  const preHandlers = [authenticate, attachClinicContext, authorize('invoices:read')];
  const mutationHandlers = [authenticate, attachClinicContext, authorize('invoices:*')];

  // جلب قائمة العمليات (الكتالوج)
  fastify.get('/', {
    preHandler: preHandlers,
  }, listProceduresHandler);

  // جلب عملية محددة بناءً على الـ ID
  fastify.get('/:id', {
    preHandler: preHandlers,
  }, getProcedureHandler);

  // إضافة عملية جديدة للكتالوج
  fastify.post('/', {
    preHandler: mutationHandlers,
    schema: { body: CreateProcedureSchema },
  }, createProcedureHandler);

  // تعديل بيانات عملية
  fastify.patch('/:id', {
    preHandler: mutationHandlers,
    schema: { body: UpdateProcedureSchema },
  }, updateProcedureHandler);

  // حذف عملية من الكتالوج
  fastify.delete('/:id', {
    preHandler: mutationHandlers,
  }, deleteProcedureHandler);
}