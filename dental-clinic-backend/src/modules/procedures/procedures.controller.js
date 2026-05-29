import { ProceduresService } from './procedures.service.js';
import { ProceduresRepository } from './procedures.repository.js';
import { CreateProcedureSchema, UpdateProcedureSchema, ListProceduresSchema } from './procedures.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new ProceduresService(new ProceduresRepository(request.server.db));
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

export async function listProceduresHandler(request, reply) {
  const query = parseValidation(ListProceduresSchema, request.query, reply);
  if (!query) return;
  const result = await getService(request).list(query);
  return reply.status(200).send(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
}

export async function getProcedureHandler(request, reply) {
  const proc = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(proc));
}

export async function createProcedureHandler(request, reply) {
  const data = parseValidation(CreateProcedureSchema, request.body, reply);
  if (!data) return;
  const proc = await getService(request).create(data);
  return reply.status(201).send(successResponse(proc));
}

export async function updateProcedureHandler(request, reply) {
  const data = parseValidation(UpdateProcedureSchema, request.body, reply);
  if (!data) return;
  const proc = await getService(request).update(request.params.id, data);
  return reply.status(200).send(successResponse(proc));
}
