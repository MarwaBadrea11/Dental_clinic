import { authenticate } from '../../middleware/authenticate.js';
import { authorizeOwner } from '../../middleware/authorize.js';
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

  // Allow DELETE (and other methods) to have an empty body even when
  // Content-Type: application/json is present — some HTTP clients send it.
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    if (!body || body.length === 0) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

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
   * DELETE /:id — hard delete
   * Staff (appointments:*) can delete any appointment.
   * PATIENT can delete only their own appointment (checked in controller).
   */
  fastify.delete('/:id', {
    preHandler: [authenticate],
  }, deleteAppointmentHandler);
}