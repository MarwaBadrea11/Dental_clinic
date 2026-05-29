import { InvoicesService } from './invoices.service.js';
import { InvoicesRepository } from './invoices.repository.js';
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  ListInvoicesSchema,
  RecordPaymentSchema,
} from './invoices.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { z } from 'zod';

function getService(request) {
  return new InvoicesService(new InvoicesRepository(request.server.db));
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

const FinanceSummarySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function listInvoicesHandler(request, reply) {
  const query = parseValidation(ListInvoicesSchema, request.query, reply);
  if (!query) return;
  const result = await getService(request).list(query);
  return reply.status(200).send(successResponse(result.data, { total: result.total, page: result.page, limit: result.limit }));
}

export async function getInvoiceHandler(request, reply) {
  const invoice = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(invoice));
}

export async function createInvoiceHandler(request, reply) {
  const data = parseValidation(CreateInvoiceSchema, request.body, reply);
  if (!data) return;
  const invoice = await getService(request).create(data, request.user.sub);
  return reply.status(201).send(successResponse(invoice));
}

export async function updateInvoiceHandler(request, reply) {
  const data = parseValidation(UpdateInvoiceSchema, request.body, reply);
  if (!data) return;
  const invoice = await getService(request).update(request.params.id, data);
  return reply.status(200).send(successResponse(invoice));
}

export async function recordPaymentHandler(request, reply) {
  const data = parseValidation(RecordPaymentSchema, request.body, reply);
  if (!data) return;
  const payment = await getService(request).recordPayment(request.params.id, data, request.user.sub);
  return reply.status(201).send(successResponse(payment));
}

export async function getPatientDebtHandler(request, reply) {
  const debt = await getService(request).getPatientDebt(request.params.patientId);
  return reply.status(200).send(successResponse(debt));
}

export async function getFinanceSummaryHandler(request, reply) {
  const query = parseValidation(FinanceSummarySchema, request.query, reply);
  if (!query) return;
  const summary = await getService(request).getFinanceSummary(query);
  return reply.status(200).send(successResponse(summary));
}
