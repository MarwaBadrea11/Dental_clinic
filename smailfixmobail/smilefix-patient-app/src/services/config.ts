// ─────────────────────────────────────────────
// API Configuration — Environment-aware
// ─────────────────────────────────────────────
import { Platform } from 'react-native';

// ── How to set your URL for each scenario ────
//
//  Android emulator on your dev machine:
//    → 10.0.2.2 is the special alias that routes to the host OS
//    → already set as default below
//
//  iOS simulator on your dev machine:
//    → localhost works fine on iOS simulator
//    → change MANUAL_LAN_IP to '' and it falls back to localhost
//
//  Physical Android or iOS device (USB or WiFi):
//    → Set MANUAL_LAN_IP to your machine's LAN IP address
//    → Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
//    → Example: '192.168.1.45'
//    → Leave empty ('') to use the emulator defaults
//
//  Production:
//    → Set MANUAL_LAN_IP to your server's public domain/IP
//    → Example: 'api.smilefix.com' (no http://, handled below)

// ── ✏️  EDIT THIS when testing on a physical device ──────────────────────────
const MANUAL_LAN_IP = '192.168.126.249';  // Your machine's Wi-Fi IP (confirmed)
const PORT = 3000;
const USE_HTTPS = false;    // set to true in production
// ─────────────────────────────────────────────────────────────────────────────

function resolveBaseUrl(): string {
  // Manual override always wins (physical device or production)
  if (MANUAL_LAN_IP) {
    const protocol = USE_HTTPS ? 'https' : 'http';
    return `${protocol}://${MANUAL_LAN_IP}:${PORT}/api/v1`;
  }

  // Emulator / simulator auto-detection
  if (Platform.OS === 'android') {
    // Android emulator: 10.0.2.2 routes to the host machine
    return `http://10.0.2.2:${PORT}/api/v1`;
  }

  // iOS simulator: localhost works directly
  return `http://localhost:${PORT}/api/v1`;
}

/**
 * Base URL for all API requests.
 * Resolved once at module load time.
 */
export const API_BASE_URL: string = resolveBaseUrl();

/**
 * Default request timeout in milliseconds.
 * Physical devices on mobile networks may need a higher value.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

// ── Debug helper (remove in production) ──────
if (__DEV__) {
  console.log(`[SmileFix] API_BASE_URL = ${API_BASE_URL}`);
}
