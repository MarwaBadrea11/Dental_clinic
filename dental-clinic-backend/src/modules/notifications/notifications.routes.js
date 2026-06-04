import { authenticate } from '../../middleware/authenticate.js';
import { authorize }    from '../../middleware/authorize.js';
import {
  listNotificationsHandler,
  unreadCountHandler,
  createNotificationHandler,
  markReadHandler,
  markAllReadHandler,
  deleteNotificationHandler,
  getPreferencesHandler,
  updatePreferencesHandler,
} from './notifications.controller.js';

/**
 * Registers notification routes under the prefix /api/v1/notifications.
 *
 * Routes:
 *   GET    /api/v1/notifications               - list notifications (paginated)
 *   GET    /api/v1/notifications/unread-count  - badge count only (lightweight)
 *   GET    /api/v1/notifications/preferences   - get user preferences
 *   PUT    /api/v1/notifications/preferences   - save user preferences
 *   POST   /api/v1/notifications               - create (admin / system use)
 *   PATCH  /api/v1/notifications/read-all      - mark all as read
 *   PATCH  /api/v1/notifications/:id/read      - mark one as read
 *   DELETE /api/v1/notifications/:id           - delete one
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
export async function notificationsRoutes(fastify) {
  const auth      = [authenticate];
  const authWrite = [authenticate, authorize('notifications:write')];

  // ── Read endpoints ────────────────────────────────────────────────────────
  fastify.get('/',             { preHandler: auth }, listNotificationsHandler);
  fastify.get('/unread-count', { preHandler: auth }, unreadCountHandler);

  // ── Preferences — registered before /:id to avoid param capture ──────────
  fastify.get('/preferences',  { preHandler: auth }, getPreferencesHandler);
  fastify.put('/preferences',  { preHandler: auth }, updatePreferencesHandler);

  // ── Mutation endpoints ────────────────────────────────────────────────────

  // NOTE: /read-all must be registered BEFORE /:id routes so Fastify
  // doesn't interpret "read-all" as an :id parameter.
  fastify.patch('/read-all',    { preHandler: auth }, markAllReadHandler);
  fastify.patch('/:id/read',    { preHandler: auth }, markReadHandler);

  // Create is restricted to users with notifications:write (e.g. admin)
  fastify.post('/', { preHandler: authWrite }, createNotificationHandler);

  fastify.delete('/:id', { preHandler: auth }, deleteNotificationHandler);
}
