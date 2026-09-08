import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { attachClinicContext } from '../../middleware/clinicContext.js';
import {
  getDashboardStatsHandler,
  getRecentPatientsHandler,
  getTodayScheduleHandler,
} from './dashboard.controller.js';

export async function dashboardRoutes(fastify) {
  // TX-05: Added attachClinicContext for clinic isolation
  const preHandler = [authenticate, attachClinicContext, authorize('dashboard:read')];

  fastify.get('/stats',           { preHandler }, getDashboardStatsHandler);
  fastify.get('/recent-patients', { preHandler }, getRecentPatientsHandler);
  fastify.get('/today-schedule',  { preHandler }, getTodayScheduleHandler);
}
