// ─────────────────────────────────────────────
// Core API Client
// Wraps fetch with:
//   • Auth token injection (Bearer JWT)
//   • Unified error handling
//   • Request timeout
//   • Typed response envelope
// ─────────────────────────────────────────────
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { useAppStore } from '../store/appStore';

// ── Response envelope from the backend ───────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  details?: {
    fields?: Array<{ field: string; message: string }>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Custom error class ────────────────────────
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message);
    this.name = 'ApiRequestError';
  }
}

// ── Options passed to every request ──────────
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip attaching the Authorization header (e.g. login/register) */
  skipAuth?: boolean;
}

/**
 * Core fetch wrapper.
 *
 * - Automatically attaches `Authorization: Bearer <token>` from the
 *   Zustand store unless `skipAuth` is true.
 * - Parses the backend's `{ success, data }` envelope.
 * - Throws `ApiRequestError` for non-2xx responses so callers can
 *   catch and display structured error messages.
 * - Aborts the request if it exceeds REQUEST_TIMEOUT_MS.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth = false, headers: extraHeaders = {}, ...rest } = options;

  // ── Build headers ─────────────────────────
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  // Only set Content-Type for requests that actually send a body
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = useAppStore.getState().authToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // ── Timeout via AbortController ───────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    clearTimeout(timeoutId);

    // Parse JSON regardless of status so we can read the error body
    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch {
      // Server returned non-JSON (e.g. 502 HTML gateway error)
      throw new ApiRequestError(response.status, {
        success: false,
        message: `Server error (${response.status})`,
      });
    }

    if (!response.ok || !json.success) {
      const errorBody = json as ApiError;
      throw new ApiRequestError(response.status, errorBody);
    }

    return (json as ApiSuccess<T>).data;
  } catch (err) {
    clearTimeout(timeoutId);

    // Re-throw our own errors as-is
    if (err instanceof ApiRequestError) throw err;

    // Network / timeout errors
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiRequestError(0, {
        success: false,
        message: 'Request timed out. Please check your connection.',
      });
    }

    throw new ApiRequestError(0, {
      success: false,
      message: 'Network error. Please check your connection.',
    });
  }
}

// ── Convenience method shorthands ─────────────

export const api = {
  get<T>(path: string, options?: RequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'POST', body });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'PATCH', body });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'PUT', body });
  },

  delete<T>(path: string, options?: RequestOptions) {
    return apiRequest<T>(path, { ...options, method: 'DELETE' });
  },
};
