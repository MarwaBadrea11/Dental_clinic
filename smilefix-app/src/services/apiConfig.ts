// Shared API base URL — kept in a dependency-free module to avoid circular
// imports between apiClient and authService.

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
