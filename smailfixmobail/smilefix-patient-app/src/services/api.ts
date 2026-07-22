// ─────────────────────────────────────────────
// Core API Client
// • Auth token injection (store → SecureStore fallback)
// • Automatic silent token refresh on 401
// • Unified error handling + request timeout
// ─────────────────────────────────────────────
import { getApiBaseUrl, REQUEST_TIMEOUT_MS } from './config';
import { useAppStore } from '../store/appStore';
import { loadSession } from './storage';

// ── Response envelope ─────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  details?: { fields?: Array<{ field: string; message: string }> };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Error class ───────────────────────────────
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message);
    this.name = 'ApiRequestError';
  }
}

// ── Request options ───────────────────────────
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip Authorization header (login / register) */
  skipAuth?: boolean;
  /** Internal — prevents infinite refresh loop */
  _isRetry?: boolean;
}

// ── Resolve best available token ──────────────
async function resolveToken(): Promise<string | null> {
  // 1. In-memory Zustand store (populated after hydration)
  const storeToken = useAppStore.getState().authToken;
  if (storeToken) return storeToken;

  // 2. SecureStore fallback — covers race where screen mounts before hydration
  try {
    const session = await loadSession();
    if (session?.accessToken) {
      useAppStore.setState({ authToken: session.accessToken });
      return session.accessToken;
    }
  } catch {
    // SecureStore unavailable
  }
  return null;
}

// ── Silent token refresh ──────────────────────
// Deduplication: all concurrent 401s share one refresh call
let _refreshPromise: Promise<string | null> | null = null;

async function silentRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const store = useAppStore.getState();
      const refreshToken =
        store.refreshToken ?? (await loadSession())?.refreshToken ?? null;

      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const json = await res.json();
      if (!json?.success || !json?.data?.accessToken) return null;

      const newToken: string = json.data.accessToken;
      await store.updateAccessToken(newToken);
      if (__DEV__) console.log('[API] 🔄 Token refreshed silently');
      return newToken;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Core request ──────────────────────────────
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    skipAuth = false,
    _isRetry = false,
    headers: extraHeaders = {},
    ...rest
  } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = await resolveToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (__DEV__) {
    console.log(
      `[API] ➡️  ${(options.method ?? 'GET').toUpperCase()} ${API_BASE_URL}${path}`,
      `| auth: ${headers['Authorization'] ? 'Bearer …' + headers['Authorization'].slice(-6) : 'NONE'}`,
      `| store_token: ${useAppStore.getState().authToken ? 'present' : 'null'}`,
    );
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    clearTimeout(timeoutId);

    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch {
      throw new ApiRequestError(response.status, {
        success: false,
        message: `Server error (${response.status})`,
      });
    }

    // ── Auto-refresh on 401 ─────────────────
    if (response.status === 401 && !skipAuth && !_isRetry) {
      if (__DEV__) console.log('[API] 🔑 401 received — attempting silent refresh…');
      const newToken = await silentRefresh();
      if (newToken) {
        return apiRequest<T>(path, { ...options, _isRetry: true });
      }
      if (__DEV__) console.warn('[API] ❌ Refresh failed — logging out');
      await useAppStore.getState().logout();
    }

    if (!response.ok || !json.success) {
      const raw = json as any;
      const errorBody: ApiError = {
        success: false,
        message: raw.message ?? raw.error ?? `HTTP ${response.status}`,
        details: raw.details ?? raw.meta ?? undefined,
      };
      if (__DEV__) {
        console.warn(
          `[API] ❌ ${options.method ?? 'GET'} ${path} → ${response.status}`,
          JSON.stringify(errorBody),
        );
      }
      throw new ApiRequestError(response.status, errorBody);
    }

    return (json as ApiSuccess<T>).data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiRequestError) throw err;

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

// ── Shorthand helpers ─────────────────────────
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
