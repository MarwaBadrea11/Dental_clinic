import { ProceduresService } from './procedures.service.js';
import { ProceduresRepository } from './procedures.repository.js';
import { successResponse } from '../../utils/response.js';

function getService(request) {
  return new ProceduresService(new ProceduresRepository(request.server.db));
}

export async function listProceduresHandler(request, reply) {
  const result = await getService(request).list(request.query);
  return reply.status(200).send(
    successResponse(result.data, { 
      total: result.total, 
      page: result.page, 
      limit: result.limit 
    })
  );
}

export async function getProcedureHandler(request, reply) {
  const proc = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(proc));
}

export async function createProcedureHandler(request, reply) {
  const proc = await getService(request).create(request.body);
  return reply.status(201).send(successResponse(proc));
}

export async function updateProcedureHandler(request, reply) {
  const proc = await getService(request).update(request.params.id, request.body);
  return reply.status(200).send(successResponse(proc));
}