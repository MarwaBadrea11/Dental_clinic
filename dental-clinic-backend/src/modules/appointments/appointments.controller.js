import { AppointmentsService } from './appointments.service.js';
import { AppointmentsRepository } from './appointments.repository.js';
import { CreateAppointmentSchema, ListAppointmentsSchema, UpdateAppointmentSchema, AppointmentIdParamSchema } from './appointments.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { hasPermission, ROLE_PERMISSIONS } from '../../middleware/authorize.js';

function getService(request) {
  // TX-03: Pass db to service for cross-clinic reference validation
  return new AppointmentsService(new AppointmentsRepository(request.server.db), request.server.db);
}

/**
 * Validate data with Zod. Sends 422 and returns null on failure.
 * Synchronous — do NOT make this async.
 */
function parseValidation(schema, data, reply) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    reply.status(422).send(errorResponse('Validation failed', { fields }));
    return null;
  }
  return parsed.data;
}

export async function bookAppointmentHandler(request, reply) {
  request.log.warn({ body: request.body }, 'booking body received');

  const data = parseValidation(CreateAppointmentSchema, request.body, reply);
  if (!data) {
    const parsed = CreateAppointmentSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn({ fields: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }, 'booking validation failed');
    }
    return;
  }

  try {
    // TX-03: Pass clinic_id from JWT to service
    const appointment = await getService(request).book(data, request.clinicId);
    return reply.status(201).send(successResponse(appointment));
  } catch (error) {
    if (error.code === 'APPOINTMENT_CONFLICT') {
      return reply.status(error.statusCode || 400).send(errorResponse(error.message));
    }
    // TX-03: Handle cross-clinic reference errors
    if (error.code === 'INVALID_PATIENT_REFERENCE' || error.code === 'INVALID_DENTIST_REFERENCE') {
      return reply.status(error.statusCode || 404).send(errorResponse(error.message));
    }
    if (error.code === '23503') {
      return reply.status(404).send(errorResponse('The provided Patient ID or Dentist ID does not exist in the system.'));
    }
    throw error;
  }
}

export async function listAppointmentsHandler(request, reply) {
  const query = parseValidation(ListAppointmentsSchema, request.query, reply);
  if (!query) return;

  try {
    // TX-03: Pass clinic_id from JWT to service
    const result = await getService(request).list(query, request.clinicId);
    return reply.status(200).send(successResponse(result));
  } catch (error) {
    throw error;
  }
}

export async function getAppointmentHandler(request, reply) {
  const params = parseValidation(AppointmentIdParamSchema, request.params, reply);
  if (!params) return;

  try {
    // TX-03: Pass clinic_id from JWT to service
    const appointment = await getService(request).getById(params.id, request.clinicId);
    if (!appointment) {
      return reply.status(404).send(errorResponse('Appointment not found'));
    }
    return reply.status(200).send(successResponse(appointment));
  } catch (error) {
    throw error;
  }
}

export async function updateAppointmentHandler(request, reply) {
  const params = parseValidation(AppointmentIdParamSchema, request.params, reply);
  if (!params) return;

  const data = parseValidation(UpdateAppointmentSchema, request.body, reply);
  if (!data) return;

  try {
    // TX-03: Pass clinic_id from JWT to service
    const appointment = await getService(request).updateById(params.id, data, request.clinicId);
    if (!appointment) {
      return reply.status(404).send(errorResponse('Appointment not found'));
    }
    return reply.status(200).send(successResponse(appointment));
  } catch (error) {
    if (error.code === 'APPOINTMENT_CONFLICT') {
      return reply.status(error.statusCode || 400).send(errorResponse(error.message));
    }
    // TX-03: Handle cross-clinic reference errors
    if (error.code === 'INVALID_PATIENT_REFERENCE' || error.code === 'INVALID_DENTIST_REFERENCE') {
      return reply.status(error.statusCode || 404).send(errorResponse(error.message));
    }
    throw error;
  }
}

/**
 * DELETE /:id
 * PATIENT: can delete only their own appointment (ownership via users→patients email join).
 * Staff with appointments:*: can delete any appointment.
 * TX-03: Now uses clinic_id for isolation
 */
export async function deleteAppointmentHandler(request, reply) {
  request.log.warn({ params: request.params, role: request.user?.role }, '[DELETE] handler entered');

  const params = parseValidation(AppointmentIdParamSchema, request.params, reply);
  if (!params) return;

  try {
    // 1. Confirm the appointment exists (TX-03: within clinic boundary)
    const existing = await request.server.db('appointments')
      .where({ id: params.id, clinic_id: request.clinicId })  // TX-03: Clinic isolation
      .select('id', 'patient_id')
      .first();

    request.log.warn({ existing }, '[DELETE] appointment lookup');

    if (!existing) {
      return reply.status(404).send(errorResponse('Appointment not found'));
    }

    // 2. Ownership / permission check
    if (request.user.role === 'PATIENT') {
      // Resolve user email → patient row
      const userRow = await request.server.db('users')
        .where({ id: request.user.sub })
        .select('email')
        .first();

      const patientRow = userRow
        ? await request.server.db('patients')
            .where({ email: userRow.email, clinic_id: request.clinicId })  // TX-03: Clinic isolation
            .select('id')
            .first()
        : null;

      request.log.warn({ userRow, patientRow, patient_id: existing.patient_id }, '[DELETE] ownership check');

      if (!patientRow || existing.patient_id !== patientRow.id) {
        return reply.status(403).send(errorResponse('Forbidden'));
      }
    } else {
      // Staff: must have appointments:* permission
      const rolePerms = ROLE_PERMISSIONS[request.user.role] ?? [];
      const allPerms  = [...rolePerms, ...(request.user.permissions ?? [])];
      if (!hasPermission(allPerms, 'appointments:*')) {
        return reply.status(403).send(errorResponse('Forbidden'));
      }
    }

    // 3. Delete (TX-03: Pass clinic_id to service)
    await getService(request).deleteById(params.id, request.clinicId);
    return reply.status(200).send(successResponse({ message: 'Appointment deleted successfully' }));
  } catch (error) {
    request.log.error({ err: error, stack: error?.stack }, '[DELETE] appointment error');
    throw error;
  }
}
