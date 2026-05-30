import { DashboardService } from './dashboard.service.js';
import { DashboardRepository } from './dashboard.repository.js';
import { successResponse } from '../../utils/response.js';

function getService(request) {
  return new DashboardService(new DashboardRepository(request.server.db));
}

export async function getDashboardStatsHandler(request, reply) {
  const stats = await getService(request).getStats();
  request.log.info({ stats }, '[dashboard] stats result');
  return reply.status(200).send(successResponse(stats));
}

export async function getRecentPatientsHandler(request, reply) {
  const patients = await getService(request).getRecentPatients();
  request.log.info({ count: patients.length, ids: patients.map(p => p.national_id) }, '[dashboard] recent-patients result');
  return reply.status(200).send(successResponse(patients));
}

export async function getTodayScheduleHandler(request, reply) {
  const schedule = await getService(request).getTodaySchedule();
  request.log.info({ count: schedule.length }, '[dashboard] today-schedule result');
  return reply.status(200).send(successResponse(schedule));
}
