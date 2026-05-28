import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

export async function rolesRoutes(fastify) {
  fastify.get('/roles', { preHandler: [authenticate, authorize('*')] }, async (_request, reply) => {
    return reply.status(501).send({
      success: false, data: null, error: 'Not implemented — available in Phase 2', meta: null,
    });
  });

  fastify.put('/roles/:roleId/permissions', { preHandler: [authenticate, authorize('*')] }, async (_request, reply) => {
    return reply.status(501).send({
      success: false, data: null, error: 'Not implemented — available in Phase 2', meta: null,
    });
  });
}
