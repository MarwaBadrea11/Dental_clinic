// ─────────────────────────────────────────────────────────────────────────────
// API Client — shared fetch wrapper with auth headers + proactive token refresh
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken, getRefreshToken, saveTokens, clearTokens, clearUser } from './authService'

// Strip any /api/v1 suffix so API_BASE is always just the server origin.
// VITE_API_BASE_URL may be set to either "http://localhost:3002" or
// "http://localhost:3002/api/v1" — we normalise to the bare origin here so
// buildUrl can always append /api/v1 exactly once.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002')
  .replace(/\/api\/v1\/?$/, '')

/**
 * Every backend route is registered under /api/v1.
 * Service files pass short paths like '/dashboard/stats' — this prefix is
 * prepended automatically in `request()` so callers never need to repeat it.
 * Paths that already start with /api/ are passed through unchanged.
 */
const API_PREFIX = '/api/v1'

function buildUrl(path: string): string {
  // Already fully-qualified — don't double-prefix
  if (path.startsWith('/api/')) return `${API_BASE}${path}`
  return `${API_BASE}${API_PREFIX}${path}`
}

// Routes that must never require an auth token (public endpoints).
// Expressed as short paths (without /api/v1) OR fully-qualified.
// Requests to these paths skip token validation and session-expired logic entirely.
const PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/health',
  '/auth/login',
  '/auth/register',
  '/health',
]

function isPublicPath(path: string): boolean {
  // Normalise to the short form for comparison
  const normalised = path.startsWith('/api/v1') ? path.slice(7) : path
  return PUBLIC_PATHS.some((p) => {
    const normP = p.startsWith('/api/v1') ? p.slice(7) : p
    return normalised.startsWith(normP)
  })
}

export class ApiError extends Error {
  status: number
  fields?: { field: string; message: string }[]

  constructor(
    status: number,
    message: string,
    fields?: { field: string; message: string }[]
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

// ── Token expiry check ────────────────────────────────────────────────────────

/** Decode JWT exp claim without verifying signature (client-side only). */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** Returns true if the access token is missing or expires within 60 seconds. */
function isTokenExpiredOrStale(): boolean {
  const token = getAccessToken()
  if (!token) return true
  const exp = getTokenExpiry(token)
  if (!exp) return true
  return Date.now() >= exp - 60_000   // refresh 60s before actual expiry
}

// ── Token refresh ─────────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return null
      const json = await res.json()
      const { accessToken, refreshToken: newRefresh } = json.data
      saveTokens(accessToken, newRefresh)
      return accessToken as string
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Ensure we have a valid, non-stale access token before making a request.
 * If the token is about to expire, refresh it proactively.
 * Returns the valid token, or null if refresh failed.
 */
async function getValidToken(): Promise<string | null> {
  if (!isTokenExpiredOrStale()) return getAccessToken()
  return tryRefreshToken()
}

// ── Core request ──────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // ── Public routes: no token required, no session-expired side effects ─────
  if (isPublicPath(path)) {
    const res = await fetch(buildUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const json = await res.json()
    if (!res.ok) {
      const msg = json?.error ?? 'Request failed'
      throw new ApiError(res.status, msg)
    }
    return json.data as T
  }

  // ── Protected routes: attach token, refresh proactively ───────────────────
  const token = await getValidToken()

  if (!token && retry) {
    clearTokens()
    clearUser()
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Fallback: if server still returns 401, retry once after a fresh token
  if (res.status === 401 && retry) {
    const newToken = await tryRefreshToken()
    if (newToken) return request<T>(method, path, body, false)
    clearTokens()
    clearUser()
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  const json = await res.json()

  if (!res.ok) {
    const fields: { field: string; message: string }[] = json?.meta?.fields ?? []
    const msg = json?.error ?? 'Request failed'
    throw new ApiError(res.status, msg, fields)
  }

  return json.data as T
}

export const apiClient = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)               => request<T>('DELETE', path),
}
