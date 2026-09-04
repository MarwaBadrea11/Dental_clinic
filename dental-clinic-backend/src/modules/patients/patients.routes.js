import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { attachClinicContext, enforceClinicIsolation } from '../../middleware/clinicContext.js';
import {
  createPatientHandler,
  getPatientHandler,
  listPatientsHandler,
  updatePatientHandler,
  updateMeHandler,
  deletePatientHandler,
} from './patients.controller.js';
import { PatientsRepository } from './patients.repository.js';
import { successResponse, errorResponse } from '../../utils/response.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function patientsRoutes(fastify) {
  // TX-01: Clinic isolation middleware
  // attachClinicContext MUST run before any route handler to set request.clinicId
  // enforceClinicIsolation validates clinic context is present
  const clinicIsolation = [attachClinicContext, enforceClinicIsolation];
  
  // إعداد الصلاحيات للكتابة/الإنشاء/الحذف (admin + receptionist)
  const writePermissions  = [authenticate, authorize('patients:*'), ...clinicIsolation];
  // إعداد الصلاحيات للتعديل (admin + receptionist + dentist)
  const updatePermissions = [authenticate, authorize('patients:update'), ...clinicIsolation];
  // إعداد الصلاحيات للقراءة فقط
  const readPermissions   = [authenticate, authorize('patients:read'), ...clinicIsolation];

  /**
   * GET /api/v1/patients/me
   * Returns the patient record whose email matches the logged-in user's email.
   * Called by the mobile app right after login to resolve the patient UUID.
   * Any authenticated role can call this (they only see their own record).
   * 
   * TX-01: Now includes clinic isolation
   */
  fastify.get('/me', { preHandler: [authenticate, ...clinicIsolation] }, async (request, reply) => {
    const repo = new PatientsRepository(request.server.db);

    // Look up patient by the email stored in the JWT (request.user.email)
    // Fall back to searching by username if email is not directly on the token.
    // The JWT payload has: { sub: userId, role, permissions }
    // So we must join with users to get the email.
    // TX-01: Added clinic_id filter
    const patient = await request.server.db('patients as p')
      .whereNull('p.deleted_at')
      .where('p.clinic_id', request.clinicId)  // TX-01: Clinic isolation
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

    return reply.status(200).send(successResponse(patient));
  });

  /**
   * PUT /api/v1/patients/me
   * Allows a PATIENT-role user to update their own profile data.
   * TX-01: Now includes clinic isolation
   */
  fastify.put('/me', { preHandler: [authenticate, authorize('patients:update_self'), ...clinicIsolation] }, updateMeHandler);

  // مسار إنشاء مريض جديد
  fastify.post('/', { preHandler: writePermissions }, createPatientHandler);

  // مسار جلب قائمة المرضى (مع دعم الـ Query Params للبحث والترقيم)
  fastify.get('/', { preHandler: readPermissions }, listPatientsHandler);

  // مسار جلب بيانات مريض محدد
  fastify.get('/:id', { preHandler: readPermissions }, getPatientHandler);

  // مسار تعديل بيانات مريض موجود
  fastify.put('/:id', { preHandler: updatePermissions }, updatePatientHandler);

  // مسار حذف مريض (Soft Delete)
  fastify.delete('/:id', { preHandler: writePermissions }, deletePatientHandler);
}