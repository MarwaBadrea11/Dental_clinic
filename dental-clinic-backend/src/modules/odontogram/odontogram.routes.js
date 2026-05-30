import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getOdontogramHandler,
  createOdontogramHandler,
  updateToothHandler,
  getOdontogramHistoryHandler,
} from './odontogram.controller.js';

export async function odontogramRoutes(fastify) {
  // GET /api/v1/patients/:patientId/odontogram
  fastify.get('/:patientId/odontogram', { preHandler: [authenticate, authorize('odontogram:read')] }, getOdontogramHandler);

  // POST /api/v1/patients/:patientId/odontogram  — initialise a blank chart
  fastify.post('/:patientId/odontogram', { preHandler: [authenticate, authorize('odontogram:create')] }, createOdontogramHandler);

  // GET /api/v1/patients/:patientId/odontogram/history
  // MUST be registered before the PATCH /:toothNumber route — otherwise Fastify
  // matches "history" as a toothNumber param and routes to the wrong handler.
  fastify.get('/:patientId/odontogram/history', { preHandler: [authenticate, authorize('odontogram:read')] }, getOdontogramHistoryHandler);

  // PATCH /api/v1/patients/:patientId/odontogram/:toothNumber
  fastify.patch('/:patientId/odontogram/:toothNumber', { preHandler: [authenticate, authorize('odontogram:*')] }, updateToothHandler);
}
