import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  getMeHandler,
  updateMeHandler,
  uploadAvatarHandler,
  removeAvatarHandler,
  changePasswordHandler,
} from './auth.controller.js';
import { successResponse } from '../../utils/response.js';

export async function authRoutes(fastify) {
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/refresh', refreshHandler);
  fastify.post('/logout', { preHandler: [authenticate] }, logoutHandler);

  fastify.get('/me', { preHandler: [authenticate] }, getMeHandler);
  fastify.patch('/me', { preHandler: [authenticate] }, updateMeHandler);
  fastify.post('/me/avatar', { preHandler: [authenticate] }, uploadAvatarHandler);
  fastify.delete('/me/avatar', { preHandler: [authenticate] }, removeAvatarHandler);
  fastify.post('/change-password', { preHandler: [authenticate] }, changePasswordHandler);

  /**
   * GET /api/v1/auth/users?role=DENTIST
   * Returns active users, optionally filtered by role.
   * Used by the appointment form to populate the doctor dropdown.
   */
  fastify.get('/users', { preHandler: [authenticate, authorize('appointments:read')] }, async (request, reply) => {
    const { role } = request.query;
    const q = request.server.db('users')
      .select('id', 'username', 'email', 'role')
      .where({ is_active: true })
      .orderBy('username', 'asc');

    if (role) q.where({ role: role.toUpperCase() });

    const users = await q;
    return reply.status(200).send(successResponse(users));
  });
}
