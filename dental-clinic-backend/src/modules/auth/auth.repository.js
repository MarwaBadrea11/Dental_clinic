export class AuthRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  // ─── User queries ────────────────────────────────────────────────────────────

  findUserByEmail(email) {
    return this.db('users').where({ email }).first();
  }

  findUserById(id) {
    return this.db('users').where({ id }).first();
  }

  async createUser({ username, email, passwordHash, role }) {
    const [user] = await this.db('users')
      .insert({ username, email, password_hash: passwordHash, role })
      .returning('*');
    return user;
  }

  async incrementFailedLogin(userId) {
    const [user] = await this.db('users')
      .where({ id: userId })
      .increment('failed_login_count', 1)
      .returning('*');
    return user;
  }

  async lockAccount(userId, until) {
    const [user] = await this.db('users')
      .where({ id: userId })
      .update({ locked_until: until })
      .returning('*');
    return user;
  }

  async resetFailedLogin(userId) {
    const [user] = await this.db('users')
      .where({ id: userId })
      .update({ failed_login_count: 0, locked_until: null, last_login_at: new Date() })
      .returning('*');
    return user;
  }

  // ─── Refresh token queries ───────────────────────────────────────────────────

  async storeRefreshToken({ userId, tokenHash, expiresAt }) {
    const [token] = await this.db('refresh_tokens')
      .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
      .returning('*');
    return token;
  }

  findRefreshToken(tokenHash) {
    return this.db('refresh_tokens').where({ token_hash: tokenHash }).first();
  }

  async revokeRefreshToken(id) {
    const [token] = await this.db('refresh_tokens')
      .where({ id })
      .update({ revoked_at: new Date() })
      .returning('*');
    return token;
  }

  async updatePasswordHash(userId, passwordHash) {
    const [user] = await this.db('users')
      .where({ id: userId })
      .update({ password_hash: passwordHash })
      .returning('*');
    return user;
  }

  revokeAllUserTokens(userId) {
    return this.db('refresh_tokens')
      .where({ user_id: userId, revoked_at: null })
      .update({ revoked_at: new Date() });
  }

  // ─── Audit log ───────────────────────────────────────────────────────────────

  async createAuditLog({ userId, action, resource, resourceId, previousValue, newValue, ipAddress, userAgent }) {
    await this.db('audit_logs').insert({
      user_id: userId ?? null,
      action,
      resource,
      resource_id: resourceId ?? null,
      previous_value: previousValue ? JSON.stringify(previousValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    });
  }
}
