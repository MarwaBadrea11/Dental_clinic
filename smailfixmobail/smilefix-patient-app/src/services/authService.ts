// ─────────────────────────────────────────────
// Auth Service
// Wraps: POST /auth/login  ·  POST /auth/register
//        POST /auth/refresh  ·  POST /auth/logout
// ─────────────────────────────────────────────
import { api } from './api';

// ── Request shapes ────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  // Patient-specific fields sent when role = 'PATIENT'
  phone?: string;
  national_id?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
}

// ── Response shapes ───────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  role: string;
}

// ── Service functions ─────────────────────────

/**
 * Authenticate with email + password.
 * Returns the user object and both JWT tokens.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', credentials, { skipAuth: true });
}

/**
 * Register a new account.
 * NOTE: The backend currently only accepts staff roles in the role enum.
 * This will need a backend update to support 'PATIENT' role (Step 7).
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return api.post<RegisterResponse>('/auth/register', data, { skipAuth: true });
}

/**
 * Exchange a refresh token for a new access token.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return api.post<AuthTokens>('/auth/refresh', { refreshToken }, { skipAuth: true });
}

/**
 * Invalidate the current session on the server.
 */
export async function logout(refreshToken: string): Promise<void> {
  await api.post<void>('/auth/logout', { refreshToken });
}
