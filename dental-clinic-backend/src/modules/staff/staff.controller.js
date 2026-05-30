import { StaffService } from './staff.service.js';
import { StaffRepository } from './staff.repository.js';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  CreateAttendanceSchema,
  UpdateAttendanceSchema,
  CreateSalaryRecordSchema,
} from './staff.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new StaffService(new StaffRepository(request.server.db));
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

// ── Staff CRUD ────────────────────────────────────────────────────────────────

export async function listStaffHandler(request, reply) {
  const result = await getService(request).list(request.query);
  return reply.status(200).send(successResponse(result.staff, {
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }));
}

export async function getStaffMemberHandler(request, reply) {
  const member = await getService(request).getById(request.params.id);
  return reply.status(200).send(successResponse(member));
}

export async function createStaffMemberHandler(request, reply) {
  const data = parseValidation(CreateStaffSchema, request.body, reply);
  if (!data) return;
  const member = await getService(request).create(data);
  return reply.status(201).send(successResponse(member));
}

export async function updateStaffMemberHandler(request, reply) {
  const data = parseValidation(UpdateStaffSchema, request.body, reply);
  if (!data) return;
  const member = await getService(request).update(request.params.id, data);
  return reply.status(200).send(successResponse(member));
}

export async function deleteStaffMemberHandler(request, reply) {
  await getService(request).delete(request.params.id);
  return reply.status(200).send(successResponse({ id: request.params.id }));
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function listAttendanceHandler(request, reply) {
  const result = await getService(request).listAttendance(request.query);
  return reply.status(200).send(successResponse(result.attendance, {
    limit: result.limit,
    offset: result.offset,
  }));
}

export async function logAttendanceHandler(request, reply) {
  const data = parseValidation(CreateAttendanceSchema, request.body, reply);
  if (!data) return;
  const log = await getService(request).logAttendance(data);
  return reply.status(201).send(successResponse(log));
}

export async function updateAttendanceHandler(request, reply) {
  const data = parseValidation(UpdateAttendanceSchema, request.body, reply);
  if (!data) return;
  const log = await getService(request).updateAttendance(request.params.id, data);
  return reply.status(200).send(successResponse(log));
}

export async function deleteAttendanceHandler(request, reply) {
  await getService(request).deleteAttendance(request.params.id);
  return reply.status(200).send(successResponse({ id: request.params.id }));
}

// ── Salary Records ────────────────────────────────────────────────────────────

export async function listSalaryRecordsHandler(request, reply) {
  const result = await getService(request).listSalaryRecords(request.query);
  return reply.status(200).send(successResponse(result.records, {
    limit: result.limit,
    offset: result.offset,
  }));
}

export async function createSalaryRecordHandler(request, reply) {
  const data = parseValidation(CreateSalaryRecordSchema, request.body, reply);
  if (!data) return;
  const record = await getService(request).createSalaryRecord(data);
  return reply.status(201).send(successResponse(record));
}

export async function updateSalaryRecordHandler(request, reply) {
  const data = parseValidation(CreateSalaryRecordSchema.partial(), request.body, reply);
  if (!data) return;
  const record = await getService(request).updateSalaryRecord(request.params.id, data);
  return reply.status(200).send(successResponse(record));
}

export async function deleteSalaryRecordHandler(request, reply) {
  await getService(request).deleteSalaryRecord(request.params.id);
  return reply.status(200).send(successResponse({ id: request.params.id }));
}

export async function getMonthlySummaryHandler(request, reply) {
  const year = Number(request.params.year);
  const month = Number(request.params.month);
  const summary = await getService(request).getMonthlySummary(year, month);
  return reply.status(200).send(successResponse(summary));
}
