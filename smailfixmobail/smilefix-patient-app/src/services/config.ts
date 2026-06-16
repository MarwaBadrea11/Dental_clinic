// ─────────────────────────────────────────────
// API Configuration — Environment-aware
//
// Priority order:
//   1. EXPO_PUBLIC_API_URL in .env         ← use this for standalone APK builds
//   2. Expo dev-server hostUri (Expo Go)   ← auto-detected on physical devices
//   3. 10.0.2.2  (Android emulator)
//   4. localhost (iOS simulator / web)
//
// For a compiled standalone APK on a physical device:
//   Set EXPO_PUBLIC_API_URL=http://<your-machine-LAN-IP>:3000 in .env
//   then rebuild the APK.  The device and your PC must be on the same Wi-Fi.
// ─────────────────────────────────────────────
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 3000;

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  return `${trimmed}/api/v1`;
}

function resolveBaseUrl(): string {
  // 1. Explicit override from .env — highest priority
  //    Required for standalone APK builds where no Expo dev server is running.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  // 2. On physical devices running through Expo Go / dev client,
  //    Constants.expoConfig.hostUri contains "192.168.x.x:8081".
  //    Strip the port and use our backend port instead.
  try {
    const hostUri: string | undefined =
      Constants.expoConfig?.hostUri ??
      (Constants as any).manifest?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(':')[0]; // e.g. "192.168.1.105"
      if (host && host !== 'localhost') {
        return `http://${host}:${DEFAULT_PORT}/api/v1`;
      }
    }
  } catch {
    // ignore — fall through to platform defaults
  }

  // 3. Android emulator: 10.0.2.2 routes to the host machine loopback
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}/api/v1`;
  }

  // 4. iOS simulator / web on the same machine
  return `http://localhost:${DEFAULT_PORT}/api/v1`;
}

export const API_BASE_URL: string = resolveBaseUrl();

export const REQUEST_TIMEOUT_MS = 15_000;

if (__DEV__) {
  console.log(`[SmileFix] API_BASE_URL = ${API_BASE_URL}`);
}
