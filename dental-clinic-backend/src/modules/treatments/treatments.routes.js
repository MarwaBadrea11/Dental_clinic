import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listTreatmentPlansHandler,
  getTreatmentPlanHandler,
  createTreatmentPlanHandler,
  updateTreatmentPlanHandler,
  updateProcedureStatusHandler,
} from './treatments.controller.js';

export async function treatmentsRoutes(fastify) {
  fastify.get('/',    { preHandler: [authenticate, authorize('treatments:read')] }, listTreatmentPlansHandler);
  fastify.get('/:id', { preHandler: [authenticate, authorize('treatments:read')] }, getTreatmentPlanHandler);
  fastify.post('/',   { preHandler: [authenticate, authorize('treatments:*')]    }, createTreatmentPlanHandler);
  fastify.patch('/:id', { preHandler: [authenticate, authorize('treatments:*')] }, updateTreatmentPlanHandler);
  fastify.patch('/:id/procedures/:procedureId', { preHandler: [authenticate, authorize('treatments:*')] }, updateProcedureStatusHandler);
}
