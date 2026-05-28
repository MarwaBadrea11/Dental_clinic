import { randomBytes, createHash } from 'crypto';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signAccessToken } from '../../utils/token.js';
import { denyJti } from '../../middleware/authenticate.js';
import { AuthenticationError, ConflictError, RateLimitError } from '../../utils/errors.js';
import { ROLE_PERMISSIONS } from '../../middleware/authorize.js';
import { env } from '../../config/env.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  /** @param {import('./auth.repository.js').AuthRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto, meta = {}) {
    const existing = await this.repo.findUserByEmail(dto.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await hashPassword(dto.password, env.BCRYPT_ROUNDS);
    const user = await this.repo.createUser({ username: dto.username, email: dto.email, passwordHash, role: dto.role });

    await this.repo.createAuditLog({
      userId: user.id,
      action: 'CREATE',
      resource: 'User',
      resourceId: user.id,
      newValue: { id: user.id, email: user.email, role: user.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.created_at };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto, meta = {}) {
    const user = await this.repo.findUserByEmail(dto.email);

    const dummyHash = '$2b$12$invalidhashfortimingsafety000000000000000000000000000';
    const isValid = await verifyPassword(dto.password, user?.password_hash ?? dummyHash);

    if (!user || !isValid) {
      if (user) {
        const updated = await this.repo.incrementFailedLogin(user.id);
        if (updated.failed_login_count >= MAX_FAILED_ATTEMPTS) {
          await this.repo.lockAccount(user.id, new Date(Date.now() + LOCKOUT_DURATION_MS));
        }
        await this.repo.createAuditLog({
          action: 'LOGIN_FAILED',
          resource: 'User',
          resourceId: user.email,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
      }
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.locked_until && user.locked_until > new Date()) {
      throw new RateLimitError('Account is temporarily locked. Please try again later.');
    }

    await this.repo.resetFailedLogin(user.id);

    const permissions = ROLE_PERMISSIONS[user.role] ?? [];
    const accessToken = signAccessToken({ sub: user.id, role: user.role, permissions });

    const rawRefreshToken = randomBytes(32).toString('hex');
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.repo.storeRefreshToken({ userId: user.id, tokenHash, expiresAt });

    await this.repo.createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { accessToken, refreshToken: rawRefreshToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(dto) {
    const lookupHash = hashRefreshToken(dto.refreshToken);
    const stored = await this.repo.findRefreshToken(lookupHash);

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    await this.repo.revokeRefreshToken(stored.id);

    const user = await this.repo.findUserById(stored.user_id);
    if (!user || !user.is_active) throw new AuthenticationError('User not found or inactive');

    const permissions = ROLE_PERMISSIONS[user.role] ?? [];
    const accessToken = signAccessToken({ sub: user.id, role: user.role, permissions });

    const newRawToken = randomBytes(32).toString('hex');
    const newTokenHash = hashRefreshToken(newRawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.repo.storeRefreshToken({ userId: user.id, tokenHash: newTokenHash, expiresAt });

    return { accessToken, refreshToken: newRawToken };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(dto, accessTokenPayload, meta = {}) {
    const lookupHash = hashRefreshToken(dto.refreshToken);
    const stored = await this.repo.findRefreshToken(lookupHash);

    if (stored && !stored.revoked_at) {
      await this.repo.revokeRefreshToken(stored.id);
    }

    denyJti(accessTokenPayload.jti, accessTokenPayload.exp);

    await this.repo.createAuditLog({
      userId: accessTokenPayload.sub,
      action: 'LOGOUT',
      resource: 'User',
      resourceId: accessTokenPayload.sub,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  // ─── Change Password ─────────────────────────────────────────────────────────

  async changePassword(userId, newPassword, currentAccessTokenPayload) {
    const passwordHash = await hashPassword(newPassword, env.BCRYPT_ROUNDS);
    await this.repo.updatePasswordHash(userId, passwordHash);
    await this.repo.revokeAllUserTokens(userId);
    denyJti(currentAccessTokenPayload.jti, currentAccessTokenPayload.exp);
    return { success: true };
  }
}
