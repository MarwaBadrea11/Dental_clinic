// ─────────────────────────────────────────────
// Secure Storage Utility
// SecureStore on native; AsyncStorage fallback on web.
// ─────────────────────────────────────────────
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Patient } from '../store/appStore';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

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
    setItem(KEYS.ACCESS_TOKEN,  session.accessToken),
    setItem(KEYS.REFRESH_TOKEN, session.refreshToken),
    setItem(KEYS.PATIENT,       JSON.stringify(session.patient)),
  ]);
}

/**
 * Overwrite only the access token (used after a silent token refresh).
 */
export async function saveAccessToken(token: string): Promise<void> {
  await setItem(KEYS.ACCESS_TOKEN, token);
}

// ── Read ──────────────────────────────────────

/**
 * Load the persisted session.
 * Returns null if nothing is stored or if the data is corrupted.
 */
export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const [accessToken, refreshToken, patientJson] = await Promise.all([
      getItem(KEYS.ACCESS_TOKEN),
      getItem(KEYS.REFRESH_TOKEN),
      getItem(KEYS.PATIENT),
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
    deleteItem(KEYS.ACCESS_TOKEN),
    deleteItem(KEYS.REFRESH_TOKEN),
    deleteItem(KEYS.PATIENT),
  ]);
}
