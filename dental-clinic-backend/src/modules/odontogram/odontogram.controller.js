import { OdontogramService } from './odontogram.service.js';
import { OdontogramRepository } from './odontogram.repository.js';
import { UpdateToothSchema, VALID_FDI_TEETH } from './odontogram.schema.js';
import { z } from 'zod';
import { successResponse, errorResponse } from '../../utils/response.js';

function getService(request) {
  return new OdontogramService(new OdontogramRepository(request.server.db));
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

export async function getOdontogramHandler(request, reply) {
  const { patientId } = request.params;
  request.log.info({ patientId }, '[odontogram] GET chart');

  const chart = await getService(request).getByPatient(patientId);

  request.log.info(
    { patientId, tooth_count: Object.keys(chart.teeth).length, updated_at: chart.updated_at },
    '[odontogram] chart fetched'
  );

  return reply.status(200).send(successResponse(chart));
}

export async function createOdontogramHandler(request, reply) {
  const { patientId } = request.params;
  const userId = request.user.sub;

  request.log.info({ patientId, userId }, '[odontogram] POST create chart — request received');

  const service = getService(request);

  // Initialise an empty chart row in the DB
  const rawRow = await service.initChart(patientId, userId);

  request.log.info(
    {
      patientId,
      db_row: rawRow ?? '(already existed — no insert)',
    },
    '[odontogram] initChart result'
  );

  // Return the full normalised chart so the frontend sees all 32 teeth
  const chart = await service.getByPatient(patientId);

  request.log.info(
    { patientId, updated_at: chart.updated_at },
    '[odontogram] chart created/confirmed — sending 201'
  );

  return reply.status(201).send(successResponse(chart));
}

export async function updateToothHandler(request, reply) {
  const { patientId, toothNumber } = request.params;

  request.log.info(
    { patientId, toothNumber, body: request.body },
    '[odontogram] PATCH tooth — request received'
  );

  const data = parseValidation(UpdateToothSchema, request.body, reply);
  if (!data) return;

  const result = await getService(request).updateTooth(
    patientId,
    toothNumber,
    data,
    request.user.sub
  );

  request.log.info(
    { patientId, toothNumber, result },
    '[odontogram] tooth updated'
  );

  return reply.status(200).send(successResponse(result));
}

export async function getOdontogramHistoryHandler(request, reply) {
  const { patientId } = request.params;
  const { tooth_number } = request.query;

  request.log.info({ patientId, tooth_number }, '[odontogram] GET history');

  const history = await getService(request).getHistory(patientId, tooth_number);

  request.log.info({ patientId, count: history.length }, '[odontogram] history fetched');

  return reply.status(200).send(successResponse(history));
}

// ── Batch update ──────────────────────────────────────────────────────────────
// PATCH /api/v1/patients/:patientId/odontogram/batch
// Body: { teeth: { "11": { status, notes?, surfaces? }, ... } }

const BatchUpdateSchema = z.object({
  teeth: z.record(
    z.string().regex(/^[1-4][1-8]$/, 'Invalid FDI tooth number'),
    UpdateToothSchema,
  ).refine(
    (teeth) => Object.keys(teeth).every((k) => VALID_FDI_TEETH.includes(k)),
    { message: 'One or more tooth numbers are invalid' },
  ),
});

export async function updateBatchHandler(request, reply) {
  const { patientId } = request.params;

  request.log.info({ patientId, body: request.body }, '[odontogram] PATCH batch — request received');

  const parsed = BatchUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }

  const service = getService(request);
  const results = [];

  for (const [toothNumber, dto] of Object.entries(parsed.data.teeth)) {
    const result = await service.updateTooth(patientId, toothNumber, dto, request.user.sub);
    results.push(result);
  }

  request.log.info({ patientId, updated: results.length }, '[odontogram] batch update complete');

  return reply.status(200).send(successResponse({ updated: results.length, teeth: results }));
}
