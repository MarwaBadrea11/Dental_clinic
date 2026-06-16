import { randomBytes, createHash } from 'crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signAccessToken } from '../../utils/token.js';
import { denyJti } from '../../middleware/authenticate.js';
import { AuthenticationError, ConflictError, NotFoundError, RateLimitError, AppError } from '../../utils/errors.js';
import { ROLE_PERMISSIONS } from '../../middleware/authorize.js';
import { env } from '../../config/env.js';

const UPLOADS_DIR = join(process.cwd(), env.UPLOAD_DIR);
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function formatPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url ?? null,
    phone: user.phone ?? null,
    specialty: user.specialty ?? null,
    bio: user.bio ?? null,
  };
}

function mergePatientProfile(profile, patient) {
  if (!patient) return profile;

  const fullName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
  return {
    ...profile,
    username: fullName || profile.username,
    email: profile.email || patient.email || null,
    phone: profile.phone || patient.phone || null,
  };
}

async function deleteAvatarFile(avatarUrl) {
  if (!avatarUrl?.startsWith('/uploads/')) return;
  const storageKey = basename(avatarUrl);
  const filePath = join(UPLOADS_DIR, storageKey);
  if (existsSync(filePath)) {
    await unlink(filePath).catch(() => {});
  }
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

    // ── Auto-create patient record for self-registering patients ──────────────
    // This eliminates the patient_id gap: when a PATIENT registers, we
    // immediately create a matching patient row so /patients/me resolves on
    // the very first login without requiring clinic staff to create the record.
    if (dto.role === 'PATIENT') {
      // Split username into first/last name (best-effort)
      const nameParts  = dto.username.trim().split(/\s+/);
      const first_name = nameParts[0] ?? dto.username;
      const last_name  = nameParts.slice(1).join(' ') || '';

      await this.repo.createPatientRecord({
        first_name,
        last_name,
        email:        dto.email,
        phone:        dto.phone ?? '',           // provided by mobile reg form if passed
        national_id:  dto.national_id ?? `REG-${user.id.slice(0, 8)}`,
        date_of_birth: dto.date_of_birth ?? '1990-01-01',
        gender:       dto.gender ?? 'male',
      });
    }

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

    return { accessToken, refreshToken: rawRefreshToken, user: formatPublicUser(user) };
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

  async changePassword(userId, currentPassword, newPassword, currentAccessTokenPayload, meta = {}) {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.is_active) throw new NotFoundError('User not found');

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) throw new AuthenticationError('Current password is incorrect');

    const passwordHash = await hashPassword(newPassword, env.BCRYPT_ROUNDS);
    await this.repo.updatePasswordHash(userId, passwordHash);
    await this.repo.revokeAllUserTokens(userId);
    denyJti(currentAccessTokenPayload.jti, currentAccessTokenPayload.exp);

    await this.repo.createAuditLog({
      userId,
      action: 'UPDATE',
      resource: 'User',
      resourceId: userId,
      newValue: { passwordChanged: true },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { success: true, message: 'Password updated successfully' };
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(userId) {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.is_active) throw new NotFoundError('User not found');

    let profile = formatPublicUser(user);
    if (user.role === 'PATIENT') {
      const patient = await this.repo.findLinkedPatient(userId);
      profile = mergePatientProfile(profile, patient);
    }
    return profile;
  }

  async updateProfile(userId, dto) {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.is_active) throw new NotFoundError('User not found');

    const updates = {};
    if (dto.username !== undefined) updates.username = dto.username;
    if (dto.email !== undefined) {
      const existing = await this.repo.findUserByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Email already in use');
      }
      updates.email = dto.email;
    }
    if (dto.phone !== undefined) updates.phone = dto.phone || null;
    if (dto.specialty !== undefined) updates.specialty = dto.specialty || null;
    if (dto.bio !== undefined) updates.bio = dto.bio || null;

    if (Object.keys(updates).length === 0) return this.getProfile(userId);

    await this.repo.updateUserProfile(userId, updates);
    return this.getProfile(userId);
  }

  async uploadAvatar(userId, filePart) {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.is_active) throw new NotFoundError('User not found');

    const { filename, mimetype, file: stream } = filePart;

    if (!AVATAR_MIME_TYPES.has(mimetype)) {
      throw new AppError(400, `File type '${mimetype}' is not allowed`);
    }

    const ext = extname(filename) || '.jpg';
    const storageKey = `avatar-${randomUUID()}${ext}`;
    const filePath = join(UPLOADS_DIR, storageKey);
    const avatarUrl = `/uploads/${storageKey}`;

    let bytesWritten = 0;
    const dest = createWriteStream(filePath);

    try {
      for await (const chunk of stream) {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_AVATAR_SIZE) {
          throw new AppError(413, 'Avatar exceeds the 5 MB limit');
        }
        dest.write(chunk);
      }
      dest.end();
    } catch (err) {
      await unlink(filePath).catch(() => {});
      if (err instanceof AppError) throw err;
      throw new AppError(413, err.message);
    }

    try {
      if (user.avatar_url) await deleteAvatarFile(user.avatar_url);
      await this.repo.updateUserProfile(userId, { avatar_url: avatarUrl });
      return this.getProfile(userId);
    } catch (dbErr) {
      await unlink(filePath).catch(() => {});
      throw new Error('Failed to save avatar');
    }
  }

  async removeAvatar(userId) {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.is_active) throw new NotFoundError('User not found');

    if (user.avatar_url) await deleteAvatarFile(user.avatar_url);
    await this.repo.updateUserProfile(userId, { avatar_url: null });
    return this.getProfile(userId);
  }
}
