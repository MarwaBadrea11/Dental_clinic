// ─────────────────────────────────────────────────────────────────────────────
// Auth Service — SmileFix Web App
// Connects to dental-clinic-backend at http://localhost:3000/api/v1/auth
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000/api/v1/auth'

const ACCESS_TOKEN_KEY  = 'smilefix_access_token'
const REFRESH_TOKEN_KEY = 'smilefix_refresh_token'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string   // firstName + lastName joined
  email: string
  password: string
  role: 'ADMIN' | 'DENTIST' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'STOREKEEPER' | 'HR'
}

export interface AuthUser {
  id: string
  email: string
  role: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface RegisterResult {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await res.json()

  if (!res.ok) {
    // Backend shape: { success: false, message, data: { fields: [{field, message}] } }
    const fields: { field: string; message: string }[] = json?.data?.fields ?? []
    const fieldMsg = fields.map((f) => `${f.field}: ${f.message}`).join('\n')
    throw new Error(fieldMsg || json?.message || 'Request failed')
  }

  // Backend shape: { success: true, data: ... }
  return json.data as T
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// ── User persistence helpers ──────────────────────────────────────────────────

const USER_KEY = 'smilefix_user'

export function saveUser(user: AuthUser & { name?: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getSavedUser(): (AuthUser & { name?: string }) | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const result = await post<AuthResult>('/login', payload)
  saveTokens(result.accessToken, result.refreshToken)
  const displayName = result.user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  saveUser({ ...result.user, name: displayName })
  return result
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  return post<RegisterResult>('/register', payload)
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  const accessToken  = getAccessToken()
  if (refreshToken) {
    await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => { /* best-effort */ })
  }
  clearTokens()
  clearUser()
}
