import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { attachClinicContext } from '../../middleware/clinicContext.js';
import {
  listTreatmentPlansHandler,
  getTreatmentPlanHandler,
  createTreatmentPlanHandler,
  updateTreatmentPlanHandler,
  updateProcedureStatusHandler,
} from './treatments.controller.js';

export async function treatmentsRoutes(fastify) {
  // TX-04: All routes use clinicContext for isolation
  const readHandlers = [authenticate, attachClinicContext, authorize('treatments:read')];
  const mutationHandlers = [authenticate, attachClinicContext, authorize('treatments:*')];

  fastify.get('/',    { preHandler: readHandlers }, listTreatmentPlansHandler);
  fastify.get('/:id', { preHandler: readHandlers }, getTreatmentPlanHandler);
  fastify.post('/',   { preHandler: mutationHandlers }, createTreatmentPlanHandler);
  fastify.patch('/:id', { preHandler: mutationHandlers }, updateTreatmentPlanHandler);
  fastify.patch('/:id/procedures/:procedureId', { preHandler: mutationHandlers }, updateProcedureStatusHandler);
}
