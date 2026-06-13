import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getWorkingHoursHandler,
  saveWorkingHoursHandler,
} from './settings.controller.js';

/**
 * Registers clinic-settings routes.
 * Prefix (set in app.js): /api/v1/settings
 *
 * GET  /working-hours  — public (patients need it for booking)
 * PUT  /working-hours  — ADMIN only
 */
export async function settingsRoutes(fastify) {
  // GET: no auth required so the mobile booking screen can fetch without
  // patient-specific credentials (called before the user selects a date).
  fastify.get('/working-hours', getWorkingHoursHandler);

  // PUT: only admins may change the schedule
  fastify.put(
    '/working-hours',
    { preHandler: [authenticate, authorize('settings:*')] },
    saveWorkingHoursHandler,
  );
}
