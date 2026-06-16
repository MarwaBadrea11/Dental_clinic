import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { ClinicInfoSchema } from './settings.schema.js';
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

/**
 * GET /api/v1/settings/clinic
 * Returns persisted clinic information for the settings form.
 */
export async function getClinicInfoHandler(request, reply) {
  const service = getService(request);
  const info = await service.getClinicInfo();
  return reply.status(200).send(successResponse(info));
}

/**
 * PUT /api/v1/settings/clinic
 * Restricted to users with settings:* permission (ADMIN).
 */
export async function saveClinicInfoHandler(request, reply) {
  const parsed = ClinicInfoSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }

  const service = getService(request);
  const saved = await service.saveClinicInfo(parsed.data);
  return reply.status(200).send(successResponse(saved));
}
