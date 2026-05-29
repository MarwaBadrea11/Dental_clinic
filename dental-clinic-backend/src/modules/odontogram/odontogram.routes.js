import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getOdontogramHandler,
  updateToothHandler,
  getOdontogramHistoryHandler,
} from './odontogram.controller.js';

export async function odontogramRoutes(fastify) {
  // GET /api/v1/patients/:patientId/odontogram
  fastify.get('/:patientId/odontogram', { preHandler: [authenticate, authorize('odontogram:read')] }, getOdontogramHandler);

  // PATCH /api/v1/patients/:patientId/odontogram/:toothNumber
  fastify.patch('/:patientId/odontogram/:toothNumber', { preHandler: [authenticate, authorize('odontogram:*')] }, updateToothHandler);

  // GET /api/v1/patients/:patientId/odontogram/history
  fastify.get('/:patientId/odontogram/history', { preHandler: [authenticate, authorize('odontogram:read')] }, getOdontogramHistoryHandler);
}
