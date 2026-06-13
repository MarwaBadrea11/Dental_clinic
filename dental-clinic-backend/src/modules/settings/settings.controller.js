import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new SettingsService(new SettingsRepository(request.server.db));
}

/**
 * GET /api/v1/settings/working-hours
 * Public (or authenticated — any role can read working hours for booking).
 */
export async function getWorkingHoursHandler(request, reply) {
  const service  = getService(request);
  const schedule = await service.getWorkingHours();
  return reply.status(200).send(successResponse(schedule));
}

/**
 * PUT /api/v1/settings/working-hours
 * Restricted to ADMIN only.
 * Body: { schedule: WorkingHoursDay[] }
 */
export async function saveWorkingHoursHandler(request, reply) {
  const { schedule } = request.body ?? {};

  if (!schedule) {
    return reply.status(422).send(errorResponse('Missing required field: schedule'));
  }

  const service  = getService(request);
  const saved    = await service.saveWorkingHours(schedule);
  return reply.status(200).send(successResponse(saved));
}
