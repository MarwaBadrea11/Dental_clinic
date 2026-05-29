import { TreatmentsService } from './treatments.service.js';
import { TreatmentsRepository } from './treatments.repository.js';
import { InvoicesRepository } from '../invoices/invoices.repository.js';
import {
  CreateTreatmentPlanSchema,
  UpdateTreatmentPlanSchema,
  UpdateProcedureStatusSchema,
  ListTreatmentPlansSchema,
} from './treatments.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new TreatmentsService(
    new TreatmentsRepository(request.server.db),
    new InvoicesRepository(request.server.db)
  );
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

export async function listTreatmentPlansHandler(request, reply) {
  const query = parseValidation(ListTreatmentPlansSchema, request.query, reply);
  if (!query) return;
  const result = await getService(request).list(query);
  return reply.status(200).send(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
}

export async function getTreatmentPlanHandler(request, reply) {
  const plan = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(plan));
}

export async function createTreatmentPlanHandler(request, reply) {
  const data = parseValidation(CreateTreatmentPlanSchema, request.body, reply);
  if (!data) return;
  const plan = await getService(request).create(data, request.user.sub);
  return reply.status(201).send(successResponse(plan));
}

export async function updateTreatmentPlanHandler(request, reply) {
  const data = parseValidation(UpdateTreatmentPlanSchema, request.body, reply);
  if (!data) return;
  const plan = await getService(request).update(request.params.id, data, request.user.sub);
  return reply.status(200).send(successResponse(plan));
}

export async function updateProcedureStatusHandler(request, reply) {
  const data = parseValidation(UpdateProcedureStatusSchema, request.body, reply);
  if (!data) return;
  const procedure = await getService(request).updateProcedure(
    request.params.id,
    request.params.procedureId,
    data,
    request.user.sub
  );
  return reply.status(200).send(successResponse(procedure));
}
