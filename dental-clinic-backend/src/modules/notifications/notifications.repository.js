/**
 * NotificationsRepository
 *
 * All SQL for the notifications table lives here.
 * Every method works in terms of snake_case columns and returns raw DB rows —
 * formatting to camelCase is the service's responsibility.
 */
export class NotificationsRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /**
   * Return all notifications for a user (own + broadcasts where user_id IS NULL),
   * newest first, limited to `limit` rows.
   *
   * @param {string}  userId
   * @param {object}  [opts]
   * @param {boolean} [opts.unreadOnly]
   * @param {number}  [opts.limit=50]
   * @param {number}  [opts.offset=0]
   */
  async findByUser(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
    const q = this.db('notifications')
      .where(function () {
        this.where('user_id', userId).orWhereNull('user_id');
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    if (unreadOnly) q.where('is_read', false);

    return q;
  }

  /**
   * Count unread notifications for a user.
   * @param {string} userId
   */
  async countUnread(userId) {
    const [{ count }] = await this.db('notifications')
      .where(function () {
        this.where('user_id', userId).orWhereNull('user_id');
      })
      .where('is_read', false)
      .count('id as count');
    return Number(count);
  }

  /**
   * Find a single notification by id.
   * @param {string} id
   */
  async findById(id) {
    return this.db('notifications').where({ id }).first();
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Insert a new notification row and return it.
   * @param {object} data
   */
  async create(data) {
    const [row] = await this.db('notifications').insert(data).returning('*');
    return row;
  }

  /**
   * Mark a single notification as read.
   * Returns the number of rows updated (0 = not found / not owned).
   *
   * @param {string} id
   * @param {string} userId  - only mark rows owned by this user (or broadcasts)
   */
  async markRead(id, userId) {
    return this.db('notifications')
      .where({ id })
      .where(function () {
        this.where('user_id', userId).orWhereNull('user_id');
      })
      .update({ is_read: true });
  }

  /**
   * Mark ALL notifications for a user as read.
   * @param {string} userId
   */
  async markAllRead(userId) {
    return this.db('notifications')
      .where(function () {
        this.where('user_id', userId).orWhereNull('user_id');
      })
      .where('is_read', false)
      .update({ is_read: true });
  }

  /**
   * Delete a single notification by id (owner-scoped).
   * @param {string} id
   * @param {string} userId
   */
  async delete(id, userId) {
    return this.db('notifications')
      .where({ id })
      .where(function () {
        this.where('user_id', userId).orWhereNull('user_id');
      })
      .delete();
  }

  /**
   * Delete all notifications older than `days` days.
   * Used by a periodic cleanup job.
   * @param {number} days  - must be a positive integer
   */
  async deleteOlderThan(days) {
    if (!Number.isInteger(days) || days < 1) {
      throw new Error(`deleteOlderThan: invalid days value "${days}"`);
    }
    return this.db('notifications')
      .where('created_at', '<', this.db.raw('NOW() - INTERVAL ?? DAY', [days]))
      .delete();
  }
}
