import { authenticate } from '../../middleware/authenticate.js';
import { authorize, authorizeOwner } from '../../middleware/authorize.js';
import {
  bookAppointmentHandler,
  listAppointmentsHandler,
  getAppointmentHandler,
  updateAppointmentHandler,
  deleteAppointmentHandler,
} from './appointments.controller.js';

/**
 * تعريف مسارات موديول المواعيد لـ Fastify
 */
export async function appointmentsRoutes(fastify) {

  /**
   * POST / — book a new appointment
   * PATIENT role can create appointments for themselves.
   */
  fastify.post('/', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    fastify.log.info({ user: request.user }, 'POST / reached handler after authenticate');
    return bookAppointmentHandler(request, reply);
  });

  /**
   * GET / — list appointments (PATIENT sees only their own via patient_id filter)
   */
  fastify.get('/', {
    preHandler: [authenticate],
  }, listAppointmentsHandler);

  /**
   * GET /:id — get a single appointment
   */
  fastify.get('/:id', {
    preHandler: [authenticate],
  }, getAppointmentHandler);

  /**
   * PATCH /:id — update appointment
   * Staff (appointments:*) can update anything.
   * PATIENT can update only their own appointment (ownership check via patient_id).
   */
  fastify.patch('/:id', {
    preHandler: [
      authenticate,
      authorizeOwner('appointments:read', async (request) => {
        // For PATIENT role: verify the appointment belongs to their patient record.
        // Staff roles (ADMIN, RECEPTIONIST, DENTIST) bypass ownership check inside authorizeOwner.
        const appt = await request.server.db('appointments')
          .where({ id: request.params.id })
          .select('patient_id')
          .first();
        // Return the patient_id so authorizeOwner can compare with request.user.sub.
        // This works when user.sub IS the patient UUID (after Step 7 full link).
        // For now, allow PAT user to patch their own — further ownership hardening in prod.
        return appt?.patient_id ?? null;
      }),
    ],
  }, updateAppointmentHandler);

  /**
   * DELETE /:id — hard delete (staff only)
   */
  fastify.delete('/:id', {
    preHandler: [authenticate, authorize('appointments:*')],
  }, deleteAppointmentHandler);
}