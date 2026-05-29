import { PatientsService } from './patients.service.js';
import { PatientsRepository } from './patients.repository.js';
import { CreatePatientSchema, UpdatePatientSchema } from './patients.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new PatientsService(new PatientsRepository(request.server.db));
}

function parseValidation(schema, body, reply) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    reply.status(422).send(errorResponse('Validation failed', { fields }));
    return null;
  }
  return parsed.data;
}

export async function createPatientHandler(request, reply) {
  const data = parseValidation(CreatePatientSchema, request.body, reply);
  if (!data) return;
  const patient = await getService(request).create(data);
  return reply.status(201).send(successResponse(patient));
}

export async function listPatientsHandler(request, reply) {
  const result = await getService(request).list(request.query);
  return reply.status(200).send(successResponse(result.patients, {
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }));
}

export async function getPatientHandler(request, reply) {
  const patient = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(patient));
}

export async function updatePatientHandler(request, reply) {
  const data = parseValidation(UpdatePatientSchema, request.body, reply);
  if (!data) return;
  const patient = await getService(request).update(request.params.id, data);
  return reply.status(200).send(successResponse(patient));
}
