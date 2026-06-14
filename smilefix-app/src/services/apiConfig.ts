// Shared API base URL — kept in a dependency-free module to avoid circular
// imports between apiClient and authService.

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

/** Server origin without the /api/v1 suffix (for static /uploads/ paths). */
export const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

/** Resolve a relative upload path or absolute URL for use in img src. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
