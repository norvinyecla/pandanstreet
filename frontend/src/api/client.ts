const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/** Resolves a server-relative path (e.g. a photo's `/uploads/...` path) against the API origin. */
export function resolveAssetUrl(path: string): string {
  return path ? `${API_URL}${path}` : path;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Requests whose `401` means "wrong credentials" or "not logged in yet", rather
 * than an expired session, so they never trigger the unauthorized handler.
 */
const SESSION_CHECK_PATHS = new Set([
  '/auth/login',
  '/auth/signup',
  '/auth/me',
]);

let unauthorizedHandler: (() => void) | null = null;

/** Registers the callback run when a request fails because the session has expired. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface ErrorBody {
  message?: string | string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => null)) as
    (T & ErrorBody) | null;

  if (!response.ok) {
    if (response.status === 401 && !SESSION_CHECK_PATHS.has(path)) {
      unauthorizedHandler?.();
    }
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? 'Something went wrong. Please try again.');
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
