import { InventoryService } from './inventory.service.js';
import { InventoryRepository } from './inventory.repository.js';
import { CreateInventorySchema, UpdateInventorySchema, RestockInventorySchema } from './inventory.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new InventoryService(new InventoryRepository(request.server.db));
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

export async function listInventoryHandler(request, reply) {
  const result = await getService(request).list(request.query);
  return reply.status(200).send(successResponse(result.items, {
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }));
}

export async function getInventoryItemHandler(request, reply) {
  const item = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(item));
}

export async function createInventoryItemHandler(request, reply) {
  const data = parseValidation(CreateInventorySchema, request.body, reply);
  if (!data) return;
  const item = await getService(request).create(data);
  return reply.status(201).send(successResponse(item));
}

export async function updateInventoryItemHandler(request, reply) {
  const data = parseValidation(UpdateInventorySchema, request.body, reply);
  if (!data) return;
  const item = await getService(request).update(request.params.id, data);
  return reply.status(200).send(successResponse(item));
}

export async function restockInventoryItemHandler(request, reply) {
  const data = parseValidation(RestockInventorySchema, request.body, reply);
  if (!data) return;
  const item = await getService(request).restock(request.params.id, data.quantity);
  return reply.status(200).send(successResponse(item));
}

export async function deleteInventoryItemHandler(request, reply) {
  await getService(request).delete(request.params.id);
  return reply.status(200).send(successResponse({ id: request.params.id }));
}

export async function getInventoryAlertsHandler(request, reply) {
  const alerts = await getService(request).getAlerts();
  return reply.status(200).send(successResponse(alerts));
}
