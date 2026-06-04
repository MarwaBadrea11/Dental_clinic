import { z } from 'zod';
import { NotificationsService }    from './notifications.service.js';
import { NotificationsRepository } from './notifications.repository.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

// ── Validation schemas ────────────────────────────────────────────────────────

const CreateNotificationSchema = z.object({
  userId:      z.string().uuid().nullable().optional(),
  type:        z.enum(['system', 'appointment', 'inventory', 'finance', 'schedule']).default('system'),
  severity:    z.enum(['error', 'warning', 'success', 'info', 'neutral']).default('info'),
  title:       z.string().min(1).max(255),
  message:     z.string().min(1),
  actionLabel: z.string().max(100).nullable().optional(),
  actionRoute: z.string().max(255).nullable().optional(),
  metadata:    z.record(z.unknown()).nullable().optional(),
});

const ListQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Helper ────────────────────────────────────────────────────────────────────

function getService(request) {
  return new NotificationsService(new NotificationsRepository(request.server.db));
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/notifications
 * Returns paginated notifications + unreadCount for the authenticated user.
 */
export async function listNotificationsHandler(request, reply) {
  const parsed = ListQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send(errorResponse('Invalid query parameters'));
  }

  const userId = request.user.sub;
  const svc    = getService(request);
  const result = await svc.list(userId, parsed.data);
  return reply.status(200).send(successResponse(result));
}

/**
 * GET /api/v1/notifications/unread-count
 * Lightweight endpoint for the Topbar badge poll.
 */
export async function unreadCountHandler(request, reply) {
  const userId = request.user.sub;
  const svc    = getService(request);
  const { unreadCount } = await svc.list(userId, { limit: 1, offset: 0 });
  return reply.status(200).send(successResponse({ unreadCount }));
}

/**
 * POST /api/v1/notifications
 * Admin / system endpoint to push a notification.
 * Requires the notifications:write permission.
 */
export async function createNotificationHandler(request, reply) {
  const parsed = CreateNotificationSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({
      field:   i.path.join('.'),
      message: i.message,
    }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }

  const svc          = getService(request);
  const notification = await svc.create(parsed.data);
  return reply.status(201).send(successResponse(notification));
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markReadHandler(request, reply) {
  const { id }  = request.params;
  const userId  = request.user.sub;
  const svc     = getService(request);
  await svc.markRead(id, userId);
  return reply.status(200).send(successResponse({ id, isRead: true }));
}

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications for the current user as read.
 */
export async function markAllReadHandler(request, reply) {
  const userId = request.user.sub;
  const svc    = getService(request);
  await svc.markAllRead(userId);
  return reply.status(200).send(successResponse({ markedRead: true }));
}

/**
 * DELETE /api/v1/notifications/:id
 * Delete a single notification owned by the current user.
 */
export async function deleteNotificationHandler(request, reply) {
  const { id } = request.params;
  const userId = request.user.sub;
  const svc    = getService(request);
  await svc.delete(id, userId);
  return reply.status(204).send();
}

// ── Preferences ───────────────────────────────────────────────────────────────

const PreferencesSchema = z.object({
  appointmentReminders: z.boolean().optional(),
  newPatients:          z.boolean().optional(),
  paymentAlerts:        z.boolean().optional(),
  lowInventory:         z.boolean().optional(),
  systemUpdates:        z.boolean().optional(),
  weeklyReports:        z.boolean().optional(),
  smsNotifications:     z.boolean().optional(),
  emailDigest:          z.boolean().optional(),
}).strict();

const DEFAULT_PREFERENCES = {
  appointmentReminders: true,
  newPatients:          true,
  paymentAlerts:        true,
  lowInventory:         true,
  systemUpdates:        false,
  weeklyReports:        true,
  smsNotifications:     false,
  emailDigest:          true,
};

/**
 * GET /api/v1/notifications/preferences
 * Returns the notification preferences for the authenticated user.
 */
export async function getPreferencesHandler(request, reply) {
  const userId = request.user.sub;
  const db     = request.server.db;

  const user = await db('users').where({ id: userId }).select('notification_preferences').first();
  if (!user) throw new NotFoundError('User not found');

  // notification_preferences may be stored as a string (some PG drivers) or object
  const prefs =
    typeof user.notification_preferences === 'string'
      ? JSON.parse(user.notification_preferences)
      : (user.notification_preferences ?? DEFAULT_PREFERENCES);

  return reply.status(200).send(successResponse({ ...DEFAULT_PREFERENCES, ...prefs }));
}

/**
 * PUT /api/v1/notifications/preferences
 * Persist the notification preferences for the authenticated user.
 * Accepts a partial object — only provided keys are updated (deep-merged with current).
 */
export async function updatePreferencesHandler(request, reply) {
  const parsed = PreferencesSchema.safeParse(request.body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({
      field:   i.path.join('.'),
      message: i.message,
    }));
    return reply.status(422).send(errorResponse('Validation failed', { fields }));
  }

  const userId = request.user.sub;
  const db     = request.server.db;

  // Read current prefs, deep-merge with the incoming patch
  const user = await db('users').where({ id: userId }).select('notification_preferences').first();
  if (!user) throw new NotFoundError('User not found');

  const current =
    typeof user.notification_preferences === 'string'
      ? JSON.parse(user.notification_preferences)
      : (user.notification_preferences ?? DEFAULT_PREFERENCES);

  const updated = { ...DEFAULT_PREFERENCES, ...current, ...parsed.data };

  await db('users')
    .where({ id: userId })
    .update({ notification_preferences: JSON.stringify(updated) });

  return reply.status(200).send(successResponse(updated));
}
