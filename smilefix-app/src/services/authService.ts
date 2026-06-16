// ─────────────────────────────────────────────────────────────────────────────
// Auth Service — SmileFix Web App
// Connects to dental-clinic-backend at VITE_API_BASE_URL/api/v1/auth
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE, resolveMediaUrl } from './apiConfig'

const BASE_URL = `${API_BASE}/auth`

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
  username?: string
  avatar_url?: string | null
  phone?: string | null
  specialty?: string | null
  bio?: string | null
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

export function saveUser(user: AuthUser & { name?: string; avatar?: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getSavedUser(): (AuthUser & { name?: string; avatar?: string }) | null {
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

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function displayNameFromUser(user: AuthUser): string {
  if (user.username?.trim()) return user.username.trim()
  return user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function persistAuthUser(user: AuthUser) {
  saveUser({
    ...user,
    name: displayNameFromUser(user),
    avatar: resolveMediaUrl(user.avatar_url) ?? undefined,
  })
}

export function authUserToProfile(user: AuthUser) {
  const name = displayNameFromUser(user)
  return {
    name,
    email: user.email,
    phone: user.phone ?? '',
    specialty: user.specialty ?? '',
    bio: user.bio ?? '',
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const result = await post<AuthResult>('/login', payload)
  saveTokens(result.accessToken, result.refreshToken)
  persistAuthUser(result.user)
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

export interface UpdateProfilePayload {
  username?: string
  email?: string
  phone?: string | null
  specialty?: string | null
  bio?: string | null
}

/** GET /auth/me — current user profile including avatar_url */
export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/me`, { headers: authHeaders() })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? 'Failed to load profile')
  return json.data as AuthUser
}

/** PATCH /auth/me — update username / email */
export async function updateMyAccount(payload: UpdateProfilePayload): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/me`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? 'Failed to update profile')
  const user = json.data as AuthUser
  persistAuthUser(user)
  return user
}

/** POST /auth/me/avatar — multipart profile picture upload */
export async function uploadMyAvatar(file: File): Promise<AuthUser> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE_URL}/me/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? 'Avatar upload failed')
  const user = json.data as AuthUser
  persistAuthUser(user)
  return user
}

/** DELETE /auth/me/avatar — remove saved profile picture */
export async function removeMyAvatar(): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/me/avatar`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? 'Failed to remove avatar')
  const user = json.data as AuthUser
  persistAuthUser(user)
  return user
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

/** POST /auth/change-password — verify current password and set a new one */
export async function changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/change-password`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) {
    const fields: { field: string; message: string }[] = json?.meta?.fields ?? json?.data?.fields ?? []
    const fieldMsg = fields.map((f) => f.message).join('\n')
    throw new Error(fieldMsg || json?.error || 'Failed to change password')
  }
  clearTokens()
  clearUser()
  return json.data as { success: boolean; message: string }
}

export { resolveMediaUrl }
