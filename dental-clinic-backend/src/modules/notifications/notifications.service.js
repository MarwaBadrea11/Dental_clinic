import { AppError, NotFoundError } from '../../utils/errors.js';

/**
 * NotificationsService
 *
 * Business-logic layer.  Controllers and other modules call this.
 * The static helper `NotificationsService.push()` is a convenience
 * for creating a notification from anywhere in the codebase without
 * instantiating the full class.
 */
export class NotificationsService {
  /** @param {import('./notifications.repository.js').NotificationsRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Return paginated notifications for a user together with the unread count.
   *
   * @param {string} userId
   * @param {object} [opts]
   * @param {boolean} [opts.unreadOnly]
   * @param {number}  [opts.limit]
   * @param {number}  [opts.offset]
   */
  async list(userId, opts = {}) {
    const [rows, unreadCount] = await Promise.all([
      this.repo.findByUser(userId, opts),
      this.repo.countUnread(userId),
    ]);
    return {
      notifications: rows.map(this.#format),
      unreadCount,
      total: rows.length,
    };
  }

  /**
   * Mark one notification as read.
   * @param {string} id
   * @param {string} userId
   */
  async markRead(id, userId) {
    const updated = await this.repo.markRead(id, userId);
    if (!updated) throw new NotFoundError('Notification not found');
  }

  /**
   * Mark all notifications for a user as read.
   * @param {string} userId
   */
  async markAllRead(userId) {
    await this.repo.markAllRead(userId);
  }

  /**
   * Delete a notification (user must own it).
   * @param {string} id
   * @param {string} userId
   */
  async delete(id, userId) {
    const deleted = await this.repo.delete(id, userId);
    if (!deleted) throw new NotFoundError('Notification not found');
  }

  /**
   * Create a notification directly.
   * Prefer `NotificationsService.push()` when calling from other modules.
   *
   * @param {object} payload
   * @param {string|null} payload.userId      - null = broadcast
   * @param {string}      payload.type        - system | appointment | inventory | finance | schedule
   * @param {string}      payload.severity    - error | warning | success | info | neutral
   * @param {string}      payload.title
   * @param {string}      payload.message
   * @param {string}      [payload.actionLabel]
   * @param {string}      [payload.actionRoute]
   * @param {object}      [payload.metadata]
   */
  async create(payload) {
    const row = await this.repo.create({
      user_id:      payload.userId      ?? null,
      type:         payload.type        ?? 'system',
      severity:     payload.severity    ?? 'info',
      title:        payload.title,
      message:      payload.message,
      action_label: payload.actionLabel ?? null,
      action_route: payload.actionRoute ?? null,
      metadata:     payload.metadata
        ? JSON.stringify(payload.metadata)
        : null,
    });
    return this.#format(row);
  }

  // ── Static convenience helper ──────────────────────────────────────────────

  /**
   * Push a notification from anywhere in the codebase.
   *
   * Usage:
   *   import { NotificationsService } from '../notifications/notifications.service.js'
   *   await NotificationsService.push(db, { userId, type: 'inventory', severity: 'warning', title: '...', message: '...' })
   *
   * Swallows errors so callers don't need try/catch — notification delivery
   * is non-critical and must never break the originating request.
   *
   * @param {import('knex').Knex} db
   * @param {object} payload  - same shape as create()
   */
  static async push(db, payload) {
    try {
      const { NotificationsRepository } = await import('./notifications.repository.js');
      const svc = new NotificationsService(new NotificationsRepository(db));
      return await svc.create(payload);
    } catch (err) {
      // Log but never propagate — notification failure must not break the caller
      console.error('[NotificationsService.push] failed:', err?.message ?? err);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Map DB snake_case row → camelCase API shape */
  #format(row) {
    return {
      id:          row.id,
      userId:      row.user_id ?? null,
      type:        row.type,
      severity:    row.severity,
      title:       row.title,
      message:     row.message,
      actionLabel: row.action_label ?? null,
      actionRoute: row.action_route ?? null,
      metadata:    row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : null,
      isRead:      Boolean(row.is_read),
      createdAt:   row.created_at,
      updatedAt:   row.updated_at,
    };
  }
}
