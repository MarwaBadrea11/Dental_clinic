// ─────────────────────────────────────────────
// API Configuration — Static build-time config
// Base URL is fixed via EXPO_PUBLIC_API_URL in
// .env — no runtime host detection needed.
// ─────────────────────────────────────────────

const RAW_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.110:3002/api/v1';

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  return `${trimmed}/api/v1`;
}

export const API_BASE_URL: string = normalizeApiBaseUrl(RAW_URL);

export const REQUEST_TIMEOUT_MS = 15_000;

if (__DEV__) {
  console.log(`[SmileFix] API_BASE_URL = ${API_BASE_URL}`);
}
