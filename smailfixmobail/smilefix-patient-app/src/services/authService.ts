// ─────────────────────────────────────────────
// Auth Service — connects to dental-clinic-backend
// Base URL: http://localhost:3000/api/v1/auth
// ─────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://localhost:3000/api/v1/auth';

// ── Storage keys ──────────────────────────────
const ACCESS_TOKEN_KEY  = 'smilefix_access_token';
const REFRESH_TOKEN_KEY = 'smilefix_refresh_token';

// ── Types ─────────────────────────────────────
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'DENTIST' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'STOREKEEPER' | 'HR';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterResult {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────
async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    // Backend returns { success: false, message, data: { fields } } on errors
    const message = json?.message ?? 'Request failed';
    const fields: { field: string; message: string }[] = json?.data?.fields ?? [];
    const fieldMsg = fields.map((f) => `${f.field}: ${f.message}`).join('\n');
    throw new Error(fieldMsg || message);
  }

  // Backend wraps success in { success: true, data: ... }
  return json.data as T;
}

// ── Token storage ─────────────────────────────
export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ── Auth API calls ────────────────────────────
export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  return post<RegisterResult>('/register', payload);
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const result = await post<AuthResult>('/login', payload);
  await saveTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout(refreshToken: string): Promise<void> {
  const accessToken = await getAccessToken();
  await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken ?? ''}`,
    },
    body: JSON.stringify({ refreshToken }),
  });
  await clearTokens();
}
