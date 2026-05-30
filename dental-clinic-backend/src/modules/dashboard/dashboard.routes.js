import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import {
  getDashboardStatsHandler,
  getRecentPatientsHandler,
  getTodayScheduleHandler,
} from './dashboard.controller.js';

export async function dashboardRoutes(fastify) {
  const preHandler = [authenticate, authorize('dashboard:read')];

  fastify.get('/stats',           { preHandler }, getDashboardStatsHandler);
  fastify.get('/recent-patients', { preHandler }, getRecentPatientsHandler);
  fastify.get('/today-schedule',  { preHandler }, getTodayScheduleHandler);
}
