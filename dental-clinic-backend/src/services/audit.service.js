/**
 * AuditService
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable service for writing to the audit_logs table.
 * Designed to be injected anywhere — Fastify hooks, controllers, auth flows.
 *
 * Usage:
 *   const audit = new AuditService(request.server.db);
 *   await audit.log({ action: 'UPDATE', resource: 'patients', resourceId: id,
 *                     userId: request.user.sub, previousValue: old, newValue: updated,
 *                     ip: request.ip, userAgent: request.headers['user-agent'] });
 */

/** @typedef {'CREATE'|'UPDATE'|'DELETE'|'LOGIN'|'LOGOUT'|'LOGIN_FAILED'|'PERMISSION_DENIED'} AuditAction */

/**
 * @typedef {Object} AuditEntry
 * @property {AuditAction}  action
 * @property {string}       resource       - table name (e.g. 'patients')
 * @property {string}       [resourceId]   - PK of the affected row
 * @property {string}       [userId]       - actor's user id
 * @property {object}       [previousValue]
 * @property {object}       [newValue]
 * @property {string}       [ip]
 * @property {string}       [userAgent]
 */

export class AuditService {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  /**
   * Write a single audit entry. Fire-and-forget safe — errors are swallowed so
   * a logging failure never breaks the main request.
   * @param {AuditEntry} entry
   * @returns {Promise<void>}
   */
  async log(entry) {
    try {
      await this.db('audit_logs').insert({
        user_id:        entry.userId   ?? null,
        action:         entry.action,
        resource:       entry.resource,
        resource_id:    entry.resourceId ?? null,
        previous_value: entry.previousValue ? JSON.stringify(entry.previousValue) : null,
        new_value:      entry.newValue      ? JSON.stringify(entry.newValue)      : null,
        ip_address:     entry.ip            ?? null,
        user_agent:     entry.userAgent     ?? null,
      });
    } catch (err) {
      // Never let audit failures surface to the caller
      console.error('[AuditService] Failed to write audit log:', err?.message);
    }
  }

  /**
   * Query audit logs with optional filters.
   * @param {{ resource?: string, resourceId?: string, userId?: string,
   *           action?: AuditAction, from?: string, to?: string,
   *           page?: number, limit?: number }} filters
   */
  async query({ resource, resourceId, userId, action, from, to, page = 1, limit = 50 } = {}) {
    const q = this.db('audit_logs as al')
      .leftJoin('users as u', 'al.user_id', 'u.id')
      .select(
        'al.id', 'al.action', 'al.resource', 'al.resource_id',
        'al.previous_value', 'al.new_value',
        'al.ip_address', 'al.user_agent', 'al.created_at',
        'u.username as actor_username', 'u.email as actor_email', 'u.role as actor_role',
      )
      .orderBy('al.created_at', 'desc');

    if (resource)   q.where('al.resource', resource);
    if (resourceId) q.where('al.resource_id', resourceId);
    if (userId)     q.where('al.user_id', userId);
    if (action)     q.where('al.action', action);
    if (from)       q.where('al.created_at', '>=', from);
    if (to)         q.where('al.created_at', '<=', `${to}T23:59:59Z`);

    const [{ count }] = await q.clone().clearSelect().count('al.id as count');
    const data = await q.limit(limit).offset((page - 1) * limit);

    return { data, total: Number(count), page, limit };
  }
}
