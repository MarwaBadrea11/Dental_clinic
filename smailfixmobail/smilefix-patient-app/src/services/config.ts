// ─────────────────────────────────────────────
// API Configuration — Environment-aware
// ─────────────────────────────────────────────
import { Platform } from 'react-native';

/** Backend default port (matches dental-clinic-backend PORT env, default 3000). */
const DEFAULT_PORT = 3000;

/**
 * Ensures the base URL always ends with /api/v1.
 * Accepts either `http://host:port` or `http://host:port/api/v1`.
 */
function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  return `${trimmed}/api/v1`;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  // Fallback when .env is missing (emulator / local dev)
  if (Platform.OS === 'android') {
    // Android emulator: 10.0.2.2 routes to the host machine
    return `http://10.0.2.2:${DEFAULT_PORT}/api/v1`;
  }

  // iOS simulator / Expo web on the same machine
  return `http://localhost:${DEFAULT_PORT}/api/v1`;
}

/**
 * Base URL for all API requests.
 * Set EXPO_PUBLIC_API_URL in .env (see .env.example).
 */
export const API_BASE_URL: string = resolveBaseUrl();

/**
 * Default request timeout in milliseconds.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

if (__DEV__) {
  console.log(`[SmileFix] API_BASE_URL = ${API_BASE_URL}`);
}
