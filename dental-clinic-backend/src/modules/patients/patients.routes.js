import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { createPatientHandler, listPatientsHandler, updatePatientHandler } from './patients.controller.js';

export async function patientsRoutes(fastify) {
  const preHandler = [authenticate, authorize('patients:*')];

  fastify.post('/', { preHandler }, createPatientHandler);
  fastify.get('/', { preHandler: [authenticate, authorize('patients:read')] }, listPatientsHandler);
  fastify.put('/:id', { preHandler }, updatePatientHandler);
}
