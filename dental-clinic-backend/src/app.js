import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import knexPlugin from './plugins/knex.js';
import jwtPlugin from './plugins/jwt.js';
import securityHeadersPlugin from './plugins/securityHeaders.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { patientsRoutes } from './modules/patients/patients.routes.js';
import { appointmentsRoutes } from './modules/appointments/appointments.routes.js';
import { AppError, ValidationError } from './utils/errors.js';
import { errorResponse } from './utils/response.js';

export async function buildApp(opts = {}) {
  const fastify = Fastify({ logger: env.NODE_ENV !== 'test', ...opts });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await fastify.register(knexPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(securityHeadersPlugin);
  await fastify.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.user?.sub ?? request.ip,
  });

  // ─── Global Error Handler ────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    if (!error.statusCode || error.statusCode >= 500) fastify.log.error(error);

    if (error instanceof ValidationError) {
      return reply.status(422).send(errorResponse('Validation failed', { fields: error.fields }));
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(errorResponse(error.message));
    }
    if (error.statusCode === 429) {
      return reply.status(429).send(errorResponse('Too many requests'));
    }
    return reply.status(500).send(errorResponse('Internal server error'));
  });

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(rolesRoutes, { prefix: '/api/v1' });
  await fastify.register(patientsRoutes, { prefix: '/api/v1/patients' });
  await fastify.register(appointmentsRoutes, { prefix: '/api/v1/appointments' });

  return fastify;
}
