// ─────────────────────────────────────────────
// Secure Storage Utility
// Wraps expo-secure-store with typed helpers.
// All auth data is encrypted at rest by the OS
// keychain (iOS Keychain / Android Keystore).
// ─────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';
import { Patient } from '../store/appStore';

// ── Storage keys ──────────────────────────────
const KEYS = {
  ACCESS_TOKEN:  'smilefix_access_token',
  REFRESH_TOKEN: 'smilefix_refresh_token',
  PATIENT:       'smilefix_patient',
} as const;

// ── Persisted auth session shape ──────────────
export interface PersistedSession {
  accessToken:  string;
  refreshToken: string;
  patient:      Patient;
}

// ── Write ─────────────────────────────────────

/**
 * Persist the full auth session after a successful login.
 * Writes three separate keys so each value stays within
 * SecureStore's 2 KB per-key limit.
 */
export async function saveSession(session: PersistedSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN,  session.accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, session.refreshToken),
    SecureStore.setItemAsync(KEYS.PATIENT,       JSON.stringify(session.patient)),
  ]);
}

/**
 * Overwrite only the access token (used after a silent token refresh).
 */
export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
}

// ── Read ──────────────────────────────────────

/**
 * Load the persisted session.
 * Returns null if nothing is stored or if the data is corrupted.
 */
export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const [accessToken, refreshToken, patientJson] = await Promise.all([
      SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.getItemAsync(KEYS.PATIENT),
    ]);

    if (!accessToken || !refreshToken || !patientJson) return null;

    const patient: Patient = JSON.parse(patientJson);
    return { accessToken, refreshToken, patient };
  } catch {
    // Corrupted data — treat as logged out
    return null;
  }
}

// ── Delete ────────────────────────────────────

/**
 * Wipe all stored auth data on logout.
 */
export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.PATIENT),
  ]);
}
