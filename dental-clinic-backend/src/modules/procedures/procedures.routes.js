import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  listProceduresHandler,
  getProcedureHandler,
  createProcedureHandler,
  updateProcedureHandler,
} from './procedures.controller.js';

export async function proceduresRoutes(fastify) {
  fastify.get('/',    { preHandler: [authenticate, authorize('treatments:read')] }, listProceduresHandler);
  fastify.get('/:id', { preHandler: [authenticate, authorize('treatments:read')] }, getProcedureHandler);
  fastify.post('/',   { preHandler: [authenticate, authorize('treatments:*')]    }, createProcedureHandler);
  fastify.patch('/:id', { preHandler: [authenticate, authorize('treatments:*')] }, updateProcedureHandler);
}
