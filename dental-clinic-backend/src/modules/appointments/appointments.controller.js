import { AppointmentsService } from './appointments.service.js';
import { AppointmentsRepository } from './appointments.repository.js';
import { CreateAppointmentSchema, ListAppointmentsSchema } from './appointments.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new AppointmentsService(new AppointmentsRepository(request.server.db));
}

function parseValidation(schema, data, reply) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    reply.status(422).send(errorResponse('Validation failed', { fields }));
    return null;
  }
  return parsed.data;
}

export async function bookAppointmentHandler(request, reply) {
  const data = parseValidation(CreateAppointmentSchema, request.body, reply);
  if (!data) return;
  const appointment = await getService(request).book(data);
  return reply.status(201).send(successResponse(appointment));
}

export async function listAppointmentsHandler(request, reply) {
  const query = parseValidation(ListAppointmentsSchema, request.query, reply);
  if (!query) return;
  const appointments = await getService(request).listDaily(query);
  return reply.status(200).send(successResponse(appointments));
}
