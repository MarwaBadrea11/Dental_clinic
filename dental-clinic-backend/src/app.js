import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { env } from './config/env.js';
import knexPlugin from './plugins/knex.js';
import jwtPlugin from './plugins/jwt.js';
import securityHeadersPlugin from './plugins/securityHeaders.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { patientsRoutes } from './modules/patients/patients.routes.js';
import { attachmentsRoutes } from './modules/attachments/attachments.routes.js';
import { appointmentsRoutes } from './modules/appointments/appointments.routes.js';
import { proceduresRoutes } from './modules/procedures/procedures.routes.js';
import { treatmentsRoutes } from './modules/treatments/treatments.routes.js';
import { odontogramRoutes } from './modules/odontogram/odontogram.routes.js';
import { invoicesRoutes, financeRoutes, patientDebtRoute } from './modules/invoices/invoices.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { AppError, ValidationError } from './utils/errors.js';
import { errorResponse } from './utils/response.js';

// Ensure uploads directory exists
const UPLOADS_DIR = join(process.cwd(), env.UPLOAD_DIR);
mkdirSync(UPLOADS_DIR, { recursive: true });

export async function buildApp(opts = {}) {
  const fastify = Fastify({ logger: env.NODE_ENV !== 'test', ...opts });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await fastify.register(knexPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(securityHeadersPlugin);
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.user?.sub ?? request.ip,
  });
  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024, files: 1 }, // 50 MB, 1 file per request
  });
  await fastify.register(staticFiles, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
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
  await fastify.register(attachmentsRoutes, { prefix: '/api/v1/patients' });
  await fastify.register(appointmentsRoutes, { prefix: '/api/v1/appointments' });
  await fastify.register(proceduresRoutes, { prefix: '/api/v1/procedures' });
  await fastify.register(treatmentsRoutes, { prefix: '/api/v1/treatments' });
  await fastify.register(odontogramRoutes, { prefix: '/api/v1/patients' });
  await fastify.register(invoicesRoutes, { prefix: '/api/v1/invoices' });
  await fastify.register(financeRoutes, { prefix: '/api/v1/finance' });
  await fastify.register(patientDebtRoute, { prefix: '/api/v1/patients' });
  await fastify.register(inventoryRoutes, { prefix: '/api/v1/inventory' });
  await fastify.register(staffRoutes, { prefix: '/api/v1/staff' });

  return fastify;
}
