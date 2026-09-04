// ─────────────────────────────────────────────
// API Configuration
//
// The BASE URL is resolved at *runtime*, not build-time.
//
// Priority order for INITIAL value (before user sets an IP):
//   1. EXPO_PUBLIC_API_URL in .env  ← compile-time override for CI/CD
//   2. Expo dev-server hostUri      ← auto-detected on Expo Go / dev builds
//   3. 10.0.2.2                     ← Android emulator → host loopback
//   4. localhost                    ← iOS simulator / web
//
// When the user saves a custom IP via ServerConfigScreen the dynamic
// URL overrides everything. Call `setDynamicBaseUrl(ip)` to apply it,
// and `getDynamicBaseUrl()` to read it in every request.
// ─────────────────────────────────────────────

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 3002;

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  // If caller already passed a full URL (http://...) keep it, else build one
  if (trimmed.startsWith('http')) return `${trimmed}/api/v1`;
  return `http://${trimmed}:${DEFAULT_PORT}/api/v1`;
}

function resolveDefaultBaseUrl(): string {
  // 1. Explicit compile-time override (.env → EXPO_PUBLIC_API_URL)
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return normalizeApiBaseUrl(fromEnv);

  // 2. Physical device via Expo Go / dev client
  try {
    const hostUri: string | undefined =
      Constants.expoConfig?.hostUri ??
      (Constants as any).manifest?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost') {
        return `http://${host}:${DEFAULT_PORT}/api/v1`;
      }
    }
  } catch { /* ignore */ }

  // 3. Android emulator
  if (Platform.OS === 'android') return `http://10.0.2.2:${DEFAULT_PORT}/api/v1`;

  // 4. iOS simulator / web
  return `http://localhost:${DEFAULT_PORT}/api/v1`;
}

// ── Mutable runtime override ──────────────────
// `null`  = use the default derived above
// string  = user-supplied IP, set via setDynamicBaseUrl()
let _dynamicBaseUrl: string | null = null;

/**
 * Override the API base URL at runtime (no rebuild needed).
 * Pass just the IP, e.g. "192.168.1.100", and the path
 * "http://<ip>:3000/api/v1" is built automatically.
 * Or pass a full URL like "http://192.168.1.100:3000".
 */
export function setDynamicBaseUrl(ipOrUrl: string): void {
  _dynamicBaseUrl = normalizeApiBaseUrl(ipOrUrl);
  if (__DEV__) {
    console.log(`[SmileFix] Dynamic API_BASE_URL set → ${_dynamicBaseUrl}`);
  }
}

/**
 * Clear the runtime override and fall back to the build-time default.
 */
export function clearDynamicBaseUrl(): void {
  _dynamicBaseUrl = null;
}

/**
 * Returns the active base URL.
 * Called on every request so changes take effect immediately.
 */
export function getApiBaseUrl(): string {
  return _dynamicBaseUrl ?? resolveDefaultBaseUrl();
}

// ── Static default (kept for backwards-compat imports) ──
export const API_BASE_URL: string = resolveDefaultBaseUrl();

export const REQUEST_TIMEOUT_MS = 15_000;

if (__DEV__) {
  console.log(`[SmileFix] Default API_BASE_URL = ${API_BASE_URL}`);
}
