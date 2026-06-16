// Shared API base URL — kept in a dependency-free module to avoid circular
// imports between apiClient and authService.

// Normalise: strip any trailing /api/v1 so we always end up with exactly one.
// VITE_API_BASE_URL may be "http://localhost:3002" or "http://localhost:3002/api/v1".
const _origin = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002')
  .replace(/\/api\/v1\/?$/, '')

export const API_BASE = `${_origin}/api/v1`

/** Server origin without the /api/v1 suffix (for static /uploads/ paths). */
export const API_ORIGIN = _origin

/** Resolve a relative upload path or absolute URL for use in img src. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
