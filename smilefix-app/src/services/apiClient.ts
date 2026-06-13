// ─────────────────────────────────────────────────────────────────────────────
// API Client — shared fetch wrapper with auth headers + proactive token refresh
// ─────────────────────────────────────────────────────────────────────────────

import { getAccessToken, getRefreshToken, saveTokens, clearTokens, clearUser } from './authService'

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

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
      const res = await fetch(`${API_BASE}/auth/refresh`, {
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
  // Proactively refresh if token is stale — avoids a round-trip 401
  const token = await getValidToken()

  if (!token && retry) {
    // No valid token and no refresh token — clear storage and signal logout
    clearTokens()
    clearUser()
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  // Only set Content-Type when we actually have a body to send.
  // Fastify v5 rejects DELETE/GET requests that advertise application/json
  // but send an empty body (FST_ERR_CTP_EMPTY_JSON_BODY).
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Fallback: if server still returns 401 (e.g. token was revoked), retry once
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
