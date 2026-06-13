import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
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
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import auditHookPlugin from './plugins/auditHook.js';
import appointmentReminderPlugin from './plugins/appointmentReminder.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { notesRoutes } from './modules/notes/notes.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { AppError, ValidationError } from './utils/errors.js';
import { errorResponse } from './utils/response.js';

// Ensure uploads directory exists
const UPLOADS_DIR = join(process.cwd(), env.UPLOAD_DIR);
mkdirSync(UPLOADS_DIR, { recursive: true });

export async function buildApp(opts = {}) {
  const fastify = Fastify({ logger: env.NODE_ENV !== 'test', ...opts });

  // ✅ ضبط الكومبيلر الخاص بـ Zod داخل دالة البناء ليعمل على مستوى السيرفر الفعلي
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // ─── Plugins ────────────────────────────────────────────────────────────────
  // CORS must be registered first so preflight OPTIONS requests are handled
  // before any other hooks (e.g. security headers) can intercept the response.
  await fastify.register(cors, {
    // Parse the comma-separated CORS_ORIGIN env var into an array, then add
    // special handling for React Native / Expo requests:
    //   • React Native on a physical device sends no Origin header (null)
    //   • The Android emulator reaches the host at 10.0.2.2
    //   • The iOS simulator uses localhost
    // In development we allow all these. In production, lock this to your
    // actual domain(s) only.
    origin: (origin, cb) => {
      // Allow requests with no Origin header (React Native fetch, Postman, etc.)
      if (!origin) return cb(null, true);

      const allowed = env.CORS_ORIGIN.split(',').map(o => o.trim());

      // Exact match
      if (allowed.includes(origin)) return cb(null, true);

      // In development, allow any localhost / LAN IP origin automatically
      if (env.NODE_ENV === 'development') {
        const isLocal =
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin.startsWith('http://10.0.2.2') ||      // Android emulator
          /^http:\/\/192\.168\.\d+\.\d+/.test(origin) || // LAN
          /^http:\/\/10\.\d+\.\d+\.\d+/.test(origin);   // LAN (10.x.x.x)
        if (isLocal) return cb(null, true);
      }

      cb(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await fastify.register(knexPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(securityHeadersPlugin);
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.user?.sub ?? request.ip,
  });
  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  });
  await fastify.register(staticFiles, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ─── Audit Hook ──────────────────────────────────────────────────────────────
  await fastify.register(auditHookPlugin);

  // ─── Appointment Reminder Scheduler ──────────────────────────────────────────
  await fastify.register(appointmentReminderPlugin);

  // ─── Global Error Handler ────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    if (!error.statusCode || error.statusCode >= 500) fastify.log.error(error);

    if (error instanceof ValidationError) {
      return reply.status(422).send(errorResponse('Validation failed', { fields: error.fields }));
    }
    // معالجة أخطاء التحقق التلقائية القادمة من Zod ونقلها لـ Format متناسق مع فرونت إند العيادة
    if (error.hasValidationError) {
      return reply.status(400).send(errorResponse('Validation failed', { fields: error.validation }));
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
  await fastify.register(reportsRoutes, { prefix: '/api/v1/reports' });
  await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
  await fastify.register(inventoryRoutes, { prefix: '/api/v1/inventory' });
  await fastify.register(staffRoutes, { prefix: '/api/v1/staff' });
  await fastify.register(notesRoutes, { prefix: '/api/v1/patients' });
  await fastify.register(notificationsRoutes, { prefix: '/api/v1/notifications' });

  return fastify;
}