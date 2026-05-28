import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { bookAppointmentHandler, listAppointmentsHandler } from './appointments.controller.js';

export async function appointmentsRoutes(fastify) {
  fastify.post('/', { preHandler: [authenticate, authorize('appointments:*')] }, bookAppointmentHandler);
  fastify.get('/', { preHandler: [authenticate, authorize('appointments:read')] }, listAppointmentsHandler);
}
