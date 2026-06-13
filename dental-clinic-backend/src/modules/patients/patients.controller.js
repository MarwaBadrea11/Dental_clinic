import { PatientsService } from './patients.service.js';
import { PatientsRepository } from './patients.repository.js';
import { CreatePatientSchema, UpdatePatientSchema } from './patients.schema.js';
import { successResponse, errorResponse } from '../../utils/response.js';

// دالة مساعدة لتجهيز الخدمة (استخدام Singleton pattern أو Dependency Injection هنا يفضل لاحقاً)
function getService(request) {
  return new PatientsService(new PatientsRepository(request.server.db));
}

// دالة مساعدة موحدة للتحقق من البيانات (Validation)
function parseValidation(schema, body, reply) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({ 
      field: i.path.join('.'), 
      message: i.message 
    }));
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

/**
 * PUT /patients/me
 * Allows a PATIENT-role user to update their own profile.
 * The patient record is resolved from the JWT (by email or phone).
 */
export async function updateMeHandler(request, reply) {
  const data = parseValidation(UpdatePatientSchema, request.body, reply);
  if (!data) return;

  // Resolve the linked patient record for the logged-in user
  const patient = await request.server.db('patients as p')
    .whereNull('p.deleted_at')
    .join('users as u', function () {
      this.on(request.server.db.raw('LOWER(p.email) = LOWER(u.email)'))
        .orOn(request.server.db.raw('p.phone = u.username'));
    })
    .where('u.id', request.user.sub)
    .select('p.*')
    .first();

  if (!patient) {
    return reply.status(404).send(errorResponse('No patient record linked to this account'));
  }

  const updated = await getService(request).update(patient.id, data);
  return reply.status(200).send(successResponse(updated));
}

export async function deletePatientHandler(request, reply) {
  await getService(request).delete(request.params.id);
  return reply.status(200).send(successResponse({ id: request.params.id }));
}