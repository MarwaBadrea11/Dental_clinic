import { authenticate } from '../../middleware/authenticate.js';
import { registerHandler, loginHandler, refreshHandler, logoutHandler } from './auth.controller.js';

export async function authRoutes(fastify) {
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/refresh', refreshHandler);
  fastify.post('/logout', { preHandler: [authenticate] }, logoutHandler);
}
