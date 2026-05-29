import { OdontogramService } from './odontogram.service.js';
import { OdontogramRepository } from './odontogram.repository.js';
import { UpdateToothSchema } from './odontogram.schema.js';
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
  const chart = await getService(request).getByPatient(request.params.patientId);
  return reply.status(200).send(successResponse(chart));
}

export async function updateToothHandler(request, reply) {
  const data = parseValidation(UpdateToothSchema, request.body, reply);
  if (!data) return;
  const result = await getService(request).updateTooth(
    request.params.patientId,
    request.params.toothNumber,
    data,
    request.user.sub
  );
  return reply.status(200).send(successResponse(result));
}

export async function getOdontogramHistoryHandler(request, reply) {
  const history = await getService(request).getHistory(
    request.params.patientId,
    request.query.tooth_number
  );
  return reply.status(200).send(successResponse(history));
}
